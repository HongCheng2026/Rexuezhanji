# 热血战姬云存档部署

正式云端由两部分组成：

- Postgres：`player_profiles`、`battle_sessions`、`reward_ledger`
- Edge Function：`supabase/functions/game-api/index.ts`

旧版 `profiles / battle_tickets` 和客户端 RPC 只用于历史兼容，会由后续迁移自动清理。不要再单独复制 `001_cloud_save.sql` 到 SQL Editor。

## 部署

```powershell
supabase login
supabase link --project-ref syrgflrmhptdpdpxhmbf
supabase db push
supabase functions deploy game-api --project-ref syrgflrmhptdpdpxhmbf
```

Supabase Auth 必须开启匿名登录，否则 H5 无法自动创建游客账号。

## 邮箱 / 手机验证码找回存档

玩家资料页的“云存档”分页使用 Supabase Email OTP 与 Phone OTP。游客可选择
“绑定当前存档”或“读取已有存档”，并自由选择邮箱或手机接收 6 位验证码。部署前确认：

- Authentication > Sign In / Providers 中同时开启 Email 和 Anonymous Sign-Ins。
- Authentication > Email Templates 的 Magic Link 模板中包含 `{{ .Token }}`，确保邮件展示可手动输入的验证码，而不是只有登录链接。当前正式项目使用免费层默认邮件服务，Management API 会拒绝自定义模板；必须先配置 Custom SMTP 或升级支持模板修改的套餐。
- 邮件模板建议正文：`<p>您的云存档验证码：<strong>{{ .Token }}</strong></p>`。生产环境同时配置 Custom SMTP，默认邮件服务只适合受限测试收件人。
- Authentication > Sign In / Providers 中开启 Phone，并在 SMS Provider 中完整配置供应商。当前项目选择了 Twilio，但仍需确认 Account SID、Auth Token、Message Service SID 三项凭据；凭据未就绪时不要只打开 Phone 开关。
- 前端重发按钮按 60 秒倒计时；服务端仍以 Supabase Auth 的 OTP 频控和过期配置为准。
- 绑定当前档会以 `create_user: true` 请求验证码；读取已有档会以 `create_user: false` 请求，避免误建空账号。
- 登录已有邮箱或手机号时，已有云存档优先，不与当前游客经济数据合并。`migrate-anonymous` 只接受真实匿名源账号。

截至 2026-08-09，正式项目公开 Auth 状态为 Email / Anonymous 已开启、Phone 未开启；
Magic Link 模板尚不含 `{{ .Token }}`。完成 Custom SMTP 与 Twilio 凭据配置后，再开启 Phone，
并分别用一个新账号和一个已有账号做真实收件端验证。短信存在实际费用，正式开放前还需配置
频控、CAPTCHA 与防滥用策略。

## 正式接口

- `bootstrap`：读取或创建存档
- `identity`：读取公开玩家 UID
- `start-battle`：扣除体力并签发战斗票据
- `finish-battle`：校验票据并由服务端结算
- `abandon-battle`：废弃战斗票据
- `sweep`：服务端扫荡
- `upgrade`：大厅属性升级
- `upgrade-fighter`：战机属性升级
- `codex-activate`：原子激活已拥有单位或已集齐羁绊
- `redeem`：兑换码
- `shop-buy`：商店购买
- `save-cosmetics`：仅保存昵称、头像和展示阵容
- `migrate-anonymous`：游客账号绑定邮箱或手机号后迁移

## 安全边界

- 前端只保存公开 publishable key。
- `service_role` 只存在于 Edge Function 环境。
- 金币、体力、经验、关卡和升级全部由服务端计算。
- 正式站不在云端失败后回退到本地结算。
- 数据表对 `anon` 和 `authenticated` 无直接读写权限。

## 经济会话与支付

新的独立微信支付核心见 [`docs/payment-core-runbook.md`](../../docs/payment-core-runbook.md)。它通过独立 `payment-api` 与 `payment-game-adapter` 部署，不依赖 `game-api` 内的历史支付骨架。

`202607300001_economy_sessions.sql` 保留经济安全骨架；
`202608050002_payment_channels.sql` 在其后增加权威商品目录、分市场价格、订单快照、
首充/礼包权益、渠道事件、发货、全额退款和资源欠账。部署顺序必须是数据库迁移在前，
Edge Function 在后。

`202608050003_codex_activation.sql` 将旧 `codexBonds` 无损迁移为图鉴模块自有的
`codex.activatedUnits / codex.activatedBonds`，并提供并发安全、幂等的图鉴激活事务。

- `payment-catalog`：渠道开关、账户资格、商品价格、首充与限购状态。
- `payment-order-create`：只接受 `offerId`、市场、支付场景与 UUID 幂等键。
- `payment-paypal-capture`：PayPal 买家批准后由服务端捕获订单。
- `payment-order-status`：查询支付、发货和退款状态；发货完成后返回权威档案。
- `payment-wechat-oauth` 为微信 OAuth GET 回调；`payment-wechat-notify` 和
  `payment-wechat-refund-notify` 使用 API v3 原始正文验签与 AES-256-GCM 解密。
- `payment-paypal-webhook` 先调用 PayPal 官方验签接口，再读取 capture 校验订单、金额和币种。
- `payment-admin-refund` 只供 `scripts/payment-refund.ps1` 使用，不在前端暴露。

默认配置为 `PAYMENTS_MODE=off`。先在 sandbox 完成联调，再单独开启 PayPal；
微信还需版号、实名防沉迷、AppID、商户号、支付目录/域名全部就绪。

```powershell
supabase secrets set PAYMENTS_MODE="sandbox" PAYPAL_PAY_ENABLED="true" `
  PAYPAL_CLIENT_ID="..." PAYPAL_CLIENT_SECRET="..." PAYPAL_WEBHOOK_ID="..." `
  PAYMENT_RETURN_URL="https://rexuezhanji.top/" PAYMENT_ADMIN_HMAC_SECRET="..." `
  --project-ref syrgflrmhptdpdpxhmbf
```

微信联调还需 `WECHAT_PAY_ENABLED`、`WECHAT_PAY_APP_ID`、`WECHAT_PAY_APP_SECRET`、
`WECHAT_PAY_MCH_ID`、`WECHAT_PAY_MERCHANT_SERIAL`、`WECHAT_PAY_PRIVATE_KEY`、
`WECHAT_PAY_PLATFORM_SERIAL`、`WECHAT_PAY_PLATFORM_PUBLIC_KEY`、`WECHAT_PAY_API_V3_KEY`、
`WECHAT_PAY_NOTIFY_URL`、`WECHAT_PAY_REFUND_NOTIFY_URL` 和 `WECHAT_PAY_OAUTH_CALLBACK_URL`。
私钥、openid、邮箱和回调全文不得写入日志。
