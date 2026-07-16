(function registerBossSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var balanceConfig = scope.balance || {};
  var enemyBalance = scope.enemyStageBalance || {};
  var combatCodexConfig = scope.combatCodexConfig || null;
  var weaponSys = scope.weaponSystem || {};
  var assetsConfig = scope.assets || {};

  var BOSS_SPAWN_TIME = levelsConfig.BOSS_SPAWN_TIME || 60;

  function spawnBossIfNeeded(state, level) {
    if (state.bossSpawned || state.elapsed < BOSS_SPAWN_TIME) return;
    return spawnBoss(state, level);
  }

  function spawnBoss(state, level, options) {
    options = options || {};
    state.bossSpawned = true;
    state.bossWarning = 3;
    var field = getField(state);

    var bossStats = options.bossStats || getBossStats(level);
    var waveConfig = bossStats.waveConfig || {};
    var visual = options.visual || (assetsConfig.getBossVisual
      ? assetsConfig.getBossVisual(level.chapterIndex, level.stageInChapter)
      : null);
    var drawWidth = visual ? visual.drawWidth : 168;
    var drawHeight = visual ? visual.drawHeight : 156;
    var hitRadiusX = visual ? visual.hitRadiusX : 78;
    var hitRadiusY = visual ? visual.hitRadiusY : 78;
    var bossDef = options.bossDef || null;
    if (!bossDef && combatCodexConfig && combatCodexConfig.getStageBoss) {
      bossDef = combatCodexConfig.getStageBoss(level.chapterIndex || 0, level.stageInChapter || 1);
    }
    if (bossDef && bossDef.cyclePatterns) {
      waveConfig.cyclePatterns = bossDef.cyclePatterns;
    }
    if (bossDef && bossDef.art) {
      if (!visual || !visual.drawWidth) { drawWidth = bossDef.art.drawWidth || drawWidth; }
      if (!visual || !visual.drawHeight) { drawHeight = bossDef.art.drawHeight || drawHeight; }
      if (!visual || !visual.hitRadiusX) { hitRadiusX = bossDef.art.hitRadiusX || hitRadiusX; }
      if (!visual || !visual.hitRadiusY) { hitRadiusY = bossDef.art.hitRadiusY || hitRadiusY; }
    }
    var minY = Math.max(96, drawHeight / 2 + 12);
    var maxY = field.height - minY;
    state.boss = {
      id: bossDef ? bossDef.bossId : "boss-" + (level.id || level.code || "1"),
      x: field.width + drawWidth / 2 + 24,
      y: field.height / 2,
      targetX: field.width - drawWidth / 2 - 18,
      radius: Math.max(hitRadiusX, hitRadiusY),
      hitRadiusX: hitRadiusX,
      hitRadiusY: hitRadiusY,
      minY: minY,
      maxY: maxY,
      visual: visual,
      hp: bossStats.hp,
      maxHp: bossStats.hp,
      damageTakenMultiplier: bossStats.damageTakenMultiplier,
      originalDamageTakenMultiplier: bossStats.damageTakenMultiplier,
      damageReductionRate: bossStats.damageReductionRate != null ? bossStats.damageReductionRate : Math.max(0, 1 - Number(bossStats.damageTakenMultiplier || 1)),
      originalDamageReductionRate: bossStats.damageReductionRate != null ? bossStats.damageReductionRate : Math.max(0, 1 - Number(bossStats.damageTakenMultiplier || 1)),
      attackDamage: bossStats.attackDamage || bossStats.baseDamage || 1000,
      bulletSpeed: (bossStats.bulletSpeed || 360) * (bossStats.bulletSpeedMultiplier || 1),
      fireInterval: bossStats.fireInterval || 0.55,
      bulletPattern: bossStats.bulletPattern || "boss_cycle",
      waveConfig: waveConfig,
      theme: bossStats.bossTheme || waveConfig.theme || "fan",
      title: options.title || (bossDef && bossDef.name) || (visual && visual.title) || bossStats.title || waveConfig.title || "BOSS 接敌",
      endlessRound: Math.max(0, Math.floor(Number(options.endlessRound) || 0)),
      spawnedAt: state.elapsed,
      fireTimer: 0,
      minFireInterval: waveConfig.minFireInterval || 0.32,
      aimInterval: waveConfig.aimInterval === null ? null : (waveConfig.aimInterval || 0.9),
      waveTimer: waveConfig.aimInterval === null ? null : 0.2,
      armorTimer: 0,
      armorMode: "normal",
      burstTimer: 0,
      burstRemaining: 0,
      burstTriggered: {},
      pendingPattern: null,
      patternIndex: 0,
      direction: 1,
      guardUnitIds: bossDef ? bossDef.guardUnitIds : null,
      phaseProfile: bossDef ? bossDef.phaseProfile : null
    };

    state.boss.fireTimer = 0.8;
    state.bossIntro = {
      title: state.boss.title,
      theme: state.boss.theme,
      timer: 3,
      duration: 3,
      life: 3
    };
    state.shockwaves = state.shockwaves || [];
    state.shockwaves.push({ x: state.boss.targetX, y: field.height / 2, radius: 18, life: 0.9, maxLife: 0.9, color: "#ff6b6b" });
    addNotice(state, state.boss.title, "#ff6b6b", 2.4);
    playSfx("bossWarning");
    return state.boss;
  }

  function playSfx(id) {
    if (scope.audioSystem && scope.audioSystem.playSfx) scope.audioSystem.playSfx(id);
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

  function updateBoss(state, dt) {
    var boss = state.boss;
    updateBossTelegraphs(state, dt);
    updateBossIntro(state, dt);
    if (!boss) return;

    if (boss.x > boss.targetX) {
      boss.x -= 90 * dt;
      return;
    }

    boss.y += boss.direction * 82 * dt;
    if (boss.y < boss.minY) {
      boss.y = boss.minY;
      boss.direction = 1;
    } else if (boss.y > boss.maxY) {
      boss.y = boss.maxY;
      boss.direction = -1;
    }

    if (boss.pendingPattern) {
      boss.pendingPattern.timer -= dt;
      if (boss.pendingPattern.timer <= 0) {
        var readyPattern = boss.pendingPattern.id;
        boss.pendingPattern = null;
        fireBossPattern(state, boss, readyPattern);
      }
      return;
    }

    updateBurstState(state, boss, dt);
    updateArmorState(state, boss, dt);

    boss.fireTimer -= dt;
    if (boss.waveTimer !== null) boss.waveTimer -= dt;

    if (boss.burstRemaining > 0) {
      if (boss.burstTimer <= 0) {
        scheduleBossPattern(state, boss, "boss_burst_spread");
        boss.burstTimer = (boss.waveConfig.burst && boss.waveConfig.burst.fireInterval) || 0.1;
      }
      return;
    }

    if (boss.fireTimer <= 0) {
      var patterns = (boss.waveConfig && boss.waveConfig.cyclePatterns) || ["boss_spread", "boss_aim", "boss_lanes"];
      var pattern = patterns[boss.patternIndex % patterns.length];
      scheduleBossPattern(state, boss, pattern);
      boss.patternIndex += 1;
      boss.fireTimer = Math.max(boss.minFireInterval || 0.32, boss.fireInterval || 0.55);
    }

    if (boss.waveTimer !== null && boss.waveTimer <= 0) {
      fireBossPattern(state, boss, "boss_aim");
      boss.waveTimer = boss.aimInterval || 0.9;
    }
  }

  function updateBossIntro(state, dt) {
    if (!state.bossIntro) return;
    state.bossIntro.timer -= dt;
    state.bossIntro.life = Math.max(0, state.bossIntro.timer);
    if (state.bossIntro.timer <= 0) state.bossIntro = null;
  }

  function updateArmorState(state, boss, dt) {
    if (boss.theme !== "shield" && boss.theme !== "armorCore") return;
    var config = boss.waveConfig || {};
    boss.armorTimer -= dt;
    if (boss.armorTimer > 0) return;
    if (boss.armorMode === "shielded") {
      boss.armorMode = "exposed";
      boss.damageTakenMultiplier = Math.max(boss.originalDamageTakenMultiplier || 1, 1.15);
      boss.armorTimer = config.exposedPhaseSeconds || 2.2;
      addNotice(state, "核心暴露", "#42f5c8", 0.9);
    } else {
      boss.armorMode = "shielded";
      boss.damageTakenMultiplier = Math.min(boss.originalDamageTakenMultiplier || 1, boss.theme === "armorCore" ? 0.32 : 0.5);
      boss.armorTimer = config.shieldPhaseSeconds || 4;
      addNotice(state, "重甲护盾", "#ffd166", 0.9);
    }
  }

  function updateBurstState(state, boss, dt) {
    boss.burstTimer -= dt;
    if (boss.burstRemaining > 0) {
      boss.burstRemaining = Math.max(0, boss.burstRemaining - dt);
      return;
    }

    var config = (boss.waveConfig && boss.waveConfig.burst) || {};
    if (config.disabled) return;
    var triggers = config.triggerHpRates || [0.7, 0.4, 0.15];
    var hpRate = boss.hp / Math.max(1, boss.maxHp);
    for (var i = 0; i < triggers.length; i++) {
      var trigger = triggers[i];
      if (hpRate <= trigger && !boss.burstTriggered[String(trigger)]) {
        boss.burstTriggered[String(trigger)] = true;
        boss.burstRemaining = config.duration || 2;
        boss.burstTimer = 0;
        addNotice(state, "BOSS 火力爆发", "#ff9fc5", 1.4);
        break;
      }
    }
  }

  function fireBossPattern(state, boss, pattern) {
    if (!weaponSys.createBullet) return;
    if (pattern === "boss_tutorial_line") {
      fireAimed(state, boss, 0, boss.attackDamage, boss.bulletSpeed - 60, 6, "#ff8f5a", pattern);
      pushBossBullet(state, boss.x - 70, boss.y - 36, Math.PI, boss.attackDamage, boss.bulletSpeed - 80, 5.4, "#ffb347", pattern);
      pushBossBullet(state, boss.x - 70, boss.y + 36, Math.PI, boss.attackDamage, boss.bulletSpeed - 80, 5.4, "#ffb347", pattern);
      return;
    }
    if (pattern === "boss_aim") {
      fireAimed(state, boss, 0, boss.attackDamage, boss.bulletSpeed + 30, 8, "#ff9fc5", "boss_aim");
      if ((state.level && Number(state.level.chapterIndex) || 0) >= 3) {
        fireAimed(state, boss, -0.13, boss.attackDamage, boss.bulletSpeed, 6, "#ff5d73", "boss_aim");
        fireAimed(state, boss, 0.13, boss.attackDamage, boss.bulletSpeed, 6, "#ff5d73", "boss_aim");
      }
      return;
    }
    if (pattern === "boss_lanes") {
      var laneCount = (boss.waveConfig && boss.waveConfig.laneCount) || 4;
      for (var i = 0; i < laneCount; i++) {
        var y = scaleY(state, 72) + i * ((getField(state).height - scaleY(state, 144)) / Math.max(1, laneCount - 1));
        pushBossBullet(state, boss.x - 74, y, Math.PI, boss.attackDamage, boss.bulletSpeed + 45, 6, "#ff784d", "boss_lanes");
      }
      return;
    }
    if (pattern === "boss_cross") {
      for (var c = 0; c < 3; c++) {
        var offset = -0.24 + c * 0.24;
        if (Math.abs(offset) < 0.01) continue;
        fireAimed(state, boss, offset, boss.attackDamage, boss.bulletSpeed + 5, 5.8, "#ff6b8a", pattern);
        fireAimed(state, boss, -offset, boss.attackDamage, boss.bulletSpeed - 18, 5.2, "#ff9f43", pattern + "_return");
      }
      return;
    }
    if (pattern === "boss_charge_lane") {
      var laneY = state.player ? state.player.y : boss.y;
      pushBossBullet(state, boss.x - 76, laneY, Math.PI, boss.attackDamage, boss.bulletSpeed + 110, 9, "#ff4d4d", pattern);
      pushBossBullet(state, boss.x - 76, laneY - 26, Math.PI, boss.attackDamage, boss.bulletSpeed + 80, 6, "#ff8f5a", pattern);
      pushBossBullet(state, boss.x - 76, laneY + 26, Math.PI, boss.attackDamage, boss.bulletSpeed + 80, 6, "#ff8f5a", pattern);
      return;
    }
    if (pattern === "boss_summon") {
      addNotice(state, "护卫群接敌", "#ffd166", 1);
      var guardBurst = (boss.waveConfig && boss.waveConfig.summonGuardBurst) || (boss.theme === "mothership" ? 8 : 5);
      state.bossGuardBurst = Math.max(Math.floor(Number(state.bossGuardBurst) || 0), guardBurst);
      state.enemyTimer = Math.min(state.enemyTimer || 0, 0.05);
      fireSpread(state, boss, 3, (34 * Math.PI) / 180, boss.attackDamage, boss.bulletSpeed - 70, 6, "#ffb347", pattern);
      return;
    }
    if (pattern === "boss_sniper") {
      fireAimed(state, boss, 0, boss.attackDamage, boss.bulletSpeed + 190, 8, "#ffd166", pattern);
      return;
    }
    if (pattern === "boss_shield_pulse" || pattern === "boss_armor_pulse") {
      fireSpread(state, boss, 5, (58 * Math.PI) / 180, boss.attackDamage, boss.bulletSpeed - 45, 6, "#ffcf5a", pattern);
      return;
    }
    if (pattern === "boss_rotating_fan") {
      var base = Math.PI + Math.sin((state.elapsed || 0) * 2.2) * 0.7;
      fireSpreadFromBase(state, boss, base, Math.min((boss.waveConfig && boss.waveConfig.spreadCount) || 9, 9), ((Math.min((boss.waveConfig && boss.waveConfig.spreadArcDegrees) || 76, 76)) * Math.PI) / 180, boss.attackDamage, boss.bulletSpeed - 8, 6, "#ff5d73", pattern);
      return;
    }
    if (pattern === "boss_burst_spread") {
      var burst = (boss.waveConfig && boss.waveConfig.burst) || {};
      fireSpread(state, boss, Math.min(burst.bulletCount || 9, 9), ((Math.min(burst.arcDegrees || 72, 72)) * Math.PI) / 180, boss.attackDamage, boss.bulletSpeed + 18, 6.5, "#ff6b8a", "boss_burst_spread");
      return;
    }

    fireSpread(
      state,
      boss,
      Math.min((boss.waveConfig && boss.waveConfig.spreadCount) || 7, 7),
      (((Math.min((boss.waveConfig && boss.waveConfig.spreadArcDegrees) || 58, 58))) * Math.PI) / 180,
      boss.attackDamage,
      boss.bulletSpeed,
      6,
      "#ff5d73",
      "boss_spread"
    );
  }

  function scheduleBossPattern(state, boss, pattern) {
    if (pattern === "boss_aim") {
      fireBossPattern(state, boss, pattern);
      return;
    }
    var delay = pattern === "boss_burst_spread" ? 0.72
      : pattern === "boss_lanes" ? 0.62
      : pattern === "boss_summon" ? 0.92
      : pattern === "boss_sniper" || pattern === "boss_charge_lane" ? 0.78
      : pattern === "boss_cross" || pattern === "boss_rotating_fan" ? 0.58
      : 0.38;
    boss.pendingPattern = { id: pattern, timer: delay };
    addBossTelegraph(state, boss, pattern, delay);
    addNotice(state, getPatternNotice(pattern), "#ffd166", Math.max(0.55, delay));
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
    return "扇形弹幕预警";
  }

  function addBossTelegraph(state, boss, pattern, delay) {
    state.bossTelegraphs = state.bossTelegraphs || [];
    var item = {
      pattern: pattern,
      x: boss.x - 74,
      y: boss.y,
      life: delay,
      duration: delay,
      color: pattern === "boss_lanes" ? "#ff784d" : pattern === "boss_burst_spread" ? "#ff6b8a" : "#ffd166"
    };
    if (pattern === "boss_lanes") {
      item.type = "lanes";
      item.laneCount = (boss.waveConfig && boss.waveConfig.laneCount) || 4;
    } else if (pattern === "boss_summon") {
      item.type = "summon";
      item.color = boss.theme === "mothership" ? "#ff5d73" : "#ffb347";
    } else if (pattern === "boss_sniper") {
      item.type = "sniper";
      item.targetY = state.player ? state.player.y : boss.y;
      item.color = "#ffd166";
    } else if (pattern === "boss_charge_lane") {
      item.type = "charge";
      item.targetY = state.player ? state.player.y : boss.y;
      item.color = "#ff4d4d";
    } else if (pattern === "boss_cross") {
      item.type = "cross";
      item.color = "#ff6b8a";
    } else {
      item.type = "cone";
      item.arcDegrees = pattern === "boss_burst_spread"
        ? ((boss.waveConfig && boss.waveConfig.burst && boss.waveConfig.burst.arcDegrees) || 84)
        : ((boss.waveConfig && boss.waveConfig.spreadArcDegrees) || 64);
    }
    state.bossTelegraphs.push(item);
    if (state.bossTelegraphs.length > 4) state.bossTelegraphs = state.bossTelegraphs.slice(-4);
  }

  function updateBossTelegraphs(state, dt) {
    var list = state.bossTelegraphs || [];
    for (var i = 0; i < list.length; i++) list[i].life -= dt;
    state.bossTelegraphs = list.filter(function (item) { return item.life > 0; });
  }

  function fireSpread(state, boss, count, arc, damage, speed, radius, color, patternSource) {
    fireSpreadFromBase(state, boss, Math.PI, count, arc, damage, speed, radius, color, patternSource);
  }

  function fireSpreadFromBase(state, boss, base, count, arc, damage, speed, radius, color, patternSource) {
    var step = count > 1 ? arc / (count - 1) : 0;
    var start = base - arc / 2;
    for (var i = 0; i < count; i++) pushBossBullet(state, boss.x - 70, boss.y, start + step * i, damage, speed, radius, color, patternSource);
  }

  function fireAimed(state, boss, offset, damage, speed, radius, color, patternSource) {
    var aim = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
    pushBossBullet(state, boss.x - 70, boss.y, aim + offset, damage, speed, radius, color, patternSource);
  }

  function pushBossBullet(state, x, y, angle, damage, speed, radius, color, patternSource) {
    if (!canAddBossBullet(state)) return;
    var bullet = weaponSys.createBullet(x, y, angle, "enemy", damage, speed, radius, color, { owner: "enemy", shape: "circle", pierceRemaining: 0 });
    bullet.age = 0;
    bullet.patternSource = patternSource || "boss";
    bullet.sourceEnemyType = "boss";
    bullet.sourceEnemyClass = "boss";
    state.enemyBullets.push(bullet);
  }

  function canAddBossBullet(state) {
    var list = state && state.enemyBullets ? state.enemyBullets : [];
    var chapter = state && state.level ? Number(state.level.chapterIndex) || 0 : 0;
    var caps = [8, 14, 18, 24, 28, 32, 36, 40, 44, 48];
    return list.length < (caps[Math.max(0, Math.min(caps.length - 1, chapter))] || 24);
  }

  function getField(state) {
    return scope.battleGeometry.getField(state);
  }

  function scaleY(state, value) {
    return scope.battleGeometry.scaleY(state, value);
  }

  function addNotice(state, text, color, life) {
    var field = getField(state);
    state.notices.push({ text: text, color: color, x: field.width / 2, y: field.noticeY, life: life });
  }

  var api = {
    spawnBossIfNeeded: spawnBossIfNeeded,
    spawnBoss: spawnBoss,
    updateBoss: updateBoss
  };

  scope.bossSystem = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
