/**
 * 布局偏好持久化：窗口尺寸 / 位置 + 右侧栏宽度。
 *
 * 存到 <DSH_HOME>/dsh-restart/layout.json：
 *   { "window": { "width": 1600, "height": 1000, "x": 80, "y": 40 }, "rightbar": { "width": 520 } }
 *
 * 字段都可为 null：null（或缺失）= 不覆盖，沿用应用自己的默认值。
 * 这里只做范围校验，真正的边界由两边各自再夹一次：
 * - 窗口：Electron 的 minWidth 520 / minHeight 600（main.js 的 createWindow）。
 * - 右侧栏：layout store 的 setRightbar 会 clampWidth(px, 300, 视口 × 0.7)，
 *   所以这里存的值只是"请求值"，实际生效值以页面回读为准。
 */
import fs from "node:fs";
import path from "node:path";

const FILE_NAME = "layout.json";

const WINDOW_LIMITS = {
  width: [520, 20000],
  height: [600, 20000],
  x: [-32768, 32767],
  y: [-32768, 32767],
};

const RIGHTBAR_LIMITS = [300, 4000];

function layoutFile(dataDir) {
  return path.join(dataDir, FILE_NAME);
}

/** 取整并夹到范围内；非数字返回 null（表示"不设这一项"）。 */
function clampInt(value, [min, max]) {
  const number = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.min(max, Math.max(min, Math.round(number)));
}

function normalizeWindow(input) {
  if (!input || typeof input !== "object") return null;
  const width = clampInt(input.width, WINDOW_LIMITS.width);
  const height = clampInt(input.height, WINDOW_LIMITS.height);
  // 尺寸不全就没有意义，宁可整项丢弃也不要"半套"窗口配置。
  if (width === null || height === null) return null;
  return {
    width,
    height,
    x: clampInt(input.x, WINDOW_LIMITS.x),
    y: clampInt(input.y, WINDOW_LIMITS.y),
  };
}

function normalizeRightbar(input) {
  if (!input || typeof input !== "object") return null;
  const width = clampInt(input.width, RIGHTBAR_LIMITS);
  return width === null ? null : { width };
}

export function emptyLayout() {
  return { window: null, rightbar: null };
}

export function normalizeLayout(input) {
  const source = input && typeof input === "object" ? input : {};
  return {
    window: normalizeWindow(source.window),
    rightbar: normalizeRightbar(source.rightbar),
  };
}

/** 读不到或坏掉都退回空布局——布局偏好丢了不该影响任何功能。 */
export function readLayout(dataDir) {
  try {
    const raw = fs.readFileSync(layoutFile(dataDir), "utf8");
    return normalizeLayout(JSON.parse(raw));
  } catch {
    return emptyLayout();
  }
}

/**
 * 合并写入：patch 里出现的键才覆盖。
 * - 显式 null → 清除该项；
 * - 给了值但校验不过（比如手输被截成非数字）→ **保留原值**，坏输入不该毁掉已有配置。
 * 先写临时文件再 rename，避免写一半被读到。
 */
export function writeLayout(dataDir, patch) {
  const current = readLayout(dataDir);
  const source = patch && typeof patch === "object" ? patch : {};
  const pick = (key, normalize) => {
    if (!Object.prototype.hasOwnProperty.call(source, key)) return current[key];
    if (source[key] === null || source[key] === undefined) return null;
    const next = normalize(source[key]);
    return next === null ? current[key] : next;
  };
  const next = {
    window: pick("window", normalizeWindow),
    rightbar: pick("rightbar", normalizeRightbar),
  };

  const target = layoutFile(dataDir);
  const temporary = `${target}.tmp`;
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (next.window === null && next.rightbar === null) {
    // 两项都空就把文件删掉，回到"从没配过"的状态。
    try {
      fs.unlinkSync(target);
    } catch {
      /* 本来就没有 */
    }
    return next;
  }
  fs.writeFileSync(temporary, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  fs.renameSync(temporary, target);
  return next;
}
