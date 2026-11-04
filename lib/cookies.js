/**
 * dsh-auth-* cookie 的统计与清理。
 *
 * 关键约束：应用运行期间 `Network\Cookies` 被 Chromium 独占锁定，
 * 任何打开尝试都会 EBUSY / EPERM / SQLITE_ERROR 14。因此本模块
 * 只在 Electron 完全退出后由 detached helper 调用。
 */
import fs from "node:fs";
import path from "node:path";

/** 只清理这个前缀的条目，绝不碰其它 cookie。 */
export const COOKIE_PREFIX = "dsh-auth-";

const AUTHORITY_HOST = "127.0.0.1";

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

/**
 * 打开库并返回统计结果。只读，用于 dryRun 与清理前快照。
 * 失败时返回 { ok:false, error }，调用方据此判断"库被锁"而非"没有 cookie"。
 */
export function inspectStore(file, sqlite) {
  if (!fs.existsSync(file)) return { ok: false, file, error: "cookie store not found" };

  let db;
  try {
    db = new sqlite.DatabaseSync(file, { readOnly: true });
  } catch (e) {
    return { ok: false, file, error: String((e && e.message) || e) };
  }

  try {
    // 表结构探测：不匹配就立刻放弃，绝不写坏库。
    const table = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='cookies'").get();
    if (!table) return { ok: false, file, error: "cookies table missing" };

    const cols = db.prepare("PRAGMA table_info(cookies)").all().map((c) => c.name);
    for (const required of ["host_key", "name", "value"]) {
      if (!cols.includes(required)) {
        return { ok: false, file, error: `cookies table lacks column ${required}` };
      }
    }

    const total = db.prepare("SELECT COUNT(*) AS n FROM cookies").get().n;
    const ours = db.prepare("SELECT COUNT(*) AS n FROM cookies WHERE name LIKE ?").get(`${COOKIE_PREFIX}%`).n;

    // 这些条目本应全部指向 127.0.0.1:<随机端口>，列出端口便于诊断累积。
    const rows = db
      .prepare("SELECT host_key, name, length(value) AS vlen FROM cookies WHERE name LIKE ? ORDER BY host_key")
      .all(`${COOKIE_PREFIX}%`);

    const authorities = new Map();
    let bytes = 0;
    for (const row of rows) {
      bytes += String(row.name).length + Number(row.vlen || 0);
      const key = String(row.host_key || "");
      authorities.set(key, (authorities.get(key) || 0) + 1);
    }

    return {
      ok: true,
      file,
      total,
      ours,
      others: total - ours,
      bytes,
      authorities: [...authorities.entries()].map(([host, count]) => ({ host, count })),
    };
  } catch (e) {
    return { ok: false, file, error: String((e && e.message) || e) };
  } finally {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
}

/**
 * 备份库文件。SQLite 可能带 -wal，一并复制保持一致性。
 * 返回备份路径；失败抛错由调用方记录。
 */
export function backupStore(file, keep) {
  const dir = path.join(path.dirname(file), "dsh-tools-backup");
  fs.mkdirSync(dir, { recursive: true });

  const target = path.join(dir, `${path.basename(file)}.${stamp()}.bak`);
  fs.copyFileSync(file, target);

  // 滚动删除，只保留最近 keep 份。
  const limit = Number.isFinite(keep) && keep > 0 ? keep : 3;
  const prefix = `${path.basename(file)}.`;
  let backups = [];
  try {
    backups = fs
      .readdirSync(dir)
      .filter((n) => n.startsWith(prefix) && n.endsWith(".bak"))
      .sort();
  } catch {
    backups = [];
  }
  while (backups.length > limit) {
    const victim = backups.shift();
    try {
      fs.unlinkSync(path.join(dir, victim));
    } catch {
      /* ignore */
    }
  }

  return target;
}

/**
 * 删除所有 dsh-auth-* 条目。
 * options: { dryRun, keepBackups }
 */
export function purgeStore(file, sqlite, options = {}) {
  const dryRun = options.dryRun === true;

  const before = inspectStore(file, sqlite);
  if (!before.ok) return { ok: false, file, error: before.error, stage: "inspect" };

  if (before.ours === 0) {
    return { ok: true, file, before: before.ours, after: 0, removed: 0, skipped: "nothing to clean" };
  }

  if (dryRun) {
    return { ok: true, file, before: before.ours, after: before.ours, removed: 0, dryRun: true };
  }

  let backup = null;
  try {
    backup = backupStore(file, options.keepBackups);
  } catch (e) {
    // 备份失败就不删——宁可留着脏数据也不能没有回退路径。
    return { ok: false, file, error: `backup failed: ${String((e && e.message) || e)}`, stage: "backup" };
  }

  let db;
  try {
    db = new sqlite.DatabaseSync(file);
  } catch (e) {
    return { ok: false, file, error: String((e && e.message) || e), stage: "open" };
  }

  try {
    const result = db.prepare("DELETE FROM cookies WHERE name LIKE ?").run(`${COOKIE_PREFIX}%`);
    const removed = Number(result.changes || 0);
    db.exec("VACUUM");

    const after = inspectStore(file, sqlite);
    return {
      ok: true,
      file,
      before: before.ours,
      after: after.ok ? after.ours : null,
      removed,
      backup,
    };
  } catch (e) {
    return { ok: false, file, error: String((e && e.message) || e), stage: "purge", backup };
  } finally {
    try {
      db.close();
    } catch {
      /* ignore */
    }
  }
}

/** 判断目标 host 是否属于本机回环（防止误删同名但不同站的条目）。 */
export function isLoopbackHost(hostKey) {
  const host = String(hostKey || "").toLowerCase();
  return host === AUTHORITY_HOST || host === "localhost" || host === `[::1]`;
}
