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
    if (!gained) return { gained: 0, leveled: 0 };
    const maxLevel = levelsConfig.COMMANDER_MAX_LEVEL || 60;
    const totals = levelsConfig.COMMANDER_TOTAL_EXP_BY_LEVEL || [];
    const oldLevel = Math.max(1, Math.min(maxLevel, Math.floor(Number(player.level) || 1)));
    const oldExp = Math.max(0, Math.floor(Number(player.exp) || 0));
    const previousTotal = Math.max(0, Math.floor(Number(player.totalExp) || ((totals[oldLevel] || 0) + oldExp)));
    player.totalExp = previousTotal + gained;
    player.level = oldLevel;
    while (player.level < maxLevel && player.totalExp >= (totals[player.level + 1] || Infinity)) player.level += 1;
    player.expMax = levelsConfig.getCommanderExpToNextLevel ? levelsConfig.getCommanderExpToNextLevel(player.level) : player.expMax;
    player.exp = player.level >= maxLevel ? 0 : Math.max(0, player.totalExp - (totals[player.level] || 0));
    player.badge = player.level >= 30 ? "V" : player.level >= 20 ? "IV" : player.level >= 12 ? "III" : player.level >= 6 ? "II" : "I";
    return { gained, leveled: player.level - oldLevel };
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

  function calculateRating({ damageTaken, powerupsSpawned, powerupsCollected, bossClearTime }) {
    const stars = 1 + (damageTaken === 0 ? 1 : 0) + (powerupsSpawned === powerupsCollected ? 1 : 0);
    const crown = bossClearTime <= 20 ? "👑" : "";
    const palette = bossClearTime <= 10 ? "全彩" : bossClearTime <= 30 ? "金色" : "银色";
    return { stars, icons: `${"★".repeat(stars)}${"☆".repeat(3 - stars)}${crown}`, label: `${palette}${stars}星` };
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
    getPerfectBattleReward,
    getBattleRewardByKillCount,
    getFighterUpgradeResult,
    getBattleExperience,
    applyExperience,
    calculateRating,
    getSweepReward,
    getSweepExperience,
    completeLevel
  };

  scope.battleRules = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
