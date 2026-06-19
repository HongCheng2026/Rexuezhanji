# H5 Game Toolchain Handoff

This machine is prepared for H5 game development. All required tools installed by Codex were moved to the D drive.

## Workspace

- Project workspace: `C:\Users\Administrator\Documents\小游戏`

## Installed Tools

### Node.js

- Version: `v24.17.0`
- Install path: `D:\DevTools\nodejs`
- Executables:
  - `D:\DevTools\nodejs\node.exe`
  - `D:\DevTools\nodejs\npm.cmd`
  - `D:\DevTools\nodejs\npx.cmd`

PowerShell note: use `npm.cmd` and `npx.cmd` instead of bare `npm` / `npx`, because PowerShell may try to run `npm.ps1` and block it due to execution policy.

Examples:

```powershell
D:\DevTools\nodejs\node.exe -v
D:\DevTools\nodejs\npm.cmd -v
D:\DevTools\nodejs\npx.cmd -v
```

### Git

- Version: `git version 2.54.0.windows.1`
- Install path: `D:\DevTools\Git`
- Main executable:
  - `D:\DevTools\Git\cmd\git.exe`

Example:

```powershell
D:\DevTools\Git\cmd\git.exe --version
```

### VS Code

- Version: `1.125.0`
- Install path: `D:\DevTools\VSCode`
- Executables:
  - `D:\DevTools\VSCode\Code.exe`
  - `D:\DevTools\VSCode\bin\code.cmd`

Example:

```powershell
D:\DevTools\VSCode\bin\code.cmd --version
```

### Cocos Creator

- Version: `3.8.8`
- Install path: `D:\Cocos\CocosCreator\3.8.8`
- Main executable:
  - `D:\Cocos\CocosCreator\3.8.8\CocosCreator.exe`

Example:

```powershell
& "D:\Cocos\CocosCreator\3.8.8\CocosCreator.exe"
```

### Cocos Dashboard

- Version: `2.2.1`
- Install path: `D:\Cocos\CocosDashboard`
- Main executable:
  - `D:\Cocos\CocosDashboard\CocosDashboard.exe`

Example:

```powershell
& "D:\Cocos\CocosDashboard\CocosDashboard.exe"
```

## Recommended Fast H5 Stack

For fastest H5 prototyping, use:

```text
Vite + TypeScript + Phaser
```

Use the full executable paths if PATH is not refreshed:

```powershell
D:\DevTools\nodejs\npm.cmd create vite@latest
D:\DevTools\nodejs\npm.cmd install phaser
D:\DevTools\nodejs\npm.cmd run dev
D:\DevTools\nodejs\npm.cmd run build
```

## Cocos H5 Target

For Cocos projects, use Cocos Creator `3.8.8` and build for:

```text
Web Mobile
```

The editor executable is:

```text
D:\Cocos\CocosCreator\3.8.8\CocosCreator.exe
```

## PATH Status

The system/user PATH was updated to include:

- `D:\DevTools\nodejs`
- `D:\DevTools\Git\cmd`
- `D:\DevTools\VSCode\bin`
- `D:\Cocos\CocosCreator\3.8.8`

If an already-open terminal cannot find these commands, open a new terminal or use the full paths above.

## Verification Commands

```powershell
D:\DevTools\nodejs\node.exe -v
D:\DevTools\nodejs\npm.cmd -v
D:\DevTools\Git\cmd\git.exe --version
D:\DevTools\VSCode\bin\code.cmd --version
(Get-Item "D:\Cocos\CocosCreator\3.8.8\CocosCreator.exe").VersionInfo.ProductVersion
(Get-Item "D:\Cocos\CocosDashboard\CocosDashboard.exe").VersionInfo.ProductVersion
```

Expected versions:

```text
Node.js: v24.17.0
npm: 11.13.0
Git: 2.54.0.windows.1
VS Code: 1.125.0
Cocos Creator: 3.8.8
Cocos Dashboard: 2.2.1
```
