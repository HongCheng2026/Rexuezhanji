(function registerProgressionSystem(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var battleRules = scope.battleRules || {};
  var stageHonorSystem = scope.stageHonorSystem || {};
  var ENERGY_COST = levelsConfig.ENERGY_COST || 5;

  // ── Level helpers ──────────────────────────────────────────

  function getLevelById(id) {
    return (levelsConfig.levels || []).find(function match(item) {
      return Number(item.id) === Number(id);
    });
  }

  // ── Unlock ─────────────────────────────────────────────────

  function isLevelUnlocked(level, profile) {
    if (!level || !profile) return false;
    return level.id <= (profile.unlockedLevel || 0);
  }

  // ── Completion check ───────────────────────────────────────

  function isLevelCompleted(levelOrId, profile) {
    if (!profile || levelOrId == null) return false;

    var level = typeof levelOrId === "object"
      ? levelOrId
      : getLevelById(levelOrId);

    var levelId = Number(level && level.id != null ? level.id : levelOrId);
    var completed = Array.isArray(profile.completed) ? profile.completed : [];
    if (Number.isFinite(levelId) && completed.some(function matchesLevel(id) {
      return Number(id) === levelId;
    })) return true;

    if (!level) return false;

    var stageKey = stageHonorSystem.getStageKey
      ? stageHonorSystem.getStageKey(level)
      : (Number(level.chapterIndex) === 0
        ? "prologue_" + level.stageInChapter
        : level.chapterIndex + "_" + level.stageInChapter);

    var cleared = profile.progress && Array.isArray(profile.progress.clearedStageIds)
      ? profile.progress.clearedStageIds
      : [];
    return cleared.some(function matchesStage(id) {
      return String(id) === String(stageKey);
    });
  }

  // ── Rating ─────────────────────────────────────────────────

  function getLevelRating(levelId, profile) {
    if (!profile || !profile.ratings) return 0;
    return profile.ratings[levelId] || 0;
  }

  // ── Complete level ─────────────────────────────────────────

  function completeLevel(profile, level, rating) {
    profile.completed = Array.from(new Set([].concat(profile.completed || [], [level.id])));

    var levelCount = (levelsConfig.levels || []).length;
    var upperBound = levelCount > 0
      ? levelCount
      : Math.max(level.id + 1, profile.unlockedLevel || 1);
    profile.unlockedLevel = Math.max(
      profile.unlockedLevel || 1,
      Math.min(upperBound, level.id + 1)
    );

    if (stageHonorSystem.recordStageHonor) {
      stageHonorSystem.recordStageHonor(profile, level, rating);
    } else {
      profile.ratings = profile.ratings || {};
      profile.ratings[level.id] = Math.max(
        profile.ratings[level.id] || 0,
        rating.stars || 0
      );
    }

    return profile;
  }

  // ── Battle rewards ─────────────────────────────────────────

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
    var levelProgress = battleRules.applyProfileExperience
      ? battleRules.applyProfileExperience(profile, expReward)
      : battleRules.applyExperience
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

  // ── Sweep ──────────────────────────────────────────────────

  function getSweepReward(level) {
    if (battleRules.getSweepReward) return battleRules.getSweepReward(level);
    return Math.round((level.reward || 200) * 0.72);
  }

  function sweepLevel(profile, level, count) {
    var eligibility = battleRules.getSweepEligibility
      ? battleRules.getSweepEligibility(profile, level)
      : { canSweep: Boolean(level && isLevelCompleted(level, profile)), reason: "NOT_COMPLETED" };
    if (!eligibility.canSweep) return { success: false, reason: eligibility.reason || "NOT_COMPLETED" };

    var sweepCount = Math.max(1, Math.floor(Number(count) || 1));
    var maxCount = battleRules.getSweepMaxCount
      ? battleRules.getSweepMaxCount(profile)
      : Math.floor(Math.max(0, Number(profile.resources && profile.resources.energy) || 0) / ENERGY_COST);
    if (sweepCount > maxCount) return { success: false, reason: "NO_ENERGY", maxCount: maxCount };

    var energySpent = sweepCount * ENERGY_COST;
    if (!spendEnergy(profile, energySpent)) return { success: false, reason: "NO_ENERGY", maxCount: maxCount };

    var singleGoldReward = getSweepReward(level);
    var singleExpReward = battleRules.getSweepExperience
      ? battleRules.getSweepExperience(singleGoldReward, level.id)
      : Math.round(singleGoldReward * 0.55);
    var goldReward = singleGoldReward * sweepCount;
    var expReward = singleExpReward * sweepCount;

    var resources = profile.resources || {};
    resources.gold = Math.max(0, Math.floor((resources.gold || 0) + goldReward));

    var player = profile.player || {};
    var levelProgress = battleRules.applyProfileExperience
      ? battleRules.applyProfileExperience(profile, expReward)
      : battleRules.applyExperience
        ? battleRules.applyExperience(player, expReward)
        : { gained: expReward, leveled: 0 };
    profile.player = player;

    return {
      success: true, count: sweepCount, energySpent: energySpent,
      goldEarned: goldReward, expEarned: expReward,
      levelProgress: levelProgress, profile: profile
    };
  }

  function spendEnergy(profile, amount) {
    profile.resources = profile.resources || {};
    var resources = profile.resources;
    var cost = Math.max(0, Math.floor(Number(amount) || 0));
    var current = Math.max(0, Math.floor(Number(resources.energy) || 0));
    if (current < cost) return false;
    resources.energy = current - cost;
    return true;
  }

  // ── API ────────────────────────────────────────────────────

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
})(typeof globalThis !== "undefined" ? globalThis : window);
