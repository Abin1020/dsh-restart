/**
 * dsh-restart — 桌面端维护工具
 *
 * 两个功能合一：
 * 1. cookie 清理：dsh-auth-* 每次启动都会因随机端口生成新条目且永不覆盖，
 *    累积到 Node 请求头上限（16384 B）后服务端回 431，桌面端只显示"认证失败"。
 * 2. 页面重启按钮：装/停插件后需要重启 DSH 才能生效，插件管理页只提示不提供动作。
 *
 * 协同：重启是唯一触发点，清理是重启的副作用——每次重启都顺带把 cookie 库收拾干净。
 * 不做定时器：运行期 cookie 库被 Chromium 独占，既清不了也没必要单独排期，
 * 而"每次重启必清"已经保证库里永远不会有第二条。
 *
 * 为什么必须用 detached helper：
 * - Host 自己 process.exit() 会被主进程判成崩溃并弹原生崩溃对话框。
 * - cookie 库在 Electron 存活期间被 Chromium 独占锁定（EBUSY / EPERM / errcode 14），
 *   必须等它彻底退出才能读写。
 */
import path from "node:path";
import { appendFile } from "node:fs/promises";
import { closeSync, existsSync, openSync, readSync, statSync } from "node:fs";
import { launchHelper, readLastRun } from "./restart.js";
import { readLayout, writeLayout } from "./layout.js";
import { agentAvailable, launchWindowAgent } from "./winagent.mjs";
import { cookieStores, desktopExecutable, ensureDir, pluginDataDir } from "./paths.js";

export const name = "dsh-restart";

// 不写死任何 service：webServer 用可选注入，缺了也不至于让插件卡在 pending 起不来。
export const inject = [];

const DEFAULTS = {
  /** 每次重启都清空 dsh-auth-*（根治累积）。关掉就退化成"只重启不清理"。 */
  cleanOnEveryRestart: true,
  /** cookie 库备份保留份数。 */
  keepBackups: 3,
  /** 关掉旧进程后等多久再拉起新进程（ms）。 */
  restartLaunchDelayMs: 1200,
  /** 收到重启请求后等多久再动手，留给 HTTP 响应回页面（ms）。 */
  killDelayMs: 800,
  /** 只统计不删除。 */
  dryRun: false,
};

function log(ctx, message, extra) {
  try {
    if (extra === undefined) ctx.logger?.info?.(message);
    else ctx.logger?.info?.(message, extra);
  } catch {
    /* ignore */
  }
}

/** Electron 主进程就是 Host 的父进程。拿不到就返回 null，helper 会跳过 kill 直接清理。 */
function electronPid() {
  const pid = process.ppid;
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

/** 从请求里读出 JSON body，超限直接拒。 */
async function readJsonBody(request, maxBytes = 64 * 1024) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += buffer.length;
    if (size > maxBytes) throw new Error("request body too large");
    chunks.push(buffer);
  }
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

function sendJson(response, status, body) {
  const text = JSON.stringify(body);
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "content-length": Buffer.byteLength(text),
  });
  response.end(text);
}

/**
 * 同源闸。桌面端转发会剥掉 origin，所以"没有 origin"必须放行；
 * 有 origin 时必须与 host 一致，跨站一律拒。
 */
function allowRequest(request, response) {
  const site = String(request.headers["sec-fetch-site"] || "").toLowerCase();
  if (site === "cross-site") {
    sendJson(response, 403, { ok: false, error: "cross-origin blocked" });
    return false;
  }

  const origin = String(request.headers["origin"] || "").trim();
  if (origin === "null") {
    sendJson(response, 403, { ok: false, error: "cross-origin blocked" });
    return false;
  }
  if (!origin) return true;

  let originHost = "";
  try {
    originHost = new URL(origin).host;
  } catch {
    sendJson(response, 403, { ok: false, error: "cross-origin blocked" });
    return false;
  }
  const host = String(request.headers["host"] || "").trim();
  if (!host || originHost.toLowerCase() !== host.toLowerCase()) {
    sendJson(response, 403, { ok: false, error: "cross-origin blocked" });
    return false;
  }
  return true;
}

/**
 * 读 boot.log 的最后一行，给界面显示"上次启动恢复是在窗口显示前还是显示后完成的"。
 * 只读文件末尾一段——这个文件会随每次启动增长，不该整份读进来。
 */
function readBoot(dataDir) {
  const tail = readLogTail(path.join(dataDir, "boot.log"), 4096);
  if (!tail) return null;
  const lines = tail.trim().split(/\r?\n/u).filter(Boolean);
  // 同一个文件里既有渲染层的 restore-start，也有代理写的 agent 行；
  // 这里只认前者，否则会把代理记录当成"启动时序"读出去。
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const space = line.indexOf(" ");
    if (space <= 0) continue;
    const at = line.slice(0, space);
    let parsed = null;
    try {
      parsed = JSON.parse(line.slice(space + 1));
    } catch {
      continue;
    }
    if (!parsed || parsed.phase === "agent") continue;
    return {
      at: parsed.at || at,
      timestamp: at,
      visibility: parsed.visibility || null,
      startSize: Array.isArray(parsed.startSize) ? parsed.startSize : null,
      stillHidden: parsed.visibility === "hidden",
    };
  }
  return null;
}

