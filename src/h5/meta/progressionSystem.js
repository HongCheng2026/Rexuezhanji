(function registerProgressionSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var battleRules = scope.battleRules || {};
  var levelsConfig = scope.levels || {};
  var ENERGY_COST = levelsConfig.ENERGY_COST || 5;

  /**
   * 检查关卡是否已解锁
   */
  function isLevelUnlocked(level, profile) {
    if (!level || !profile) return false;
    return level.id <= (profile.unlockedLevel || 0);
  }

  /**
   * 检查关卡是否已通关
   */
  function isLevelCompleted(levelId, profile) {
    if (!profile || !profile.completed) return false;
    return profile.completed.indexOf(levelId) >= 0;
  }

  /**
   * 获取关卡评星
   */
  function getLevelRating(levelId, profile) {
    if (!profile || !profile.ratings) return 0;
    return profile.ratings[levelId] || 0;
  }

  /**
   * 完成关卡后更新进度
   */
  function completeLevel(profile, level, rating) {
    if (battleRules.completeLevel) {
      return battleRules.completeLevel(profile, level, rating);
    }
    // 兜底
    var completed = Array.from(new Set([].concat(profile.completed || [], [level.id])));
    profile.completed = completed;
    profile.unlockedLevel = Math.max(
      profile.unlockedLevel || 1,
      Math.min((levelsConfig.levels || []).length || 3, level.id + 1)
    );
    profile.ratings = profile.ratings || {};
    profile.ratings[level.id] = Math.max(profile.ratings[level.id] || 0, rating.stars || 0);
    return profile;
  }

  /**
   * 结算过关奖励
   */
  function settleBattleRewards(profile, result) {
    var goldReward = 0;
    var expReward = 0;

    if (result && result.isWin) {
      goldReward = result.coinsEarned || 200;
      expReward = result.levelId ? result.levelId * 12 : 100;
    }

    var resources = profile.resources || {};
    resources.gold = Math.max(0, Math.floor((resources.gold || 0) + goldReward));

    var player = profile.player || {};
    var levelProgress = battleRules.applyExperience
      ? battleRules.applyExperience(player, expReward)
      : { gained: expReward, leveled: 0 };
    profile.player = player;

    return {
      goldEarned: goldReward,
      expEarned: expReward,
      levelProgress: levelProgress,
      profile: profile
    };
  }

  /**
   * 计算扫荡奖励
   */
  function getSweepReward(level) {
    if (battleRules.getSweepReward) {
      return battleRules.getSweepReward(level);
    }
    return Math.round((level.reward || 200) * 0.72);
  }

  /**
   * 扫荡关卡（生成数据，不处理 UI）
   */
  function sweepLevel(profile, level) {
    if (!isLevelCompleted(level.id, profile)) {
      return { success: false, reason: "NOT_COMPLETED" };
    }

    if (!spendEnergy(profile, ENERGY_COST)) {
      return { success: false, reason: "NO_ENERGY" };
    }

    var goldReward = getSweepReward(level);
    var expReward = battleRules.getSweepExperience
      ? battleRules.getSweepExperience(goldReward, level.id)
      : Math.round(goldReward * 0.55);

    var resources = profile.resources || {};
    resources.gold = Math.max(0, Math.floor((resources.gold || 0) + goldReward));

    var player = profile.player || {};
    var levelProgress = battleRules.applyExperience
      ? battleRules.applyExperience(player, expReward)
      : { gained: expReward, leveled: 0 };
    profile.player = player;

    return {
      success: true,
      goldEarned: goldReward,
      expEarned: expReward,
      levelProgress: levelProgress,
      profile: profile
    };
  }

  function spendEnergy(profile, amount) {
    var resources = profile.resources || {};
    resources.energy = Math.max(0, Math.floor((resources.energy || 0) - amount));
    return resources.energy >= 0;
  }

  var api = {
    isLevelUnlocked: isLevelUnlocked,
    isLevelCompleted: isLevelCompleted,
    getLevelRating: getLevelRating,
    completeLevel: completeLevel,
    settleBattleRewards: settleBattleRewards,
    getSweepReward: getSweepReward,
    sweepLevel: sweepLevel
  };

  scope.progressionSystem = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
