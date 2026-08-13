"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

// 商店重构：三个等宽商品分类，兑换页以对方 SSS 物资作为商品价格。
global.RXGame = {};
const shopConfig = require("../src/h5/UI/Shop/ShopConfig.js");
const shopView = require("../src/h5/UI/Shop/ShopView.js");
const assets = require("../src/h5/Presentation/Assets/assets.js");

test("商店导出金币、钻石、兑换三个分类，默认打开金币", () => {
  const content = shopConfig.SHOP_CONTENT;
  assert.ok(Array.isArray(content) && content.length > 0, "SHOP_CONTENT 应为非空数组");
  assert.deepEqual(shopConfig.SHOP_CATEGORIES, ["金币", "钻石", "兑换"]);
  assert.deepEqual(shopView.getShopTabs(), ["金币", "钻石", "兑换"]);
  assert.equal(shopView.ensureActiveShopTab(), "金币");
  assert.equal(shopConfig.SHOP_SECTIONS, undefined);
});

test("金币、钻石商品按币种分类，兑换商品使用背包物资定价", () => {
  for (const item of shopConfig.SHOP_CONTENT) {
    assert.ok(["gold", "diamonds", "item"].includes(item.priceCurrency), item.id + " 的价格货币非法：" + item.priceCurrency);
    if (item.priceCurrency === "item") {
      assert.equal(item.category, "兑换");
      assert.ok(item.priceItemId && item.priceItemTitle && item.priceItemImage, item.id + " 缺少兑换价格物资");
    } else assert.equal(item.category, item.priceCurrency === "gold" ? "金币" : "钻石", item.id + " 分类与支付币种不一致");
    assert.equal(Object.hasOwn(item, "section"), false, item.id + " 不应保留 section 字段");
    assert.ok(item.description, item.id + " 缺少商品说明");
  }
});

