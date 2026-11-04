// dsh-restart 的窗口代理源码。
//
// 为什么需要它：Electron 主窗口在 main.js:13128 创建（show=false），直到
// enterWorkspace() 里 await navigateMain(url) 完成的瞬间才 window.show()。
// 渲染层的 client.js 要等页面加载 + bundle 取回才执行，实测在导航开始后 10.4s，
// 那时窗口已经显示过了 —— 所以在渲染层怎么调都来不及，必然"先小后大"。
//
// 而插件跑在 Host 子进程里，apply() 一定早于 navigateMain()（页面就是 Host 提供的），
// 所以这个代理有 10 秒量级的余量，可以在窗口 show() 之前把它摆好。
//
// 编译（Windows 自带 .NET Framework 编译器）：
//   csc.exe -nologo -target:winexe -optimize+ -out:winagent.exe winagent-src.cs
//
// 用 winexe 而不是 exe：避免启动时闪一个黑色控制台窗口。

using System;
using System.Diagnostics;
using System.Globalization;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;

internal static class WinAgent
{
    private const uint SWP_NOZORDER = 0x0004;
    private const uint SWP_NOACTIVATE = 0x0010;
    private const int DWMWA_EXTENDED_FRAME_BOUNDS = 9;
    private const int UnsetInt = int.MinValue;

    [StructLayout(LayoutKind.Sequential)]
    private struct RECT
    {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;

        public int Width { get { return Right - Left; } }
        public int Height { get { return Bottom - Top; } }
    }

