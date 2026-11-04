/**
 * 路径探测：定位桌面端 exe、Electron userData 目录、cookie SQLite。
 *
 * 所有路径都在运行期现算，不写死本机绝对路径。
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/** Electron 桌面端的应用目录名（来自 asar 内 package.json 的 name 字段）。 */
export const DESKTOP_APP_DIR = path.join("@deepseek-ai", "dsh-desktop");

/** 官方安装包的可执行文件名（小写比较）。 */
const EXE_NAME = "deepseek harness.exe";

function isFile(p) {
  try {
    return fs.statSync(p).isFile();
  } catch {
    return false;
  }
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Host 进程的 process.execPath 在 Electron 桌面端就是 exe 本身
 * （子进程由 Electron 以 ELECTRON_RUN_AS_NODE=1 拉起，execPath 不变）。
 * 拿不到时退回资源目录的父目录。
 */
export function desktopExecutable(env = process.env) {
  const fromEnv = env.DSH_DESKTOP_APP_EXE;
  if (typeof fromEnv === "string" && isFile(fromEnv)) return path.normalize(fromEnv);

  const execPath = process.execPath;
  if (typeof execPath === "string" && isFile(execPath) && path.basename(execPath).toLowerCase() === EXE_NAME) {
    return path.normalize(execPath);
  }

  // resources 目录的上一层就是安装根目录。
  try {
    const resources = process.resourcesPath;
    if (typeof resources === "string") {
      const candidate = path.join(path.dirname(path.normalize(resources)), "DeepSeek Harness.exe");
      if (isFile(candidate)) return candidate;
    }
  } catch {
    /* ignore */
  }

  return typeof execPath === "string" ? path.normalize(execPath) : null;
}

/** Electron userData：%APPDATA%\@deepseek-ai\dsh-desktop。 */
export function electronUserData(env = process.env) {
  const appdata = env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(appdata, DESKTOP_APP_DIR);
}

/**
 * 所有可能存放 dsh-auth-* 的 cookie 库。
 * 主库一定在 Network\Cookies；Partitions 下的独立 session 库只在实际存在时才收进来。
 */
export function cookieStores(env = process.env) {
  const userData = electronUserData(env);
  const stores = [];

  const main = path.join(userData, "Network", "Cookies");
  stores.push({ label: "default", file: main });

  const partitionsRoot = path.join(userData, "Partitions");
  if (isDir(partitionsRoot)) {
    let entries = [];
    try {
      entries = fs.readdirSync(partitionsRoot, { withFileTypes: true });
    } catch {
      entries = [];
    }
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const file = path.join(partitionsRoot, entry.name, "Network", "Cookies");
      if (isFile(file)) stores.push({ label: `partition:${entry.name.slice(0, 12)}`, file });
    }
  }

  return stores;
}

/** 插件自己的数据目录（日志、备份索引）。 */
export function pluginDataDir(dshHome) {
  const home = dshHome || process.env.DSH_HOME || path.join(os.homedir(), ".dsh");
  return path.join(home, "dsh-restart");
}

export function ensureDir(dir) {
  try {
    fs.mkdirSync(dir, { recursive: true });
    return true;
  } catch {
    return false;
  }
}

/** 按 PID 判断进程是否还活着（Windows：tasklist 查询）。 */
export function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e) {
    // EPERM 表示进程存在但没权限；ESRCH 表示不存在。
    return e && e.code === "EPERM";
  }
}
