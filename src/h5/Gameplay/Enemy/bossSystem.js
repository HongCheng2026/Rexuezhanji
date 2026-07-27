(function registerBossSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});
  var events = scope.events;

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

  // Phase 2 signature bullet patterns — these must reach the main firing loop.
  var PHASE2_BOSS_PATTERNS = {
    boss_wall: true, boss_ring_expand: true, boss_ring_recall: true,
    boss_homing_orb: true, boss_fragment_volley: true, boss_rotor_overdrive: true,
    boss_grid_explosion: true, boss_split_nest: true, boss_laser_sweep: true,
    boss_shockwave_ring: true
  };

  // Build the boss waveConfig from the themed BOSS_THEME_CONFIG so that
  // cyclePatterns, signatureSkills, chapterMechanic, burst, spreadCount, laneCount
  // etc. are all wired correctly. Previously spawnBoss overrode cyclePatterns with the
  // legacy combatCodexConfig list, which silently dropped every Phase 2 pattern and
  // left the boss behaviour unchanged at runtime.
  function buildBossWaveConfig(level, bossStats, bossDef) {
    var chapterIndex = level ? (level.chapterIndex || 0) : 0;
    var themeCfg = null;
    if (enemyBalance && typeof enemyBalance.getBossThemeConfig === "function") {
      try { themeCfg = enemyBalance.getBossThemeConfig(chapterIndex); } catch (e) { themeCfg = null; }
    }
    if (!themeCfg) {
      // Legacy fallback (e.g. unit tests): keep old behaviour.
      var fb = (bossStats && bossStats.waveConfig) ? Object.assign({}, bossStats.waveConfig) : {};
      if (bossDef && bossDef.cyclePatterns) {
        fb.cyclePatterns = bossDef.cyclePatterns.slice ? bossDef.cyclePatterns.slice() : bossDef.cyclePatterns;
      }
      return fb;
    }
    var cfg = Object.assign({}, themeCfg);
    cfg.cyclePatterns = Array.isArray(themeCfg.cyclePatterns)
      ? themeCfg.cyclePatterns.slice()
      : ["boss_spread", "boss_lanes"];
    cfg.signatureSkills = Array.isArray(themeCfg.signatureSkills)
      ? themeCfg.signatureSkills.slice()
      : [];
    if (themeCfg.burst && typeof themeCfg.burst === "object") cfg.burst = Object.assign({}, themeCfg.burst);
    // Inject Phase 2 signature patterns into the main cycle so they appear without
    // waiting for the signature-skill cooldown — this is what makes the boss visibly change.
    for (var i = 0; i < cfg.signatureSkills.length; i++) {
      var p = cfg.signatureSkills[i] && cfg.signatureSkills[i].patternOnBoss;
      if (p && PHASE2_BOSS_PATTERNS[p] && cfg.cyclePatterns.indexOf(p) === -1) {
        cfg.cyclePatterns.push(p);
      }
    }
    return cfg;
  }

  function spawnBoss(state, level, options) {
    options = options || {};
    state.bossSpawned = true;
    state.bossWarning = 3;
    var field = getField(state);

    var bossStats = options.bossStats || scope.enemyAI.getBossStats(level);
    var bossDef = options.bossDef || null;
    if (!bossDef && combatCodexConfig && combatCodexConfig.getStageBoss) {
      bossDef = combatCodexConfig.getStageBoss(level.chapterIndex || 0, level.stageInChapter || 1);
    }
    var waveConfig = buildBossWaveConfig(level, bossStats, bossDef);
    var visual = options.visual || (assetsConfig.getBossVisual
      ? assetsConfig.getBossVisual(level.chapterIndex, level.stageInChapter)
      : null);
    var drawWidth = visual ? visual.drawWidth : 168;
    var drawHeight = visual ? visual.drawHeight : 156;
    var hitRadiusX = visual ? visual.hitRadiusX : 78;
    var hitRadiusY = visual ? visual.hitRadiusY : 78;
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

    // [diag] confirm Phase 2 waveConfig is active — see DevTools console on boss spawn
    if (typeof console !== "undefined" && console.log) {
      var _p2list = (waveConfig.cyclePatterns || []).filter(function (p) {
        return p === "boss_wall" || p === "boss_ring_expand" || p === "boss_ring_recall" ||
          p === "boss_homing_orb" || p === "boss_fragment_volley" || p === "boss_rotor_overdrive" ||
          p === "boss_grid_explosion" || p === "boss_split_nest" || p === "boss_laser_sweep" ||
          p === "boss_shockwave_ring";
      });
      console.log("[BOSS] theme=" + (bossStats.bossTheme || waveConfig.theme || "fan") +
        " phase2=" + _p2list.length + " [" + _p2list.join(",") + "] sig=" + (waveConfig.signatureSkills || []).length);
    }

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
    initChapterMechanics(state, state.boss);
    addNotice(state, state.boss.title, "#ff6b6b", 2.4);
    if (scope.bus && typeof scope.bus.emit === "function") {
      scope.bus.emit(events.BOSS_SPAWNED, {
        title: state.boss.title,
        hp: state.boss.hp,
        maxHp: state.boss.maxHp,
        theme: state.boss.theme
      });
    }
    return state.boss;
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
    updateChapterMechanics(state, boss, dt);
    updateSignatureSkills(state, boss, dt);

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
    // Ch7 uses heat cycle instead of old armor toggle
    var chapter = state.level ? Number(state.level.chapterIndex) || 0 : 0;
    if (chapter === 7) return;
    var config = boss.waveConfig || {};
    boss.armorTimer -= dt;
    if (boss.armorTimer > 0) return;
    if (boss.armorMode === "shielded") {
      boss.armorMode = "exposed";
      boss.damageTakenMultiplier = Math.max(boss.originalDamageTakenMultiplier || 1, 1.15);
      boss.armorTimer = config.exposedPhaseSeconds || 2.2;
      addNotice(state, "核心暴露", "#42f5c8", 0.9);
      if (scope.bus && events.BOSS_ARMOR_SWITCH) scope.bus.emit(events.BOSS_ARMOR_SWITCH, { armorMode: "exposed" });
    } else {
      boss.armorMode = "shielded";
      boss.damageTakenMultiplier = Math.min(boss.originalDamageTakenMultiplier || 1, boss.theme === "armorCore" ? 0.32 : 0.5);
      boss.armorTimer = config.shieldPhaseSeconds || 4;
      addNotice(state, "重甲护盾", "#ffd166", 0.9);
      if (scope.bus && events.BOSS_ARMOR_SWITCH) scope.bus.emit(events.BOSS_ARMOR_SWITCH, { armorMode: "shielded" });
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
        if (scope.bus && events.BOSS_PHASE_BURST) scope.bus.emit(events.BOSS_PHASE_BURST, { hpRate: trigger });
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
    // Phase 2 — new bullet patterns
    if (pattern === "boss_wall") {
      fireBossWall(state, boss);
      return;
    }
    if (pattern === "boss_ring_expand") {
      fireBossRingExpand(state, boss);
      return;
    }
    if (pattern === "boss_ring_recall") {
      fireBossRingRecall(state, boss);
      return;
    }
    if (pattern === "boss_homing_orb") {
      fireBossHomingOrb(state, boss);
      return;
    }
    if (pattern === "boss_fragment_volley") {
      fireBossFragmentVolley(state, boss);
      return;
    }
    if (pattern === "boss_rotor_overdrive") {
      fireBossRotorOverdrive(state, boss);
      return;
    }
    if (pattern === "boss_grid_explosion") {
      fireBossGridExplosion(state, boss);
      return;
    }
    if (pattern === "boss_split_nest") {
      fireBossSplitNest(state, boss);
      return;
    }
    if (pattern === "boss_laser_sweep") {
      fireBossLaserSweep(state, boss);
      return;
    }
    if (pattern === "boss_shockwave_ring") {
      fireBossShockwaveRing(state, boss);
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

  // ===== Phase 2 New Bullet Patterns =====

  function fireBossWall(state, boss) {
    var wallConfig = (boss.waveConfig && boss.waveConfig.wall) || {};
    var count = wallConfig.bulletCount || 12;
    var gapCount = wallConfig.gapCount || 2;
    var field = getField(state);
    var startY = field.height * 0.1;
    var endY = field.height * 0.9;
    var step = (endY - startY) / (count - 1);
    var gaps = [];
    for (var g = 0; g < gapCount; g++) {
      gaps.push(Math.floor(Math.random() * count));
    }
    for (var i = 0; i < count; i++) {
      if (gaps.indexOf(i) !== -1) continue;
      var wy = startY + i * step;
      pushBossBullet(state, boss.x - 70, wy, Math.PI, boss.attackDamage * 1.2, boss.bulletSpeed - 120, 7, "#ff8f5a", "boss_wall");
    }
  }

  function fireBossRingExpand(state, boss) {
    var count = 16;
    var damage = boss.attackDamage * 0.7;
    for (var i = 0; i < count; i++) {
      var angle = (2 * Math.PI * i) / count;
      var bullet = pushBossBulletReturn(state, boss.x, boss.y, angle, damage, 200, 5, "#ffcf5a", "boss_ring_expand");
      if (bullet) { bullet.ringPhase = "expand"; bullet.ringOriginX = boss.x; bullet.ringOriginY = boss.y; }
    }
  }

  function fireBossRingRecall(state, boss) {
    if (!state.bossRecallBullets) return;
    var list = state.bossRecallBullets;
    for (var i = 0; i < list.length; i++) {
      var b = list[i];
      var toBoss = Math.atan2(boss.y - b.y, boss.x - b.x);
      b.angle = toBoss;
      b.speed = 300;
      b.damage = boss.attackDamage * 1.0;
      b.color = "#ff9f43";
      b.patternSource = "boss_ring_recall";
      b.ringPhase = "recall";
    }
  }

  function fireBossHomingOrb(state, boss) {
    var orb = pushBossBulletReturn(state, boss.x - 70, boss.y, Math.PI, boss.attackDamage * 1.5, 280, 10, "#ff4d4d", "boss_homing_orb");
    if (!orb) return;
    orb.isHoming = true;
    orb.homingStrength = 0.04;
    orb.homingLife = 3;
    orb.homingExplodeTimer = 3;
    orb.onExpire = function() {
      for (var i = 0; i < 8; i++) {
        var a = (2 * Math.PI * i) / 8;
        pushBossBullet(state, orb.x, orb.y, a, boss.attackDamage * 0.6, boss.bulletSpeed, 5, "#ff6b8a", "boss_homing_orb_split");
      }
    };
  }

  function fireBossFragmentVolley(state, boss) {
    var count = 8;
    for (var i = 0; i < count; i++) {
      var frag = pushBossBulletReturn(state, boss.x - 40, boss.y + (i - count / 2) * 14, Math.PI, 0, 0, 6, "#ff8f5a", "boss_fragment_volley");
      if (!frag) continue;
      frag.isFragment = true;
      frag.fragmentTimer = 1.5;
      frag.fragmentDamage = boss.attackDamage * 1.3;
      frag.fragmentSpeed = 600;
      frag.fragmentHoming = 0.6;
    }
  }

  function fireBossRotorOverdrive(state, boss) {
    var count = 20;
    for (var i = 0; i < count; i++) {
      var a = (2 * Math.PI * i) / count;
      pushBossBullet(state, boss.x, boss.y, a, boss.attackDamage * 0.8, boss.bulletSpeed + 60, 5, "#ff5d73", "boss_rotor_overdrive");
    }
  }

  function fireBossGridExplosion(state, boss) {
    var gridConfig = (boss.waveConfig && boss.waveConfig.grid) || {};
    var cols = gridConfig.cols || 6;
    var rows = gridConfig.rows || 4;
    var field = getField(state);
    var spacing = gridConfig.spacing || 120;
    var startX = field.width * 0.15;
    var startY = field.height * 0.1;
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var gx = startX + c * spacing;
        var gy = startY + r * spacing;
        state.bossGridMines = state.bossGridMines || [];
        state.bossGridMines.push({ x: gx, y: gy, timer: 1.5, radius: 40, damage: boss.attackDamage * 1.8 });
      }
    }
    if (scope.bus && events.BOSS_FIELD_MARK) {
      scope.bus.emit(events.BOSS_FIELD_MARK, { type: "grid", cols: cols, rows: rows, spacing: spacing });
    }
  }

  function fireBossSplitNest(state, boss) {
    var count = (boss.waveConfig && boss.waveConfig.nestCount) || 3;
    for (var i = 0; i < count; i++) {
      var offset = (i - (count - 1) / 2) * 0.2;
      var nest = pushBossBulletReturn(state, boss.x - 70, boss.y, Math.PI + offset, boss.attackDamage * 1.5, 180, 16, "#ff9f43", "boss_split_nest");
      if (!nest) continue;
      nest.isNest = true;
      nest.nestTimer = 2;
      nest.nestSplitCount = 6;
      nest.nestSplitRadius = 120;
      nest.nestSplitDamage = boss.attackDamage * 0.7;
    }
  }

  function fireBossLaserSweep(state, boss) {
    var sweep = { x: boss.x - 70, y: boss.y, startAngle: Math.PI - 0.5, endAngle: Math.PI + 0.5, timer: 1.2, life: 1.2, damage: boss.attackDamage * 1.5, width: 16 };
    state.bossLaserSweeps = state.bossLaserSweeps || [];
    state.bossLaserSweeps.push(sweep);
  }

  function fireBossShockwaveRing(state, boss) {
    var ringCount = 3;
    for (var i = 0; i < ringCount; i++) {
      var ring = { x: boss.x, y: boss.y, radius: 60 + i * 70, maxRadius: 60 + i * 70 + 200, speed: 320, damage: boss.attackDamage * 1.5, life: 0.65 + i * 0.1, color: "#82f7ff" };
      state.bossShockwaveRings = state.bossShockwaveRings || [];
      state.bossShockwaveRings.push(ring);
    }
    if (scope.bus && events.BOSS_SHOCKWAVE) {
      scope.bus.emit(events.BOSS_SHOCKWAVE, { ringCount: ringCount });
    }
  }

  function pushBossBulletReturn(state, x, y, angle, damage, speed, radius, color, patternSource) {
    if (!canAddBossBullet(state)) return null;
    var bullet = weaponSys.createBullet(x, y, angle, "enemy", damage, speed, radius, color, { owner: "enemy", shape: "circle", pierceRemaining: 0 });
    bullet.age = 0;
    bullet.patternSource = patternSource || "boss";
    bullet.sourceEnemyType = "boss";
    bullet.sourceEnemyClass = "boss";
    state.enemyBullets.push(bullet);
    return bullet;
  }

  // ===== Phase 2 Chapter Mechanics =====

  function initChapterMechanics(state, boss) {
    var chapter = state.level ? Number(state.level.chapterIndex) || 0 : 0;
    if (chapter === 1) {
      boss.densityLevel = 0;
      boss.densityTimer = 0;
    }
    if (chapter === 2) {
      boss.shieldLayers = [];
      boss.shieldRegenTimer = 0;
      initShieldLayers(boss, chapter, state.level ? state.level.stageInChapter || 1 : 1);
    }
    if (chapter === 3) {
      state.bossCrossNodes = [];
      boss.crossGridTimer = 12;
    }
    if (chapter === 4) {
      boss.rage = 0;
      boss.rageActive = false;
      boss.rageCooldown = 0;
    }
    if (chapter === 5) {
      boss.currentOrder = null;
      boss.orderTimer = 0;
    }
    if (chapter === 6) {
      boss.lockProgress = 0;
      boss.lockTargets = [];
    }
    if (chapter === 7) {
      boss.heat = 0;
      boss.overheated = false;
    }
    if (chapter === 8) {
      boss.rotorPhase = "clockwise";
      boss.rotorPhaseTimer = 10;
    }
    if (chapter === 9) {
      boss.mothershipForm = "artillery";
      boss.formTimer = 20;
      boss.shapeshifted = false;
    }
  }

  function initShieldLayers(boss, chapter, stage) {
    var layerCount = stage <= 3 ? 2 : stage <= 7 ? 3 : 4;
    for (var i = 0; i < layerCount; i++) {
      boss.shieldLayers.push({ hp: Math.ceil(boss.maxHp * 0.08), maxHp: Math.ceil(boss.maxHp * 0.08), active: true });
    }
  }

  function updateChapterMechanics(state, boss, dt) {
    if (!boss) return;
    var chapter = state.level ? Number(state.level.chapterIndex) || 0 : 0;

    if (chapter === 1) updateDensityModulation(state, boss, dt);
    if (chapter === 2) updateLayeredPlating(state, boss, dt);
    if (chapter === 3) updateCrossLockGrid(state, boss, dt);
    if (chapter === 4) updateRageSystem(state, boss, dt);
    if (chapter === 5) updateTacticalOrders(state, boss, dt);
    if (chapter === 6) updateLockStack(state, boss, dt);
    if (chapter === 7) updateHeatCycle(state, boss, dt);
    if (chapter === 8) updateRotorPhase(state, boss, dt);
    if (chapter === 9) updateMothershipForms(state, boss, dt);

    updateBossEntities(state, dt);
  }

  // Ch1: Density Modulation
  function updateDensityModulation(state, boss, dt) {
    boss.densityTimer = (boss.densityTimer || 0) + dt;
    var hpDensity = Math.floor((1 - boss.hp / Math.max(1, boss.maxHp)) * 2);
    var timeDensity = Math.floor(boss.densityTimer / 15);
    boss.densityLevel = Math.min(3, Math.max(0, hpDensity + timeDensity));

    var densityConfig = [
      { spreadCount: 5, arcDegrees: 48, speedMul: 0.85 },
      { spreadCount: 7, arcDegrees: 58, speedMul: 1.0 },
      { spreadCount: 9, arcDegrees: 68, speedMul: 1.15 },
      { spreadCount: 11, arcDegrees: 78, speedMul: 1.3 }
    ][boss.densityLevel];

    if (boss.waveConfig) {
      boss.waveConfig.spreadCount = densityConfig.spreadCount;
      boss.waveConfig.spreadArcDegrees = densityConfig.arcDegrees;
    }
    boss.densitySpeedMul = densityConfig.speedMul;
  }

  // Ch2: Layered Plating
  function updateLayeredPlating(state, boss, dt) {
    boss.shieldRegenTimer = (boss.shieldRegenTimer || 0) - dt;
    if (boss.shieldRegenTimer <= 0) {
      regrowShieldLayer(boss);
      boss.shieldRegenTimer = boss.hp / boss.maxHp < 0.35 ? 12 : boss.hp / boss.maxHp < 0.7 ? 15 : 20;
    }
    var hasActiveShield = boss.shieldLayers.some(function(l) { return l.active; });
    if (hasActiveShield) {
      boss.damageReductionRate = Math.min(0.9, (boss.originalDamageReductionRate || 0) + 0.2);
      boss.damageTakenMultiplier = Math.max(0.1, 1 - boss.damageReductionRate);
    }
  }

  function regrowShieldLayer(boss) {
    if (!boss.shieldLayers) return;
    for (var i = 0; i < boss.shieldLayers.length; i++) {
      if (!boss.shieldLayers[i].active) {
        boss.shieldLayers[i].active = true;
        boss.shieldLayers[i].hp = boss.shieldLayers[i].maxHp;
        return;
      }
    }
  }

  // Ch3: Cross-Lock Grid
  function updateCrossLockGrid(state, boss, dt) {
    boss.crossGridTimer = (boss.crossGridTimer || 0) - dt;
    if (boss.crossGridTimer <= 0) {
      generateCrossGrid(state, boss);
      boss.crossGridTimer = boss.hp / boss.maxHp < 0.35 ? 7 : boss.hp / boss.maxHp < 0.7 ? 9 : 12;
    }
    updateCrossNodes(state, boss, dt);
  }

  function generateCrossGrid(state, boss) {
    var field = getField(state);
    var nodeCount = boss.hp / boss.maxHp < 0.35 ? 5 : boss.hp / boss.maxHp < 0.7 ? 4 : 3;
    state.bossCrossNodes = [];
    for (var i = 0; i < nodeCount; i++) {
      state.bossCrossNodes.push({
        x: field.width * (0.2 + Math.random() * 0.5),
        y: field.height * (0.15 + Math.random() * 0.7),
        timer: 2,
        exploded: false
      });
    }
  }

  function updateCrossNodes(state, boss, dt) {
    var nodes = state.bossCrossNodes || [];
    for (var i = 0; i < nodes.length; i++) {
      var n = nodes[i];
      if (n.exploded) continue;
      n.timer -= dt;
      if (n.timer <= 0) {
        n.exploded = true;
        for (var j = 0; j < 4; j++) {
          var a = (Math.PI / 2) * j + Math.PI / 4;
          pushBossBullet(state, n.x, n.y, a, boss.attackDamage * 1.0, boss.bulletSpeed, 5, "#ff6b8a", "boss_cross_node");
        }
      }
    }
  }

  // Ch4: Rage System
  function updateRageSystem(state, boss, dt) {
    if (boss.rageActive) {
      boss.rageDuration = (boss.rageDuration || 0) - dt;
      if (boss.rageDuration <= 0) {
        boss.rageActive = false;
        boss.rage = 0;
        boss.rageWeaknessTimer = 2;
        if (scope.bus && events.BOSS_RAGE_ENDED) scope.bus.emit(events.BOSS_RAGE_ENDED, {});
      }
      return;
    }
    if (boss.rageWeaknessTimer > 0) {
      boss.rageWeaknessTimer -= dt;
      boss.damageTakenMultiplier = Math.max(boss.originalDamageTakenMultiplier || 1, 1.25);
      if (boss.rageWeaknessTimer <= 0) {
        boss.damageTakenMultiplier = boss.originalDamageTakenMultiplier || 1;
      }
    }
    var rageRate = boss.hp / boss.maxHp < 0.3 ? 5 : boss.hp / boss.maxHp < 0.65 ? 4 : 3;
    boss.rage = Math.min(100, (boss.rage || 0) + rageRate * dt);
    if (scope.bus && events.BOSS_RAGE_CHANGED) {
      scope.bus.emit(events.BOSS_RAGE_CHANGED, { rage: boss.rage, maxRage: 100 });
    }
    if (boss.rage >= 100) {
      boss.rageActive = true;
      boss.rageDuration = boss.hp / boss.maxHp < 0.3 ? 6 : boss.hp / boss.maxHp < 0.65 ? 5 : 4;
      if (scope.bus && events.BOSS_RAGE_ACTIVATED) scope.bus.emit(events.BOSS_RAGE_ACTIVATED, {});
    }
  }

  // Ch5: Tactical Orders
  function updateTacticalOrders(state, boss, dt) {
    boss.orderTimer = (boss.orderTimer || 0) - dt;
    if (boss.orderTimer <= 0) {
      var orders = ["volley", "defense", "charge"];
      if (boss.hp / boss.maxHp > 0.7) orders = ["volley", "defense"];
      var order = orders[Math.floor(Math.random() * orders.length)];
      boss.currentOrder = order;
      boss.orderDuration = order === "charge" ? 2 : order === "defense" ? 4 : 3;
      boss.orderTimer = boss.hp / boss.maxHp < 0.35 ? 6 + Math.random() * 2 : boss.hp / boss.maxHp < 0.7 ? 8 + Math.random() * 2 : 10 + Math.random() * 2;
      if (scope.bus && events.BOSS_TACTICAL_ORDER) {
        scope.bus.emit(events.BOSS_TACTICAL_ORDER, { orderType: order, duration: boss.orderDuration });
      }
    }
    if (boss.currentOrder) {
      boss.orderDuration -= dt;
      if (boss.orderDuration <= 0) boss.currentOrder = null;
    }
  }

  // Ch6: Lock Stack
  function updateLockStack(state, boss, dt) {
    if (!state.player) return;
    var lockSpeed = 25;
    var unlockSpeed = 40;
    if (boss.hp / boss.maxHp < 0.3) {
      lockSpeed = 30;
      unlockSpeed = 30;
    } else if (boss.hp / boss.maxHp < 0.65) {
      lockSpeed = 25;
      unlockSpeed = 35;
    }
    if (state.player.x > boss.x) {
      boss.lockProgress = Math.max(0, (boss.lockProgress || 0) - unlockSpeed * dt);
    } else {
      boss.lockProgress = Math.min(100, (boss.lockProgress || 0) + lockSpeed * dt);
    }
    if (scope.bus && events.BOSS_LOCK_CHANGED) {
      scope.bus.emit(events.BOSS_LOCK_CHANGED, { lockIndex: 0, progress: boss.lockProgress, maxProgress: 100 });
    }
    if (boss.lockProgress >= 100) {
      var aim = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
      pushBossBullet(state, boss.x - 70, boss.y, aim, boss.attackDamage * 3.0, boss.bulletSpeed + 250, 12, "#ffd166", "boss_lock_fired");
      boss.lockProgress = 0;
      if (scope.bus && events.BOSS_LOCK_FIRED) scope.bus.emit(events.BOSS_LOCK_FIRED, { lockIndex: 0 });
    }
  }

  // Ch7: Heat Cycle
  function updateHeatCycle(state, boss, dt) {
    boss.heat = (boss.heat || 0) + 5 * dt;
    if (boss.overheated) {
      boss.heat -= 20 * dt;
      if (boss.heat <= 0) {
        boss.overheated = false;
        boss.heat = 0;
        boss.heatCooldown = 3;
        boss.damageTakenMultiplier = 1.4;
      }
      if (scope.bus && events.BOSS_HEAT_CHANGED) {
        scope.bus.emit(events.BOSS_HEAT_CHANGED, { heat: boss.heat, maxHeat: 100 });
      }
      return;
    }
    if ((boss.heatCooldown || 0) > 0) {
      boss.heatCooldown -= dt;
      if (boss.heatCooldown <= 0) {
        boss.damageTakenMultiplier = boss.originalDamageTakenMultiplier || 1;
      }
    }
    var threshold = boss.hp / boss.maxHp < 0.28 ? 70 : boss.hp / boss.maxHp < 0.6 ? 75 : 80;
    if (boss.heat >= 100) {
      boss.overheated = false;
      boss.heat = 0;
      boss.heatCooldown = 2.5;
      boss.damageTakenMultiplier = 1.4;
      if (scope.bus && events.BOSS_HEAT_DUMP) scope.bus.emit(events.BOSS_HEAT_DUMP, {});
      for (var i = 0; i < 12; i++) {
        var a = (2 * Math.PI * i) / 12;
        pushBossBullet(state, boss.x, boss.y, a, boss.attackDamage * 1.0, boss.bulletSpeed, 5, "#ff8f5a", "boss_heat_dump");
      }
    } else if (boss.heat >= threshold && !boss.overheated) {
      boss.overheated = true;
      boss.damageTakenMultiplier = 1.5;
      if (scope.bus && events.BOSS_OVERHEAT) scope.bus.emit(events.BOSS_OVERHEAT, {});
    }
    if (scope.bus && events.BOSS_HEAT_CHANGED) {
      scope.bus.emit(events.BOSS_HEAT_CHANGED, { heat: boss.heat, maxHeat: 100 });
    }
  }

  // Ch8: Rotor Phase
  function updateRotorPhase(state, boss, dt) {
    boss.rotorPhaseTimer = (boss.rotorPhaseTimer || 0) - dt;
    if (boss.rotorPhaseTimer <= 0) {
      var phases = ["clockwise", "counterclockwise", "static"];
      if (boss.hp / boss.maxHp > 0.65) phases = ["clockwise", "counterclockwise"];
      var next = phases[Math.floor(Math.random() * phases.length)];
      boss.rotorPhase = next;
      boss.rotorPhaseTimer = boss.hp / boss.maxHp < 0.32 ? 7 : boss.hp / boss.maxHp < 0.65 ? 8 : 10;
      if (boss.rotorPhase === "static") {
        boss.staticTimer = 1.5;
        boss.damageTakenMultiplier = (boss.originalDamageTakenMultiplier || 1) * 1.2;
      }
      if (scope.bus && events.BOSS_ROTOR_PHASE_CHANGED) {
        scope.bus.emit(events.BOSS_ROTOR_PHASE_CHANGED, { phase: boss.rotorPhase });
      }
    }
    if (boss.rotorPhase === "static") {
      boss.staticTimer = (boss.staticTimer || 0) - dt;
      if (boss.staticTimer <= 0) {
        boss.rotorPhaseTimer = 0;
        boss.damageTakenMultiplier = boss.originalDamageTakenMultiplier || 1;
      }
    }
  }

  // Ch9: Mothership Forms
  function updateMothershipForms(state, boss, dt) {
    boss.formTimer = (boss.formTimer || 0) - dt;
    var hpRate = boss.hp / Math.max(1, boss.maxHp);
    if (boss.formTimer <= 0) {
      var prevForm = boss.mothershipForm;
      if (hpRate < 0.2) {
        var forms = ["artillery", "carrier", "assault"];
        boss.mothershipForm = forms[Math.floor(Math.random() * forms.length)];
        boss.formTimer = 8;
      } else if (hpRate < 0.25) {
        boss.mothershipForm = "assault";
      } else if (hpRate < 0.5) {
        boss.mothershipForm = "carrier";
      } else if (hpRate < 0.75) {
        boss.mothershipForm = "assault";
      } else {
        boss.mothershipForm = "artillery";
      }
      if (prevForm !== boss.mothershipForm && scope.bus && events.BOSS_FORM_CHANGED) {
        scope.bus.emit(events.BOSS_FORM_CHANGED, { form: boss.mothershipForm, previousForm: prevForm });
      }
    }

    if (hpRate < 0.2 && !boss.endgameActive) {
      boss.endgameActive = true;
      boss.damageTakenMultiplier = (boss.originalDamageTakenMultiplier || 1) * 1.5;
      boss.fireInterval *= 0.6;
      if (scope.bus && events.BOSS_ENDGAME) scope.bus.emit(events.BOSS_ENDGAME, {});
    }
  }

  // Boss entity system (field effects)
  function updateBossEntities(state, dt) {
    updateGridMines(state, dt);
    updateShockwaveRings(state, dt);
    updateLaserSweeps(state, dt);
    updateFragments(state, dt);
    updateHomingOrbs(state, dt);
    updateSplitNests(state, dt);
    updateRecallBullets(state, dt);
  }

  function updateGridMines(state, dt) {
    var mines = state.bossGridMines || [];
    for (var i = 0; i < mines.length; i++) {
      mines[i].timer -= dt;
    }
    for (var j = mines.length - 1; j >= 0; j--) {
      if (mines[j].timer <= 0) {
        var m = mines[j];
        for (var k = 0; k < 8; k++) {
          var a = (2 * Math.PI * k) / 8;
          pushBossBullet(state, m.x, m.y, a, m.damage, 300, 5, "#ffffff", "boss_grid_explode");
        }
        state.bossGridMines.splice(j, 1);
      }
    }
  }

  function updateShockwaveRings(state, dt) {
    var rings = state.bossShockwaveRings || [];
    for (var i = 0; i < rings.length; i++) {
      var r = rings[i];
      r.radius += r.speed * dt;
      r.life -= dt;
    }
    state.bossShockwaveRings = rings.filter(function(r) { return r.life > 0; });
  }

  function updateLaserSweeps(state, dt) {
    var sweeps = state.bossLaserSweeps || [];
    for (var i = 0; i < sweeps.length; i++) {
      sweeps[i].timer -= dt;
    }
    state.bossLaserSweeps = sweeps.filter(function(s) { return s.timer > 0; });
  }

  function updateFragments(state, dt) {
    var bullets = state.enemyBullets || [];
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b.isFragment || b.fragmentLaunched) continue;
      b.fragmentTimer -= dt;
      if (b.fragmentTimer <= 0) {
        b.fragmentLaunched = true;
        var aim = state.player ? Math.atan2(state.player.y - b.y, state.player.x - b.x) : Math.PI;
        var jitter = (Math.random() - 0.5) * 0.5;
        b.angle = aim + jitter * (1 - b.fragmentHoming);
        b.speed = b.fragmentSpeed;
        b.damage = b.fragmentDamage;
      }
    }
  }

  function updateHomingOrbs(state, dt) {
    var bullets = state.enemyBullets || [];
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b.isHoming) continue;
      b.homingLife -= dt;
      if (b.homingLife <= 0) {
        if (b.onExpire) b.onExpire();
        b.hp = 0;
        continue;
      }
      if (state.player) {
        var desired = Math.atan2(state.player.y - b.y, state.player.x - b.x);
        var diff = desired - b.angle;
        while (diff > Math.PI) diff -= 2 * Math.PI;
        while (diff < -Math.PI) diff += 2 * Math.PI;
        b.angle += diff * b.homingStrength;
      }
    }
  }

  function updateSplitNests(state, dt) {
    var bullets = state.enemyBullets || [];
    for (var i = 0; i < bullets.length; i++) {
      var b = bullets[i];
      if (!b.isNest) continue;
      b.nestTimer -= dt;
      if (b.nestTimer <= 0) {
        for (var j = 0; j < b.nestSplitCount; j++) {
          var a = (2 * Math.PI * j) / b.nestSplitCount;
          pushBossBullet(state, b.x, b.y, a, b.nestSplitDamage, bossBulletSpeed(state), 5, "#ff9f43", "boss_split_nest_burst");
        }
        b.hp = 0;
      }
    }
  }

  function updateRecallBullets(state, dt) {
    var bullets = state.enemyBullets || [];
    var recallList = [];
    for (var i = 0; i < bullets.length; i++) {
      if (bullets[i].ringPhase === "recall") recallList.push(bullets[i]);
    }
    state.bossRecallBullets = recallList;
  }

  function updateSignatureSkills(state, boss, dt) {
    if (!boss || !boss.waveConfig || !boss.waveConfig.signatureSkills) return;
    boss._skillTimers = boss._skillTimers || {};
    boss._skillFollowUp = boss._skillFollowUp || null;

    if (boss._skillFollowUp) {
      boss._skillFollowUp.timer -= dt;
      if (boss._skillFollowUp.timer <= 0) {
        fireBossPattern(state, boss, boss._skillFollowUp.pattern);
        boss._skillFollowUp = null;
      }
      return;
    }

    var skills = boss.waveConfig.signatureSkills;
    for (var i = 0; i < skills.length; i++) {
      var skill = skills[i];
      var key = skill.id;
      if (!boss._skillTimers[key]) {
        boss._skillTimers[key] = (skill.initialDelay || skill.cd) * (0.5 + Math.random() * 0.5);
      }
      boss._skillTimers[key] -= dt;
      if (boss._skillTimers[key] <= 0) {
        boss._skillTimers[key] = skill.cd * (boss.hp / boss.maxHp < 0.3 ? 0.7 : 1);
        if (skill.autoFollow) {
          boss._skillFollowUp = { pattern: skill.patternOnBoss, timer: skill.followDelay || 2 };
        } else {
          scheduleBossPattern(state, boss, skill.patternOnBoss);
        }
        if (skill.notice) addNotice(state, skill.notice, "#ffd166", 1);
        break;
      }
    }
  }

  function bossBulletSpeed(state) {
    var boss = state.boss;
    if (!boss) return 300;
    return (boss.bulletSpeed || 360) * (boss.densitySpeedMul || 1);
  }

  function scheduleBossPattern(state, boss, pattern) {
    if (pattern === "boss_aim") {
      fireBossPattern(state, boss, pattern);
      return;
    }
    var delay = pattern === "boss_burst_spread" || pattern === "boss_grid_explosion" ? 0.72
      : pattern === "boss_lanes" || pattern === "boss_shockwave_ring" ? 0.62
      : pattern === "boss_summon" || pattern === "boss_rotor_overdrive" ? 0.92
      : pattern === "boss_sniper" || pattern === "boss_charge_lane" || pattern === "boss_wall" || pattern === "boss_laser_sweep" ? 0.78
      : pattern === "boss_cross" || pattern === "boss_rotating_fan" || pattern === "boss_split_nest" ? 0.58
      : pattern === "boss_homing_orb" ? 0.45
      : pattern === "boss_ring_expand" || pattern === "boss_fragment_volley" ? 0.5
      : 0.38;
    boss.pendingPattern = { id: pattern, timer: delay };
    addBossTelegraph(state, boss, pattern, delay);
    addNotice(state, scope.enemyAI.getPatternNotice(pattern), "#ffd166", Math.max(0.55, delay));
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
    } else if (pattern === "boss_wall") {
      item.type = "wall";
      item.color = "#ff8f5a";
    } else if (pattern === "boss_ring_expand" || pattern === "boss_ring_recall") {
      item.type = "ring_pulse";
      item.color = "#ffcf5a";
    } else if (pattern === "boss_homing_orb") {
      item.type = "homing_orb";
      item.color = "#ff4d4d";
      item.targetY = state.player ? state.player.y : boss.y;
    } else if (pattern === "boss_fragment_volley") {
      item.type = "fragment";
      item.color = "#ff8f5a";
    } else if (pattern === "boss_rotor_overdrive") {
      item.type = "rotor_overdrive";
      item.color = "#ff5d73";
    } else if (pattern === "boss_grid_explosion") {
      item.type = "grid_judgment";
      item.color = "#ffffff";
    } else if (pattern === "boss_split_nest") {
      item.type = "split_nest";
      item.color = "#ff9f43";
    } else if (pattern === "boss_laser_sweep") {
      item.type = "laser_sweep";
      item.color = "#ff4d4d";
    } else if (pattern === "boss_shockwave_ring") {
      item.type = "shockwave_ring";
      item.color = "#82f7ff";
    } else {
      item.type = "cone";
      item.arcDegrees = pattern === "boss_burst_spread"
        ? ((boss.waveConfig && boss.waveConfig.burst && boss.waveConfig.burst.arcDegrees) || 84)
        : ((boss.waveConfig && boss.waveConfig.spreadArcDegrees) || 64);
    }
    state.bossTelegraphs.push(item);
    if (state.bossTelegraphs.length > 6) state.bossTelegraphs = state.bossTelegraphs.slice(-6);
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
