// 窗口代理：在窗口 show() 之前就把它摆到保存的尺寸。
//
// 为什么必须有这一步：Electron 主窗口在 main.js:13128 创建（show=false），
// 到 enterWorkspace() 里 await navigateMain(url) 完成的瞬间才 window.show()。
// 渲染层的 client.js 要等页面加载完、bundle 取回才执行，实测是导航开始后 10.4s，
// 那时窗口早就显示过了。所以在渲染层怎么调都来不及，必然「先小后大」。
//
// 而插件跑在 Host 子进程里，apply() 一定早于 navigateMain()（页面就是 Host 提供的），
// 所以从这里拉起代理，有 10 秒量级的余量。
//
// 零 asar 补丁：代理是插件目录里的独立 exe，通过 Win32 SetWindowPos 改的是
// 已经存在的窗口，不碰 Electron 的任何代码。

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const AGENT_ARGS = ["--pid", "--width", "--height", "--x", "--y", "--timeout", "--log"];

/** 代理 exe 与本模块同目录。 */
export function agentPath() {
	return fileURLToPath(new URL("./winagent.exe", import.meta.url));
}

export function agentAvailable() {
	return process.platform === "win32" && existsSync(agentPath());
}

/**
 * 拉起窗口代理。它是 detached 的：拉起后立刻脱手，
 * 不占 Host 的生命周期，也没人需要等它。
 *
 * @param {{pid:number, window:{width:number,height:number,x?:number|null,y?:number|null},
 *          logFile:string, timeoutMs?:number}} options
 * @returns {{ok:boolean, pid?:number, error?:string}}
 */
export function launchWindowAgent(options) {
	const { pid, window: target } = options;
	if (process.platform !== "win32") return { ok: false, error: "not windows" };
	if (!Number.isInteger(pid) || pid <= 0) return { ok: false, error: "invalid pid" };
	if (!target || !(target.width > 0) || !(target.height > 0)) {
		return { ok: false, error: "no window preference" };
	}
	const file = agentPath();
	if (!existsSync(file)) return { ok: false, error: "winagent.exe missing" };

	const args = [
		"--pid", String(pid),
		"--width", String(Math.round(target.width)),
		"--height", String(Math.round(target.height)),
		"--timeout", String(options.timeoutMs ?? 30000),
		"--log", options.logFile,
	];
	// x/y 允许缺省：缺省时保持窗口自己算出来的位置。
	if (Number.isFinite(target.x)) args.push("--x", String(Math.round(target.x)));
	if (Number.isFinite(target.y)) args.push("--y", String(Math.round(target.y)));

	try {
		const child = spawn(file, args, {
			detached: true,
			stdio: "ignore",
			windowsHide: true,
		});
		// 异步 spawn 失败只 emit error，不监听就是未捕获异常，会把宿主一起带走。
		child.on("error", () => {});
		child.unref();
		return { ok: true, pid: child.pid ?? null };
	} catch (error) {
		return { ok: false, error: error instanceof Error ? error.message : String(error) };
	}
}

export { AGENT_ARGS };
