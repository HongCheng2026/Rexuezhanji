"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const coreSql = fs.readFileSync(path.join(root, "src/backend/migrations/202608090001_paycore_wechat_native.sql"), "utf8");
const adapterSql = fs.readFileSync(path.join(root, "src/backend/migrations/202608090002_paycore_hotblood_adapter.sql"), "utf8");
const paymentApi = fs.readFileSync(path.join(root, "src/backend/functions/payment-api/index.ts"), "utf8");
const deployPaymentApi = fs.readFileSync(path.join(root, "supabase/functions/payment-api/index.ts"), "utf8");
const gameAdapter = fs.readFileSync(path.join(root, "src/backend/functions/payment-game-adapter/index.ts"), "utf8");
const deployGameAdapter = fs.readFileSync(path.join(root, "supabase/functions/payment-game-adapter/index.ts"), "utf8");
const app = fs.readFileSync(path.join(root, "src/h5/PaymentLab/app.js"), "utf8");
const css = fs.readFileSync(path.join(root, "src/h5/PaymentLab/style.css"), "utf8");

test("独立支付核心包含六档人民币钻石商品与首充快照", () => {
  for (const amount of [60, 300, 680, 1280, 3280, 6480]) assert.match(coreSql, new RegExp(`'diamond_${amount}'`));
  assert.match(coreSql, /first_bonus_rewards/);
  assert.match(coreSql, /paycore_entitlements/);
});

test("支付核心不直接依赖游戏档案，游戏写入只存在于适配器", () => {
  assert.doesNotMatch(coreSql, /player_profiles|game-api|reward_ledger/);
  assert.doesNotMatch(paymentApi, /player_profiles|game-api/);
  assert.match(adapterSql, /paycore_apply_hotblood_grant/);
  assert.match(adapterSql, /player_profiles/);
});

test("微信 Native 每单动态下单并通过验签回调或主动查单确认", () => {
  assert.match(paymentApi, /\/v3\/pay\/transactions\/native/);
  assert.match(paymentApi, /code_url/);
  assert.match(paymentApi, /verifyWechat/);
  assert.match(paymentApi, /AES-GCM/);
  assert.match(paymentApi, /transactions\/out-trade-no/);
  assert.doesNotMatch(paymentApi, /收款截图|固定收款码|payment-admin-confirm/);
});

test("付款与发货分别幂等，并用签名 Outbox 解耦", () => {
  assert.match(coreSql, /primary key\(provider, event_id\)/);
  assert.match(coreSql, /PAYCORE_EVENT_REPLAY_MISMATCH/);
  assert.match(coreSql, /v_claimed <> cardinality\(v_order\.benefit_keys\)/);
  assert.match(coreSql, /order_id uuid not null unique/);
  assert.match(coreSql, /paycore_mark_paid/);
  assert.match(coreSql, /paycore_mark_delivery/);
  assert.match(paymentApi, /PAYCORE_DELIVERY_SECRET/);
  assert.match(gameAdapter, /x-paycore-signature/);
  assert.match(adapterSql, /PAYCORE_DELIVERY_REPLAY_MISMATCH/);
});

test("独立支付页面直接调用 payment-api 并本地编码动态二维码", () => {
  assert.match(app, /functions\/v1\/payment-api/);
  assert.match(app, /root\.qrcode/);
  assert.match(app, /order-create/);
  assert.match(app, /order-status/);
  assert.match(app, /rx-paycore-delivered/);
  assert.match(app, /paycorePendingCreate/);
  assert.doesNotMatch(app, /wechat-donation-qr|收款截图/);
  assert.match(css, /\.paylab-app button:focus-visible/);
  assert.doesNotMatch(css, /^\s*(button|article|section|header)\s*\{/m);
});

test("部署函数与后端镜像完全一致", () => {
  assert.equal(paymentApi, deployPaymentApi);
  assert.equal(gameAdapter, deployGameAdapter);
});
