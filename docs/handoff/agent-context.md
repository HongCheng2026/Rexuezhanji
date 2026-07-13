# Agent Context - 热血战姬

本文件承接原 `AGENTS.md` 的详细背景。日常任务优先读取根目录 `AGENTS.md`；只有需要理解整体架构、发布流程、跨端同步或交接背景时再读取本文。

## 项目概述

项目是横版飞行射击 H5 游戏，代号“热血战姬 / 星空打飞机”。当前实现为纯前端 Canvas + DOM，无框架、无构建工具、无 npm。H5 版本是日常开发主目标，微信/抖音小程序通过共享层同步，云存档后端使用 Supabase。

技术栈：

- H5：纯 HTML / CSS / JavaScript，ES5 兼容
- 共享模块：IIFE 注入 `window.RXGame`
- 后端：Supabase Postgres + Deno Edge Function `game-api`
- 小程序：微信原生 + 抖音原生
- 部署：Netlify 静态托管，发布目录为 `release/netlify-h5/`

## 目录结构

```text
src/
  h5/                  H5 游戏入口、Canvas 逻辑、样式、UI 视图
    index.html         入口 HTML
    game.js            启动器，只调用 app/gameApp.js
    app/               页面协调与统一 GameGateway
    style.css          全局样式，大文件，按需分段读取
    shared-loader.js   按顺序注入 shared 模块和 H5 模块
    cloud-save.js      Supabase 云存档适配器
    supabase-config.js Supabase 公开 publishableKey
    battle/            战斗控制与 Canvas 渲染：敌机、碰撞、武器、掉落、Boss
    ui/                大厅、选关、战斗 HUD、机库画廊、结算控制器
    meta/              战力计算、存档运行时、进阶系统
  shared/              跨平台共享层：配置、数值、规则、剧情、任务等
  miniprogram-common/  小程序公共层：轻量 profile 和图片

platforms/
  wechat-miniprogram/  微信小程序工程，shared 由脚本同步
  douyin-miniprogram/  抖音小程序工程，shared 由脚本同步

assets/
  runtime/             H5 运行时图片和音频，参与发布
  originals/           原始素材，大文件，默认不读取
  references/          UI 参考图，大文件，默认不读取

release/               生成产物，只通过同步脚本生成，不手动修改
supabase/              数据库迁移与 Edge Function
docs/                  设计、交接、数值、更新文档
archive/               历史快照和旧部署副本，不读取、不删除
scripts/               发布同步脚本
```

## 模块加载

`src/h5/shared-loader.js` 使用 `document.write` 按固定顺序注入脚本。

加载顺序分两层：

- 第一层：`src/shared/`，包含运行时工具、资源表、存档、关卡、数值、战斗规则、剧情、任务、商店等共享模块。
- 第二层：`src/h5/` 子目录，包含战斗状态、武器、敌机、碰撞、Boss、结算、HUD、选关、大厅等 H5 模块。

生产环境中，`release/netlify-h5/` 会镜像 shared 文件，加载器会根据环境切换资源路径。

## 主要开发规则

- H5 表现、UI、战斗体验优先改 `src/h5/`。
- 数值、规则、关卡、装备、剧情等跨端配置改 `src/shared/`。
- 运行时图片放入 `assets/runtime/` 对应子目录，并更新 `src/shared/assets.js`。
- 修改 shared 后，发布或小程序验证前运行 `scripts/sync-release.ps1`。
- Supabase 前端只能使用公开 publishable key；高价值操作由 Edge Function 服务端计算。
- 正式域名必须通过 `GameGateway` 走 Supabase；云端失败时禁止回退本地发奖励。
- 新增数据库表或 RPC 时只新增 `supabase/migrations/` 文件，不修改已经存在的迁移历史。

## 启动与预览

```powershell
# 源码直开，日常开发首选
start src/h5/index.html

# 本地静态服务器，端口 8787
node release/local-static-server.js
# 访问 http://127.0.0.1:8787

# 发布版预览，先生成再打开
powershell -NoProfile -ExecutionPolicy Bypass -File ".\scripts\sync-release.ps1"
start release/netlify-h5/index.html
```

正式发布先执行 `supabase db push` 与 `supabase functions deploy game-api`，验证云端开战和结算后，再发布 Netlify 正式站。旧 `001_cloud_save.sql` 只作为迁移历史，禁止手工复制执行。

## 验证方式

项目有轻量架构与云端契约测试，浏览器冒烟仍是发布必检项：

- `node --test tests/*.test.js`

- 打开 `src/h5/index.html`，检查控制台无新增报错。
- 测试关卡通关、Boss 战、结算流程。
- 云存档测试：登录、存档、读档、跨设备同步。
- 发布版测试：运行 `scripts/sync-release.ps1` 后打开 `release/netlify-h5/index.html`。

## Token 与上下文约定

- 默认不要搜索或读取 `release/`、`archive/`、`docs/chat-backups/`、`assets/originals/`、`assets/references/`、日志和临时截图。
- 读取大文件时先 `rg` 定位，再按函数、关键字或行范围读取。
- 平台目录和 release 目录包含镜像文件，除非任务明确涉及小程序或发布，否则优先看 `src/`。
- 不把本文复制回 `AGENTS.md`；根目录 Agent 规则必须保持短小。
