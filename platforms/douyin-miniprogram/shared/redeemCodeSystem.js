(function registerRedeemCodeSystem(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const REDEEM_CODE_STATUS = { OK: "OK", EMPTY_CODE: "EMPTY_CODE", CODE_NOT_FOUND: "CODE_NOT_FOUND", CODE_ALREADY_USED: "CODE_ALREADY_USED", CODE_EXPIRED: "CODE_EXPIRED", PLAYER_LEVEL_NOT_ENOUGH: "PLAYER_LEVEL_NOT_ENOUGH" };
  const REDEEM_CODE_CONFIG = {
    SVIP0903: { minCommanderLevel: 1, rewards: [{ type: "gold", amount: 5000000 }] },
    RXZJ666: { minCommanderLevel: 1, rewards: [{ type: "gold", amount: 30000 }, { type: "stamina", amount: 50 }] },
    SKY2026: { minCommanderLevel: 1, rewards: [{ type: "gold", amount: 50000 }] },
    FIGHTER888: { minCommanderLevel: 5, rewards: [{ type: "gold", amount: 80000 }, { type: "item", itemId: "fighter_upgrade_ticket", amount: 1 }] },
    PILOT888: { minCommanderLevel: 3, rewards: [{ type: "gold", amount: 60000 }, { type: "item", itemId: "pilot_training_chip", amount: 3 }] },
    ACE2026: { minCommanderLevel: 10, rewards: [{ type: "gold", amount: 100000 }, { type: "stamina", amount: 100 }] }
  };
  const normalizeRedeemCode = (code) => String(code || "").replace(/\s+/g, "").toUpperCase().slice(0, 24);
  function redeemCode({ rawCode, profile }) { const code = normalizeRedeemCode(rawCode); const used = profile.usedRedeemCodes || []; const config = REDEEM_CODE_CONFIG[code]; if (!code) return { success: false, status: REDEEM_CODE_STATUS.EMPTY_CODE }; if (!config) return { success: false, status: REDEEM_CODE_STATUS.CODE_NOT_FOUND }; if (used.includes(code)) return { success: false, status: REDEEM_CODE_STATUS.CODE_ALREADY_USED }; if ((profile.player?.level || 1) < config.minCommanderLevel) return { success: false, status: REDEEM_CODE_STATUS.PLAYER_LEVEL_NOT_ENOUGH, requiredLevel: config.minCommanderLevel }; const next = structuredClone(profile); next.resources = next.resources || {}; next.resources.inventory = next.resources.inventory || {}; for (const reward of config.rewards) { if (reward.type === "gold") { next.resources.gold = Math.max(0, Number(next.resources.gold) || 0) + reward.amount; next.coins = next.resources.gold; } if (reward.type === "stamina") next.resources.energy = Math.min(next.resources.maxEnergy, Math.max(0, Number(next.resources.energy) || 0) + reward.amount); if (reward.type === "item") next.resources.inventory[reward.itemId] = (next.resources.inventory[reward.itemId] || 0) + reward.amount; } next.usedRedeemCodes = [...used, code]; return { success: true, status: REDEEM_CODE_STATUS.OK, code, rewards: config.rewards, profile: next }; }
  const api = { REDEEM_CODE_STATUS, REDEEM_CODE_CONFIG, normalizeRedeemCode, redeemCode };
  scope.redeemCodeSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
