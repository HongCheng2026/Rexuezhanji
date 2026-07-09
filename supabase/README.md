# 热血战姬 云存档部署指南

## 前置条件

- 已有 Supabase 项目（URL: `https://syrgflrmhptdpdpxhmbf.supabase.co`）
- 本地安装了 Supabase CLI（`npm i -g supabase`）或可访问 Supabase Dashboard SQL Editor

---

## 方式一：CLI 一键部署（推荐）

在项目根目录 `E:\JT\20260618-热血战姬` 执行：

```powershell
# 1. 登录 Supabase（如果还没登录）
supabase login

# 2. 关联已有项目
supabase link --project-ref syrgflrmhptdpdpxhmbf

# 3. 推送数据库迁移（建表 + RLS 策略 + Postgres 函数）
supabase db push

# 4. 部署 Edge Function
supabase functions deploy game-api
```

部署完成后，打开 `E:\JT\20260618-热血战姬\部署\通用代码\H5\index.html` 即可测试云存档。

---

## 方式二：手动部署（Dashboard）

### 步骤 1：创建数据库表

1. 打开 Supabase Dashboard → SQL Editor
2. 复制 `supabase/migrations/001_cloud_save.sql` 全部内容
3. 粘贴并点击 **Run**

这会创建：
- `profiles` 表（玩家存档）
- `battle_tickets` 表（战斗票据）
- `redeem_codes` 表（兑换码）
- `code_redemptions` 表（兑换记录）
- 所有 RLS 安全策略
- 所有原子操作 Postgres 函数

### 步骤 2：部署 Edge Function

1. 打开 Supabase Dashboard → Edge Functions
2. 点击 **Create a new function**
3. 名称填 `game-api`
4. 将 `supabase/functions/game-api/index.ts` 内容粘贴进去
5. 点击 **Deploy**

### 步骤 3：验证

在 Supabase Dashboard → Edge Functions → game-api → 复制 URL，格式应为：
`https://syrgflrmhptdpdpxhmbf.supabase.co/functions/v1/game-api`

无需额外配置——前端 `cloud-save.js` 已经指向这个地址。

---

## 文件列表

| 文件 | 用途 |
|------|------|
| `supabase/migrations/001_cloud_save.sql` | 建表 + RLS + 原子操作函数 |
| `supabase/functions/game-api/index.ts` | 10 个 action 的完整 Edge Function |

## Action 一览

| Action | 功能 | 防作弊校验 |
|--------|------|-----------|
| `bootstrap` | 获取/创建玩家存档 | 无（初始化） |
| `start-battle` | 扣体力、签发战斗票据 | 体力检查、关卡解锁检查 |
| `finish-battle` | 验证票据、结算奖励 | 票据有效性、奖励服务端计算 |
| `abandon-battle` | 废弃票据、退还部分体力 | 票据有效性 |
| `sweep` | 扫荡已通关卡 | 通关验证、体力检查、奖励服务端计算 |
| `upgrade` | 升级大厅属性 | 金币检查、等级上限检查、费用服务端计算 |
| `upgrade-fighter` | 升级战机属性 | 金币检查、指挥官等级检查、费用服务端计算 |
| `redeem` | 兑换码 | 码有效性、等级检查、重复兑换检查 |
| `shop-buy` | 商城购买 | 钻石检查、库存服务端计算 |
| `save-cosmetics` | 保存装扮选择 | 拥有权检查 |
| `migrate-anonymous` | 匿名账号合并 | 源账号验证 |

---

## 安全说明

- 前端只使用 `publishableKey`（匿名密钥），已在 `supabase-config.js` 中配置
- 所有高价值操作（金币、体力、升级）由 Edge Function 服务端计算，不信任客户端传入的数值
- RLS 策略确保用户只能访问自己的数据
- `service_role` 密钥仅 Edge Function 内部使用，不出现在前端代码中
- 战斗票据机制防止重放攻击：每场战斗只有一个有效票据，用后即焚
