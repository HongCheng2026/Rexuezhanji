(function registerEndlessModeDirector(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function start(state) {
    state.battleMode = "endless";
    state.boss = null;
    state.bossSpawned = false;
    state.enemies = [];
    state.enemyBullets = [];
    state.endless = {
      round: 0,
      kills: 0,
      nextSpawnAt: 0,
      startedAt: Number(state.elapsed) || 0
    };
    return state.endless;
  }

  function getBossLevel(chapterIndex, round) {
    return {
      id: 3 + (chapterIndex - 1) * 10 + 10,
      code: "ENDLESS-" + round,
      chapterIndex: chapterIndex,
      stageInChapter: 10,
      name: "无尽模式"
    };
  }

  function spawnNextBoss(state) {
    var config = scope.endlessModeConfig;
    var bossSystem = scope.bossSystem;
    if (!config || !bossSystem || !bossSystem.spawnBoss) return null;
    var round = Math.max(1, Number(state.endless && state.endless.kills || 0) + 1);
    var stats = config.getRoundStats(round);
    var level = getBossLevel(stats.chapterIndex, round);
    var campaignStats = scope.enemyStageBalance && scope.enemyStageBalance.getEnemyFinalStats
      ? scope.enemyStageBalance.getEnemyFinalStats({ chapterIndex: stats.chapterIndex, stageInChapter: 10, enemyType: "boss" })
      : {};
    var bossDef = scope.combatCodexConfig && scope.combatCodexConfig.getStageBoss
      ? scope.combatCodexConfig.getStageBoss(stats.chapterIndex, 10)
      : null;
    var visual = scope.assets && scope.assets.getBossVisual
      ? scope.assets.getBossVisual(stats.chapterIndex, 10)
      : null;
    var bossName = bossDef && bossDef.name || visual && visual.title || "BOSS";
    var bossStats = Object.assign({}, campaignStats, {
      hp: stats.hp,
      attackDamage: stats.attackDamage,
      bulletSpeed: stats.bulletSpeed,
      damageReductionRate: stats.damageReductionRate,
      damageTakenMultiplier: stats.damageTakenMultiplier
    });
    state.endless.round = round;
    return bossSystem.spawnBoss(state, level, {
      bossStats: bossStats,
      bossDef: bossDef,
      visual: visual,
      endlessRound: round,
      title: "第 " + round + " 只 · " + bossName
    });
  }

  function beforeUpdate(state) {
    if (!state || state.battleMode !== "endless" || !state.endless) return;
    state.enemies = [];
    if (!state.boss && Number(state.elapsed) >= Number(state.endless.nextSpawnAt || 0)) {
      state.bossSpawned = false;
      spawnNextBoss(state);
    }
  }

  function afterCollisions(state) {
    if (!state || state.battleMode !== "endless" || !state.endless || !state.boss || state.boss.hp > 0) return false;
    state.endless.kills += 1;
    state.endless.round = state.endless.kills;
    state.endless.nextSpawnAt = state.endless.kills * scope.endlessModeConfig.BOSS_INTERVAL_SECONDS;
    state.boss = null;
    state.bossSpawned = false;
    state.enemyBullets = [];
    state.enemyTelegraphs = [];
    state.hudDirty = true;
    state.notices = state.notices || [];
    state.notices.push({
      text: "已击破 " + state.endless.kills + " 只 BOSS",
      color: "#ffd166",
      x: (state.fieldWidth || 1600) / 2,
      y: 120,
      life: 2
    });
    return true;
  }

  var api = {
    start: start,
    beforeUpdate: beforeUpdate,
    afterCollisions: afterCollisions,
    spawnNextBoss: spawnNextBoss,
    getBossLevel: getBossLevel
  };

  scope.endlessModeDirector = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
