(function registerResourceExchangeModel(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});
  var GOLD_PER_DIAMOND = 1000;

  function getBalance(profile) {
    var resources = profile && profile.resources || {};
    return {
      diamonds: Math.max(0, Math.floor(Number(resources.diamonds) || 0)),
      gold: Math.max(0, Math.floor(Number(resources.gold != null ? resources.gold : profile && profile.coins) || 0))
    };
  }

  function normalizeAmount(value, maximum) {
    var amount = Math.max(1, Math.floor(Number(value) || 1));
    var limit = Math.max(0, Math.floor(Number(maximum) || 0));
    return limit > 0 ? Math.min(amount, limit) : 1;
  }

  function quote(profile, value) {
    var balance = getBalance(profile);
    var amount = normalizeAmount(value, balance.diamonds);
    return {
      amount: amount,
      diamonds: balance.diamonds,
      gold: balance.gold,
      goldGain: amount * GOLD_PER_DIAMOND,
      canExchange: balance.diamonds >= amount && amount > 0
    };
  }

  function exchange(profile, value) {
    if (!profile || typeof profile !== "object") return { ok: false, reason: "PROFILE_MISSING" };
    var result = quote(profile, value);
    if (!result.canExchange) return { ok: false, reason: "DIAMONDS_NOT_ENOUGH", quote: result };
    profile.resources = profile.resources || {};
    profile.resources.diamonds = result.diamonds - result.amount;
    profile.resources.gold = result.gold + result.goldGain;
    profile.coins = profile.resources.gold;
    return { ok: true, amount: result.amount, goldGain: result.goldGain, profile: profile };
  }

  scope.resourceExchangeModel = {
    GOLD_PER_DIAMOND: GOLD_PER_DIAMOND,
    getBalance: getBalance,
    normalizeAmount: normalizeAmount,
    quote: quote,
    exchange: exchange
  };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.resourceExchangeModel;
})(typeof globalThis !== "undefined" ? globalThis : window);