    private delegate bool EnumProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    private static extern bool EnumWindows(EnumProc cb, IntPtr lParam);
    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint pid);
    [DllImport("user32.dll")]
    private static extern bool IsWindowVisible(IntPtr hWnd);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int GetClassName(IntPtr hWnd, StringBuilder sb, int max);
    [DllImport("user32.dll")]
    private static extern bool GetWindowRect(IntPtr hWnd, out RECT r);
    [DllImport("user32.dll")]
    private static extern bool SetWindowPos(IntPtr hWnd, IntPtr after, int x, int y, int cx, int cy, uint flags);
    [DllImport("user32.dll")]
    private static extern uint GetDpiForWindow(IntPtr hWnd);
    [DllImport("dwmapi.dll")]
    private static extern int DwmGetWindowAttribute(IntPtr hWnd, int attr, out RECT r, int cb);

    private static IntPtr FindMainWindow(uint pid)
    {
        IntPtr best = IntPtr.Zero;
        long bestArea = -1;
        EnumWindows(delegate(IntPtr h, IntPtr l)
        {
            uint owner;
            GetWindowThreadProcessId(h, out owner);
            if (owner != pid) return true;
            StringBuilder sb = new StringBuilder(256);
            GetClassName(h, sb, 256);
            // Electron 的主窗口类名固定是 Chrome_WidgetWin_1；同进程还有
            // Chrome_WidgetWin_0（隐藏的离屏窗口）等，用面积取最大者兜底。
            if (!sb.ToString().StartsWith("Chrome_WidgetWin_1", StringComparison.Ordinal)) return true;
            RECT r;
            if (!GetWindowRect(h, out r)) return true;
            long area = (long)r.Width * r.Height;
            if (area > bestArea)
            {
                bestArea = area;
                best = h;
            }
            return true;
        }, IntPtr.Zero);
        return best;
    }

    private static bool TryVisibleBounds(IntPtr hwnd, out RECT r)
    {
        if (DwmGetWindowAttribute(hwnd, DWMWA_EXTENDED_FRAME_BOUNDS, out r, Marshal.SizeOf(typeof(RECT))) == 0)
        {
            if (r.Width > 0 && r.Height > 0) return true;
        }
        return GetWindowRect(hwnd, out r);
    }

    private static void AppendLog(string logPath, string json)
    {
        if (string.IsNullOrEmpty(logPath)) return;
        try
        {
            string line = DateTime.UtcNow.ToString("yyyy-MM-ddTHH:mm:ss.fffZ", CultureInfo.InvariantCulture) + " " + json + "\r\n";
            File.AppendAllText(logPath, line, new UTF8Encoding(false));
        }
        catch
        {
            // 日志写不进去不能影响主流程
        }
    }

    private static string J(string s)
    {
        if (s == null) return "null";
        var sb = new StringBuilder("\"");
        foreach (char c in s)
        {
            if (c == '"' || c == '\\') sb.Append('\\').Append(c);
            else if (c == '\n') sb.Append("\\n");
            else if (c == '\r') sb.Append("\\r");
            else if (c < ' ') sb.Append(' ');
            else sb.Append(c);
        }
        return sb.Append('"').ToString();
    }

    private static int Main(string[] args)
    {
        int pid = 0;
        int width = 0;
        int height = 0;
        int x = UnsetInt;
        int y = UnsetInt;
        int timeoutMs = 30000;
        string logPath = null;

        for (int i = 0; i + 1 < args.Length; i++)
        {
            switch (args[i])
            {
                case "--pid": int.TryParse(args[i + 1], out pid); break;
                case "--width": int.TryParse(args[i + 1], out width); break;
                case "--height": int.TryParse(args[i + 1], out height); break;
                case "--x": int.TryParse(args[i + 1], out x); break;
                case "--y": int.TryParse(args[i + 1], out y); break;
                case "--timeout": int.TryParse(args[i + 1], out timeoutMs); break;
                case "--log": logPath = args[i + 1]; break;
            }
        }

        if (pid <= 0 || width <= 0 || height <= 0)
        {
            AppendLog(logPath, "{\"phase\":\"agent\",\"ok\":false,\"error\":\"bad-args\"}");
            return 2;
        }

        Stopwatch sw = Stopwatch.StartNew();
        IntPtr hwnd = IntPtr.Zero;

        while (sw.ElapsedMilliseconds < timeoutMs)
        {
            try
            {
                Process.GetProcessById(pid);
            }
            catch
            {
                // 父进程没了，代理没有存在意义，别留下孤儿。
                AppendLog(logPath, "{\"phase\":\"agent\",\"ok\":false,\"error\":\"parent-gone\",\"waitedMs\":" + sw.ElapsedMilliseconds + "}");
                return 3;
            }

            hwnd = FindMainWindow((uint)pid);
            if (hwnd != IntPtr.Zero) break;
            Thread.Sleep(40);
        }

        if (hwnd == IntPtr.Zero)
        {
            AppendLog(logPath, "{\"phase\":\"agent\",\"ok\":false,\"error\":\"window-timeout\",\"waitedMs\":" + sw.ElapsedMilliseconds + "}");
            return 4;
        }

        bool visibleAtApply = IsWindowVisible(hwnd);
        long waited = sw.ElapsedMilliseconds;
        uint dpi = GetDpiForWindow(hwnd);
        double scale = dpi > 0 ? dpi / 96.0 : 1.0;

        int wantCx = (int)Math.Round(width * scale);
        int wantCy = (int)Math.Round(height * scale);
        int wantX = x == UnsetInt ? UnsetInt : (int)Math.Round(x * scale);
        int wantY = y == UnsetInt ? UnsetInt : (int)Math.Round(y * scale);

        RECT last = new RECT();
        bool landed = false;

        // GetWindowRect 含 DWM 那圈不可见的缩放边（实测 100% DPI 下 16×8），
        // 而 Electron 的 outerWidth/outerHeight 不含。差值不写死，直接从窗口读，
        // 这样高 DPI 和多显示器下也不用改代码。最多两轮：第一轮按差值补，第二轮纠偏。
        for (int pass = 0; pass < 2; pass++)
        {
            RECT wr;
            if (!GetWindowRect(hwnd, out wr)) break;
            RECT vis;
            TryVisibleBounds(hwnd, out vis);

            int frameX = wr.Width - vis.Width;
            int frameY = wr.Height - vis.Height;
            if (frameX < 0) frameX = 0;
            if (frameY < 0) frameY = 0;

            int setCx = wantCx + frameX;
            int setCy = wantCy + frameY;
            int setX = wantX == UnsetInt ? wr.Left : wantX - (vis.Left - wr.Left);
            int setY = wantY == UnsetInt ? wr.Top : wantY - (vis.Top - wr.Top);

            if (wr.Left == setX && wr.Top == setY && wr.Width == setCx && wr.Height == setCy)
            {
                last = vis;
                landed = true;
                break;
            }

            SetWindowPos(hwnd, IntPtr.Zero, setX, setY, setCx, setCy, SWP_NOZORDER | SWP_NOACTIVATE);
            Thread.Sleep(30);

            if (!TryVisibleBounds(hwnd, out last)) GetWindowRect(hwnd, out last);
            landed = Math.Abs(last.Width - wantCx) <= 2 && Math.Abs(last.Height - wantCy) <= 2;
            if (landed) break;
        }

        AppendLog(logPath, "{"
            + "\"phase\":\"agent\",\"ok\":" + (landed ? "true" : "false")
            + ",\"waitedMs\":" + waited
            + ",\"visibleAtApply\":" + (visibleAtApply ? "true" : "false")
            + ",\"dpi\":" + dpi
            + ",\"wantCss\":[" + width + "," + height + "]"
            + ",\"wantPx\":[" + wantCx + "," + wantCy + "]"
            + ",\"gotPx\":[" + last.Width + "," + last.Height + "]"
            + ",\"gotPos\":[" + last.Left + "," + last.Top + "]"
            + ",\"hwnd\":" + hwnd.ToInt64()
            + "}");

        return landed ? 0 : 5;
    }
}
