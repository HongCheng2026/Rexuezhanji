(function registerRosterEconomy(root) {
  "use strict";

  const scope = root.RXGame || (root.RXGame = {});
  const PILOT_RARITY_PRICE_GOLD = Object.freeze({ B: 30000, A: 120000, S: 900000 });
  const FIGHTER_RARITY_PRICE_GOLD = Object.freeze({ B: 50000, A: 150000, S: 1300000 });
  const PILOT_MAX_STARS = 6;
  const PILOT_STAR_ARMOR_PENETRATION = 0.05;
  const PILOT_STAR_MEDAL_ID = "sss_pilot_medal";
  const PILOT_STAR_MEDALS_REQUIRED = 5;
  const PILOT_COPY_ITEMS = Object.freeze({ "pilot-ss-heiyue": "pilot_ss_heiyue_copy" });
  const FIGHTER_MAX_STARS = 6;
  const FIGHTER_SSS_PROMOTION_ATTACK = 20;
  const FIGHTER_STAR_ATTACK = 10;
  const FIGHTER_STAR_MODULE_ID = "sss_fighter_module";
  const FIGHTER_STAR_MODULES_REQUIRED = 5;
  const FIGHTER_COPY_ITEMS = Object.freeze({ "ship-ss-lingguang": "ship_ss_lingguang_copy" });
  const PILOT_PROMOTION_RULES = Object.freeze({
    B: Object.freeze({ targetRank: "A", tokenId: "pilot_rank_a_token", tokenRequired: 1 }),
    A: Object.freeze({ targetRank: "S", tokenId: "pilot_rank_s_token", tokenRequired: 1 }),
    SS: Object.freeze({ targetRank: "SSS", tokenId: "sss_pilot_medal", tokenRequired: 5 })
  });
  const FIGHTER_PROMOTION_RULES = Object.freeze({
    B: Object.freeze({ targetRank: "A", tokenId: "fighter_rank_a_token", tokenRequired: 1 }),
    A: Object.freeze({ targetRank: "S", tokenId: "fighter_rank_s_token", tokenRequired: 1 }),
    SS: Object.freeze({ targetRank: "SSS", tokenId: FIGHTER_STAR_MODULE_ID, tokenRequired: 5 })
  });

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
    if (normalizedType === "pilot" || normalizedType === "ship") {
      profile.scene = profile.scene || {};
      profile.scene[normalizedType === "pilot" ? "pilotId" : "shipId"] = itemId;
    }
    return { profile, cost, itemId, rank: asset.rank };
  }

  function getOwnedRank(profile, type, itemId) {
    const normalizedType = normalizeType(type);
    const asset = getAsset(normalizedType, itemId);
    if (!asset) return "";
    const rankMap = normalizedType === "pilot" ? (profile.pilotRanks = profile.pilotRanks || {}) : (profile.shipRanks = profile.shipRanks || {});
    if (rankMap[itemId]) return String(rankMap[itemId]).toUpperCase();
    return asset.rank ? String(asset.rank).toUpperCase() : "";
  }

  function getInventoryCount(profile, itemId) {
    return Math.max(0, Math.floor(Number(profile?.resources?.inventory?.[itemId]) || 0));
  }

  function getPromotionPlan(profile, type, itemId) {
    const normalizedType = normalizeType(type);
    const asset = getAsset(normalizedType, itemId);
    const ownedIds = normalizedType ? getOwnedIds(profile, normalizedType) : [];
    if (!normalizedType || !asset) return { ok: false, reason: "INVALID_KIND" };
    if (!ownedIds.includes(itemId)) return { ok: false, reason: "NOT_OWNED", currentRank: String(asset.rank || "").toUpperCase() };
    const currentRank = getOwnedRank(profile, normalizedType, itemId);
    const rules = normalizedType === "pilot" ? PILOT_PROMOTION_RULES : FIGHTER_PROMOTION_RULES;
    const rule = rules[currentRank];
    if (!rule) return { ok: false, reason: "RANK_NOT_ELIGIBLE", currentRank };
    const tokenOwned = getInventoryCount(profile, rule.tokenId);
    return {
      ok: tokenOwned >= rule.tokenRequired,
      reason: tokenOwned >= rule.tokenRequired ? "" : "TOKEN_NOT_OWNED",
      currentRank,
      targetRank: rule.targetRank,
      tokenId: rule.tokenId,
      tokenRequired: rule.tokenRequired,
      tokenOwned
    };
  }

  function getPilotStarLevel(profile, itemId) {
    return Math.max(0, Math.min(PILOT_MAX_STARS, Math.floor(Number(profile?.pilotStars?.[itemId]) || 0)));
  }

  function getPilotCopyCount(profile, itemId) {
    const copyItemId = PILOT_COPY_ITEMS[itemId];
    return copyItemId ? getInventoryCount(profile, copyItemId) : 0;
  }

  function getPilotStarPlan(profile, itemId) {
    const asset = getAsset("pilot", itemId);
    const owned = getOwnedIds(profile, "pilot").includes(itemId);
    const currentStars = getPilotStarLevel(profile, itemId);
    const copiesOwned = getPilotCopyCount(profile, itemId);
    const medalsOwned = getInventoryCount(profile, PILOT_STAR_MEDAL_ID);
    const materials = { currentStars, copiesOwned, copiesRequired: 1, medalsOwned, medalsRequired: PILOT_STAR_MEDALS_REQUIRED, medalId: PILOT_STAR_MEDAL_ID };
    if (!asset || String(asset.rank || "").toUpperCase() !== "SS") return { ok: false, reason: "STAR_NOT_SUPPORTED", ...materials };
    if (!owned) return { ok: false, reason: "NOT_OWNED", ...materials };
    if (currentStars >= PILOT_MAX_STARS) return { ok: false, reason: "MAX_STARS", ...materials };
    return {
      ok: copiesOwned >= 1 && medalsOwned >= PILOT_STAR_MEDALS_REQUIRED,
      reason: copiesOwned < 1 ? "COPY_NOT_OWNED" : medalsOwned < PILOT_STAR_MEDALS_REQUIRED ? "MEDAL_NOT_OWNED" : "",
      ...materials,
      targetStars: currentStars + 1,
    };
  }

  function addPilotCopy(profile, itemId, amount) {
    const asset = getAsset("pilot", itemId);
    const copyItemId = PILOT_COPY_ITEMS[itemId];
    if (!asset || String(asset.rank || "").toUpperCase() !== "SS" || !copyItemId) return { ok: false, reason: "STAR_NOT_SUPPORTED" };
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    profile.resources.inventory[copyItemId] = getPilotCopyCount(profile, itemId) + Math.max(1, Math.floor(Number(amount) || 1));
    return { ok: true, id: itemId, copyItemId, copies: profile.resources.inventory[copyItemId] };
  }

  function starUpPilot(profile, itemId) {
    const plan = getPilotStarPlan(profile, itemId);
    if (!plan.ok) return plan;
    profile.pilotStars = profile.pilotStars || {};
    const copyItemId = PILOT_COPY_ITEMS[itemId];
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    profile.resources.inventory[copyItemId] = plan.copiesOwned - plan.copiesRequired;
    profile.resources.inventory[plan.medalId] = plan.medalsOwned - plan.medalsRequired;
    profile.pilotStars[itemId] = plan.targetStars;
    return { ok: true, id: itemId, fromStars: plan.currentStars, toStars: plan.targetStars, copiesUsed: plan.copiesRequired, medalId: plan.medalId, medalsUsed: plan.medalsRequired };
  }

  function getFighterStarLevel(profile, itemId) {
    return Math.max(0, Math.min(FIGHTER_MAX_STARS, Math.floor(Number(profile?.shipStars?.[itemId]) || 0)));
  }

  function getFighterCopyCount(profile, itemId) {
    const copyItemId = FIGHTER_COPY_ITEMS[itemId];
    return copyItemId ? getInventoryCount(profile, copyItemId) : 0;
  }

  function getFighterStarPlan(profile, itemId) {
    const asset = getAsset("ship", itemId);
    const owned = getOwnedIds(profile, "ship").includes(itemId);
    const currentRank = asset ? getOwnedRank(profile, "ship", itemId) : "";
    const currentStars = getFighterStarLevel(profile, itemId);
    const copiesOwned = getFighterCopyCount(profile, itemId);
    const modulesOwned = getInventoryCount(profile, FIGHTER_STAR_MODULE_ID);
    const materials = {
      currentRank,
      currentStars,
      copiesOwned,
      copiesRequired: 1,
      modulesOwned,
      modulesRequired: FIGHTER_STAR_MODULES_REQUIRED,
      moduleId: FIGHTER_STAR_MODULE_ID
    };
    if (!asset || String(asset.rank || "").toUpperCase() !== "SS") return { ok: false, reason: "STAR_NOT_SUPPORTED", ...materials };
    if (!owned) return { ok: false, reason: "NOT_OWNED", ...materials };
    if (currentRank !== "SSS") return { ok: false, reason: "STAR_REQUIRES_SSS", ...materials };
    if (currentStars >= FIGHTER_MAX_STARS) return { ok: false, reason: "MAX_STARS", ...materials };
    return {
      ok: copiesOwned >= 1 && modulesOwned >= FIGHTER_STAR_MODULES_REQUIRED,
      reason: copiesOwned < 1 ? "COPY_NOT_OWNED" : modulesOwned < FIGHTER_STAR_MODULES_REQUIRED ? "MODULE_NOT_OWNED" : "",
      ...materials,
      targetStars: currentStars + 1
    };
  }

  function starUpFighter(profile, itemId) {
    const plan = getFighterStarPlan(profile, itemId);
    if (!plan.ok) return plan;
    profile.shipStars = profile.shipStars || {};
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    const copyItemId = FIGHTER_COPY_ITEMS[itemId];
    profile.resources.inventory[copyItemId] = plan.copiesOwned - plan.copiesRequired;
    profile.resources.inventory[plan.moduleId] = plan.modulesOwned - plan.modulesRequired;
    profile.shipStars[itemId] = plan.targetStars;
    return {
      ok: true,
      id: itemId,
      fromStars: plan.currentStars,
      toStars: plan.targetStars,
      copiesUsed: plan.copiesRequired,
      moduleId: plan.moduleId,
      modulesUsed: plan.modulesRequired,
      attackGained: FIGHTER_STAR_ATTACK
    };
  }

  function getPilotStats(profile, itemId) {
    const asset = getAsset("pilot", itemId);
    if (!asset) return null;
    const rank = getOwnedRank(profile, "pilot", itemId) || String(asset.rank || "B").toUpperCase();
    const rankDamage = scope.assets?.RANK_DAMAGE?.pilot || {};
    const rarityStats = scope.balance?.PILOT_RARITY_STATS || {};
    const stars = String(asset.rank || "").toUpperCase() === "SS" ? getPilotStarLevel(profile, itemId) : 0;
    return {
      rank,
      stars,
      attack: Math.max(0, Number(rankDamage[rank]) || Number(asset.damage) || 0),
      hp: 0,
      armorPenetration: Math.max(0, Number(rarityStats[rank]?.armorPenetration) || 0) + stars * PILOT_STAR_ARMOR_PENETRATION
    };
  }

  function getShipStats(profile, itemId) {
    const asset = getAsset("ship", itemId);
    if (!asset) return null;
    const rank = getOwnedRank(profile, "ship", itemId) || String(asset.rank || "B").toUpperCase();
    const rankDamage = scope.assets?.RANK_DAMAGE?.ship || {};
    const rankHp = scope.assets?.RANK_HP?.ship || {};
    const rarityStats = scope.balance?.FIGHTER_RARITY_STATS || {};
    const nativeRank = String(asset.rank || "").toUpperCase();
    const promotedFromSs = nativeRank === "SS" && rank === "SSS";
    const stars = promotedFromSs ? getFighterStarLevel(profile, itemId) : 0;
    const statRank = promotedFromSs ? "SS" : rank;
    return {
      rank,
      stars,
      attack: Math.max(0, Number(rankDamage[statRank]) || Number(asset.damage) || 0) + (promotedFromSs ? FIGHTER_SSS_PROMOTION_ATTACK : 0) + stars * FIGHTER_STAR_ATTACK,
      hp: Math.max(0, Number(rankHp[statRank]) || Number(asset.hp) || 0),
      armorPenetration: Math.max(0, Number(rarityStats[statRank]?.armorPenetration) || 0)
    };
  }

  function promoteWithToken(profile, type, itemId, tokenId) {
    const normalizedType = normalizeType(type);
    if (!normalizedType) return { ok: false, reason: "INVALID_KIND" };
    const plan = getPromotionPlan(profile, normalizedType, itemId);
    if (plan.reason === "NOT_OWNED" || plan.reason === "INVALID_KIND") return plan;
    if (!plan.tokenId) return { ok: false, reason: "RANK_NOT_ELIGIBLE", currentRank: plan.currentRank };
    if (tokenId !== plan.tokenId) {
      const knownTokens = normalizedType === "pilot"
        ? ["pilot_rank_a_token", "pilot_rank_s_token", "sss_pilot_medal"]
        : ["fighter_rank_a_token", "fighter_rank_s_token", FIGHTER_STAR_MODULE_ID];
      return { ok: false, reason: knownTokens.includes(tokenId) ? "RANK_NOT_ELIGIBLE" : "INVALID_TOKEN", currentRank: plan.currentRank };
    }
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    if (!plan.ok) return { ok: false, reason: plan.reason, tokenId, tokenOwned: plan.tokenOwned, tokenRequired: plan.tokenRequired };
    profile.resources.inventory[tokenId] = plan.tokenOwned - plan.tokenRequired;
    const rankMap = normalizedType === "pilot" ? (profile.pilotRanks = profile.pilotRanks || {}) : (profile.shipRanks = profile.shipRanks || {});
    rankMap[itemId] = plan.targetRank;
    return { ok: true, kind: normalizedType, id: itemId, tokenId, tokenUsed: plan.tokenRequired, fromRank: plan.currentRank, toRank: plan.targetRank };
  }

  const api = {
    PILOT_RARITY_PRICE_GOLD,
    FIGHTER_RARITY_PRICE_GOLD,
    PILOT_MAX_STARS,
    PILOT_STAR_ARMOR_PENETRATION,
    PILOT_STAR_MEDAL_ID,
    PILOT_STAR_MEDALS_REQUIRED,
    PILOT_COPY_ITEMS,
    FIGHTER_MAX_STARS,
    FIGHTER_SSS_PROMOTION_ATTACK,
    FIGHTER_STAR_ATTACK,
    FIGHTER_STAR_MODULE_ID,
    FIGHTER_STAR_MODULES_REQUIRED,
    FIGHTER_COPY_ITEMS,
    getPrice,
    getAsset,
    getOwnedIds,
    getOwnedRank,
    getPromotionPlan,
    getPilotStarLevel,
    getPilotCopyCount,
    getPilotStarPlan,
    getPilotStats,
    getShipStats,
    addPilotCopy,
    starUpPilot,
    getFighterStarLevel,
    getFighterCopyCount,
    getFighterStarPlan,
    starUpFighter,
    promoteWithToken,
    purchase
  };

  scope.rosterEconomy = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
