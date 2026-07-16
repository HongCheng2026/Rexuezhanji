(function registerEndlessModeDirector(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var NORMAL_TYPES = ["small", "shooter", "charger", "shield", "bomber", "sniper", "rotor"];

  function start(state) {
    state.battleMode = "endless";
    state.boss = null;
    state.bossSpawned = false;
    state.enemies = [];
    state.enemyBullets = [];
    state.endless = {
      round: 0,
      kills: 0,
      nextBossAt: 0,
      bossSpawnedAt: null,
      nextEscortAt: null,
      intermissionStartedAt: null,
      reinforcementIndex: 0,
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
    var elapsed = Number(state.elapsed) || 0;
    state.endless.round = round;
    state.endless.bossSpawnedAt = elapsed;
    state.endless.nextEscortAt = elapsed + config.BOSS_ESCORT_FIRST_DELAY_SECONDS;
    state.endless.intermissionStartedAt = null;
    state.endless.reinforcementIndex = 0;
    return bossSystem.spawnBoss(state, level, {
      bossStats: bossStats,
      bossDef: bossDef,
      visual: visual,
      endlessRound: round,
      title: "第 " + round + " 只 · " + bossName
    });
  }

  function spawnWave(state, phase) {
    var config = scope.endlessModeConfig;
    var enemySystem = scope.enemySystem;
    if (!config || !enemySystem || typeof enemySystem.spawnWave !== "function") return 0;
    var isEscort = phase === "escort";
    var round = isEscort
      ? Math.max(1, Number(state.endless && state.endless.round) || 1)
      : Math.max(1, Number(state.endless && state.endless.kills || 0) + 1);
    var chapterIndex = config.getBossChapter(round);
    return enemySystem.spawnWave(state, getBossLevel(chapterIndex, round), {
      phaseId: isEscort ? "endless-boss-escort" : "endless-intermission",
      waveSize: isEscort ? config.BOSS_ESCORT_WAVE_SIZE : config.INTERMISSION_REINFORCEMENT_WAVE_SIZE,
      activeCap: isEscort ? config.BOSS_ESCORT_ACTIVE_CAP : config.INTERMISSION_REINFORCEMENT_ACTIVE_CAP,
      allowElite: false,
      allowedTypes: NORMAL_TYPES
    });
  }

  function updateEscortWaves(state, elapsed) {
    var config = scope.endlessModeConfig;
    var nextAt = Number(state.endless.nextEscortAt);
    if (!isFinite(nextAt)) return;
    while (elapsed >= nextAt) {
      spawnWave(state, "escort");
      nextAt += config.BOSS_ESCORT_INTERVAL_SECONDS;
    }
    state.endless.nextEscortAt = nextAt;
  }

  function updateIntermissionWaves(state, elapsed) {
    if (state.endless.intermissionStartedAt == null) return;
    var offsets = scope.endlessModeConfig.INTERMISSION_REINFORCEMENT_OFFSETS_SECONDS || [];
    var index = Math.max(0, Math.floor(Number(state.endless.reinforcementIndex) || 0));
    while (index < offsets.length && elapsed >= state.endless.intermissionStartedAt + offsets[index]) {
      spawnWave(state, "intermission");
      index += 1;
    }
    state.endless.reinforcementIndex = index;
  }

  function beforeUpdate(state) {
    if (!state || state.battleMode !== "endless" || !state.endless) return;
    var elapsed = Number(state.elapsed) || 0;
    if (!state.boss && elapsed >= Number(state.endless.nextBossAt || 0)) {
      state.bossSpawned = false;
      spawnNextBoss(state);
      return;
    }
    if (state.boss) {
      updateEscortWaves(state, elapsed);
      return;
    }
    updateIntermissionWaves(state, elapsed);
  }

  function afterCollisions(state) {
    if (!state || state.battleMode !== "endless" || !state.endless || !state.boss || state.boss.hp > 0) return false;
    state.endless.kills += 1;
    state.endless.round = state.endless.kills;
    state.endless.bossSpawnedAt = null;
    state.endless.nextEscortAt = null;
    state.endless.intermissionStartedAt = Number(state.elapsed) || 0;
    state.endless.reinforcementIndex = 0;
    state.endless.nextBossAt = state.endless.intermissionStartedAt + scope.endlessModeConfig.BOSS_INTERVAL_SECONDS;
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
    spawnWave: spawnWave,
    getBossLevel: getBossLevel
  };

  scope.endlessModeDirector = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