test("金币页 9 件、钻石页 6 件，商品互不混入", () => {
  const goldItems = shopConfig.SHOP_CONTENT.filter((item) => item.priceCurrency === "gold");
  const diamondItems = shopConfig.SHOP_CONTENT.filter((item) => item.priceCurrency === "diamonds");
  assert.equal(goldItems.length, 9);
  assert.equal(diamondItems.length, 6);

  shopView.setShopTab("金币");
  const goldHtml = shopView.renderShopPanel({ resources: { gold: 0, diamonds: 0 } }, assets);
  assert.equal((goldHtml.match(/<article class="shop-item-card/g) || []).length, 9);
  assert.match(goldHtml, /体力药水（当日）/);
  assert.match(goldHtml, /主动技能模组·C/);
  assert.doesNotMatch(goldHtml, /不限购/);
  assert.doesNotMatch(goldHtml, /体力药水（库存）/);
  assert.doesNotMatch(goldHtml, /主动技能模组·S</);

  shopView.setShopTab("钻石");
  const diamondHtml = shopView.renderShopPanel({ resources: { gold: 0, diamonds: 0 } }, assets);
  assert.equal((diamondHtml.match(/<article class="shop-item-card/g) || []).length, 6);
  assert.match(diamondHtml, />体力药水</);
  assert.doesNotMatch(diamondHtml, /体力药水（库存）/);
  assert.match(diamondHtml, /主动技能模组·S</);
  assert.doesNotMatch(diamondHtml, /不限购/);
  assert.doesNotMatch(diamondHtml, /体力药水（当日）/);
  assert.doesNotMatch(diamondHtml, /主动技能模组·C/);
});

test("三个顶部标签不渲染旧用途条、数量徽章和卡片结算徽章", () => {
  shopView.setShopTab("金币");
  const html = shopView.renderShopPanel({ resources: { gold: 0, diamonds: 0 } }, assets);
  assert.equal((html.match(/data-feature-tab=/g) || []).length, 3);
  assert.match(html, /data-feature-tab="金币"/);
  assert.match(html, /data-feature-tab="钻石"/);
  assert.match(html, /data-feature-tab="兑换"/);
  assert.doesNotMatch(html, /shop-section-brief|shop-section-stats|shop-currency-tag|data-shop-section/);
  assert.doesNotMatch(html, /金币结算|钻石结算/);
  assert.doesNotMatch(html, /购买前确认/);
  assert.match(html, /shop-currency-icon gold/);
  assert.match(html, /shop-currency-icon diamond/);
  assert.match(html, /shop-currency-icon exchange/);
  const tabbarHtml = html.match(/<nav class="feature-tabbar"[\s\S]*?<\/nav>/)?.[0] || "";
  assert.doesNotMatch(tabbarHtml, /<b>/, "标签不应包含商品数量徽章");
  for (const oldTab of ["补给", "武装", "技能", "晋升", "研究"]) {
    assert.doesNotMatch(tabbarHtml, new RegExp(`data-feature-tab="${oldTab}"`));
  }
});

test("兑换页展示四种物资（SSS双向+武器模组/核心双向）并按比例批量兑换", () => {
  const profile = {
    resources: {
      inventory: {
        sss_fighter_module: 3,
        sss_pilot_medal: 2,
        active_weapon_module: 5,
        auto_weapon_module_gold: 4
      }
    }
  };

  shopView.setShopTab("兑换");
  const html = shopView.renderShopPanel(profile, assets);
  assert.equal((html.match(/<article class="shop-item-card/g) || []).length, 4);
  assert.match(html, /SSS战机模组/);
  assert.match(html, /SSS级战姬奖章/);
  assert.match(html, /自动武器核心/);     // 武器模组→紫核心
  assert.match(html, /自动武器模块/);       // 紫核心→蓝模块
  assert.match(html, /data-shop-buy="exchange_sss_fighter_module"/);
  assert.match(html, /data-shop-buy="exchange_sss_pilot_medal"/);
  assert.match(html, /data-shop-buy="exchange_weapon_module_to_core"/);
  assert.match(html, /data-shop-buy="exchange_core_to_blue_module"/);
  assert.match(html, /shop-price-item-icon/);
  assert.match(html, /shop-item-owned">持有 <b>2<\/b>/);
  assert.match(html, /shop-item-owned">持有 <b>3<\/b>/);
  assert.doesNotMatch(html, /不限购/);
  assert.doesNotMatch(html, /shop-exchange-workbench|data-shop-exchange=/);

  const fighterProduct = shopConfig.getShopItem("exchange_sss_fighter_module");
  const pilotProduct = shopConfig.getShopItem("exchange_sss_pilot_medal");
  assert.equal(fighterProduct.priceItemId, "sss_pilot_medal");
  assert.equal(pilotProduct.priceItemId, "sss_fighter_module");
  const quote = shopView.getPurchaseQuote(profile, fighterProduct, 2);
  assert.equal(quote.quantity, 2);
  assert.equal(quote.maxQuantity, 2);
  assert.equal(quote.totalPrice, 2);
  assert.equal(quote.balance, 2);
  assert.equal(quote.affordable, true);

  const pending = shopView.buyShopItem(profile, fighterProduct.id, { quantity: 2 });
  assert.equal(pending.reason, "CONFIRM_REQUIRED");
  assert.deepEqual(profile.resources.inventory, { sss_fighter_module: 3, sss_pilot_medal: 2, active_weapon_module: 5, auto_weapon_module_gold: 4 });

  const forward = shopView.buyShopItem(profile, fighterProduct.id, { quantity: 2, confirmed: true });
  assert.equal(forward.ok, true);
  assert.equal(forward.quantity, 2);
  assert.deepEqual(profile.resources.inventory, { sss_fighter_module: 5, sss_pilot_medal: 0, active_weapon_module: 5, auto_weapon_module_gold: 4 });

  const reverse = shopView.buyShopItem(profile, pilotProduct.id, { quantity: 1, confirmed: true });
  assert.equal(reverse.ok, true);
  assert.deepEqual(profile.resources.inventory, { sss_fighter_module: 4, sss_pilot_medal: 1, active_weapon_module: 5, auto_weapon_module_gold: 4 });
  shopView.setShopTab("金币");
});

test("兑换库存不足或物资非法时档案保持不变", () => {
  const profile = { resources: { inventory: { sss_fighter_module: 0, sss_pilot_medal: 1 } } };
  const before = structuredClone(profile);
  assert.equal(
    shopView.buyShopItem(profile, "exchange_sss_pilot_medal", { quantity: 1, confirmed: true }).reason,
    "PRICE_ITEM_NOT_ENOUGH"
  );
  assert.deepEqual(profile, before);
  assert.equal(
    shopView.buyShopItem(profile, "unknown_item", { quantity: 1, confirmed: true }).reason,
    "SHOP_ITEM_NOT_FOUND"
  );
  assert.deepEqual(profile, before);
});

test("19 件商品均有存在的运行时图片，兑换商品沿用现有物资素材", () => {
  assert.equal(shopConfig.SHOP_CONTENT.length, 19);
  const assetPaths = [];
  for (const item of shopConfig.SHOP_CONTENT) {
    const assetPath = assets.SHOP_ITEM_ASSETS[item.image];
    assert.ok(assetPath, item.id + " 缺少 SHOP_ITEM_ASSETS 映射");
    assert.ok(fs.existsSync(path.join(__dirname, "..", assetPath.split("?")[0])), item.id + " 图片不存在：" + assetPath);
    assetPaths.push(assetPath);
  }
  assert.equal(assetPaths.length, 19);
  assert.match(assets.SHOP_ITEM_ASSETS.sss_fighter_module, /inventory\/items\/sss-weapon-module\.png\?rev=20260729a$/);
  assert.match(assets.SHOP_ITEM_ASSETS.sss_pilot_medal, /inventory\/items\/sss-pilot-medal\.png\?rev=20260729a$/);
});

test("三个商店标签等宽且顶部资源块不再绘制左侧竖线", () => {
  const css = fs.readFileSync(path.join(__dirname, "../src/h5/UI/FeaturePanels/mainFeaturePanelsView.css"), "utf8");
  assert.match(css, /shop-board \.feature-tabbar[\s\S]*?grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
  assert.match(css, /feature-panel-resources > span[\s\S]*?border-left:\s*0/);
  assert.match(css, /shop-item-price \.shop-currency-icon[\s\S]*?height:\s*19px[\s\S]*?width:\s*19px/);
});

test("商店标题使用独立的星港补给终端徽记", () => {
  const emblem = assets.FEATURE_PANEL_ASSETS.shopHeaderEmblem;
  assert.match(emblem, /assets\/runtime\/shop\/ui\/shop-terminal-emblem\.png\?rev=20260729a$/);
  assert.ok(fs.existsSync(path.join(__dirname, "..", emblem.split("?")[0])), "商店标题徽记文件不存在：" + emblem);
  const css = fs.readFileSync(path.join(__dirname, "../src/h5/UI/FeaturePanels/mainFeaturePanelsView.css"), "utf8");
  assert.match(css, /--rx-fp-shop-header-emblem/);
});

test("getShopItem 按 id 精确命中商品", () => {
  const item = shopConfig.getShopItem("auto_weapon_module_purple");
  assert.ok(item, "应能查到 auto_weapon_module_purple");
  assert.equal(item.category, "金币");
  assert.equal(shopConfig.getShopItem("nope-404"), null);
});

test("星链研究券单价为 120 钻石，S 级令牌写明 A 晋升到 S", () => {
  const ticket = shopConfig.getShopItem("starlink_ticket");
  assert.equal(ticket.priceAmount, 120);
  assert.equal(ticket.price, "120 钻石");
  assert.match(shopConfig.getShopItem("pilot_rank_s_token").description, /A 级驾驶员晋升至 S 级/);
  assert.match(shopConfig.getShopItem("fighter_rank_s_token").description, /A 级战机晋升至 S 级/);
});

test("购买追踪使用本地日期键(YYYY-MM-DD)与周键(YYYY-Www)", () => {
  const d = new Date(2026, 0, 5); // 2026-01-05 周一
  const dateKey = shopView.localDateKey(d);
  assert.match(dateKey, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(dateKey, "2026-01-05");
  const weekKey = shopView.isoWeekString(d);
  assert.match(weekKey, /^\d{4}-W\d{2}$/);
  assert.equal(weekKey, "2026-W02");
});

test("周限购兼容读取旧版无 W 的周键", () => {
  const item = shopConfig.getShopItem("auto_weapon_module_purple");
  const currentWeekKey = shopView.isoWeekString();
  const legacyWeekKey = currentWeekKey.replace("-W", "-");
  const profile = { shopWeeklyPurchases: { [legacyWeekKey]: { [item.id]: 3 } } };
  assert.equal(shopView.getItemState(profile, item).count, 3);
});

test("金币不足与钻石不足时不扣款也不发放奖励", () => {
  const goldProfile = { resources: { gold: 999, diamonds: 0, energy: 0, maxEnergy: 200, inventory: {} } };
  assert.deepEqual(shopView.buyShopItem(goldProfile, "energy_potion_daily"), {
    ok: false,
    reason: "GOLD_NOT_ENOUGH",
    itemId: "energy_potion_daily"
  });
  assert.equal(goldProfile.resources.gold, 999);
  assert.equal(goldProfile.resources.energy, 0);

  const diamondProfile = { resources: { gold: 0, diamonds: 119, energy: 0, maxEnergy: 200, inventory: {} } };
  assert.deepEqual(shopView.buyShopItem(diamondProfile, "starlink_ticket"), {
    ok: false,
    reason: "DIAMONDS_NOT_ENOUGH",
    itemId: "starlink_ticket"
  });
  assert.equal(diamondProfile.resources.diamonds, 119);
  assert.equal(diamondProfile.resources.inventory.starlink_ticket, undefined);
});

test("当日阶梯价与五次限购保持不变", () => {
  const profile = { resources: { gold: 15000, diamonds: 0, energy: 0, maxEnergy: 999, inventory: {} } };
  const prices = [];
  for (let i = 0; i < 5; i += 1) prices.push(shopView.buyShopItem(profile, "energy_potion_daily").price);
  assert.deepEqual(prices, [1000, 2000, 3000, 4000, 5000]);
  assert.equal(profile.resources.gold, 0);
  assert.equal(profile.resources.energy, 100);
  assert.equal(shopView.getItemState(profile, shopConfig.getShopItem("energy_potion_daily")).soldOut, true);
  assert.equal(shopView.buyShopItem(profile, "energy_potion_daily").reason, "LIMIT_REACHED");
});

test("金币购买即时体力允许溢出上限", () => {
  const profile = { resources: { gold: 1000, diamonds: 0, energy: 195, maxEnergy: 200, inventory: {} } };
  const result = shopView.buyShopItem(profile, "energy_potion_daily");
  assert.equal(result.ok, true);
  assert.equal(profile.resources.energy, 215);
});

test("钻石体力药水进入背包并与抽卡体力药水共用库存 ID", () => {
  const profile = { resources: { gold: 0, diamonds: 10, energy: 200, maxEnergy: 200, inventory: { stamina_potion: 2 } } };
  const result = shopView.buyShopItem(profile, "energy_potion_inventory");
  assert.equal(result.ok, true);
  assert.equal(profile.resources.energy, 200);
  assert.equal(profile.resources.inventory.stamina_potion, 3);
});

test("高价商品不再调用默认原生确认，必须由自定义界面显式确认", () => {
  const profile = { resources: { gold: 600000, diamonds: 0, energy: 0, maxEnergy: 200, inventory: {} } };
  const pending = shopView.buyShopItem(profile, "active_skill_module_c");
  assert.equal(pending.reason, "CONFIRM_REQUIRED");
  assert.equal(profile.resources.gold, 600000);
  assert.equal(profile.resources.inventory.active_skill_module_c, undefined);

  const bought = shopView.buyShopItem(profile, "active_skill_module_c", { confirmed: true });
  assert.equal(bought.ok, true);
  assert.equal(bought.price, 500000);
  assert.equal(profile.resources.gold, 100000);
  assert.equal(profile.resources.inventory.active_skill_module_c, 1);
});

test("可入库商品支持批量报价和原子购买，限购物品不会超额", () => {
  const item = shopConfig.getShopItem("auto_weapon_module_purple");
  const profile = { resources: { gold: 200000, diamonds: 0, energy: 0, maxEnergy: 200, inventory: {} } };
  const quote = shopView.getPurchaseQuote(profile, item, 3);
  assert.equal(item.batchable, true);
  assert.equal(quote.quantity, 3);
  assert.equal(quote.totalPrice, 30000);
  assert.equal(quote.maxQuantity, 20);
  assert.equal(quote.affordable, true);

  const bought = shopView.buyShopItem(profile, item.id, { quantity: 3, confirmed: true });
  assert.equal(bought.ok, true);
  assert.equal(bought.quantity, 3);
  assert.equal(bought.price, 30000);
  assert.equal(profile.resources.gold, 170000);
  assert.equal(profile.resources.inventory.auto_weapon_module_purple, 3);
  assert.equal(shopView.getItemState(profile, item).count, 3);

  const weekKey = shopView.isoWeekString();
  profile.shopWeeklyPurchases[weekKey][item.id] = 19;
  const before = structuredClone(profile);
  assert.equal(shopView.buyShopItem(profile, item.id, { quantity: 2, confirmed: true }).reason, "LIMIT_REACHED");
  assert.deepEqual(profile, before);
});
