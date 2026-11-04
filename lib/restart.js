/**
 * 重启动作：拉起 detached helper 后，由 helper 结束 Electron 并重新打开应用。
 *
 * 为什么不自己在 Host 里做完：
 * - Host 自己 exit 会让主进程判成崩溃并弹原生崩溃对话框（DesktopHostProcess.fail → reportFatal）。
 * - cookie 库在 Electron 存活期间被独占锁定，必须等它彻底退出才能清理。
 * 所以"结束进程 + 清理 + 重新拉起"三件事必须由一个活在 Electron 之外的进程完成。
 */
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const PAYLOAD_ENV = "DSH_DESKTOP_TOOLS_PAYLOAD";

function helperPath() {
  // helper.mjs 与本文件同目录。
  return new URL("./helper.mjs", import.meta.url);
}

/**
 * 启动 helper。
 * @param {object} options
 * @param {"restart"|"clean"} options.mode
 * @param {string} options.exe        桌面端可执行文件
 * @param {Array}  options.stores     cookie 库列表
 * @param {number} [options.killPid]  要结束的 Electron 主进程（通常是 Host 的 ppid）
 * @param {string} options.dataDir    日志与结果目录
 */
export function launchHelper(options) {
  const payload = {
    mode: options.mode,
    exe: options.exe,
    stores: options.stores,
    killPid: options.killPid,
    killDelayMs: options.killDelayMs ?? 800,
    waitTimeoutMs: options.waitTimeoutMs ?? 15000,
    launchDelayMs: options.launchDelayMs ?? 1200,
    keepBackups: options.keepBackups ?? 3,
    dryRun: options.dryRun === true,
    clean: options.clean !== false,
    dataDir: options.dataDir,
  };

  // spawn 的 file 与 args 只接受字符串，传 URL 对象会在 Node 里抛
  // ERR_INVALID_ARG_TYPE（args 位）或直接失败，必须先转成路径。
  const file = fileURLToPath(helperPath());
  if (!fs.existsSync(file)) {
    return { ok: false, error: "helper script missing" };
  }

  const env = {
    ...process.env,
    // helper 必须以 node 方式运行，但它拉起的新应用必须清掉这个变量。
    ELECTRON_RUN_AS_NODE: "1",
    DSH_DESKTOP_TOOLS_DATA: options.dataDir,
    [PAYLOAD_ENV]: JSON.stringify(payload),
  };

  // 用 Electron 自身的二进制跑 helper：官方安装不带独立 node.exe，
  // 而 process.execPath 在 Host 里正是 "DeepSeek Harness.exe"。
  const execPath = options.nodeExecPath || process.execPath;

  let child;
  try {
    child = spawn(execPath, [file], {
      detached: true,
      stdio: "ignore",
      windowsHide: true,
      env,
    });
  } catch (e) {
    return { ok: false, error: String((e && e.message) || e) };
  }

  // 必须挂 error，否则 unhandled 'error' 会把宿主带崩。
  child.on("error", () => {
    /* helper 启动失败时由 last-run.json 缺失体现，这里只需吞掉事件 */
  });
  child.unref();

  return { ok: true, pid: child.pid, helper: path.basename(file) };
}

/** 读上一次 helper 执行结果，供页面展示。 */
export function readLastRun(dataDir) {
  try {
    const file = path.join(dataDir, "last-run.json");
    if (!fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}
