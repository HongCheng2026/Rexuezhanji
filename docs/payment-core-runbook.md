# 独立微信支付核心：部署与联调手册

## 系统边界

`payment-api` 只负责商品、订单、微信支付、回调验签、查单和发货 Outbox，不读取或修改游戏档案。

`payment-game-adapter` 是热血战姬专用适配器。它只接受 `PAYCORE_DELIVERY_SECRET` 签名的发货事件，通过数据库事务幂等增加钻石。未来新游戏只需实现自己的发货适配器，不修改支付核心。

首版仅启用微信 Native：每笔订单向微信 API v3 请求独立 `code_url`，前端在本地将其编码为二维码。不使用个人收款码、固定二维码、付款截图或人工确认。

## 一次完整到账流程

1. 已登录云端账号的玩家选择钻石档位。
2. `payment-api?action=order-create` 创建价格和奖励快照。
3. 支付核心调用 `/v3/pay/transactions/native`，返回本次订单专属二维码。
4. 微信支付成功后调用 `payment-api?action=wechat-notify`。
5. 支付核心验签、AES-256-GCM 解密并核对 AppID、商户号、订单号、金额、币种和 `SUCCESS`。
6. `paycore_mark_paid` 幂等记录微信交易号并写入发货 Outbox。
7. 支付核心使用 HMAC 调用 `payment-game-adapter`。
8. 适配器执行 `paycore_apply_hotblood_grant`，锁定玩家档案、增加钻石、更新 revision、记录已消费事件。
9. 前端轮询 `order-status`；看到 `deliveryStatus=delivered` 后通知大厅重新同步云档。

回调丢失时，`order-status` 会使用商户订单号主动查询微信。任何前端状态都不能直接发钻石。

## 部署步骤

1. 按顺序执行迁移：

   - `202608090001_paycore_wechat_native.sql`
   - `202608090002_paycore_hotblood_adapter.sql`

2. 生成一个至少 32 字节的随机发货密钥，将同一个值分别配置给两个函数的 `PAYCORE_DELIVERY_SECRET`。不要把密钥提交到仓库或发送到聊天中。

3. 配置 `payment-api` Secrets：

   - `PAYCORE_WECHAT_ENABLED=false`（首次部署保持关闭）
   - `WECHAT_PAY_APP_ID`
   - `WECHAT_PAY_MCH_ID`
   - `WECHAT_PAY_MERCHANT_SERIAL`
   - `WECHAT_PAY_PRIVATE_KEY`
   - `WECHAT_PAY_PLATFORM_SERIAL`
   - `WECHAT_PAY_PLATFORM_PUBLIC_KEY`
   - `WECHAT_PAY_API_V3_KEY`
   - `PAYCORE_WECHAT_NOTIFY_URL=https://<project>.supabase.co/functions/v1/payment-api?action=wechat-notify`
   - `PAYCORE_DELIVERY_URL=https://<project>.supabase.co/functions/v1/payment-game-adapter`
   - `PAYCORE_DELIVERY_SECRET`

4. 配置 `payment-game-adapter` 的 `PAYCORE_DELIVERY_SECRET`。

5. 部署两个公开网关函数；函数内部自行验证用户 JWT、微信签名或 HMAC：

   ```powershell
   supabase functions deploy payment-game-adapter --no-verify-jwt
   supabase functions deploy payment-api --no-verify-jwt
   ```

6. 在微信商户平台确认 AppID 与商户号已绑定、API v3 密钥和证书/公钥有效，并允许回调域名。

7. 设置 `PAYCORE_WECHAT_ENABLED=true`，仅用测试账号购买最低 `¥6` 档。

## 首单验收

- 下单后 `paycore_orders` 出现 `pending/pending` 订单，金额为 600 分。
- 扫描的是以 `weixin://wxpay/` 开头的动态内容，不是固定图片。
- 支付后 `provider_transaction_id` 已写入且唯一。
- `paycore_provider_events` 只有一个已处理事件；重复回调不重复创建 Outbox。
- `paycore_delivery_outbox` 最终为 `delivered`。
- `paycore_hotblood_deliveries` 只有一条对应记录。
- 玩家档案 revision 增加一次；首购 60 档时钻石增加 120，第二次增加 60。
- 刷新页面或重复查单不会再次增加钻石。

## 当前范围

- Micro：固定码/截图人工核销——不采用。
- Useful（当前）：微信 Native 动态订单、回调、主动查单、Outbox、游戏适配器、六档钻石和首充。
- Full（以后）：微信内 JSAPI、手机 H5、退款/拒付、账单自动对账、运营后台和多游戏租户。

当前代码完成不等于微信商户配置已经生效。没有真实商户号、AppID、API v3 密钥和证书时，只能完成静态与本地界面验证，无法产生真实微信订单。
