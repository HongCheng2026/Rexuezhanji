(function registerRosterEconomy(root) {
  "use strict";

  const scope = root.RXGame || (root.RXGame = {});
  const PILOT_RARITY_PRICE_GOLD = Object.freeze({ B: 30000, A: 120000, S: 900000 });
  const FIGHTER_RARITY_PRICE_GOLD = Object.freeze({ B: 50000, A: 150000, S: 1300000 });

  function normalizeType(type) {
    return type === "ship" || type === "fighter" ? "ship" : type === "pilot" ? "pilot" : "";
  }

  function getPrice(type, rank) {
    const normalizedType = normalizeType(type);
    const normalizedRank = String(rank || "").toUpperCase();
    if (normalizedType === "pilot") {
      if (normalizedRank === "S" && scope.sRankPriceConfig?.getSRankPilotPrice) {
        return Math.max(0, Number(scope.sRankPriceConfig.getSRankPilotPrice().priceGold) || 0);
      }
      return PILOT_RARITY_PRICE_GOLD[normalizedRank] || 0;
    }
    if (normalizedType === "ship") {
      if (normalizedRank === "S" && scope.sRankPriceConfig?.getSRankFighterPrice) {
        return Math.max(0, Number(scope.sRankPriceConfig.getSRankFighterPrice().priceGold) || 0);
      }
      return FIGHTER_RARITY_PRICE_GOLD[normalizedRank] || 0;
    }
    return 0;
  }

  function getAsset(type, itemId) {
    const normalizedType = normalizeType(type);
    const assets = scope.assets || {};
    const list = normalizedType === "pilot" ? assets.PILOT_ASSETS : normalizedType === "ship" ? assets.SHIP_ASSETS : [];
    return list.find((item) => item && item.id === itemId) || null;
  }

  function getOwnedIds(profile, type) {
    const normalizedType = normalizeType(type);
    const field = normalizedType === "pilot" ? "pilots" : normalizedType === "ship" ? "ships" : "";
    if (!field) return [];
    profile.owned = profile.owned || {};
    profile.owned[field] = Array.isArray(profile.owned[field]) ? profile.owned[field] : [];
    return profile.owned[field];
  }

  function getGold(profile) {
    if (scope.profile?.getGold) return scope.profile.getGold(profile);
    return Math.max(0, Math.floor(Number(profile?.resources?.gold ?? profile?.coins) || 0));
  }

  function setGold(profile, value) {
    if (scope.profile?.setGold) return scope.profile.setGold(profile, value);
    profile.resources = profile.resources || {};
    profile.resources.gold = Math.max(0, Math.floor(Number(value) || 0));
    profile.coins = profile.resources.gold;
    return profile.resources.gold;
  }

  function purchase(profile, type, itemId) {
    const normalizedType = normalizeType(type);
    const asset = getAsset(normalizedType, itemId);
    if (!asset) {
      const missing = new Error(normalizedType === "pilot" ? "战姬不存在。" : "战机不存在。");
      missing.code = "ROSTER_ITEM_NOT_FOUND";
      throw missing;
    }
    const ownedIds = getOwnedIds(profile, normalizedType);
    if (ownedIds.includes(itemId)) {
      const duplicate = new Error(normalizedType === "pilot" ? "该战姬已经拥有。" : "该战机已经拥有。");
      duplicate.code = "ROSTER_ITEM_OWNED";
      throw duplicate;
    }
    const cost = getPrice(normalizedType, asset.rank);
    if (!cost) {
      const unpriced = new Error("该角色尚未配置价格。");
      unpriced.code = "ROSTER_PRICE_MISSING";
      throw unpriced;
    }
    if (getGold(profile) < cost) {
      const insufficient = new Error("金币不足。");
      insufficient.code = "GOLD_NOT_ENOUGH";
      throw insufficient;
    }
    setGold(profile, getGold(profile) - cost);
    ownedIds.push(itemId);
    return { profile, cost, itemId, rank: asset.rank };
  }

  const api = {
    PILOT_RARITY_PRICE_GOLD,
    FIGHTER_RARITY_PRICE_GOLD,
    getPrice,
    getAsset,
    getOwnedIds,
    purchase
  };

  scope.rosterEconomy = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
