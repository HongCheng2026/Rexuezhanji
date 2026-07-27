(function registerSRankPriceConfig(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const CURRENCY_EXCHANGE_RATE = { goldPerDiamond: 200, diamondPerCny: 100, goldPerCny: 20000 };
  // Authoritative S-rank prices: package 5 explicitly designates this file as the source of truth.
  const S_RANK_PRICE_CONFIG = {
    pilot: { rarity: "S", type: "pilot", priceGold: 900000, diamondEquivalent: 4500, cnyEquivalent: 45 },
    fighter: { rarity: "S", type: "fighter", priceGold: 1300000, diamondEquivalent: 6500, cnyEquivalent: 65 },
    combo: { rarity: "S", type: "pilot_fighter_combo", priceGold: 2200000, diamondEquivalent: 11000, cnyEquivalent: 110 }
  };
  const getSRankPriceByType = (type) => S_RANK_PRICE_CONFIG[type] || null;
  function canAffordSRankItem({ playerGold, type }) { const price = getSRankPriceByType(type); if (!price) return { canAfford: false, reason: "S_RANK_PRICE_TYPE_NOT_FOUND", priceGold: 0 }; const current = Math.max(0, Math.floor(Number(playerGold) || 0)); return { canAfford: current >= price.priceGold, reason: current >= price.priceGold ? "OK" : "GOLD_NOT_ENOUGH", priceGold: price.priceGold, needGold: Math.max(0, price.priceGold - current) }; }
  const api = { CURRENCY_EXCHANGE_RATE, S_RANK_PRICE_CONFIG, goldToDiamond: (gold) => Math.ceil(gold / 200), diamondToGold: (diamond) => diamond * 200, diamondToCny: (diamond) => diamond / 100, cnyToDiamond: (cny) => cny * 100, goldToCny: (gold) => gold / 20000, getSRankPilotPrice: () => S_RANK_PRICE_CONFIG.pilot, getSRankFighterPrice: () => S_RANK_PRICE_CONFIG.fighter, getSRankComboPrice: () => S_RANK_PRICE_CONFIG.combo, getSRankPriceByType, canAffordSRankItem, formatSRankPriceText: (type) => { const price = getSRankPriceByType(type); return price ? `${price.priceGold}金币 / ${price.diamondEquivalent}钻石等价 / 约${price.cnyEquivalent}元` : ""; } };
  scope.sRankPriceConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
