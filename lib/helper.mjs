/**
 * detached helper：在 Electron 完全退出后清理 cookie，并按需重新拉起应用。
 *
 * 它必须独立于 Host 进程存活，所以由插件以 detached + unref 方式拉起，
 * 参数全部走环境变量（避免命令行转义问题）。
 *
 * 运行方式：ELECTRON_RUN_AS_NODE=1 "<exe>" "<本文件>"
 */
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";

const PAYLOAD_ENV = "DSH_DESKTOP_TOOLS_PAYLOAD";

function logFile(payload) {
  try {
    const dir = payload.dataDir;
    if (!dir) return null;
    fs.mkdirSync(dir, { recursive: true });
    return path.join(dir, "helper.log");
  } catch {
    return null;
  }
}

function log(payload, message) {
  const line = `[${new Date().toISOString()}] ${message}\n`;
  const file = logFile(payload);
  if (!file) return;
  try {
    fs.appendFileSync(file, line, "utf8");
  } catch {
    /* ignore */
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    return e && e.code === "EPERM";
  }
}

/**
 * 查某个 PID 的映像名（不含路径，小写）。
 *
 * 用来在动手杀进程前确认目标真的是桌面应用：插件是用 process.ppid 推断
 * Electron 主进程的，万一宿主结构变了（比如以后把 Host 改成 detached），
 * 这个推断就会指错人，而 taskkill /F 是没有撤销的。
 *
 * 返回 null 表示查不出来（权限不足等），此时调用方按"无法验证"处理。
 */
function imageName(pid) {
  try {
    // /NH 去掉表头，/FO CSV 让输出固定成 "name","pid",... 便于取第一列。
    const result = spawnSync("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"], {
      windowsHide: true,
      encoding: "utf8",
      timeout: 5000,
    });
    if (result.status !== 0 || !result.stdout) return null;
    const match = /^"([^"]+)"/u.exec(result.stdout.trim());
    return match ? match[1].toLowerCase() : null;
  } catch {
    return null;
  }
}

/** 桌面应用的映像名，用于校验目标进程身份。 */
const DESKTOP_IMAGE = "deepseek harness.exe";

/**
 * 确认某个 PID 是否确实是桌面应用主进程。
 *
 * 三态：
 * - 查到了且匹配   → { verified: true }
 * - 查到了但不匹配 → { verified: false, mismatch: true }（必须拒绝）
 * - 查不到         → { verified: false, mismatch: false }（降级放行，见 terminate）
 *
 * tasklist 在某些受限环境里跑不起来；把它当硬门槛会让重启功能整体失效，
 * 这是个比误杀更常见的坏结局，所以只在"确实查出了别的进程名"时才拦。
 */
function verifyTarget(pid) {
  const image = imageName(pid);
  if (image === null) return { verified: false, mismatch: false, image: null, reason: "tasklist unavailable" };
  if (image !== DESKTOP_IMAGE) return { verified: false, mismatch: true, image, reason: `unexpected image ${image}` };
  return { verified: true, image };
}

/**
 * 等目标进程退出。超时则强杀。
 *
 * 只用 /PID、不加 /T：本 helper 自己就是 Host 的子进程，而 Host 又是 Electron
 * 的子进程，/T 会把整棵树连 helper 一起杀掉，清理与重启就做不成了。
 * 只杀 Electron 主进程是安全的——它退出后 Host 的 IPC 通道断开，
 * desktop-host 里的 process.once("disconnect", stop) 会自行收尾。
 */
async function waitForExit(payload, pid, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!pidAlive(pid)) return { exited: true, forced: false };
    await sleep(200);
  }

  log(payload, `pid ${pid} still alive after ${timeoutMs}ms, forcing taskkill`);
  try {
    spawnSync("taskkill", ["/PID", String(pid), "/F"], { windowsHide: true, stdio: "ignore" });
  } catch (e) {
    log(payload, `taskkill failed: ${String((e && e.message) || e)}`);
  }

  const forceDeadline = Date.now() + 5000;
  while (Date.now() < forceDeadline) {
    if (!pidAlive(pid)) return { exited: true, forced: true };
    await sleep(100);
  }
  return { exited: false, forced: true };
}

/**
 * 主动结束 Electron 主进程。
 *
 * 必须延迟 killDelayMs 再动手：触发重启的 HTTP 响应要先送回页面，
 * 页面才能显示"正在重启"。这一步由 helper 做而不是 Host 做，是因为
 * Host 一死页面就立刻断连，拿不到任何反馈。
 */
async function terminate(payload) {
  const pid = payload.killPid;
  if (!Number.isInteger(pid) || pid <= 0) return { ok: true, skipped: "no pid" };

  const delay = Number(payload.killDelayMs) || 800;
  await sleep(delay);

  if (!pidAlive(pid)) {
    log(payload, `pid ${pid} already gone before kill`);
    return { ok: true, alreadyGone: true };
  }

  // 动手前先确认这真的是桌面应用。只在"查出了别的进程名"时拦下来——
  // 宁可重启失败，也不能把无关进程 taskkill /F 掉。
  const target = verifyTarget(pid);
  log(payload, `verify target ${pid}: ${JSON.stringify(target)}`);
  if (target.mismatch) {
    return { ok: false, aborted: true, error: `target ${pid} is not the desktop app (${target.reason})` };
  }

  try {
    spawnSync("taskkill", ["/PID", String(pid), "/F"], { windowsHide: true, stdio: "ignore" });
    log(payload, `taskkill /PID ${pid} sent`);
  } catch (e) {
    log(payload, `taskkill failed: ${String((e && e.message) || e)}`);
    return { ok: false, error: String((e && e.message) || e) };
  }

  return { ok: true };
}