/**
 * 只读日志文件尾部，避免把整个 boot.log 读进内存。文件不存在返回 null。
 */
function readLogTail(file, maxBytes) {
  try {
    if (!existsSync(file)) return null;
    const size = statSync(file).size;
    const readFrom = Math.max(0, size - maxBytes);
    const fd = openSync(file, "r");
    let text = "";
    try {
      const buffer = Buffer.alloc(size - readFrom);
      readSync(fd, buffer, 0, buffer.length, readFrom);
      text = buffer.toString("utf8");
    } finally {
      closeSync(fd);
    }
    return text;
  } catch {
    return null;
  }
}

function buildState(ctx, cfg, dataDir) {
  const exe = desktopExecutable(process.env);
  // 官方桌面端的 exe 名固定；纯 web 模式下 execPath 是 node.exe，据此区分。
  const desktop = process.platform === "win32" && typeof exe === "string" && path.basename(exe).toLowerCase() === "deepseek harness.exe" && electronPid() !== null;

  return {
    ok: true,
    platform: process.platform,
    desktop,
    dataDir,
    executable: exe,
    electronPid: electronPid(),
    stores: cookieStores(process.env),
    lastRun: readLastRun(dataDir),
    layout: readLayout(dataDir),
    boot: readBoot(dataDir),
    agent: readAgent(dataDir),
    config: {
      cleanOnEveryRestart: cfg.cleanOnEveryRestart,
      keepBackups: cfg.keepBackups,
      dryRun: cfg.dryRun,
    },
  };
}

/**
 * 读窗口代理留下的最后一条记录。与 boot.log 同一个文件，
 * 靠 `"phase":"agent"` 区分——渲染层那几条 phase 是 "restore-start"。
 */
function readAgent(dataDir) {
  const tail = readLogTail(path.join(dataDir, "boot.log"), 8192);
  if (!tail) return null;
  const lines = tail.trim().split(/\r?\n/u).filter(Boolean);
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i];
    const space = line.indexOf(" ");
    if (space <= 0) continue;
    let parsed = null;
    try {
      parsed = JSON.parse(line.slice(space + 1));
    } catch {
      continue;
    }
    if (!parsed || parsed.phase !== "agent") continue;
    return { ...parsed, timestamp: line.slice(0, space) };
  }
  return null;
}

/**
 * 窗口代理：在窗口 show() 之前把尺寸摆好。
 *
 * 时序依据（main.js）：窗口在 createMainWindow() 里以 show=false 创建，
 * 到 enterWorkspace() 里 await navigateMain(url) 完成的瞬间才 window.show()。
 * 而 navigateMain() 要等页面加载完，页面又由本 Host 提供 ——
 * 所以 apply() 一定早于 show()，从这里拉起代理有 10 秒量级的余量。
 * 渲染层做不到这件事：client bundle 实测在导航开始后 10.4 秒才执行。
 */
function startWindowAgent(ctx, dataDir) {
  if (!agentAvailable()) return;
  const pid = electronPid();
  if (pid === null) return;
  const layout = readLayout(dataDir);
  if (!layout || !layout.window) return;

  const result = launchWindowAgent({
    pid,
    window: layout.window,
    logFile: path.join(dataDir, "boot.log"),
    timeoutMs: 30000,
  });
  if (result.ok) log(ctx, "dsh-restart: window agent started", { pid: result.pid });
  else log(ctx, "dsh-restart: window agent skipped", result.error);
}

