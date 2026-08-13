"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

delete global.RXGame;
const catalog = require("../src/h5/UI/Inventory/inventoryCatalog.js");
const view = require("../src/h5/UI/Inventory/inventoryView.js");

test("背包分类与顶部资源使用图片 UI，且默认不显示旧状态说明和体力", () => {
  const mount = { innerHTML: "" };
  const uiAssets = {
    terminalBackground: "terminal.png",
    categoryAll: "all.png",
    categoryConsumable: "consumable.png",
    categoryMaterial: "material.png",
    categoryTicket: "ticket.png",
    categoryArchive: "archive.png",
    resourceGold: "gold.png",
    resourceDiamond: "diamond.png",
    resourceTicket: "research-ticket.png"
  };
  view.create({ mount, catalog, uiAssets }).render({
    filter: "all",
    items: [],
    selected: null,
    resources: { gold: 1234, diamonds: 56, tickets: 7 },
    message: ""
  });

  for (const src of ["all.png", "consumable.png", "material.png", "ticket.png", "archive.png", "gold.png", "diamond.png", "research-ticket.png"]) {
    assert.match(mount.innerHTML, new RegExp('src="' + src.replace(".", "\\.") + '"'));
  }
  assert.match(mount.innerHTML, /星链研究券/);
  assert.doesNotMatch(mount.innerHTML, />体力</);
  assert.doesNotMatch(mount.innerHTML, /所有道具沿用当前存档结构/);
  assert.doesNotMatch(mount.innerHTML, /inventory-status/);
  assert.match(mount.innerHTML, /class="inventory-close"/);
});

test("详情使用完整品质框，出售显示回收资源并弹出回收提示", () => {
  const mount = { innerHTML: "" };
  const selected = {
    id: "auto_weapon_module_purple",
    name: "自动武器模块",
    category: "material",
    rarity: "purple",
    description: "用于自动武装升级。",
    source: "商店",
    quantity: 2,
    icon: "module.png",
    relatedPanel: "shipGallery",
    sellPrice: 10000,
    sellCurrency: "gold"
  };
  view.create({ mount, catalog, uiAssets: { resourceGold: "gold.png", resourceDiamond: "diamond.png" } }).render({
    filter: "all",
    items: [selected],
    selectedId: selected.id,
    selected,
    resources: { gold: 0, diamonds: 0, tickets: 0 },
    feedback: { kind: "sell", currency: "gold", amount: 10000 }
  });

  assert.doesNotMatch(mount.innerHTML, /查看对应图鉴|data-inventory-action="navigate"|原价/);
  assert.match(mount.innerHTML, /inventory-detail-card rarity-purple/);
  assert.match(mount.innerHTML, /inventory-sell-button/);
  assert.match(mount.innerHTML, /src="gold\.png"/);
  assert.match(mount.innerHTML, /\+10,000/);
  assert.match(mount.innerHTML, /资源回收完成/);
  assert.match(mount.innerHTML, /data-inventory-action="dismiss-feedback"/);

  const css = fs.readFileSync(path.join(__dirname, "../src/h5/UI/Inventory/inventoryView.css"), "utf8");
  assert.doesNotMatch(css, /inventory-resource-chip::after|clip-path:/);
  assert.match(css, /\.inventory-detail-card\s*\{[\s\S]*?border:\s*1px solid/);
});