/** 清理单个库；任何异常都只记录不中断，保证重启动作不被清理失败阻断。 */
async function cleanStores(payload) {
  const results = [];
  if (payload.clean === false) return results;

  let sqlite;
  try {
    sqlite = await import("node:sqlite");
  } catch (e) {
    log(payload, `node:sqlite unavailable: ${String((e && e.message) || e)}`);
    return [{ ok: false, error: "node:sqlite unavailable" }];
  }

  // 用 file URL 动态 import 同目录的相对模块。
  const cookiesUrl = new URL("./cookies.js", import.meta.url);
  const cookies = await import(cookiesUrl.href);

  for (const store of payload.stores || []) {
    try {
      const result = cookies.purgeStore(store.file, sqlite, {
        dryRun: payload.dryRun === true,
        keepBackups: payload.keepBackups,
      });
      log(payload, `clean ${store.label}: ${JSON.stringify(result)}`);
      results.push({ label: store.label, ...result });
    } catch (e) {
      log(payload, `clean ${store.label} threw: ${String((e && e.message) || e)}`);
      results.push({ label: store.label, ok: false, error: String((e && e.message) || e) });
    }
  }
  return results;
}

/** 重新拉起桌面应用。DSH_PROFILE 必须补，否则新 Host 找不到 boot profile。 */
function relaunch(payload) {
  const exe = payload.exe;
  if (!exe || !fs.existsSync(exe)) {
    log(payload, `relaunch skipped: exe not found ${String(exe)}`);
    return { ok: false, error: "exe not found" };
  }

  // 从 helper 的环境里清掉 ELECTRON_RUN_AS_NODE，否则新进程会变成 node 而不是 GUI。
  const env = { ...process.env };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.DSH_DESKTOP_TOOLS_PAYLOAD;
  if (!env.DSH_PROFILE) env.DSH_PROFILE = "desktop";

  try {
    const child = spawn(exe, [], {
      cwd: path.dirname(exe),
      detached: true,
      stdio: "ignore",
      windowsHide: false,
      env,
    });
    // 异步启动失败只会 emit 'error'，不监听就是 unhandled 'error' 直接崩。
    child.on("error", (e) => {
      log(payload, `relaunch error event: ${String((e && e.message) || e)}`);
    });
    child.unref();
    log(payload, `relaunched ${exe} (pid ${child.pid})`);
    return { ok: true, pid: child.pid };
  } catch (e) {
    log(payload, `relaunch failed: ${String((e && e.message) || e)}`);
    return { ok: false, error: String((e && e.message) || e) };
  }
}

/** 落一次执行结果，页面回读它确认清理与重启真的发生了。 */
function writeSummary(payload, summary) {
  try {
    if (!payload.dataDir) return;
    fs.mkdirSync(payload.dataDir, { recursive: true });
    fs.writeFileSync(path.join(payload.dataDir, "last-run.json"), JSON.stringify(summary, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

async function main() {
  const raw = process.env[PAYLOAD_ENV];
  if (!raw) {
    process.exit(2);
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(2);
    return;
  }

  log(payload, `helper start pid=${process.pid} mode=${payload.mode}`);

  // 1. 结束旧进程。
  //    先等 killDelayMs，让插件的 HTTP 响应先回到页面，页面才来得及显示"正在重启"。
  //    没有 killPid 时（应用已经关了）跳过这一步，直接清理。
  let terminated = null;
  if (Number.isInteger(payload.killPid) && payload.killPid > 0) {
    terminated = await terminate(payload);
    log(payload, `terminate result ${JSON.stringify(terminated)}`);

    // 身份校验没过就不能继续：下面 waitForExit 超时后会强制 taskkill，
    // 那条路会绕过 terminate 里的校验，把无关进程杀掉。
    if (!terminated.ok) {
      log(payload, "terminate refused, aborting without touching the process");
      writeSummary(payload, {
        mode: payload.mode,
        terminated,
        cleans: [],
        launched: null,
        at: new Date().toISOString(),
      });
      process.exit(1);
      return;
    }

    // 已经不在跑了（例如用户自己关了窗口）就没必要等。
    if (!terminated.alreadyGone) {
      const waited = await waitForExit(payload, payload.killPid, Number(payload.waitTimeoutMs) || 15000);
      log(payload, `wait result ${JSON.stringify(waited)}`);
      if (!waited.exited) {
        log(payload, "target process refuses to die, aborting");
        process.exit(1);
        return;
      }
    }
    // 锁释放有延迟，给文件系统一点时间。
    await sleep(400);
  }

  // 2. 清理 cookie。应用此刻已退出，SQLite 不再被独占。
  const cleans = await cleanStores(payload);

  // 3. 需要时重新拉起。
  let launched = null;
  if (payload.mode === "restart") {
    await sleep(Number(payload.launchDelayMs) || 1200);
    launched = relaunch(payload);
  }

  const summary = { mode: payload.mode, terminated, cleans, launched, at: new Date().toISOString() };
  writeSummary(payload, summary);
  log(payload, `helper done ${JSON.stringify(summary)}`);
  process.exit(0);
}

main().catch((e) => {
  try {
    log({ dataDir: process.env.DSH_DESKTOP_TOOLS_DATA }, `helper crashed: ${String((e && e.stack) || e)}`);
  } catch {
    /* ignore */
  }
  process.exit(1);
});
