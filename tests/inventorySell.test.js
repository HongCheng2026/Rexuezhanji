"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

// 背包原价出售：紫阶模块返金币，金阶模块返钻石；无售价或数量为 0 不可售。
global.RXGame = {};
const inventoryCatalog = require("../src/h5/UI/Inventory/inventoryCatalog.js");
const inventoryModel = require("../src/h5/UI/Inventory/inventoryModel.js");

test("原价出售紫阶自动武器模块返还金币", () => {
  const profile = { resources: { gold: 0, inventory: { auto_weapon_module_purple: 2 } } };
  const result = inventoryModel.sell(profile, "auto_weapon_module_purple", inventoryCatalog);
  assert.equal(result.ok, true);
  assert.equal(result.sellCurrency, "gold");
  assert.equal(result.refunded, 10000);
  assert.equal(result.profile.resources.gold, 10000);
  assert.equal(result.profile.resources.inventory.auto_weapon_module_purple, 1);
});

test("原价出售金阶自动武器模块返还钻石", () => {
  const profile = { resources: { diamonds: 0, inventory: { auto_weapon_module_gold: 1 } } };
  const result = inventoryModel.sell(profile, "auto_weapon_module_gold", inventoryCatalog);
  assert.equal(result.ok, true);
  assert.equal(result.sellCurrency, "diamonds");
  assert.equal(result.refunded, 100);
  assert.equal(result.profile.resources.diamonds, 100);
  assert.equal(result.profile.resources.inventory.auto_weapon_module_gold, 0);
});

test("无售价或数量为 0 时不可出售", () => {
  const result = inventoryModel.sell(
    { resources: { gold: 0, inventory: {} } },
    "auto_weapon_module_purple",
    inventoryCatalog
  );
  assert.equal(result.ok, false);
  assert.equal(result.reason, "CANNOT_SELL");
});
