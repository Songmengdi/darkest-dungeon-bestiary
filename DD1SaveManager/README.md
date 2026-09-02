# 暗黑地牢1 本地存档管理器 (DD1SaveManager)

一个绿色单文件的 Windows 桌面程序（WinForms / .NET Framework 4.x，系统自带运行时，无需安装任何东西），
用于备份、恢复、克隆暗黑地牢1 的 Steam 本地存档。

## 使用

双击 `DD1SaveManager.exe`：

- **存档根目录**：默认 `D:\software\steam\userdata\923728202\262060\remote`，可改，设置保存在 exe 旁的 `settings.json`。
- **备份目录**：默认 exe 旁的 `backups\`。
- 左侧列出所有 `profile_N` 插槽（本机现有 profile_0/1/3/4，即 4 个存档位）。
- 选中插槽后可 **备份**（可填备注）、**全部插槽备份**；右侧列表可 **恢复 / 删除 / 双击打开备份文件夹**。
- **克隆到其他插槽**：把某个备份复制到另一个槽位（如把 profile_0 的进度复制到空的 profile_2）。
- **启动游戏**：通过 Steam (`steam://rungameid/262060`) 启动。

安全机制：
- 恢复 / 克隆前检测 `darkest.exe` 是否在运行，运行中会拒绝操作。
- 恢复前默认自动把当前存档再备份一份（可关）。
- 每插槽保留最近 N 份备份（默认 20，0=不限），自动清理。
- 界面按显示器 DPI 自动缩放，高分屏不模糊、按钮不裁剪（窗口变窄时按钮自动换行）。

## 备份结构

```
backups/
  profile_0/
    2026-09-02_091500_备注名/        ← 完整的 profile_0 文件夹快照
      dd1backup.json                 ← 清单（恢复时自动跳过）
      persist.game.json
      persist.roster.json
      ...
```

## 关于 Steam 云存档

暗黑地牢1 默认开启 Steam 云同步。恢复旧存档后建议：
- 若发现存档被云端的旧版本"顶回来"，在 Steam 里右键游戏 → 属性 → 关闭"Steam 云"，或恢复后立即启动游戏让本地版本上传。
- 游戏自身也会在 `profile_N\backup\` 里留一份游戏内备份，管理器会照常备份/还原它。

## 开发

- 源码：`src/`（C#，兼容系统自带 csc.exe 的语法子集）
- 逻辑测试：`test/LogicTest.cs`
- 构建：`powershell -ExecutionPolicy Bypass -File build.ps1`
- 构建 + 跑逻辑测试：`powershell -ExecutionPolicy Bypass -File build.ps1 -Test`

依赖：仅 Windows 自带的 .NET Framework 4.x（Win7 及以上都预装）。无需 .NET SDK、无需管理员权限。
