# 云端游戏架构决策

## 结论

- `src/h5/game.js` 只负责启动，页面协调在 `src/h5/app/gameApp.js`。
- 战斗运行、Canvas 渲染、大厅视图、结算控制分别放在 `battle/` 与 `ui/`。
- 所有存档写操作统一经过 `src/h5/app/gameGateway.js`。
- 本地地址默认使用本地实现；`rexuezhanji.top` 与 `www.rexuezhanji.top` 强制使用 Supabase。
- 云端报错必须直接显示并允许重试，禁止回退到本地发金币、经验或通关进度。

## 数据规则

- 云端正式表为 `player_profiles`、`battle_sessions`、`reward_ledger`。
- 开战和服务端结算由数据库事务一次提交，避免半套数据。
- 旧本地进度不上传金币、等级、关卡和拥有列表，只迁移昵称、签名、头像，以及云端已经拥有的当前外观。
- 前端只能保存公开 `publishableKey`，`service_role` 只存在于 Supabase Edge Function 环境。

## 发布规则

1. 运行语法检查、`node --test tests/*.test.js` 和源码版浏览器冒烟。
2. 运行 `scripts/sync-release.ps1`，再做发布版浏览器冒烟。
3. 推送 GitHub 默认分支。
4. 推送 Supabase 迁移并部署 `game-api`，验证匿名登录、开战票据和结算。
5. 先部署 Netlify 预览；预览通过后才发布正式站。

Supabase 验证失败时，不允许发布 Netlify 正式版本。
