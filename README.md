# 热血战姬项目结构

这个仓库已经整理为源码、素材、发布产物和历史资料分区管理。日常开发优先改 `src/`，不要直接改 `release/` 里的生成结果。

## 目录说明

- `src/h5/`：H5 游戏入口、样式、画布逻辑、云存档适配。
- `src/shared/`：跨平台共享的数值、存档、关卡、资产和系统配置。
- `src/miniprogram-common/`：微信和抖音小程序可复用的轻量素材与通用逻辑。
- `platforms/wechat-miniprogram/`：微信小程序工程。
- `platforms/douyin-miniprogram/`：抖音小程序工程。
- `assets/runtime/`：H5 当前运行所需图片资源。
- `assets/originals/`：原始素材、透明底、PSD、备用图。
- `assets/references/`：UI 参考图和历史参考素材。
- `docs/`：交接、设计、数值、更新记录和聊天备份。
- `release/netlify-h5/`：由脚本生成的 Netlify H5 发布目录。
- `release/packages/`：发布压缩包。
- `archive/`：历史部署副本、旧拖拽包、更新包和整理前根目录预览副本。
- `supabase/`：云存档数据库迁移和 Edge Function。
- `scripts/`：项目维护脚本。

## 日常开发

1. 修改 H5 表现层：编辑 `src/h5/`。
2. 修改数值、规则、存档或共享配置：编辑 `src/shared/`。
3. 修改运行图片：放入 `assets/runtime/` 对应分类，并同步更新 `src/shared/assets.js`。
4. 修改原始素材或参考图：放入 `assets/originals/` 或 `assets/references/`，不要混入运行目录。

## 生成发布目录

在 PowerShell 中运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\sync-release.ps1"
```

脚本会从 `src/h5/`、`src/shared/` 和 `assets/runtime/` 生成 `release/netlify-h5/`，同时刷新微信和抖音小程序的 `shared/`、通用 `profile.js` 和轻量图片，并输出 `release/packages/netlify-h5.zip`。

## 本地预览

- H5 源码预览：打开 `src/h5/Shell/index.html`（`src/h5/index.html` 为兼容跳转入口）。不要直接打开固定 1600×900 的 `Shell/game-frame.html`，否则会绕过居中缩放壳。
- 发布版预览：先运行同步脚本，再打开 `release/netlify-h5/index.html`。

整体缩放由外层 `Shell/index.html`、`Game/Camera/` 和 `Shell/viewport.css` 独立负责；大厅、战斗和功能面板只存在于 iframe 内，不应修改外层缩放舞台。

`src/h5/` 使用 `../shared/` 加载共享脚本，发布版使用发布目录根部的共享脚本镜像；运行图片统一来自 `assets/runtime/`。

## 历史资料

整理前根目录的 H5 预览副本保存在 `archive/root-preview-before-reorg/`。旧部署目录、Netlify 拖拽包和更新包保存在 `archive/` 与 `release/` 下，未删除历史资料。
