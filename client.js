window.__ModuleLoader__.load({
	id: "dsh-restart",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });

		const react = require("react");
		const h = react.createElement;
		const { useState, useEffect, useCallback } = react;

		const name = "dsh-restart";
		const inject = ["slots", "locale"];
		const NS = "dsh-restart";

		const zh = {
			section: "桌面维护",
			title: "桌面端维护",
			lead: "重启 DSH、调整窗口与右侧栏尺寸、清理累积的 dsh-auth-* cookie。",
			why: "dsh-auth-* 的 cookie 名里带着 Host 的随机端口，cookie 作用域又只认 host 不认端口，所以每次启动都会新增一条、永不覆盖。累积过多会让请求头超过 Node 的上限（16384 字节），服务端回 431，桌面端只显示“认证失败”。",
			restart: "重启 DSH",
			restarting: "正在重启…",
			restartHint: "窗口会关闭，约 3 秒后自动重开。插件安装、停用后的生效全靠这一步。",
			restartConfirm: "现在重启 DSH？窗口会关闭并在约 3 秒后重新打开。",
			cleanOnRestart: "重启时顺便清理 dsh-auth-* cookie",
			cleanOnRestartHint: "重启后旧 cookie 必然失效，清掉可以保证永远只有一条。",
			status: "当前状态",
			electronPid: "桌面进程 PID",
			stores: "cookie 库",
			notFound: "未找到",
			lastRun: "上次执行结果",
			noLastRun: "还没有执行记录。",
			removed: "已清理",
			entries: "条",
			loadFailed: "读取状态失败：{e}",
			restartFailed: "重启没有启动：{e}",
			restartAccepted: "已安排重启，页面即将断开。",
			desktopOnly: "这个分区只在桌面端有效。当前不是桌面端，按钮会不可用。",
			restartTitle: "重启 DSH（顺带清理 dsh-auth-* cookie）",
			windowTitle: "窗口尺寸",
			windowHint: "通常先点「读取当前」把当前大小填进来，再点「保存为默认」。保存会记住这个尺寸和位置，每次启动直接套用；如果当前窗口不是这个大小，保存时会一并调整过去。",
			windowWidth: "宽",
			windowHeight: "高",
			windowX: "X",
			windowY: "Y",
			windowCurrent: "当前：{w} × {h}　位置 {x}, {y}",
			windowNotDesktop: "只有在桌面端才能改窗口尺寸。",
			windowResizeBlocked: "这个窗口暂时不接受脚本改尺寸（可能处于最大化或全屏）。恢复窗口状态后再点「应用」。",
			rightbarTitle: "右侧栏宽度",
			rightbarHint: "「保存为默认」会立即套用并记住这个宽度。右侧栏实际宽度受窗口宽度限制，超出上限时会被截到允许的最大值。",
			rightbarWidth: "宽度",
			rightbarRange: "允许范围 {min} – {max} px",
			rightbarTooNarrow: "窗口太窄，右侧栏最多只能开到 {max} px。",
			rightbarCurrent: "当前：{w} px",
			rightbarUnset: "当前：跟随默认（约窗口宽度的 45%）",
			rightbarUnavailable: "拿不到布局状态，右侧栏宽度暂时改不了。",
			readCurrent: "读取当前",
			saveDefault: "保存为默认",
			resetDefault: "恢复默认",
			saved: "已保存。",
			savedApplied: "已保存，并已调整到该尺寸。",
			saveFailed: "保存失败：{e}",
			applyFailed: "应用失败：{e}",
			notANumber: "请填一个整数。",
			rowRestart: "重启",
			rowWindow: "窗口尺寸",
			rowRightbar: "右侧栏",
			rowBoot: "启动恢复",
			rowClean: "Cookie 清理",
			rowLastRun: "上次执行",
			rowStatus: "运行环境",
			bootHidden: "上次启动的尺寸调整在窗口显示前完成，没有可见抖动。",
			bootVisible: "上次启动的尺寸调整在窗口已经显示之后才完成，所以会有一下可见的跳变。",
			agentHidden: "上次启动尺寸由窗口代理在窗口显示前完成，没有可见抖动。",
			agentVisible: "上次启动代理赶到时窗口已经显示，所以会有一下跳变。",
			agentFailed: "上次启动代理未生效：{reason}",
			agentGot: "实际 {w} × {h}，等待 {ms}ms",
			bootNone: "还没有启动记录。重启一次后这里会显示结果。",
			bootAt: "记录于 {at}",
			bootStart: "起始尺寸 {w} × {h}",
			external: "外部",
			openFolder: "打开数据目录",
			openFolderFailed: "打不开目录：{e}",
		};

		const en = {
			section: "Desktop tools",
			title: "Desktop maintenance",
			lead: "Restart DSH, size the window and right sidebar, clear accumulated dsh-auth-* cookies.",
			why: "The dsh-auth-* cookie name includes the Host's random port, while cookies are scoped by host alone, so every launch adds a new entry and never overwrites. Enough of them push the request headers past Node's 16384-byte limit, the server answers 431, and the desktop shell only shows \"authentication failed\".",
			restart: "Restart DSH",
			restarting: "Restarting…",
			restartHint: "The window closes and reopens on its own in about 3 seconds. This is how plugin installs and disables take effect.",
			restartConfirm: "Restart DSH now? The window closes and reopens in about 3 seconds.",
			cleanOnRestart: "Also clear dsh-auth-* cookies on restart",
			cleanOnRestartHint: "Old cookies are dead after a restart anyway; clearing keeps exactly one alive.",
			status: "Current state",
			electronPid: "Desktop process PID",
			stores: "Cookie stores",
			notFound: "not found",
			lastRun: "Last run",
			noLastRun: "No run recorded yet.",
			removed: "Removed",
			entries: "entries",
			loadFailed: "Failed to read state: {e}",
			restartFailed: "Restart did not start: {e}",
			restartAccepted: "Restart scheduled; the page is about to disconnect.",
			desktopOnly: "This section only works in the desktop app. The button is disabled elsewhere.",
			restartTitle: "Restart DSH (also clears dsh-auth-* cookies)",
			windowTitle: "Window size",
			windowHint: "Usually press Read current to fill in the present size, then Save as default. Saving remembers that size and position for every launch, and resizes the window now if it differs.",
			windowWidth: "Width",
			windowHeight: "Height",
			windowX: "X",
			windowY: "Y",
			windowCurrent: "Now: {w} × {h}   at {x}, {y}",
			windowNotDesktop: "Window size can only be changed in the desktop app.",
			windowResizeBlocked: "This window will not accept scripted resizing right now (maximized or fullscreen). Restore it first, then press Apply.",
			rightbarTitle: "Right sidebar width",
			rightbarHint: "Save as default applies the width right away and remembers it. The right sidebar is capped by the window width; anything larger is cut back to the allowed maximum.",
			rightbarWidth: "Width",
			rightbarRange: "Allowed {min} – {max} px",
			rightbarTooNarrow: "The window is too narrow for more than {max} px on the right sidebar.",
			rightbarCurrent: "Now: {w} px",
			rightbarUnset: "Now: following the default (about 45% of the window width)",
			rightbarUnavailable: "Layout state is unavailable, so the right sidebar width cannot be changed.",
			readCurrent: "Read current",
			saveDefault: "Save as default",
			resetDefault: "Reset",
			saved: "Saved.",
			savedApplied: "Saved and resized to that size.",
			saveFailed: "Save failed: {e}",
			applyFailed: "Apply failed: {e}",
			notANumber: "Please enter a whole number.",
			rowRestart: "Restart",
			rowWindow: "Window",
			rowRightbar: "Right sidebar",
			rowBoot: "Startup restore",
			rowClean: "Cookie cleanup",
			rowLastRun: "Last run",
			rowStatus: "Environment",
			bootHidden: "Last launch resized the window before it was shown — nothing moved visibly.",
			bootVisible: "Last launch finished resizing after the window was already visible, so there was one visible jump.",
			agentHidden: "The last launch was sized by the window agent before it became visible - no visible jump.",
			agentVisible: "The last launch's agent arrived after the window was already visible, so there was one jump.",
			agentFailed: "The last launch's window agent did not take effect: {reason}",
			agentGot: "got {w} x {h} after {ms}ms",
			bootNone: "No launch recorded yet. Restart once and the result appears here.",
			bootAt: "recorded {at}",
			bootStart: "started at {w} × {h}",
			external: "lookup",
			openFolder: "Open data folder",
			openFolderFailed: "Cannot open the folder: {e}",
		};

		let translate = (key) => key;

		function fill(template, values) {
			return String(template).replace(/\{(\w+)\}/g, (m, key) => (values && values[key] !== undefined ? String(values[key]) : m));
		}

		async function getJson(path) {
			const response = await fetch(path, { cache: "no-store", credentials: "same-origin" });
			if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
			return response.json();
		}

		async function postJson(path, body) {
			const response = await fetch(path, {
				method: "POST",
				headers: { "content-type": "application/json" },
				credentials: "same-origin",
				body: JSON.stringify(body || {}),
			});
			const text = await response.text();
			let data = {};
			try {
				data = text ? JSON.parse(text) : {};
			} catch {
				data = { raw: text };
			}
			return { ok: response.ok, status: response.status, data };
		}

		// ---- 样式：全部走主题 token，跟随明暗切换 ----
		// 行式设置页：单卡 + 细线分隔。左列固定宽度放标签，右列放控件与说明。
		// 比六张独立卡片省一半垂直空间，读法也更接近系统设置页（先扫标签再找控件）。
		const sectionStyle = {
			display: "flex",
			flexDirection: "column",
			gap: "16px",
			padding: "4px 2px 24px",
			maxWidth: "820px",
		};
		const cardStyle = {
			display: "flex",
			flexDirection: "column",
			borderRadius: "12px",
			background: "var(--dsw-alias-bg-layer-1)",
			border: "1px solid var(--dsw-alias-border-l1)",
			padding: "0 18px",
		};
		const headingStyle = {
			fontSize: "16px",
			fontWeight: 600,
			color: "var(--dsw-alias-label-primary)",
			margin: 0,
		};
		const textStyle = {
			fontSize: "13px",
			lineHeight: 1.6,
			color: "var(--dsw-alias-label-secondary)",
			margin: 0,
		};
		const hintStyle = {
			fontSize: "12px",
			lineHeight: 1.6,
			color: "var(--dsw-alias-label-secondary)",
			margin: 0,
		};
		const rowWrapStyle = {
			display: "flex",
			gap: "16px",
			padding: "14px 0",
			alignItems: "flex-start",
		};
		const rowLabelStyle = {
			flex: "0 0 88px",
			width: "88px",
			fontSize: "13px",
			fontWeight: 500,
			color: "var(--dsw-alias-label-primary)",
			paddingTop: "1px",
		};
		const rowBodyStyle = {
			flex: "1 1 auto",
			display: "flex",
			flexDirection: "column",
			gap: "8px",
			minWidth: 0,
		};
		const rowStyle = {
			display: "flex",
			flexWrap: "wrap",
			alignItems: "center",
			gap: "8px",
		};

		// 2×2 网格：每格是「标签 + 输入」的整体，标签不会和输入被换行拆开。
		// 两列宽度取各自最大内容宽度，所以 X / Y 的输入框与上面宽 / 高严格对齐。
		const fieldGridStyle = {
			display: "grid",
			gridTemplateColumns: "repeat(2, max-content)",
			columnGap: "18px",
			rowGap: "10px",
			alignItems: "center",
		};
		const fieldStyle = {
			display: "flex",
			alignItems: "center",
			gap: "8px",
		};
		// 不写死宽度：中文「宽」和英文 "Width" 长度差很多，固定宽度会让英文标签换行、
		// 把输入框挤偏。交给 grid 的 max-content 算，同一列内所有输入框的 x 一定相同。
		const fieldLabelStyle = {
			minWidth: "16px",
			fontSize: "12px",
			color: "var(--dsw-alias-label-secondary)",
			textAlign: "right",
			whiteSpace: "nowrap",
		};
		const monoStyle = {
			fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
			fontSize: "12px",
			color: "var(--dsw-alias-label-secondary)",
			wordBreak: "break-all",
			margin: 0,
		};

		// 行分隔：用 border-top 而不是 <hr>，避免在 flex 容器里多出一层盒子。
		function rowDivider(index) {
			return index === 0 ? null : { borderTop: "1px solid var(--dsw-alias-border-l1)" };
		}

		function SettingRow(props) {
			return h(
				"div",
				{ style: { ...rowWrapStyle, ...(props.first ? null : { borderTop: "1px solid var(--dsw-alias-border-l1)" }) } },
				h("div", { style: rowLabelStyle }, props.label),
				h(
					"div",
					{ style: rowBodyStyle },
					props.hint ? h("p", { style: hintStyle }, props.hint) : null,
					props.children,
				),
			);
		}

		function restartButtonStyle(busy, disabled) {
			return {
				display: "inline-flex",
				alignItems: "center",
				gap: "8px",
				padding: "8px 18px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: busy || disabled ? "var(--dsw-alias-bg-layer-2)" : "var(--dsw-alias-brand-primary)",
				// brand-primary 浅色近黑(#0f1115)、深色近白(#f9fafb)，能与之形成对比的
				// 前景是 label-primary-foreground（浅 #fff / 深 #0f1115）。
				// 注意 brand-primary-invert 与 brand-primary 同值，不能当前景用。
				color: busy || disabled ? "var(--dsw-alias-state-idle-primary)" : "var(--dsw-alias-label-primary-foreground)",
				fontSize: "14px",
				fontWeight: 500,
				cursor: busy || disabled ? "default" : "pointer",
				transition: "opacity .15s ease",
			};
		}

		function secondaryButtonStyle(disabled) {
			return {
				padding: "7px 14px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "transparent",
				color: disabled ? "var(--dsw-alias-state-idle-primary)" : "var(--dsw-alias-label-primary)",
				fontSize: "13px",
				fontWeight: 500,
				cursor: disabled ? "default" : "pointer",
			};
		}

		function numberInputStyle() {
			return {
				width: "96px",
				padding: "6px 10px",
				borderRadius: "8px",
				border: "1px solid var(--dsw-alias-border-l2)",
				background: "var(--dsw-alias-bg-layer-2)",
				color: "var(--dsw-alias-label-primary)",
				fontSize: "13px",
				fontVariantNumeric: "tabular-nums",
			};
		}

		// ---- 布局：窗口尺寸 ----
		// Electron 主窗口接受渲染层的 resizeTo / moveTo（和普通浏览器窗口一样），
		// 所以改窗口不需要碰 app.asar。最大化时不改变尺寸是无效操作，调用前先判断。
		function readWindowBounds() {
			return {
				width: Math.round(window.outerWidth),
				height: Math.round(window.outerHeight),
				x: Math.round(window.screenX),
				y: Math.round(window.screenY),
				maximized: window.outerWidth >= window.screen.availWidth - 8,
			};
		}

		function applyWindowBounds(bounds) {
			if (!bounds) return false;
			try {
				if (Number.isFinite(bounds.width) && Number.isFinite(bounds.height)) {
					window.resizeTo(bounds.width, bounds.height);
				}
				if (Number.isFinite(bounds.x) && Number.isFinite(bounds.y)) {
					window.moveTo(bounds.x, bounds.y);
				}
				return true;
			} catch {
				return false;
			}
		}

		// Windows 上 Electron 的 setBounds 没有 animate 参数（那是 macOS 独有的），
		// 所以"顺滑"只能自己分帧：每帧把剩余距离走掉一截，观感上就是滑动而不是瞬移。
		// 帧数不多不少——太少还是有跳跃感，太多会让用户觉得"点了没反应"。
		const RESIZE_FRAMES = 10;

		function applyWindowBoundsAnimated(bounds, onDone) {
			if (!bounds) return false;
			const target = {
				width: Number.isFinite(bounds.width) ? bounds.width : Math.round(window.outerWidth),
				height: Number.isFinite(bounds.height) ? bounds.height : Math.round(window.outerHeight),
				x: Number.isFinite(bounds.x) ? bounds.x : null,
				y: Number.isFinite(bounds.y) ? bounds.y : null,
			};
			const from = {
				width: Math.round(window.outerWidth),
				height: Math.round(window.outerHeight),
				x: Math.round(window.screenX),
				y: Math.round(window.screenY),
			};
			const sameX = target.x === null || from.x === target.x;
			const sameY = target.y === null || from.y === target.y;
			if (from.width === target.width && from.height === target.height && sameX && sameY) {
				if (onDone) onDone(true);
				return true;
			}

			const raf =
				typeof window.requestAnimationFrame === "function"
					? window.requestAnimationFrame.bind(window)
					: (fn) => setTimeout(fn, 16);

			let frame = 0;
			const step = () => {
				frame += 1;
				const k = Math.min(1, frame / RESIZE_FRAMES);
				const eased = 1 - Math.pow(1 - k, 3); // easeOutCubic：先快后慢，收尾更稳
				try {
					window.resizeTo(
						Math.round(from.width + (target.width - from.width) * eased),
						Math.round(from.height + (target.height - from.height) * eased),
					);
					if (target.x !== null && target.y !== null) {
						window.moveTo(
							Math.round(from.x + (target.x - from.x) * eased),
							Math.round(from.y + (target.y - from.y) * eased),
						);
					}
				} catch {
					/* 单帧失败不影响后续帧 */
				}
				if (frame < RESIZE_FRAMES) raf(step);
				else if (onDone) onDone(true);
			};
			raf(step);
			return true;
		}

		// ---- 布局：右侧栏 ----
		// layout 把宽度写进内联 gridTemplateColumns，CSS 盖不掉；ctx.layout 服务也没有
		// setRightbar。唯一入口是 root slot entry 上的 store：layout 注册时把 create()
		// 固定成了同一个实例，所以这里拿到的就是 AppFrame 正在用的那个。
		let slotsRef = null;

		function layoutStore() {
			if (!slotsRef || typeof slotsRef.entries !== "function") return null;
			let entries = [];
			try {
				entries = slotsRef.entries("root") || [];
			} catch {
				return null;
			}
			for (const entry of entries) {
				const handle = entry && entry.store;
				if (!handle || typeof handle.create !== "function") continue;
				try {
					const instance = handle.create();
					if (instance && instance.actions && typeof instance.actions.setRightbar === "function") return instance;
				} catch {
					/* 换下一个 */
				}
			}
			return null;
		}

		function readRightbar() {
			const instance = layoutStore();
			if (!instance) return null;
			try {
				const info = instance.getSnapshot().layoutInfo || {};
				return { width: info.rightbar, viewport: info.viewportWidth || window.innerWidth };
			} catch {
				return null;
			}
		}

		function setRightbarWidth(width) {
			const instance = layoutStore();
			if (!instance) return false;
			try {
				instance.actions.setRightbar(width);
				return true;
			} catch {
				return false;
			}
		}

		// 与 layout 的 computeColumns 对齐：可用宽 = 视口 − 左侧栏 280 − 中间最小值 400，
		// 且不超过视口的 70%。两者取小，再兜底 300。
		const SIDEBAR_WIDTH = 280;
		const CENTER_MIN_WIDTH = 400;
		const RIGHTBAR_MAX_RATIO = 0.7;

		function rightbarLimits() {
			const viewport = Math.round(window.innerWidth);
			const byViewport = Math.floor(viewport * RIGHTBAR_MAX_RATIO);
			const byColumns = viewport - SIDEBAR_WIDTH - CENTER_MIN_WIDTH;
			return { min: 300, max: Math.max(300, Math.min(byViewport, byColumns)), viewport };
		}

		function clampNumber(value, min, max) {
			// 空串必须当作「没填」而不是 0：Number("") === 0 是有限数，
			// 会被夹到下限，于是留空点保存就变成把窗口缩到 520×600。
			if (typeof value === "string" && value.trim() === "") return null;
			if (value === null || value === undefined) return null;
			const number = Number(value);
			if (!Number.isFinite(number)) return null;
			return Math.min(max, Math.max(min, Math.round(number)));
		}

		// ---- 设置分区 ----
		function DesktopToolsSection() {
			const t = translate;
			const [state, setState] = useState(null);
			const [error, setError] = useState("");
			const [busy, setBusy] = useState(false);
			const [notice, setNotice] = useState("");

			// 窗口尺寸表单（字符串保存，避免受控数字框在清空时跳回 0）
			const [winWidth, setWinWidth] = useState("");
			const [winHeight, setWinHeight] = useState("");
			const [winX, setWinX] = useState("");
			const [winY, setWinY] = useState("");
			const [winNotice, setWinNotice] = useState("");
			const [winBusy, setWinBusy] = useState(false);
			const [bounds, setBounds] = useState(null);

			// 右侧栏表单
			const [barWidth, setBarWidth] = useState("");
			const [barNotice, setBarNotice] = useState("");
			const [barBusy, setBarBusy] = useState(false);
			const [barLive, setBarLive] = useState(null);
			const [limits, setLimits] = useState(() => rightbarLimits());

			const load = useCallback(async () => {
				try {
					const data = await getJson("/dsh-restart/status");
					setState(data);
					setError("");
				} catch (e) {
					setError(String((e && e.message) || e));
				}
			}, []);

			useEffect(() => {
				load();
			}, [load]);

			const onRestart = useCallback(async () => {
				if (busy) return;
				const confirmed = typeof window !== "undefined" && typeof window.confirm === "function" ? window.confirm(t("restartConfirm")) : true;
				if (!confirmed) return;

				setBusy(true);
				setNotice("");
				try {
					const result = await postJson("/dsh-restart/restart", {});
					if (!result.ok) {
						setNotice(fill(t("restartFailed"), { e: (result.data && (result.data.error || result.data.raw)) || result.status }));
						setBusy(false);
						return;
					}
					setNotice(t("restartAccepted"));
				} catch (e) {
					// 进程被杀时这条请求本身可能中断，那说明重启已经在进行中。
					setNotice(t("restartAccepted"));
				}
			}, [busy, t]);

			const desktop = state ? state.desktop === true : false;
			const lastRun = state && state.lastRun;

			// 把已保存的布局回填进表单；只有一次，之后由用户自己改。
			useEffect(() => {
				if (!state) return;
				const savedWindow = state.layout ? state.layout.window : null;
				if (savedWindow) {
					setWinWidth(String(savedWindow.width));
					setWinHeight(String(savedWindow.height));
					setWinX(savedWindow.x === null ? "" : String(savedWindow.x));
					setWinY(savedWindow.y === null ? "" : String(savedWindow.y));
				}
				const savedBar = state.layout ? state.layout.rightbar : null;
				if (savedBar) setBarWidth(String(savedBar.width));
			}, [state]);

			// 视口变化会改右侧栏上限，跟着重算。
			useEffect(() => {
				const sync = () => {
					setLimits(rightbarLimits());
					setBounds(readWindowBounds());
					setBarLive(readRightbar());
				};
				sync();
				window.addEventListener("resize", sync);
				return () => window.removeEventListener("resize", sync);
			}, []);

			const persistLayout = useCallback(async (patch) => {
				const response = await fetch("/dsh-restart/layout", {
					method: "PUT",
					headers: { "content-type": "application/json" },
					credentials: "same-origin",
					body: JSON.stringify(patch),
				});
				const text = await response.text();
				let data = {};
				try {
					data = text ? JSON.parse(text) : {};
				} catch {
					data = { raw: text };
				}
				if (!response.ok || data.ok === false) {
					throw new Error((data && (data.error || data.raw)) || `${response.status} ${response.statusText}`);
				}
				setState((previous) => (previous ? { ...previous, layout: data.layout } : previous));
				return data.layout;
			}, []);

			// ---- 窗口 ----
			const onReadWindow = useCallback(() => {
				const now = readWindowBounds();
				setBounds(now);
				setWinWidth(String(now.width));
				setWinHeight(String(now.height));
				setWinX(String(now.x));
				setWinY(String(now.y));
				setWinNotice(now.maximized ? t("windowResizeBlocked") : "");
			}, [t]);


			// 「保存」= 落盘 + 需要时立即生效。
			// 常见路径是先点「读取当前」，那时窗口已经是这个尺寸，比较后等于空操作；
			// 只有手填了不一样的值才会真的去调整窗口。
			const onSaveWindow = useCallback(async () => {
				const width = clampNumber(winWidth, 520, 20000);
				const height = clampNumber(winHeight, 600, 20000);
				if (width === null || height === null) {
					setWinNotice(t("notANumber"));
					return;
				}
				const x = winX === "" ? null : clampNumber(winX, -32768, 32767);
				const y = winY === "" ? null : clampNumber(winY, -32768, 32767);
				setWinBusy(true);
				try {
					await persistLayout({ window: { width, height, x, y } });
				} catch (e) {
					setWinNotice(fill(t("saveFailed"), { e: String((e && e.message) || e) }));
					setWinBusy(false);
					return;
				}
				const now = readWindowBounds();
				const changed =
					Math.round(now.width) !== width ||
					Math.round(now.height) !== height ||
					(x !== null && Math.round(now.x) !== x) ||
					(y !== null && Math.round(now.y) !== y);
				if (!changed) {
					setWinNotice(t("saved"));
					setWinBusy(false);
					return;
				}
				// 手填了不同的值：走分帧过渡，比瞬移顺滑；结束后再回读一次真实值。
				applyWindowBoundsAnimated(
					{ width, height, x: x === null ? NaN : x, y: y === null ? NaN : y },
					() => {
						setBounds(readWindowBounds());
						setWinBusy(false);
					},
				);
				setWinNotice(t("savedApplied"));
			}, [winWidth, winHeight, winX, winY, persistLayout, t]);

			const onResetWindow = useCallback(async () => {
				setWinWidth("");
				setWinHeight("");
				setWinX("");
				setWinY("");
				setWinBusy(true);
				try {
					await persistLayout({ window: null });
					setWinNotice(t("saved"));
				} catch (e) {
					setWinNotice(fill(t("saveFailed"), { e: String((e && e.message) || e) }));
				} finally {
					setWinBusy(false);
				}
			}, [persistLayout, t]);

			// ---- 右侧栏 ----
			const onReadRightbar = useCallback(() => {
				const live = readRightbar();
				setBarLive(live);
				setLimits(rightbarLimits());
				if (!live) {
					setBarNotice(t("rightbarUnavailable"));
					return;
				}
				setBarNotice("");
				if (live.width) setBarWidth(String(Math.round(live.width)));
			}, [t]);


			// 「保存」= 先套用到当前界面，再落盘。右侧栏是纯前端布局状态，
			// 套用是即时的，所以这两个动作没有分开的必要。
			const onSaveRightbar = useCallback(async () => {
				const { min, max } = rightbarLimits();
				setLimits({ min, max, viewport: Math.round(window.innerWidth) });
				const width = clampNumber(barWidth, min, max);
				if (width === null) {
					setBarNotice(t("notANumber"));
					return;
				}
				const requested = Math.round(Number(barWidth));
				setBarBusy(true);
				try {
					const ok = setRightbarWidth(width);
					setBarLive(readRightbar());
					if (!ok) {
						setBarNotice(t("rightbarUnavailable"));
						return;
					}
					await persistLayout({ rightbar: { width } });
					// 请求值超上限时明确告知被截断，别让用户以为设成功了。
					setBarNotice(requested > max ? fill(t("rightbarTooNarrow"), { max }) : t("savedApplied"));
				} catch (e) {
					setBarNotice(fill(t("saveFailed"), { e: String((e && e.message) || e) }));
				} finally {
					setBarBusy(false);
				}
			}, [barWidth, persistLayout, t]);

			const onResetRightbar = useCallback(async () => {
				setBarWidth("");
				setBarBusy(true);
				try {
					await persistLayout({ rightbar: null });
					setBarNotice(t("saved"));
				} catch (e) {
					setBarNotice(fill(t("saveFailed"), { e: String((e && e.message) || e) }));
				} finally {
					setBarBusy(false);
				}
			}, [persistLayout, t]);

			return h(
				"div",
				{ style: sectionStyle },
				h(
					"div",
					null,
					h("h2", { style: { ...headingStyle, fontSize: "17px", marginBottom: "6px" } }, t("title")),
					h("p", { style: textStyle }, t("lead")),
				),

				h(
					"div",
					{ style: cardStyle },
					error
						? h("p", { style: { ...hintStyle, color: "var(--dsw-alias-state-error-primary)", paddingTop: "14px" } }, fill(t("loadFailed"), { e: error }))
						: null,

					h(
						SettingRow,
						{ first: true, label: t("rowRestart"), hint: t("restartHint") },
						h(
							"div",
							{ style: rowStyle },
							h(
								"button",
								{
									type: "button",
									style: restartButtonStyle(busy, !desktop),
									disabled: busy || !desktop,
									onClick: onRestart,
								},
								busy ? t("restarting") : t("restart"),
							),
							state && state.electronPid
								? h("span", { style: monoStyle }, `PID ${state.electronPid}`)
								: null,
						),
						notice
							? h("p", { style: { ...hintStyle, color: "var(--dsw-alias-state-warn-primary)" } }, notice)
							: null,
						state && !desktop ? h("p", { style: hintStyle }, t("desktopOnly")) : null,
					),

					h(
						SettingRow,
						{ label: t("rowWindow"), hint: t("windowHint") },
							h(
								"div",
								{ style: fieldGridStyle },
								h(
									"label",
									{ style: fieldStyle },
									h("span", { style: fieldLabelStyle }, t("windowWidth")),
									h("input", {
										"type": "number",
										min: 520,
										step: 1,
										value: winWidth,
										onChange: (event) => setWinWidth(event.target.value),
										style: numberInputStyle(),
									}),
								),
								h(
									"label",
									{ style: fieldStyle },
									h("span", { style: fieldLabelStyle }, t("windowHeight")),
									h("input", {
										"type": "number",
										min: 600,
										step: 1,
										value: winHeight,
										onChange: (event) => setWinHeight(event.target.value),
										style: numberInputStyle(),
									}),
								),
								h(
									"label",
									{ style: fieldStyle },
									h("span", { style: fieldLabelStyle }, t("windowX")),
									h("input", {
										"type": "number",
										step: 1,
										value: winX,
										onChange: (event) => setWinX(event.target.value),
										style: numberInputStyle(),
									}),
								),
								h(
									"label",
									{ style: fieldStyle },
									h("span", { style: fieldLabelStyle }, t("windowY")),
									h("input", {
										"type": "number",
										step: 1,
										value: winY,
										onChange: (event) => setWinY(event.target.value),
										style: numberInputStyle(),
									}),
								),
							),
						h(
							"div",
							{ style: rowStyle },
							h("button", { type: "button", style: secondaryButtonStyle(!desktop), disabled: !desktop, onClick: onReadWindow }, t("readCurrent")),
							h("button", { type: "button", style: secondaryButtonStyle(!desktop || winBusy), disabled: !desktop || winBusy, onClick: onSaveWindow }, t("saveDefault")),
							h("button", { type: "button", style: secondaryButtonStyle(winBusy), disabled: winBusy, onClick: onResetWindow }, t("resetDefault")),
							bounds
								? h("span", { style: monoStyle }, fill(t("windowCurrent"), { w: bounds.width, h: bounds.height, x: bounds.x, y: bounds.y }))
								: null,
						),
						state && !desktop ? h("p", { style: hintStyle }, t("windowNotDesktop")) : null,
						winNotice
							? h(
									"p",
									{
										style: {
											...hintStyle,
											color:
												winNotice === t("saved") || winNotice === t("savedApplied")
													? "var(--dsw-alias-label-secondary)"
													: "var(--dsw-alias-state-warn-primary)",
										},
									},
									winNotice,
								)
							: null,
					),

					h(
						SettingRow,
						{ label: t("rowRightbar"), hint: t("rightbarHint") },
						h(
							"div",
							{ style: rowStyle },
							h("span", { style: hintStyle }, t("rightbarWidth")),
							h("input", {
								type: "number",
								min: limits.min,
								max: limits.max,
								step: 1,
								value: barWidth,
								onChange: (event) => setBarWidth(event.target.value),
								style: numberInputStyle(),
							}),
							h("span", { style: monoStyle }, fill(t("rightbarRange"), { min: limits.min, max: limits.max })),
							h(
								"span",
								{ style: monoStyle },
								barLive && barLive.width
									? fill(t("rightbarCurrent"), { w: Math.round(barLive.width) })
									: t("rightbarUnset"),
							),
						),
						h(
							"div",
							{ style: rowStyle },
							h("button", { type: "button", style: secondaryButtonStyle(false), onClick: onReadRightbar }, t("readCurrent")),
							h("button", { type: "button", style: secondaryButtonStyle(barBusy), disabled: barBusy, onClick: onSaveRightbar }, t("saveDefault")),
							h("button", { type: "button", style: secondaryButtonStyle(barBusy), disabled: barBusy, onClick: onResetRightbar }, t("resetDefault")),
						),
						barNotice
							? h(
									"p",
									{
										style: {
											...hintStyle,
											color:
												barNotice === t("saved") || barNotice === t("savedApplied")
													? "var(--dsw-alias-label-secondary)"
													: "var(--dsw-alias-state-warn-primary)",
										},
									},
									barNotice,
								)
							: null,
					),

					h(
						SettingRow,
						{ label: t("rowBoot") },
						state && state.agent
							? h(
									"div",
									{ style: rowStyle },
									h(
										"span",
										{ style: hintStyle },
										state.agent.ok === true
											? state.agent.visibleAtApply === true
												? t("agentVisible")
												: t("agentHidden")
											: fill(t("agentFailed"), { reason: state.agent.error || "-" }),
									),
									Array.isArray(state.agent.gotPx)
										? h(
												"span",
												{ style: monoStyle },
												fill(t("agentGot"), { w: state.agent.gotPx[0], h: state.agent.gotPx[1], ms: state.agent.waitedMs || 0 }),
										)
									: null,
									state.agent.timestamp
										? h("span", { style: monoStyle }, fill(t("bootAt"), { at: state.agent.timestamp }))
										: null,
								)
							: state && state.boot
								? h(
										"div",
									{ style: rowStyle },
									h(
										"span",
										{ style: hintStyle },
										state.boot.visibility === "visible" ? t("bootVisible") : t("bootHidden"),
									),
									state.boot.startSize
										? h("span", { style: monoStyle }, fill(t("bootStart"), { w: state.boot.startSize[0], h: state.boot.startSize[1] }))
										: null,
								)
							: h("p", { style: hintStyle }, t("bootNone")),
					),

					h(
						SettingRow,
						{ label: t("rowClean"), hint: state && state.config ? t("why") : null },
						state && state.config
							? h(
									"div",
									{ style: rowStyle },
									h("span", { style: hintStyle }, t("cleanOnRestartHint")),
									h("span", { style: monoStyle }, t("cleanOnRestart")),
									h(
										"span",
										{ style: { ...monoStyle, color: state.config.cleanOnEveryRestart ? "var(--dsw-alias-state-success-primary)" : "var(--dsw-alias-state-idle-primary)" } },
										state.config.cleanOnEveryRestart ? "on" : "off",
									),
								)
							: null,
					),

					h(
						SettingRow,
						{ label: t("rowLastRun") },
						lastRun
							? h(
									"div",
									{ style: { display: "flex", flexDirection: "column", gap: "4px" } },
									h("div", { style: monoStyle }, fill(t("bootAt"), { at: lastRun.at || "-" })),
									...(lastRun.cleans || []).map((clean, index) =>
										h(
											"div",
											{ key: `${clean.label || "store"}-${index}`, style: monoStyle },
											`${clean.label || "store"}: ${t("removed")} ${clean.removed ?? 0} ${t("entries")}${clean.error ? ` (${clean.error})` : ""}`,
										),
									),
									lastRun.launched ? h("div", { style: monoStyle }, `relaunched pid ${lastRun.launched.pid || "-"}`) : null,
								)
							: h("p", { style: hintStyle }, t("noLastRun")),
					),

					h(
						SettingRow,
						{ label: t("rowStatus") },
						state
							? h(
									"div",
									{ style: { display: "flex", flexDirection: "column", gap: "4px" } },
									h("div", { style: monoStyle }, `${state.executable || t("notFound")}`),
									...(state.stores || []).map((store) =>
										h("div", { key: store.label, style: monoStyle }, `${store.label}: ${store.file}`),
									),
								)
							: null,
					),
				),
			);
		}

		// ---- 标题栏重启按钮：只有循环箭头图标，紧贴窗口控制键左侧 ----
		// 标题栏那条 40px 的带子由 @deepseek-ai/dsh-client-ui-layout 画（html[data-windows-titlebar]），
		// shell.overlay 落在 .overlayLayer（position:absolute; inset:0; z-index:20）里，
		// 所以这里绝对定位即可压在这条带子上。
		const CHROME_BUTTONS_FALLBACK = 138; // Windows 三个窗口控制键 46px × 3

		// 窗口控制键的实际宽度：能拿到 Web 窗口控件 API 就用它算，
		// getTitlebarAreaRect() 的右边界正好是控制键的左边界。
		function controlsInset() {
			try {
				const wco = typeof navigator !== "undefined" ? navigator.windowControlsOverlay : null;
				if (wco && typeof wco.getTitlebarAreaRect === "function") {
					const rect = wco.getTitlebarAreaRect();
					const gap = window.innerWidth - rect.right;
					if (Number.isFinite(gap) && gap > 0) return gap;
				}
			} catch {
				/* 拿不到就退回固定值 */
			}
			return CHROME_BUTTONS_FALLBACK;
		}

		function titlebarButtonStyle(hover, busy, inset) {
			return {
				// 必须是 fixed：shell.overlay 挂在 .overlayLayer（position:absolute; inset:0）
				// 里，absolute 的包含块是那个 layer 的 padding box，不保证等于窗口顶端，
				// 一旦有偏差按钮就在垂直方向跑。preload 里官方的「文件 / 编辑」菜单用的
				// 也是 position:fixed; top:0; height:var(--dsh-windows-titlebar-height)。
				position: "fixed",
				// 28px 高、上下各留 6px（标题栏 40px），与官方标题栏按钮同尺寸，
				// 这样它才是「融进标题栏」而不是自己长出一块 40px 高的色块。
				top: "6px",
				right: `calc(${inset}px + 2px)`,
				width: "32px",
				height: "28px",
				// display / 居中交给 TITLEBAR_CSS：内联 display 会压过样式表里的显示与隐藏规则。
				padding: 0,
				border: 0,
				borderRadius: "6px",
				background: hover ? "var(--dsw-alias-interactive-bg-hover)" : "transparent",
				color: hover ? "var(--dsw-alias-label-primary)" : "var(--dsw-alias-label-secondary)",
				opacity: busy ? 0.45 : 1,
				cursor: busy ? "default" : "pointer",
				transition: "background .12s ease, color .12s ease, opacity .12s ease",
				// 必须显式声明：标题栏那条 :before 拖拽带会把指针事件吃掉，按钮点不动。
				WebkitAppRegion: "no-drag",
			};
		}

		// 平台与全屏都交给 CSS 判定，避免「preload 打标晚于 React 挂载」导致按钮永不出现：
		// - 只有 html[data-windows-titlebar]（preload 在 win32 下打的）才显示；
		// - 全屏时顶带消失（--dsh-frame-chrome-top:0），按钮跟着藏起来。
		//
		// 后面两条 overflow:hidden 是必须的：桌面端整个界面就是一层
		// height:100% 的 grid，文档本身不该能滚。但实测 document 的
		// scrollHeight 会比 clientHeight 多出约 21px，于是鼠标在对话框里
		// 滚一下，整个 frame（连同标题栏那条拖拽带）就跟着上移 21px；
		// 而 Electron 的原生窗口控制键画在窗口最上层、我们的按钮又是
		// fixed，两者都不动 —— 看上去就是「按钮/整条标题栏整体上移」。
		// 锁住文档滚动，三者的位置关系才恒定。
		const TITLEBAR_CSS =
			"[data-dsh-titlebar-restart]{display:none}" +
			"html[data-windows-titlebar] [data-dsh-titlebar-restart]{display:inline-flex;align-items:center;justify-content:center}" +
			"html[data-windows-titlebar][data-fullscreen] [data-dsh-titlebar-restart]{display:none}" +
			"html[data-windows-titlebar]," +
			"html[data-windows-titlebar] body{overflow:hidden}";

		function TitlebarRestartButton() {
			const t = translate;
			const [state, setState] = useState(null);
			const [busy, setBusy] = useState(false);
			const [hover, setHover] = useState(false);
			const [inset, setInset] = useState(controlsInset);

			// 窗口控制键的宽度随 DPI / 最大化 / 全屏变化，resize 时重算一次。
			useEffect(() => {
				const sync = () => setInset(controlsInset());
				sync();
				window.addEventListener("resize", sync);
				return () => window.removeEventListener("resize", sync);
			}, []);

			useEffect(() => {
				let alive = true;
				getJson("/dsh-restart/status")
					.then((data) => {
						if (alive) setState(data);
					})
					.catch(() => {
						/* 宿主没加载时静默不显示 */
					});
				return () => {
					alive = false;
				};
			}, []);

			const onActivate = useCallback(async () => {
				if (busy) return;
				const confirmed =
					typeof window !== "undefined" && typeof window.confirm === "function"
						? window.confirm(t("restartConfirm"))
						: true;
				if (!confirmed) return;
				setBusy(true);
				try {
					const result = await postJson("/dsh-restart/restart", {});
					// 失败就把按钮放开，成功则窗口马上会被关掉，不必复位。
					if (!result.ok) setBusy(false);
				} catch {
					/* 进程被杀时请求本身会中断，说明重启已经在进行中 */
				}
			}, [busy, t]);

			// 平台由 CSS 判定（见 TITLEBAR_CSS）；这里只拦「宿主没响应」和「不是桌面端」。
			if (!state || state.desktop !== true) return null;

			return h(
				react.Fragment,
				null,
				h("style", null, TITLEBAR_CSS),
				h(
					"button",
					{
						type: "button",
						"data-dsh-titlebar-restart": "",
						title: t("restartTitle"),
						"aria-label": t("restartTitle"),
						style: titlebarButtonStyle(hover, busy, inset),
						disabled: busy,
						onClick: onActivate,
						onMouseEnter: () => setHover(true),
						onMouseLeave: () => setHover(false),
					},
					h(
						"svg",
						{
							width: 15,
							height: 15,
							viewBox: "0 0 24 24",
							fill: "none",
							stroke: "currentColor",
							strokeWidth: 2,
							strokeLinecap: "round",
							strokeLinejoin: "round",
							"aria-hidden": "true",
						},
						h("polyline", { points: "23 4 23 10 17 10" }),
						h("path", { d: "M20.49 15a9 9 0 1 1-2.12-9.36L23 10" }),
					),
				),
			);
		}

		/**
		 * 启动时恢复布局。
		 *
		 * 时序是关键：主进程 createWindow(..., show=false) 之后要等 navigateMain()
		 * 完成才 show()（main.js:12937-12943），所以 apply() 跑到这里时窗口通常还是
		 * 隐藏的。隐藏状态下 resizeTo 不会让任何人看到中间态，等于"一出现就是目标大小"。
		 *
		 * 因此这里立即试一次，而不是干等 600ms（那是上一版"先 1280×820 出现再跳"的根因）。
		 * 右侧栏要等 layout 的 root slot 挂好，用轮询；两者各自成功一次就收手，
		 * 免得用户在头几秒里手动调整又被拽回去。
		 *
		 * visibilitychange 作兜底：万一这次 bundle 加载真的晚于 show()，
		 * 窗口一变为可见就再补一发，把可见的抖动压到最短。
		 */
		function restoreLayout() {
			let stopped = false;
			let windowDone = false;
			let barDone = false;
			const timers = [];
			let visibilityHandler = null;

			// 一次性时序诊断：跑一次重启后看 boot.log 就能确认窗口当时是否已显示。
			try {
				postJson("/dsh-restart/diag", {
					phase: "restore-start",
					visibility: document.visibilityState,
					hidden: document.hidden,
					at: Math.round(
						typeof performance !== "undefined" && performance.now ? performance.now() : 0,
					),
					startSize: [Math.round(window.outerWidth), Math.round(window.outerHeight)],
				}).catch(() => {});
			} catch {
				/* 诊断失败不影响恢复 */
			}

			const later = (fn, ms) => {
				const id = setTimeout(() => {
					if (!stopped) fn();
				}, ms);
				timers.push(id);
			};

			const finish = () => {
				if (!windowDone || !barDone) return;
				stopped = true;
				for (const id of timers.splice(0)) clearTimeout(id);
				if (visibilityHandler) {
					document.removeEventListener("visibilitychange", visibilityHandler);
					visibilityHandler = null;
				}
			};

			const tick = async () => {
				if (windowDone && barDone) return;
				let layout = null;
				try {
					const data = await getJson("/dsh-restart/layout");
					layout = data && data.layout;
				} catch {
					return; // 宿主没起好，下一轮再说
				}
				if (stopped || !layout) return;

				// 没有配置该项就等于"已完成"，否则会一直轮询、监听器也永远不摘。
				if (!windowDone) {
					if (!layout.window) windowDone = true;
					// 启动恢复不带动画：要么窗口还没显示（看不见），
					// 要么已经显示了，分帧反而会拖长可见抖动的时长。
					else windowDone = applyWindowBounds(layout.window);
				}

				if (!barDone) {
					if (!layout.rightbar || !layout.rightbar.width) barDone = true;
					else barDone = setRightbarWidth(layout.rightbar.width);
				}

				if (windowDone && barDone) finish();
			};

			// 第一发立刻打，不等。窗口若还隐藏，用户看不到任何变化。
			const visibleAtStart = document.visibilityState === "visible";
			const first = tick();

			// 兜底：变为可见且还没成功，说明 bundle 确实晚于 show()，再补一次。
			if (!visibleAtStart) {
				visibilityHandler = () => {
					if (document.visibilityState !== "visible" || stopped) return;
					tick();
				};
				document.addEventListener("visibilitychange", visibilityHandler);
			}

			// 轮询补齐：首帧时 layout slot 往往还没挂，右侧栏要等它。
			// 每轮 250ms、最多 12 轮（约 3 秒）——慢机器上足够，又不会拖太久。
			let rounds = 0;
			const kick = () => {
				if (stopped) return;
				rounds += 1;
				tick().finally(() => {
					if (!stopped && !(windowDone && barDone) && rounds < 12) later(kick, 250);
				});
			};
			first.finally(() => {
				if (!stopped && !(windowDone && barDone)) later(kick, 250);
			});

			return () => {
				stopped = true;
				for (const id of timers.splice(0)) clearTimeout(id);
				if (visibilityHandler) {
					document.removeEventListener("visibilitychange", visibilityHandler);
					visibilityHandler = null;
				}
			};
		}

		function apply(ctx) {
			ctx.effect(
				() => ctx.locale.register(NS, { zh, en }),
				"dsh-restart: dictionaries",
			);
			translate = ctx.locale.bind(NS);
			// 设置分区与标题栏按钮都靠这个引用拿 layout 的 store。
			slotsRef = ctx.slots;

			ctx.effect(() => restoreLayout(), "dsh-restart: restore layout");

			ctx.slots.inject("settings.section", () =>
				ctx.slots.register(
					{
						name: "settings.section",
						id: "dsh-restart",
						order: 50,
						label: () => translate("section"),
					},
					DesktopToolsSection,
				),
			);

			ctx.slots.inject("shell.overlay", () =>
				ctx.slots.register(
					{
						name: "shell.overlay",
						id: "dsh-restart/titlebar-restart",
						order: 10,
					},
					TitlebarRestartButton,
				),
			);
		}

		exports.name = name;
		exports.inject = inject;
		exports.apply = apply;
		return module.exports;
	},
});