export function apply(ctx, config) {
  const cfg = { ...DEFAULTS, ...(config || {}) };
  const dataDir = pluginDataDir(process.env.DSH_HOME);
  ensureDir(dataDir);

  log(ctx, "dsh-restart: loaded", { dataDir, dryRun: cfg.dryRun });

  // 越早越好：这里一定早于主窗口的 show()（页面就是本 Host 提供的）。
  startWindowAgent(ctx, dataDir);

  ctx.inject(["webServer"], (host) => {
    host.effect(() => {
      const disposers = [];
      const route = (spec) => {
        try {
          const dispose = host.webServer.register({
            ...spec,
            handler: async (request, response) => {
              if (!allowRequest(request, response)) return;
              return spec.handler(request, response);
            },
          });
          if (typeof dispose === "function") disposers.push(dispose);
        } catch (e) {
          log(ctx, `dsh-restart: route ${spec.path} failed`, String((e && e.message) || e));
        }
      };

      /** 只读状态：页面用它渲染面板。 */
      route({
        kind: "exact",
        path: "/dsh-restart/status",
        handler: async (request, response) => {
          if (request.method !== "GET") {
            response.writeHead(405, { allow: "GET" });
            response.end();
            return;
          }
          sendJson(response, 200, buildState(ctx, cfg, dataDir));
        },
      });

      /**
       * 重启。helper 延迟后结束 Electron 主进程，等它退出、清 cookie、再拉起。
       * 响应必须立刻返回——helper 一旦动手这条连接就断了。
       */
      route({
        kind: "exact",
        path: "/dsh-restart/restart",
        handler: async (request, response) => {
          if (request.method !== "POST") {
            response.writeHead(405, { allow: "POST" });
            response.end();
            return;
          }

          let body = {};
          try {
            body = await readJsonBody(request);
          } catch (e) {
            sendJson(response, 400, { ok: false, error: String((e && e.message) || e) });
            return;
          }

          const exe = desktopExecutable(process.env);
          if (!exe) {
            sendJson(response, 500, { ok: false, error: "desktop executable not found" });
            return;
          }

          const clean = body.clean === false ? false : cfg.cleanOnEveryRestart !== false;
          const result = launchHelper({
            mode: "restart",
            exe,
            stores: cookieStores(process.env),
            killPid: electronPid(),
            killDelayMs: cfg.killDelayMs,
            launchDelayMs: cfg.restartLaunchDelayMs,
            keepBackups: cfg.keepBackups,
            dryRun: cfg.dryRun === true,
            clean,
            dataDir,
          });

          if (!result.ok) {
            sendJson(response, 500, { ok: false, error: result.error || "failed to start restart helper" });
            return;
          }

          log(ctx, "dsh-restart: restart scheduled", { helperPid: result.pid, clean });
          sendJson(response, 202, {
            ok: true,
            restarting: true,
            clean,
            helperPid: result.pid,
            message: "restart scheduled",
          });
        },
      });

      /** 上次执行结果，页面用来确认重启真的清理过。 */
      route({
        kind: "exact",
        path: "/dsh-restart/last-run",
        handler: async (request, response) => {
          if (request.method !== "GET") {
            response.writeHead(405, { allow: "GET" });
            response.end();
            return;
          }
          sendJson(response, 200, { ok: true, lastRun: readLastRun(dataDir) });
        },
      });

      /**
       * 布局偏好：窗口尺寸 / 位置 + 右侧栏宽度。
       * GET 读，PUT 合并写（patch 里出现的键才覆盖，null 表示清除该项）。
       * 这里只管存，不负责施加——窗口与右侧栏都是渲染层的东西。
       */
      route({
        kind: "exact",
        path: "/dsh-restart/layout",
        handler: async (request, response) => {
          if (request.method === "GET") {
            sendJson(response, 200, { ok: true, layout: readLayout(dataDir) });
            return;
          }
          if (request.method !== "PUT") {
            response.writeHead(405, { allow: "GET, PUT" });
            response.end();
            return;
          }

          let body = {};
          try {
            body = await readJsonBody(request);
          } catch (e) {
            sendJson(response, 400, { ok: false, error: String((e && e.message) || e) });
            return;
          }

          try {
            const layout = writeLayout(dataDir, body);
            log(ctx, "dsh-restart: layout saved", { window: layout.window, rightbar: layout.rightbar });
            sendJson(response, 200, { ok: true, layout });
          } catch (e) {
            sendJson(response, 500, { ok: false, error: String((e && e.message) || e) });
          }
        },
      });

      /**
       * 一次性启动时序诊断：确认渲染层跑到恢复逻辑时窗口是否还隐藏。
       * hidden → resizeTo 发生在 show() 之前，用户看不到中间态；
       * visible → bundle 加载晚于 show()，那一下抖动是不可避免的。
       * 只追加几行到 boot.log，用完即可删掉这条路由。
       */
      route({
        kind: "exact",
        path: "/dsh-restart/diag",
        handler: async (request, response) => {
          if (request.method !== "POST") {
            response.writeHead(405, { allow: "POST" });
            response.end();
            return;
          }
          let body = {};
          try {
            body = await readJsonBody(request, 8 * 1024);
          } catch {
            body = {};
          }
          try {
            const file = path.join(dataDir, "boot.log");
            const line = `${new Date().toISOString()} ${JSON.stringify(body)}\n`;
            await appendFile(file, line, "utf8");
            sendJson(response, 200, { ok: true });
          } catch (e) {
            sendJson(response, 500, { ok: false, error: String((e && e.message) || e) });
          }
        },
      });

      return () => {
        for (const dispose of disposers.splice(0)) {
          try {
            dispose();
          } catch {
            /* ignore */
          }
        }
      };
    }, "dsh-restart: routes");
  });
}
