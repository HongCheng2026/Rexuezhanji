(function registerBattleRules(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const levelsConfig = scope.levels || {};

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
    let leveled = 0;
    player.exp += gained;
    while (player.exp >= player.expMax) {
      player.exp -= player.expMax;
      player.level += 1;
      leveled += 1;
      player.expMax = Math.floor(player.expMax * 1.22 + 40);
      player.badge = player.level >= 30 ? "V" : player.level >= 20 ? "IV" : player.level >= 12 ? "III" : player.level >= 6 ? "II" : "I";
    }
    return { gained, leveled };
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
