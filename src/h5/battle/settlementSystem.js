(function registerSettlementSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var battleRules = scope.battleRules || {};
  var enemyBalance = scope.enemyStageBalance || {};
  var HONOR_TIERS = {
    0: { label: "未评级", icon: "none" },
    1: { label: "1星", icon: "starBadge" },
    2: { label: "2星", icon: "starBadge" },
    3: { label: "3星", icon: "starBadge" },
    4: { label: "3星金冠", icon: "crownGold" },
    5: { label: "3星彩冠", icon: "crownColorful" }
  };

  function normalizeKillStats(state) {
    var source = state && state.killStats ? state.killStats : {};
    return {
      small: Math.max(0, Math.floor(source.small || 0)),
      elite: Math.max(0, Math.floor(source.elite || 0)),
      boss: Math.max(0, Math.floor(source.boss || 0)),
      total: Math.max(0, Math.floor(source.total || ((source.small || 0) + (source.elite || 0) + (source.boss || 0)))),
      baseGold: Math.max(0, Math.floor(source.baseGold || 0))
    };
  }

  function createGoldBreakdown(state, level, isWin) {
    var killStats = normalizeKillStats(state);
    var clearBonus = isWin ? Math.max(0, Math.floor((level && level.reward) || 200)) : 0;
    var rawKillGold = killStats.baseGold;

    if (!rawKillGold && killStats.total) {
      rawKillGold = killStats.small * 10 + killStats.elite * 60 + killStats.boss * Math.max(200, Math.floor(((level && level.reward) || 200) * 0.8));
    }
    var rewardLimit = calculateRewardLimit(level, killStats.total);
    var killGold = applyRewardSoftCap(rawKillGold, killStats.total, rewardLimit.expectedKills);

    return {
      smallKills: killStats.small,
      eliteKills: killStats.elite,
      bossKills: killStats.boss,
      rawKillGold: rawKillGold,
      killGold: killGold,
      expectedKills: rewardLimit.expectedKills,
      overCapKills: Math.max(0, killStats.total - rewardLimit.expectedKills),
      clearBonus: clearBonus,
      total: killGold + clearBonus
    };
  }

  function getChapterIndex(level) {
    return level && typeof level.chapterIndex === "number" ? level.chapterIndex : 1;
  }

  function calculateRewardLimit(level, totalKills) {
    var chapterIndex = getChapterIndex(level);
    var expected = enemyBalance && enemyBalance.getExpectedKills
      ? enemyBalance.getExpectedKills(chapterIndex)
      : (chapterIndex <= 0 ? 120 : chapterIndex === 1 ? 180 : chapterIndex === 2 ? 220 : chapterIndex === 3 ? 260 : 260 + (chapterIndex - 3) * 40);
    return {
      expectedKills: Math.max(1, Math.floor(expected || totalKills || 1))
    };
  }

  function applyRewardSoftCap(rawGold, totalKills, expectedKills) {
    rawGold = Math.max(0, Math.floor(rawGold || 0));
    totalKills = Math.max(0, Math.floor(totalKills || 0));
    expectedKills = Math.max(1, Math.floor(expectedKills || 1));
    if (!rawGold || !totalKills || totalKills <= expectedKills) return rawGold;

    var averageGold = rawGold / totalKills;
    var overKills = totalKills - expectedKills;
    var firstBand = Math.min(overKills, Math.ceil(expectedKills * 0.5));
    var secondBand = Math.max(0, overKills - firstBand);
    var effectiveKills = expectedKills + firstBand * 0.5 + secondBand * 0.2;
    return Math.max(1, Math.floor(averageGold * effectiveKills));
  }

  function getBossClearTime(state) {
    return state && state.boss
      ? Math.max(0, (state.elapsed || 0) - (state.boss.spawnedAt || 0))
      : 999;
  }

  function generateBattleResult(state, level, isWin, endReason) {
    state = state || {};
    level = level || {};
    var killStats = normalizeKillStats(state);
    var goldBreakdown = createGoldBreakdown(state, level, isWin);
    var bossClearTime = getBossClearTime(state);
    var rating = calculateRating(state, bossClearTime, isWin, killStats, goldBreakdown);
    var expEarned = Math.max(5, Math.floor(goldBreakdown.killGold * 0.2));

    if (isWin) {
      expEarned += Math.max(60, Math.round(((level && level.reward) || 200) * 0.35));
    }

    return {
      isWin: Boolean(isWin),
      endReason: endReason || (isWin ? "win" : "fail"),
      levelId: level.id,
      chapterIndex: getChapterIndex(level),
      stageInChapter: level.stageInChapter || level.id || 1,
      killedEnemies: killStats.total,
      totalEnemies: killStats.total,
      killStats: killStats,
      goldBreakdown: goldBreakdown,
      coinsEarned: goldBreakdown.total,
      expEarned: expEarned,
      energyRefunded: false,
      damageTaken: state.damageTaken || 0,
      powerupsSpawned: state.powerupsSpawned || 0,
      powerupsCollected: state.powerupsCollected || 0,
      bossClearTime: isWin ? bossClearTime : 999,
      rating: rating
    };
  }

  function calculateRating(state, bossClearTime, isWin, killStats, goldBreakdown) {
    var player = state.player || {};
    var hpRatio = Math.max(0, Math.min(1, (player.hp || 0) / Math.max(1, player.maxHp || 100)));
    var damageTaken = Math.max(0, Math.floor(Number(state.damageTaken) || 0));
    killStats = killStats || normalizeKillStats(state);
    goldBreakdown = goldBreakdown || { expectedKills: Math.max(1, killStats.total || 1) };
    var expectedKills = Math.max(1, Math.floor(Number(goldBreakdown.expectedKills) || 1));
    var killRatio = Math.max(0, killStats.total / expectedKills);
    if (battleRules.calculateRating) {
      return attachHonorRating(battleRules.calculateRating({
        isWin: Boolean(isWin),
        hpRatio: hpRatio,
        damageTaken: damageTaken,
        bossClearTime: bossClearTime,
        killedEnemies: killStats.total,
        expectedKills: expectedKills,
        killRatio: killRatio
      }) || {}, state, bossClearTime, Boolean(isWin), hpRatio);
    }
    var tier = 0;
    if (isWin) {
      tier = 1;
      if (killRatio >= 0.55 && damageTaken <= 8 && bossClearTime <= 45) tier = 2;
      if (killRatio >= 0.75 && damageTaken <= 5 && bossClearTime <= 35) tier = 3;
      if (killRatio >= 0.95 && damageTaken <= 2 && bossClearTime <= 25 && hpRatio >= 0.6) tier = 4;
      if (killRatio >= 1.05 && damageTaken === 0 && bossClearTime <= 18 && hpRatio >= 0.8) tier = 5;
    }
    var honor = HONOR_TIERS[tier] || HONOR_TIERS[0];
    return attachHonorRating({
      stars: Math.min(3, tier),
      honorTier: tier,
      honorLabel: honor.label,
      honorIcon: honor.icon,
      label: honor.label,
      hpRatio: hpRatio,
      damageTaken: damageTaken,
      bossClearTime: bossClearTime,
      killedEnemies: killStats.total,
      expectedKills: expectedKills,
      killRatio: killRatio
    }, state, bossClearTime, Boolean(isWin), hpRatio);
  }

  function attachHonorRating(rating, state, bossClearTime, isWin, hpRatio) {
    if (!isWin) {
      rating.stars = 0;
      rating.honorTier = 0;
      rating.honorLabel = "未通关";
      rating.honorIcon = "none";
      rating.label = "未通关";
      rating.hpRatio = Math.max(0, Math.min(1, Number(hpRatio) || 0));
      rating.bossClearTime = bossClearTime;
      rating.damageTaken = Math.max(0, Math.floor(Number(state && state.damageTaken) || 0));
      rating.killedEnemies = Math.max(0, Math.floor(Number(state && state.killStats && state.killStats.total) || 0));
      rating.expectedKills = Math.max(1, Math.floor(Number(rating.expectedKills) || rating.killedEnemies || 1));
      rating.killRatio = Math.max(0, Number(rating.killRatio) || (rating.killedEnemies / rating.expectedKills));
      return rating;
    }
    if (rating.honorTier != null) {
      rating.stars = Math.max(0, Math.min(3, Math.floor(Number(rating.stars) || Math.min(3, rating.honorTier))));
      rating.bestHonorTier = rating.honorTier;
      return rating;
    }
    var stars = Math.max(0, Math.min(3, Math.floor(Number(rating.stars) || 0)));
    var tier = Math.max(0, stars);
    hpRatio = Math.max(0, Math.min(1, Number(hpRatio) || 0));
    if (stars >= 3 && hpRatio >= 0.75 && (state.damageTaken || 0) <= 2 && bossClearTime <= 20) tier = 4;
    if (stars >= 3 && hpRatio >= 0.75 && (state.damageTaken || 0) === 0 && bossClearTime <= 15) tier = 5;
    var honor = HONOR_TIERS[tier] || HONOR_TIERS[0];
    rating.stars = stars;
    rating.honorTier = tier;
    rating.honorLabel = honor.label;
    rating.honorIcon = honor.icon;
    rating.label = honor.label;
    rating.hpRatio = hpRatio;
    rating.bossClearTime = bossClearTime;
    rating.damageTaken = Math.max(0, Math.floor(Number(state && state.damageTaken) || 0));
    return rating;
  }

  function completeLevelSetup(state, level, profile, cloudTicket) {
    var result = generateBattleResult(state, level, true, "win");
    var settlement = {
      gold: result.coinsEarned,
      experience: result.expEarned,
      rating: result.rating
    };

    var updatedProfile = profile;
    if (battleRules.completeLevel) {
      updatedProfile = battleRules.completeLevel(profile, level, result.rating);
    }

    return {
      result: result,
      settlement: settlement,
      updatedProfile: updatedProfile
    };
  }

  var api = {
    generateBattleResult: generateBattleResult,
    calculateRating: calculateRating,
    HONOR_TIERS: HONOR_TIERS,
    completeLevelSetup: completeLevelSetup
  };

  scope.settlementSystem = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
