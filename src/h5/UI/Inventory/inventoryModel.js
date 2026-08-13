(function registerInventoryModel(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});
  var ITEM_ALIASES = Object.freeze({ energy_potion_inventory: "stamina_potion" });

  function clone(value) { return JSON.parse(JSON.stringify(value == null ? {} : value)); }
  function amount(value) { return Math.max(0, Math.floor(Number(value) || 0)); }
  function getInventory(profile) { return profile && profile.resources && profile.resources.inventory || {}; }
  function canonicalId(id) { return ITEM_ALIASES[id] || id; }
  function quantityFor(inventory, id) {
    var canonical = canonicalId(id);
    return Object.keys(inventory || {}).reduce(function sum(total, key) {
      return canonicalId(key) === canonical ? total + amount(inventory[key]) : total;
    }, 0);
  }

  function project(profile, filter, catalog, iconAssets, fallbackIcon) {
    catalog = catalog || scope.inventoryCatalog;
    filter = filter || "all";
    var inventory = getInventory(profile);
    var projectedIds = [];
    Object.keys(inventory).forEach(function collect(id) {
      var canonical = canonicalId(id);
      if (amount(inventory[id]) > 0 && projectedIds.indexOf(canonical) < 0) projectedIds.push(canonical);
    });
    return projectedIds.map(function mapItem(id) {
      var definition = catalog.get(id);
      return Object.assign({}, definition, {
        quantity: quantityFor(inventory, id),
        icon: iconAssets && iconAssets[id] || fallbackIcon || "",
        unknown: !catalog.ITEMS[id]
      });
    }).filter(function byCategory(item) { return filter === "all" || item.category === filter; }).sort(function sortItems(a, b) {
      var rarityOrder = { rainbow: 5, pink: 4, gold: 3, purple: 2, blue: 1 };
      return (rarityOrder[b.rarity] || 0) - (rarityOrder[a.rarity] || 0) || a.name.localeCompare(b.name, "zh-CN");
    });
  }

  function use(profile, id, catalog) {
    catalog = catalog || scope.inventoryCatalog;
    id = canonicalId(id);
    var item = catalog.get(id);
    var current = quantityFor(getInventory(profile), id);
    if (!current) return { ok: false, reason: "ITEM_NOT_OWNED" };
    if (!item.use || !item.use.energy) return { ok: false, reason: "ITEM_READ_ONLY" };
    var next = clone(profile);
    next.resources = next.resources || {};
    next.resources.inventory = next.resources.inventory || {};
    var maxEnergy = Math.max(0, amount(next.resources.maxEnergy));
    var energy = Math.min(maxEnergy, amount(next.resources.energy));
    if (energy >= maxEnergy) return { ok: false, reason: "ENERGY_FULL" };
    var restored = Math.min(item.use.energy, maxEnergy - energy);
    next.resources.energy = energy + restored;
    var sourceId = amount(next.resources.inventory[id]) > 0 ? id : Object.keys(next.resources.inventory).find(function findAlias(key) {
      return canonicalId(key) === id && amount(next.resources.inventory[key]) > 0;
    });
    next.resources.inventory[sourceId] = amount(next.resources.inventory[sourceId]) - 1;
    return { ok: true, profile: next, item: item, restored: restored, remaining: current - 1 };
  }

  // 原价出售：仅当 catalog 标注 sellPrice 且持有数量 > 0 时可售。
  // 退款按 sellCurrency 写回对应货币（gold 同时回写 coins），不改变输入档。
  function sell(profile, id, catalog) {
    catalog = catalog || scope.inventoryCatalog;
    var item = catalog.get(id);
    var current = amount(getInventory(profile)[id]);
    if (!item.sellPrice || current <= 0) return { ok: false, reason: "CANNOT_SELL", itemId: id };
    var next = clone(profile);
    next.resources = next.resources || {};
    next.resources.inventory = next.resources.inventory || {};
    next.resources.inventory[id] = current - 1;
    var currency = item.sellCurrency;
    var refund = Math.max(0, Math.floor(Number(item.sellPrice) || 0));
    if (currency === "gold") {
      var gold = Math.max(0, Math.floor(Number(next.resources.gold != null ? next.resources.gold : (next.coins || 0))));
      next.resources.gold = gold + refund;
      next.coins = next.resources.gold;
    } else if (currency === "diamonds") {
      next.resources.diamonds = Math.max(0, Math.floor(Number(next.resources.diamonds) || 0) + refund);
    } else {
      return { ok: false, reason: "CANNOT_SELL", itemId: id };
    }
    return { ok: true, profile: next, itemId: id, refunded: refund, sellPrice: refund, sellCurrency: currency };
  }

  var api = { project: project, use: use, sell: sell, getInventory: getInventory, canonicalId: canonicalId, quantityFor: quantityFor };
  scope.inventoryModel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
