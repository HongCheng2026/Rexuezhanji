"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const migration = fs.readFileSync(path.join(root, "src/backend/migrations/202608050002_payment_channels.sql"), "utf8");
const service = fs.readFileSync(path.join(root, "src/backend/functions/game-api/services/payments.ts"), "utf8");
const deployService = fs.readFileSync(path.join(root, "supabase/functions/game-api/services/payments.ts"), "utf8");

test("权威商品目录包含六档钻石与三个永久限购礼包", () => {
  const diamondIds = [60, 300, 680, 1280, 3280, 6480].map((amount) => `diamond_${amount}`);
  for (const id of diamondIds) assert.match(migration, new RegExp(`'${id}'`));
  for (const id of ["bundle_recruit", "bundle_ace", "bundle_flagship"]) assert.match(migration, new RegExp(`'${id}'`));
  assert.match(migration, /\('diamond_60', 'GLOBAL', 'paypal', 99, 'USD', true\)/);
  assert.match(migration, /\('diamond_6480', 'CN', 'wechat', 64800, 'CNY', true\)/);
});

test("首充与礼包权益、事件和渠道交易双重幂等在数据库层生效", () => {
  assert.match(migration, /primary key \(player_id, benefit_key\)/);
  assert.match(migration, /unique\(provider, event_id\)/);
  assert.match(migration, /on public\.payment_orders\(provider, provider_capture_id\)/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /create_payment_order_v2/);
  assert.match(migration, /fulfill_payment_order_v2/);
  assert.match(migration, /reverse_payment_order_v2/);
});

test("退款原子追回钻石与道具，不恢复已认领权益", () => {
  assert.match(migration, /payment_resource_debts/);
  assert.match(migration, /paymentDebtLocked/);
  assert.match(migration, /resource_type = 'diamonds'/);
  assert.match(migration, /resource_type = 'item'/);
  assert.doesNotMatch(migration, /delete from public\.payment_entitlements[\s\S]{0,200}state = 'claimed'/);
});

test("旧的共享密钥模拟回调已移除，真实渠道回调包含验签与解密", () => {
  assert.doesNotMatch(service, /PAYMENT_WEBHOOK_SECRET|x-rx-payment-secret/);
  assert.match(service, /verifyWechatSignature/);
  assert.match(service, /AES-GCM/);
  assert.match(service, /verify-webhook-signature/);
  assert.match(service, /PAYMENT_ADMIN_HMAC_SECRET/);
  assert.equal(service, deployService);
});

test("PC 微信码使用冻结在本地的编码器生成可扫 SVG", () => {
  const qrcode = require("../src/h5/UI/Payment/vendor/qrcode-generator.js");
  const qr = qrcode(0, "M");
  qr.addData("weixin://wxpay/bizpayurl?pr=payment-test", "Byte");
  qr.make();
  const svg = qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
  assert.ok(qr.getModuleCount() >= 21);
  assert.match(svg, /^<svg/);
  assert.match(svg, /fill="black"/);
});

test("顶层支付桥只允许同源、微信与 PayPal HTTPS 目的地", () => {
  const code = fs.readFileSync(path.join(root, "src/h5/Game/Payment/paymentHostBridge.js"), "utf8");
  const context = {
    URL,
    Set,
    module: { exports: {} },
    location: { href: "https://rexuezhanji.top/", origin: "https://rexuezhanji.top" },
    document: { getElementById: () => null, title: "game" },
    history: { replaceState() {} },
    addEventListener() {}
  };
  context.globalThis = context;
  vm.runInNewContext(code, context);
  const bridge = context.module.exports;
  assert.equal(bridge.trustedDestination("https://www.paypal.com/checkoutnow")?.hostname, "www.paypal.com");
  assert.equal(bridge.trustedDestination("https://wx.tenpay.com/cgi-bin/mmpayweb-bin/checkmweb")?.hostname, "wx.tenpay.com");
  assert.equal(bridge.trustedDestination("http://www.paypal.com/checkoutnow"), null);
  assert.equal(bridge.trustedDestination("https://paypal.example.com/phish"), null);
});

test("充值入口只托管独立支付页面并在发货后同步权威档案", () => {
  const room = fs.readFileSync(path.join(root, "src/h5/UI/Payment/rechargeRoom.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "src/h5/UI/Payment/rechargeView.css"), "utf8");
  assert.match(room, /PaymentLab\/index\.html/);
  assert.match(room, /rx-paycore-delivered/);
  assert.match(room, /gateway\.syncProfile\(0\)/);
  assert.doesNotMatch(room, /createPaymentOrder|capturePaypalPayment|wechat_jsapi/);
  assert.match(css, /\.paycore-host__frame/);
  assert.doesNotMatch(css, /^\s*(button|article|section|header)\s*\{/m);
});

test("充值宿主在本地模式阻止下单，云端模式只挂载独立 iframe", () => {
  const room = fs.readFileSync(path.join(root, "src/h5/UI/Payment/rechargeRoom.js"), "utf8");
  let factory = null;
  const context = {
    module: { exports: {} },
    RXGame: { roomRegistry: { defineRoom(name, value) { if (name === "recharge") factory = value; } } },
    addEventListener() {}, removeEventListener() {}, location: { origin: "https://game.example" }
  };
  context.globalThis = context;
  vm.runInNewContext(room, context);
  assert.equal(typeof factory, "function");

  const slots = { className: "", innerHTML: "" };
  let shellMode = "";
  const dom = { featurePanelKicker: {}, featurePanelTitle: {}, featurePanelBody: {}, featurePanelSlots: slots };
  const local = factory({ dom, payment: { openShell(mode) { shellMode = mode; }, isCloudMode() { return false; } } });
  local.actions["recharge.open"]();
  assert.match(shellMode, /paycore-host-panel/);
  assert.match(slots.innerHTML, /充值服务不可用/);
  assert.doesNotMatch(slots.innerHTML, /<iframe/);

  const cloud = factory({ dom, payment: { openShell() {}, isCloudMode() { return true; } } });
  cloud.actions["recharge.open"]();
  assert.match(slots.innerHTML, /<iframe[^>]+PaymentLab\/index\.html\?embed=1/);
});
