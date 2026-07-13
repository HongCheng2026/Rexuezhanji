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

## 正式接口

- `bootstrap`：读取或创建存档
- `identity`：读取公开玩家 UID
- `start-battle`：扣除体力并签发战斗票据
- `finish-battle`：校验票据并由服务端结算
- `abandon-battle`：废弃战斗票据
- `sweep`：服务端扫荡
- `upgrade`：大厅属性升级
- `upgrade-fighter`：战机属性升级
- `redeem`：兑换码
- `shop-buy`：商店购买
- `save-cosmetics`：仅保存昵称、头像和展示阵容
- `migrate-anonymous`：游客账号绑定邮箱后迁移

## 安全边界

- 前端只保存公开 publishable key。
- `service_role` 只存在于 Edge Function 环境。
- 金币、体力、经验、关卡和升级全部由服务端计算。
- 正式站不在云端失败后回退到本地结算。
- 数据表对 `anon` 和 `authenticated` 无直接读写权限。
