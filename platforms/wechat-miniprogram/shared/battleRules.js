(function registerBattleRules(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const levelsConfig = scope.levels || {};

  const BATTLE_REWARD_CONFIG = {
    staminaCost: levelsConfig.ENERGY_COST || 5,
    bossAppearSeconds: levelsConfig.BOSS_SPAWN_TIME || 60,
    battleEndSeconds: levelsConfig.LEVEL_DURATION || 90,
    perfectExp: 100,
    perfectGold: 1000
  };

  const INSURANCE_RULES = Object.freeze({
    B: Object.freeze({ maxCharges: 2, initialCharges: 1, rechargeSeconds: 18 }),
    A: Object.freeze({ maxCharges: 3, initialCharges: 1, rechargeSeconds: 18 }),
    S: Object.freeze({ maxCharges: 4, initialCharges: 1, rechargeSeconds: 18 })
  });

  function getInsuranceRule(rank) {
    return INSURANCE_RULES[String(rank || "B").toUpperCase()] || INSURANCE_RULES.B;
  }

  function getUpgradeCost(upgrade, currentLevel) {
    return upgrade.baseCost * (currentLevel + 1);
  }

  function getBattleExperience({ levelId, levelCoins, baseReward = 0 }) {
    const scorePart = Math.round((Number(levelCoins) || 0) * 0.28);
    const clearPart = Math.round((Number(baseReward) || 0) * 0.18);
    return Math.max(5, scorePart + clearPart + (Number(levelId) || 1) * 12);
  }

  function applyExperience(player, amount) {
    let gained = Math.max(0, Math.floor(Number(amount) || 0));
    if (!gained) return { gained: 0, leveled: 0, before: createLevelProgressSnapshot(player), after: createLevelProgressSnapshot(player) };
    const maxLevel = levelsConfig.COMMANDER_MAX_LEVEL || 60;
    const totals = levelsConfig.COMMANDER_TOTAL_EXP_BY_LEVEL || [];
    const oldLevel = Math.max(1, Math.min(maxLevel, Math.floor(Number(player.level) || 1)));
    const oldExp = Math.max(0, Math.floor(Number(player.exp) || 0));
    const previousTotal = Math.max(0, Math.floor(Number(player.totalExp) || ((totals[oldLevel] || 0) + oldExp)));
    const before = createLevelProgressSnapshot(player);
    player.totalExp = previousTotal + gained;
    player.level = oldLevel;
    while (player.level < maxLevel && player.totalExp >= (totals[player.level + 1] || Infinity)) player.level += 1;
    player.expMax = levelsConfig.getCommanderExpToNextLevel ? levelsConfig.getCommanderExpToNextLevel(player.level) : player.expMax;
    player.exp = player.level >= maxLevel ? 0 : Math.max(0, player.totalExp - (totals[player.level] || 0));
    player.honorLevel = getHonorLevelByCommanderLevel(player.level);
    player.badge = honorLevelToText(player.honorLevel);
    return { gained, leveled: player.level - oldLevel, before, after: createLevelProgressSnapshot(player) };
  }

  function createLevelProgressSnapshot(player) {
    player = player || {};
    const level = Math.max(1, Math.floor(Number(player.level) || 1));
    const expMax = Math.max(1, Math.floor(Number(player.expMax) || (levelsConfig.getCommanderExpToNextLevel ? levelsConfig.getCommanderExpToNextLevel(level) : 1)));
    const exp = Math.max(0, Math.min(expMax, Math.floor(Number(player.exp) || 0)));
    const maxLevel = levelsConfig.COMMANDER_MAX_LEVEL || 60;
    return {
      level,
      exp,
      expMax,
      totalExp: Math.max(0, Math.floor(Number(player.totalExp) || 0)),
      percent: level >= maxLevel ? 100 : Math.round((exp / expMax) * 100),
      isMaxLevel: level >= maxLevel
    };
  }

  function getHonorLevelByCommanderLevel(level) {
    const safeLevel = Math.max(1, Math.floor(Number(level) || 1));
    return Math.max(1, Math.min(10, Math.floor((safeLevel - 1) / 6) + 1));
  }

  function honorLevelToText(value) {
    const labels = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return labels[Math.max(1, Math.min(10, Math.floor(Number(value) || 1)))] || "I";
  }

  function getPerfectBattleReward() {
    return { exp: BATTLE_REWARD_CONFIG.perfectExp, gold: BATTLE_REWARD_CONFIG.perfectGold, ...BATTLE_REWARD_CONFIG, isPerfect: true };
  }

  function getBattleRewardByKillCount({ killedEnemies, totalEnemies }) {
    if (!(Number(totalEnemies) > 0)) return { exp: 0, gold: 0, clearRate: 0, isPerfect: false };
    const clearRate = Math.max(0, Math.min(1, Number(killedEnemies) / Number(totalEnemies)));
    return { exp: Math.floor(BATTLE_REWARD_CONFIG.perfectExp * clearRate), gold: Math.floor(BATTLE_REWARD_CONFIG.perfectGold * clearRate), clearRate, isPerfect: clearRate >= 1 };
  }

  function getFighterUpgradeResult(profile, statType) {
    const targetLevel = Math.max(1, Math.floor(Number(profile.fighterUpgrades?.[statType]) || 1)) + 1;
    const commanderLevel = Math.max(1, Math.floor(Number(profile.player?.level) || 1));
    const cost = levelsConfig.getFighterUpgradeCost?.(statType, targetLevel);
    if (!cost) return { canUpgrade: false, reason: "MAX_LEVEL", targetLevel };
    if (targetLevel > commanderLevel) return { canUpgrade: false, reason: "COMMANDER_LEVEL_NOT_ENOUGH", targetLevel, cost };
    if (Number(profile.resources?.gold || profile.coins || 0) < cost) return { canUpgrade: false, reason: "GOLD_NOT_ENOUGH", targetLevel, cost };
    return { canUpgrade: true, targetLevel, cost };
  }

  function calculateRating({ isWin = true, hpRatio = 0, damageTaken = 0, bossClearTime = 999, killedEnemies = 0, expectedKills = 1, killRatio = null }) {
    if (!isWin) {
      return { stars: 0, honorTier: 0, honorLabel: "未通关", honorIcon: "none", icons: "---", label: "未通关", killRatio: 0 };
    }
    const safeHpRatio = Math.max(0, Math.min(1, Number(hpRatio) || 0));
    const safeDamageTaken = Math.max(0, Math.floor(Number(damageTaken) || 0));
    const safeBossClearTime = Math.max(0, Number(bossClearTime) || 999);
    const safeExpectedKills = Math.max(1, Math.floor(Number(expectedKills) || 1));
    const safeKilledEnemies = Math.max(0, Math.floor(Number(killedEnemies) || 0));
    const safeKillRatio = Math.max(0, Number(killRatio) || (safeKilledEnemies / safeExpectedKills));
    let tier = 1;
    if (safeKillRatio >= 0.55 && safeDamageTaken <= 8 && safeBossClearTime <= 45) tier = 2;
    if (safeKillRatio >= 0.75 && safeDamageTaken <= 5 && safeBossClearTime <= 35) tier = 3;
    if (safeKillRatio >= 0.95 && safeDamageTaken <= 2 && safeBossClearTime <= 25 && safeHpRatio >= 0.6) tier = 4;
    if (safeKillRatio >= 1.05 && safeDamageTaken === 0 && safeBossClearTime <= 18 && safeHpRatio >= 0.8) tier = 5;
    const stars = Math.min(3, tier);
    const labels = ["未通关", "1星", "2星", "3星", "3星金冠", "3星彩冠"];
    return {
      stars,
      honorTier: tier,
      honorLabel: labels[tier],
      honorIcon: tier >= 5 ? "crownColorful" : tier >= 4 ? "crownGold" : "starBadge",
      icons: `${"*".repeat(stars)}${"-".repeat(3 - stars)}${tier >= 4 ? "+C" : ""}`,
      label: labels[tier],
      hpRatio: safeHpRatio,
      bossClearTime: safeBossClearTime,
      damageTaken: safeDamageTaken,
      killedEnemies: safeKilledEnemies,
      expectedKills: safeExpectedKills,
      killRatio: safeKillRatio
    };
  }

  function getSweepReward(level) {
    return Math.round(level.reward * 0.72);
  }

  function getSweepExperience(reward, levelId) {
    return Math.round(getBattleExperience({ levelId, levelCoins: 0, baseReward: reward }) * 0.55);
  }

  function completeLevel(profile, level, rating) {
    profile.completed = Array.from(new Set([...(profile.completed || []), level.id]));
    profile.unlockedLevel = Math.max(profile.unlockedLevel || 1, Math.min((levelsConfig.levels || []).length || 3, level.id + 1));
    profile.ratings = profile.ratings || {};
    profile.ratings[level.id] = Math.max(profile.ratings[level.id] || 0, rating.stars);
    return profile;
  }

  const api = {
    getUpgradeCost,
    BATTLE_REWARD_CONFIG,
    INSURANCE_RULES,
    getInsuranceRule,
    getPerfectBattleReward,
    getBattleRewardByKillCount,
    getFighterUpgradeResult,
    getBattleExperience,
    applyExperience,
    createLevelProgressSnapshot,
    getHonorLevelByCommanderLevel,
    honorLevelToText,
    calculateRating,
    getSweepReward,
    getSweepExperience,
    completeLevel
  };

  scope.battleRules = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
