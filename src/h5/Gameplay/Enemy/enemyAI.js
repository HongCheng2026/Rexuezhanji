(function registerEnemyAI(root) {
  // 敌人/Boss 的纯决策函数（AI 大脑）从 enemySystem / bossSystem 抽取而来。
  // 这些函数只做「选类型 / 选入场 / 选火力 / 选阶段压力 / 算数值 / 预警文案」等决策，
  // 不触碰 state 的逐帧更新、子弹数组或 battleGeometry，由系统的 spawn/update 编排层委托调用。
  var scope = root.RXGame || (root.RXGame = {});
  var enemyBalance = scope.enemyStageBalance || {};
  var balanceConfig = scope.balance || {};
  var combatCodexConfig = scope.combatCodexConfig || {};
  var NORMAL_TYPES = ["small", "shooter", "charger", "shield", "bomber", "sniper", "guard", "rotor", "core"];

  function pickWaveEnemyType(allowedTypes, weights) {
    var weighted = [];
    var total = 0;
    for (var i = 0; i < allowedTypes.length; i++) {
      var type = allowedTypes[i];
      var weight = Math.max(0, Number(weights[type]) || 0);
      weighted.push({ type: type, weight: weight });
      total += weight;
    }
    if (total <= 0) return allowedTypes.indexOf("small") >= 0 ? "small" : allowedTypes[0];
    var roll = Math.random() * total;
    for (var j = 0; j < weighted.length; j++) {
      roll -= weighted[j].weight;
      if (roll <= 0) return weighted[j].type;
    }
    return weighted[0].type;
  }

  function pickBossGuardType(index, state) {
    var theme = state && state.boss ? state.boss.theme : "";
    if (theme === "mothership") {
      if (index === 0) return "core";
      if (index === 1) return "guard";
      if (index === 2) return "sniper";
      return Math.random() < 0.28 ? "rotor" : "shooter";
    }
    if (theme === "summon") return index % 3 === 0 ? "guard" : (index % 3 === 1 ? "bomber" : "shooter");
    if (index === 0) return "shield";
    if (index === 1) return "shooter";
    if (index === 2) return "charger";
    return Math.random() < 0.22 ? "elite" : "small";
  }

  function getBossGuardEntryPatterns(state) {
    var theme = state && state.boss ? state.boss.theme : "";
    if (theme === "mothership") return ["mothershipGuard", "eliteEscort", "topDive", "bottomRise", "delayedPincer"];
    if (theme === "summon") return ["eliteEscort", "shieldLine", "chargeThrough"];
    if (theme === "armorCore" || theme === "shield") return ["shieldLine", "eliteEscort"];
    return ["eliteEscort", "shieldLine"];
  }

  function getCurrentPhase(director, elapsed) {
    var phases = director.phases || [];
    for (var i = 0; i < phases.length; i++) {
      if (elapsed >= phases[i].start && elapsed < phases[i].end) return phases[i];
    }
    return phases[phases.length - 1] || null;
  }

  function getPhasePressure(director, phase, bossActive) {
    var activeCap = bossActive ? director.bossGuardCap : (phase.activeCap || director.activeCap || 26);
    var waveSize = phase.waveSize || 4;
    return {
      id: phase.id,
      activeCap: activeCap,
      enteringCap: bossActive ? activeCap + Math.max(2, Math.ceil(waveSize / 2)) : (phase.enteringCap || director.enteringCap || activeCap + waveSize),
      waveSize: bossActive ? Math.max(2, Math.ceil(waveSize / 2)) : waveSize,
      refillInterval: phase.refillInterval || phase.waveInterval || 0.7,
      intervalJitter: phase.intervalJitter || 0.12,
      minWaveInterval: phase.minWaveInterval || 0.24,
      minAliveTargets: bossActive ? Math.max(2, Math.floor(activeCap * 0.5)) : (phase.minAliveTargets || Math.max(3, Math.floor(activeCap * 0.35))),
      antiDrySpawn: phase.antiDrySpawn || Math.max(2, Math.floor(waveSize * 0.8)),
      eliteChance: bossActive ? Math.min(0.45, (phase.eliteChance || 0.1) + 0.08) : (phase.eliteChance || 0),
      typeWeights: phase.typeWeights || director.typeWeights || { small: 0.65, shooter: 0.2, charger: 0.08, shield: 0.07 },
      entryPatterns: phase.entryPatterns || ["lane"]
    };
  }

  function pickEnemyType(director, phase, state) {
    var elapsed = state.elapsed || 0;
    var pressureBias = phase.id === "pressure" || phase.id === "bossPressure";
    var eliteChance = typeof phase.eliteChance === "number" ? phase.eliteChance : (pressureBias ? 0.3 : 0.12);
    if (elapsed > 12 && Math.random() < eliteChance) return "elite";

    var weighted = NORMAL_TYPES.map(function make(type) {
      var weights = phase.typeWeights || director.typeWeights || {};
      var weight = Math.max(0, weights[type] || 0);
      if (phase.id === "pressure" && (type === "shooter" || type === "shield")) weight *= 1.4;
      if (phase.id === "bossPressure" && (type === "shield" || type === "charger")) weight *= 1.5;
      return { type: type, weight: weight };
    });
    var total = weighted.reduce(function sum(acc, item) { return acc + item.weight; }, 0);
    if (total <= 0) return "small";
    var roll = Math.random() * total;
    for (var i = 0; i < weighted.length; i++) {
      roll -= weighted[i].weight;
      if (roll <= 0) return weighted[i].type;
    }
    return weighted[0].type;
  }

  function getWaveInterval(level, phase, spawned) {
    if (!spawned) return 0.5;
    var base = phase.refillInterval || phase.waveInterval || level.spawn || 0.8;
    var chapter = level.chapterIndex || 0;
    var pressure = chapter >= 7 ? 0.82 : chapter >= 5 ? 0.9 : 1;
    var jitter = typeof phase.intervalJitter === "number" ? phase.intervalJitter : 0.18;
    var minInterval = typeof phase.minWaveInterval === "number" ? phase.minWaveInterval : 0.28;
    return Math.max(minInterval, base * pressure + Math.random() * jitter);
  }

  function createFallbackPressurePhases(plan) {
    var phases = (plan && plan.phases) || [
      { id: "opening", start: 0, end: 18, waveInterval: 0.7, waveSize: 4, eliteChance: 0.04, entryPatterns: ["lane"] },
      { id: "grass", start: 18, end: 55, waveInterval: 0.62, waveSize: 5, eliteChance: 0.08, entryPatterns: ["lane", "formation"] },
      { id: "pressure", start: 55, end: 75, waveInterval: 0.58, waveSize: 5, eliteChance: 0.18, entryPatterns: ["formation", "charger"] },
      { id: "bossPressure", start: 75, end: 90, waveInterval: 0.7, waveSize: 4, eliteChance: 0.22, entryPatterns: ["lane", "shieldLine"] }
    ];
    var activeCap = (plan && plan.simultaneousCap) || 26;
    return phases.map(function mapPhase(phase) {
      var waveSize = phase.waveSize || 4;
      return {
        id: phase.id,
        start: phase.start,
        end: phase.end,
        activeCap: activeCap,
        enteringCap: activeCap + waveSize,
        waveSize: waveSize,
        refillInterval: phase.waveInterval || 0.7,
        intervalJitter: phase.intervalJitter || 0.12,
        minAliveTargets: phase.minAliveTargets || Math.max(3, Math.floor(activeCap * 0.35)),
        antiDrySpawn: phase.antiDrySpawn || Math.max(2, Math.floor(waveSize * 0.8)),
        eliteChance: phase.eliteChance || 0.08,
        typeWeights: { small: 0.65, shooter: 0.2, charger: 0.08, shield: 0.07 },
        entryPatterns: phase.entryPatterns || ["lane"]
      };
    });
  }

  function getRuntimeFireProfile(level, enemyType, phase) {
    var phaseProfile = phase && phase.fireProfile && phase.fireProfile[enemyType];
    if (phaseProfile) return phaseProfile;
    if (enemyBalance && enemyBalance.getEnemyFireProfile) {
      try {
        return enemyBalance.getEnemyFireProfile(
          level.chapterIndex != null ? level.chapterIndex : 1,
          level.stageInChapter != null ? level.stageInChapter : (level.id || 1),
          phase && phase.id ? phase.id : "grass",
          enemyType
        );
      } catch (e) { /* fallback below */ }
    }
    return {
      canFire: true,
      bulletPattern: null,
      fireInterval: null,
      firstFireDelay: null,
      bulletSpeedMultiplier: 1
    };
  }

  function getRuntimeStats(level, enemyType, unitId) {
    if (enemyBalance && enemyBalance.getEnemyFinalStats) {
      try {
        var opts = {
          chapterIndex: level.chapterIndex != null ? level.chapterIndex : 1,
          stageInChapter: level.stageInChapter != null ? level.stageInChapter : (level.id || 1),
          enemyType: enemyType
        };
        if (unitId) opts.unitId = unitId;
        return enemyBalance.getEnemyFinalStats(opts);
      } catch (e) { /* fallback below */ }
    }

    if (balanceConfig.getEnemyHp) {
      var hp = balanceConfig.getEnemyHp(enemyType, level);
      var scaling = balanceConfig.getEnemyScalingForLevel(level, {});
      return {
        hp: hp,
        damageTakenMultiplier: (scaling && scaling.damageTakenMultiplier) || 1,
        attackDamage: enemyType === "elite" ? 40 : 10,
        bulletSpeed: enemyType === "elite" ? 330 : 260,
        bulletPattern: enemyType === "elite" ? "elite_spread" : enemyType === "shooter" ? "triple" : "single"
      };
    }

    return {
      hp: enemyType === "elite" ? 1000 + (level.id || 1) * 120 : 100 + (level.id || 1) * 20,
      damageTakenMultiplier: 1,
      attackDamage: enemyType === "elite" ? 40 : 10,
      bulletSpeed: enemyType === "elite" ? 330 : 260,
      bulletPattern: enemyType === "elite" ? "elite_spread" : enemyType === "shooter" ? "triple" : "single"
    };
  }

  function getBossStats(level) {
    if (enemyBalance && enemyBalance.getEnemyFinalStats) {
      try {
        return enemyBalance.getEnemyFinalStats({
          chapterIndex: level.chapterIndex != null ? level.chapterIndex : 1,
          stageInChapter: level.stageInChapter != null ? level.stageInChapter : (level.id || 1),
          enemyType: "boss"
        });
      } catch (e) { /* fallback below */ }
    }
    if (balanceConfig.getBossScaling) {
      var scaling = balanceConfig.getBossScaling(
        level.chapterIndex != null ? level.chapterIndex : 1,
        level.stageInChapter != null ? level.stageInChapter : (level.id || 1)
      );
      return {
        hp: scaling.hp,
        damageReductionRate: scaling.damageReductionRate,
        damageTakenMultiplier: scaling.damageTakenMultiplier,
        attackDamage: 80,
        bulletSpeed: 360
      };
    }
    return { hp: 100000, damageTakenMultiplier: 1, attackDamage: 80, bulletSpeed: 360 };
  }

  function getPatternNotice(pattern) {
    if (pattern === "boss_lanes") return "封锁波预警";
    if (pattern === "boss_burst_spread") return "火力爆发预警";
    if (pattern === "boss_sniper") return "狙击锁定";
    if (pattern === "boss_charge_lane") return "冲锋航道";
    if (pattern === "boss_cross") return "交叉火力";
    if (pattern === "boss_rotating_fan") return "旋翼弹幕";
    if (pattern === "boss_summon") return "护卫召集";
    if (pattern === "boss_shield_pulse" || pattern === "boss_armor_pulse") return "装甲脉冲";
    if (pattern === "boss_wall") return "弹幕墙壁";
    if (pattern === "boss_ring_expand") return "环形弹幕";
    if (pattern === "boss_ring_recall") return "铆钉回收";
    if (pattern === "boss_homing_orb") return "追踪能量弹";
    if (pattern === "boss_fragment_volley") return "碎片急射";
    if (pattern === "boss_rotor_overdrive") return "旋翼超载";
    if (pattern === "boss_grid_explosion") return "全屏炮击";
    if (pattern === "boss_split_nest") return "分裂巢弹";
    if (pattern === "boss_laser_sweep") return "扫射光束";
    if (pattern === "boss_shockwave_ring") return "冲击波";
    return "扇形弹幕预警";
  }

  var api = {
    pickEnemyType: pickEnemyType,
    pickWaveEnemyType: pickWaveEnemyType,
    pickBossGuardType: pickBossGuardType,
    getBossGuardEntryPatterns: getBossGuardEntryPatterns,
    getRuntimeFireProfile: getRuntimeFireProfile,
    getRuntimeStats: getRuntimeStats,
    getCurrentPhase: getCurrentPhase,
    getPhasePressure: getPhasePressure,
    getWaveInterval: getWaveInterval,
    createFallbackPressurePhases: createFallbackPressurePhases,
    getBossStats: getBossStats,
    getPatternNotice: getPatternNotice
  };

  scope.enemyAI = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
