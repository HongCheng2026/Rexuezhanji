(function registerGachaModel(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});
  var config = scope.gachaConfig;

  function clone(value) {
    return JSON.parse(JSON.stringify(value == null ? {} : value));
  }

  function clampRandom(value) {
    value = Number(value);
    if (!Number.isFinite(value)) return 0;
    return Math.max(0, Math.min(0.999999999, value));
  }

  function choose(list, rng) {
    if (!list || !list.length) return null;
    return list[Math.floor(clampRandom(rng()) * list.length)];
  }

  function normalizeCount(value) {
    return Number(value) === 10 ? 10 : 1;
  }

  function getTicketCount(profile) {
    var inventory = profile && profile.resources && profile.resources.inventory;
    return Math.max(0, Math.floor(Number(inventory && inventory[config.TICKET_ID]) || 0));
  }

  function getDiamondCount(profile) {
    return Math.max(0, Math.floor(Number(profile && profile.resources && profile.resources.diamonds) || 0));
  }

  function normalizeState(state) {
    state = state || {};
    var target = config.TARGETS[state.target] ? state.target : null;
    var loaded = Number(state.pity);
    var pity = Number.isFinite(loaded) && loaded > 0
      ? Math.min(config.PITY_LIMIT, Math.floor(loaded))
      : config.PITY_LIMIT;
    return {
      version: 1,
      target: target,
      pity: pity,
      totalDraws: Math.max(0, Math.floor(Number(state.totalDraws) || 0)),
      history: Array.isArray(state.history) ? state.history.slice(0, config.HISTORY_LIMIT) : []
    };
  }

  // pity 为「距保底剩余抽数」：初始为 PITY_LIMIT，每抽非终极大奖 -1，
  // 归零前最后一抽（pity<=1）强制终极大奖；抽到终极大奖后重置为 PITY_LIMIT。
  function rollTier(rng, pityRemaining) {
    if (pityRemaining <= 1) return "ultimate";
    var roll = clampRandom(rng());
    if (roll < 0.01) return "ultimate";
    if (roll < 0.06) return "legendary";
    if (roll < 0.30) return "elite";
    return "standard";
  }

  function resolveReward(tier, targetKey, rng) {
    if (tier === "ultimate") {
      var target = config.TARGETS[targetKey];
      return { id: target.id, kind: "ultimate", quantity: 1, label: target.label + " · " + target.name };
    }
    return clone(choose(config.REWARD_POOLS[tier], rng));
  }

  function ensureProfileContainers(profile) {
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    profile.owned = profile.owned || {};
    profile.owned.pilots = Array.isArray(profile.owned.pilots) ? profile.owned.pilots : [];
    profile.owned.ships = Array.isArray(profile.owned.ships) ? profile.owned.ships : [];
    profile.pilotCopies = profile.pilotCopies && typeof profile.pilotCopies === "object" ? profile.pilotCopies : {};
  }

  function addInventory(profile, id, quantity) {
    var inventory = profile.resources.inventory;
    inventory[id] = Math.max(0, Math.floor(Number(inventory[id]) || 0)) + quantity;
  }

  function addGold(profile, quantity) {
    var current = Math.max(0, Math.floor(Number(profile.resources.gold != null ? profile.resources.gold : profile.coins) || 0));
    profile.resources.gold = current + quantity;
    profile.coins = profile.resources.gold;
  }

  function applyReward(profile, reward, targetKey) {
    if (reward.kind === "gold") {
      addGold(profile, reward.quantity);
      return reward;
    }
    if (reward.kind === "inventory") {
      addInventory(profile, reward.id, reward.quantity);
      return reward;
    }
    var target = config.TARGETS[targetKey];
    var owned = profile.owned[target.ownedKey];
    if (owned.indexOf(target.id) < 0) {
      owned.push(target.id);
      return reward;
    }
    addInventory(profile, target.duplicateItem, 1);
    return {
      id: target.duplicateItem,
      kind: "duplicate",
      quantity: 1,
      duplicate: true,
      label: target.label + "本体 ×1（已存入背包）"
    };
  }

  function summarize(results) {
    var map = Object.create(null);
    results.forEach(function countReward(item) {
      var key = item.reward.id + "::" + item.reward.label;
      if (!map[key]) map[key] = { id: item.reward.id, label: item.reward.label, quantity: 0, tier: item.tier };
      map[key].quantity += Math.max(1, Number(item.reward.quantity) || 1);
    });
    return Object.keys(map).map(function toValue(key) { return map[key]; });
  }

  function draw(profile, state, options) {
    options = options || {};
    var count = normalizeCount(options.count);
    var targetKey = options.target || (state && state.target);
    if (!config.TARGETS[targetKey]) return { ok: false, reason: "TARGET_REQUIRED" };
    var cost = config.DRAW_COSTS[count];
    var tickets = getTicketCount(profile);
    var missingTickets = Math.max(0, cost - tickets);
    var diamondCost = missingTickets * config.TICKET_DIAMOND_PRICE;
    if (missingTickets && !options.buyMissingTickets) {
      return {
        ok: false,
        reason: "TICKET_TOPUP_REQUIRED",
        count: count,
        ticketCost: cost,
        missingTickets: missingTickets,
        diamondCost: diamondCost,
        canAfford: getDiamondCount(profile) >= diamondCost
      };
    }
    if (missingTickets && getDiamondCount(profile) < diamondCost) {
      return {
        ok: false,
        reason: "DIAMOND_NOT_ENOUGH",
        count: count,
        ticketCost: cost,
        missingTickets: missingTickets,
        diamondCost: diamondCost
      };
    }

    var rng = typeof options.rng === "function" ? options.rng : Math.random;
    var now = typeof options.now === "function" ? options.now : Date.now;
    var nextProfile = clone(profile);
    var nextState = normalizeState(state);
    nextState.target = targetKey;
    ensureProfileContainers(nextProfile);
    nextProfile.resources.diamonds = Math.max(0, getDiamondCount(nextProfile) - diamondCost);
    nextProfile.resources.inventory[config.TICKET_ID] = tickets + missingTickets - cost;

    var results = [];
    for (var i = 0; i < count; i += 1) {
      var tier = rollTier(rng, nextState.pity);
      var reward = resolveReward(tier, targetKey, rng);
      reward = applyReward(nextProfile, reward, targetKey);
      nextState.pity = tier === "ultimate" ? config.PITY_LIMIT : nextState.pity - 1;
      nextState.totalDraws += 1;
      results.push({ tier: tier, reward: reward });
    }

    var stampedHistory = results.slice().reverse().map(function toHistory(item, index) {
      return {
        drawNumber: nextState.totalDraws - index,
        tier: item.tier,
        rewardId: item.reward.id,
        label: item.reward.label,
        quantity: item.reward.quantity,
        duplicate: Boolean(item.reward.duplicate),
        at: Number(now()) || Date.now()
      };
    });
    nextState.history = stampedHistory.concat(nextState.history).slice(0, config.HISTORY_LIMIT);

    return {
      ok: true,
      count: count,
      cost: cost,
      ticketCost: cost,
      missingTickets: missingTickets,
      purchasedTickets: missingTickets,
      diamondCost: diamondCost,
      currency: "ticket",
      target: targetKey,
      profile: nextProfile,
      state: nextState,
      results: results,
      summary: summarize(results)
    };
  }

  var api = {
    draw: draw,
    rollTier: rollTier,
    normalizeState: normalizeState,
    getTicketCount: getTicketCount,
    getDiamondCount: getDiamondCount
  };
  scope.gachaModel = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
