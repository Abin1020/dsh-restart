# Changelog

本文件记录面向使用者的变更。格式参照 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [0.1.1] - 2026-11-06

### 修复

- 标题栏重启按钮位置跑偏：桌面端文档本身会整体滚动约 21px，把标题栏那条背景带推走，而按钮（`position: fixed`）和 Electron 原生的窗口控制键都不动，看上去像「按钮或整条标题栏上移」。现在锁住文档级滚动，三者的相对位置恒定；按钮定位也从 `absolute` 改为 `fixed`，与 preload 里官方「文件 / 编辑」菜单保持一致。
- 设置页输入框留空后点「保存为默认」会把窗口存成最小值：`clampNumber("")` 得到 `0`，被夹到下限 520×600，并且真的把窗口缩过去。现在空值返回 `null`，表示「这一项不设」。

### 文档

- README 增加界面预览截图。
- 安装方式改为「设置 → 插件 → 添加插件，填仓库地址」一步装；DSH 会自动登记 `dependencies` 与 `dsh.profile.bundles`，不需要手改 JSON。
- 卸载说明从文末移到安装下方。

## [0.1.0] - 2026-11-03

首个可用版本。一个插件，三项功能。

### 新增

- **Cookie 清理**：定位并清空 `dsh-auth-*` 累积条目，解决 Host 随机端口导致的 cookie 名漂移（71 条 ≈ 16.1 KB 超过 Node 16384 请求头上限 → 服务端 431 → 桌面端只显示"认证失败"）。
  - 清理挂在应用退出之后执行：运行期 `Network/Cookies` 被 Chromium 独占锁定，改不了。
  - 删除前备份到 `Network/dsh-tools-backup/`，滚动保留最近 3 份；备份失败则不删。
  - 只匹配 `dsh-auth-` 前缀，其它站点的 cookie 一条不动。
- **页面重启按钮**：`POST /dsh-restart/restart` → detached helper → `taskkill` → 清 cookie → 重新拉起应用。装/停插件后不必再手动退出重开。
  - 标题栏循环箭头图标按钮（`shell.overlay`，紧贴窗口控制键左侧，仅 Windows 标题栏下显示）。
  - 设置页「桌面维护」分区内的完整入口。
- **窗口尺寸与右侧栏宽度**：手填或读取当前值保存，下次启动自动套用。
  - 窗口由 `lib/winagent.exe` 在窗口 `show()` 之前用 `SetWindowPos` 摆好，消除"先小后大"的抖动。
  - 右侧栏通过 root slot 的 store 直接改布局，绕过 `LayoutController` 未暴露 `setRightbar` 的限制。
  - 左侧栏保持默认，不在范围内。
- 零 asar 补丁：不改官方安装包，nightly 更新不会冲掉。

### 已知限制

- 仅 Windows 桌面端；纯 web 模式下按钮置灰。
- 重启是强制结束进程（`taskkill /F`），进行中的写入会中断（会话记录实时落盘，正常使用不丢）。
- 窗口代理只作用于启动那一次，之后用户手动拖动/最大化不会被覆盖。
- 右侧栏宽度受窗口宽度限制，上限 `min(视口 × 0.7, 视口 − 680)`，下限 300。

[0.1.1]: https://github.com/Abin1020/dsh-restart/releases/tag/v0.1.1
[0.1.0]: https://github.com/Abin1020/dsh-restart/releases/tag/v0.1.0
