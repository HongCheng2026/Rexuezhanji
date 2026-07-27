(function registerBattleSettlementSystem(root) {
  const scope = root.RXGame || (root.RXGame = {});
  function calculateBattleStars({ isWin, playerFinalHp, playerMaxHp, enemyLeakCount }) { if (!isWin) return 0; let stars = 1; if (Number(playerFinalHp) / Math.max(1, Number(playerMaxHp)) >= .5) stars = 2; if (Number(enemyLeakCount || 0) <= 0) stars = 3; return stars; }
  function createSettlementViewModel(result) { const stars = calculateBattleStars(result); return { isWin: Boolean(result.isWin), stars, perfect: stars === 3, rewards: result.isWin ? { gold: 1000, exp: 100 } : { gold: 0, exp: 0 } }; }
  const api = { calculateBattleStars, settleBattle: (result) => createSettlementViewModel(result), createSettlementViewModel };
  scope.battleSettlementSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
