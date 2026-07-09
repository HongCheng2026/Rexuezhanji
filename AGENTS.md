# AGENTS.md - 热血战姬

## 项目定位

横版飞行射击 H5 游戏，纯前端 Canvas + DOM，无框架、无构建工具、无 npm。H5 是当前主要开发目标，小程序与发布目录通过脚本同步生成。

详细架构、目录说明、发布流程见 `docs/handoff/agent-context.md`；只有需要交接、发布或理解整体架构时再读取。

## 高频入口

- H5 入口：`src/h5/index.html`
- 主控制器：`src/h5/game.js`（大文件，按需分段读取）
- 全局样式：`src/h5/style.css`（大文件，按需分段读取）
- H5 模块：`src/h5/battle/`、`src/h5/ui/`、`src/h5/meta/`
- 跨端共享配置：`src/shared/`
- 云存档后端：`supabase/functions/game-api/`
- 发布同步脚本：`scripts/sync-release.ps1`

## 修改边界

- H5 表现、UI、战斗逻辑：改 `src/h5/`
- 数值、规则、关卡、装备、剧情配置：改 `src/shared/`
- 运行时素材：放 `assets/runtime/` 并更新 `src/shared/assets.js`
- 小程序平台目录和 `release/` 由同步脚本生成或镜像，不作为日常首改位置
- 修改 `src/shared/` 后，发布或小程序验证前运行 `scripts/sync-release.ps1`

## 禁止与谨慎

- 不主动读取：`archive/`、`docs/chat-backups/`、`assets/originals/`、`assets/references/`、`*.log`
- 不手动修改：`release/` 生成产物
- 不删除：`archive/` 历史文件
- 不把 `service_role` 密钥写入前端；前端只允许公开 `publishableKey`
- 大文件必须定向读取：`game.js`、`style.css`、`enemyStageBalance.js`、`game-api/index.ts`、大 SQL 迁移

## Token 节流规则

- 搜索默认排除：`release/`、`archive/`、`docs/chat-backups/`、`assets/originals/`、`assets/references/`、`*.log`、`tmp-*.png`
- 优先用 `rg` 定位符号或文件，再读取小范围上下文
- 不为了解释项目而全量读取长文档、生成目录、平台镜像或大素材目录
- 需要全局背景时，先读 `docs/handoff/agent-context.md` 的相关段落

## 本地验证

```powershell
start src/h5/index.html
node release/local-static-server.js
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\sync-release.ps1"
```

最低验证：打开 `src/h5/index.html`，确认控制台无新增报错。发布版验证：先运行同步脚本，再打开 `release/netlify-h5/index.html`。

## 专用技能

- `bug-hunt`：复现、定位、最小修复问题
- `code-review`：审查变更，优先缺陷、回归、安全和测试缺口
- `frontend-polish`：优化 UI 细节、响应式状态和视觉一致性
- `release-notes`：整理面向用户的发布说明和升级注意事项
