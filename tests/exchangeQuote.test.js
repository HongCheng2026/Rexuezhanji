"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

// 兑换报价与目录元数据：getExchangeQuote / getExchangeItem 是 Line 2 兑换对话框的核心计算。
global.RXGame = {};
const shopConfig = require("../src/h5/UI/Shop/ShopConfig.js");
const shopView = require("../src/h5/UI/Shop/ShopView.js");
const assets = require("../src/h5/Presentation/Assets/assets.js");

test("getExchangeQuote computes spend/gain for a 1:1 SSS exchange", () => {
  const profile = { resources: { inventory: { sss_pilot_medal: 3, sss_fighter_module: 2 } } };
  const quote = shopView.getExchangeQuote(profile, "exchange_sss_fighter_module", 1);
  assert.equal(quote.canExchange, true);
  assert.equal(quote.sourceCount, 3);
  assert.equal(quote.targetCount, 2);
  assert.equal(quote.pricePerSwap, 1);
  assert.equal(quote.gainPerSwap, 1);
  assert.equal(quote.spendQuantity, 1);
  assert.equal(quote.gainQuantity, 1);
  assert.equal(quote.fromItem.id, "sss_pilot_medal");
  assert.equal(quote.toItem.id, "sss_fighter_module");
});

test("getExchangeQuote respects inventory for max quantity (1:2 core -> module)", () => {
  const profile = { resources: { inventory: { auto_weapon_module_gold: 4, auto_weapon_module_purple: 0 } } };
  const quote = shopView.getExchangeQuote(profile, "exchange_core_to_blue_module", 99);
  assert.equal(quote.maxQuantity, 4, "4 个金核心最多兑换 4 次");
  assert.equal(quote.gainPerSwap, 2, "1 个金核心换 2 个紫模块");
  assert.equal(quote.gainQuantity, 8, "4 次 × 2 = 8 个紫模块");
  assert.equal(quote.canExchange, true);
});

test("getExchangeQuote cannot exchange without source material", () => {
  const profile = { resources: { inventory: { sss_pilot_medal: 0 } } };
  const quote = shopView.getExchangeQuote(profile, "exchange_sss_fighter_module", 1);
  assert.equal(quote.canExchange, false);
  assert.equal(quote.maxQuantity, 0);
  assert.equal(quote.spendQuantity, 0);
  assert.equal(quote.gainQuantity, 0);
});

test("getExchangeQuote bounds quantity to available source and 99 cap", () => {
  const profile = { resources: { inventory: { sss_pilot_medal: 200 } } };
  const quote = shopView.getExchangeQuote(profile, "exchange_sss_fighter_module", 99);
  assert.equal(quote.maxQuantity, 99, "上限为 99");
  assert.equal(quote.quantity, 99);
  assert.equal(quote.spendQuantity, 99);
  assert.equal(quote.gainQuantity, 99);
});

test("getExchangeItem returns catalog metadata for both sides, null for unknown", () => {
  assert.ok(shopView.getExchangeItem("sss_pilot_medal"));
  assert.ok(shopView.getExchangeItem("sss_fighter_module"));
  assert.equal(shopView.getExchangeItem("nonexistent_id"), null);
});
