// 重编窗口代理。
//
// 用 .NET Framework 4 自带的 csc.exe，不依赖安装 Visual Studio 或 .NET SDK。
// 必须是 -target:winexe：用 -target:exe 编出来的程序启动时会闪一个黑色控制台窗口。
import { spawnSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const libDir = path.join(here, "..", "lib");
const source = path.join(libDir, "winagent-src.cs");
const output = path.join(libDir, "winagent.exe");

const candidates = [
  path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
  path.join(process.env.WINDIR || "C:\\Windows", "Microsoft.NET", "Framework", "v4.0.30319", "csc.exe"),
];

const csc = candidates.find((file) => existsSync(file));
if (!csc) {
  console.error("找不到 csc.exe。需要 .NET Framework 4（Windows 自带，路径通常是");
  console.error("  C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe");
  process.exit(1);
}

if (!existsSync(source)) {
  console.error("找不到源文件:", source);
  process.exit(1);
}

console.log("编译器:", csc);
console.log("源文件:", source);

const result = spawnSync(
  csc,
  ["-nologo", "-target:winexe", "-optimize+", `-out:${output}`, source],
  { cwd: libDir, stdio: "inherit" },
);

if (result.error) {
  console.error("调用 csc 失败:", result.error.message);
  process.exit(1);
}
if (result.status !== 0) {
  console.error("编译失败，退出码:", result.status);
  process.exit(result.status ?? 1);
}

console.log("已生成:", output, `(${statSync(output).size} 字节)`);
