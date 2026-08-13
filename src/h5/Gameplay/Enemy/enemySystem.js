(function registerEnemySystem(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var balanceConfig = scope.balance || {};
  var enemyBalance = scope.enemyStageBalance || {};
  var combatCodexConfig = scope.combatCodexConfig || {};
  var assetsConfig = scope.assets || {};
  var weaponSys = scope.weaponSystem || {};

  var LEVEL_DURATION = levelsConfig.LEVEL_DURATION || 90;
  var NORMAL_TYPES = ["small", "shooter", "charger", "shield", "bomber", "sniper", "guard", "rotor", "core"];

  function spawnEnemies(state, level) {
    if (state.elapsed >= LEVEL_DURATION) return;
    var director = ensureDirector(state, level);
    director.timer -= Math.max(0, state.lastDt || 0);

    var phase = scope.enemyAI.getCurrentPhase(director, state.elapsed || 0);
    if (!phase) return;
    if (director.activePhaseId !== phase.id) director.activePhaseId = phase.id;
    var pressure = scope.enemyAI.getPhasePressure(director, phase, Boolean(state.boss));
    var activeCount = countActiveEnemies(state);
    var sceneCount = countLiveEnemies(state);
    var sceneCap = pressure.activeCap;
    var guardBurst = Math.max(0, Math.floor(Number(state.bossGuardBurst) || 0));
    if (activeCount >= pressure.activeCap || sceneCount >= sceneCap) return;
    if (state.enemyTimer > 0 && guardBurst <= 0) return;

    var requestedWave = activeCount < (pressure.minAliveTargets || 0)
      ? Math.max(pressure.antiDrySpawn || 0, pressure.waveSize || 3)
      : (pressure.waveSize || 3);
    if (guardBurst > 0) requestedWave = Math.max(requestedWave, Math.min(guardBurst, 5));
    var waveSize = Math.min(requestedWave, sceneCap - sceneCount, pressure.activeCap - activeCount);
    var spawned = 0;
    for (var i = 0; i < waveSize; i++) {
      var enemyType = guardBurst > 0 ? scope.enemyAI.pickBossGuardType(i, state) : scope.enemyAI.pickEnemyType(director, pressure, state);
      if (!enemyType) break;
      var guardPhase = guardBurst > 0
        ? Object.assign({}, pressure, { entryPatterns: scope.enemyAI.getBossGuardEntryPatterns(state) })
        : pressure;
      state.enemies.push(createEnemy(state, level, enemyType, i, waveSize, guardPhase));
      spawned += 1;
    }

    if (spawned > 0) director.waveIndex += 1;
    if (guardBurst > 0) state.bossGuardBurst = Math.max(0, guardBurst - spawned);
    state.enemyTimer = scope.enemyAI.getWaveInterval(level, pressure, spawned);
  }

  function spawnWave(state, level, options) {
    options = options || {};
    if (!state || !level) return 0;
    state.enemies = Array.isArray(state.enemies) ? state.enemies : [];

    var activeCap = Math.max(1, Math.floor(Number(options.activeCap) || 6));
    var available = Math.max(0, activeCap - countLiveEnemies(state));
    var waveSize = Math.min(
      available,
      Math.max(0, Math.floor(Number(options.waveSize) || 0))
    );
    if (waveSize <= 0) return 0;

    var director = ensureDirector(state, level);
    var phases = director.phases || [];
    var basePhase = phases[phases.length - 1] || {};
    var phase = Object.assign({}, basePhase, {
      id: options.phaseId || "reinforcement",
      activeCap: activeCap,
      waveSize: waveSize,
      eliteChance: options.allowElite === true ? Number(basePhase.eliteChance) || 0 : 0
    });
    var allowedTypes = Array.isArray(options.allowedTypes) && options.allowedTypes.length
      ? options.allowedTypes.slice()
      : ["small", "shooter", "charger", "shield", "bomber", "sniper", "rotor"];
    var weights = phase.typeWeights || director.typeWeights || {};
    var spawned = 0;

    for (var i = 0; i < waveSize; i++) {
      var enemyType = scope.enemyAI.pickWaveEnemyType(allowedTypes, weights);
      state.enemies.push(createEnemy(state, level, enemyType, i, waveSize, phase));
      spawned += 1;
    }

    if (spawned > 0) director.waveIndex += 1;
    return spawned;
  }

  function ensureDirector(state, level) {
    if (state.spawnDirector && state.spawnDirector.levelId === level.id) return state.spawnDirector;
    var plan = enemyBalance && enemyBalance.getStageEnemySpawnPlan
      ? enemyBalance.getStageEnemySpawnPlan(level.chapterIndex || 0, level.stageInChapter || 1)
      : null;
    var spawnPressure = plan && plan.spawnPressure ? plan.spawnPressure : null;
    state.spawnDirector = {
      levelId: level.id,
      plan: plan || {},
      phases: (spawnPressure && spawnPressure.phases) || scope.enemyAI.createFallbackPressurePhases(plan),
      entryMode: (plan && plan.entryMode) || "rightOnly",
      threatBudget: (plan && typeof plan.threatBudget === "number") ? plan.threatBudget : 1,
      activeCap: (spawnPressure && spawnPressure.activeCap) || (plan && plan.simultaneousCap) || 26,
      enteringCap: (spawnPressure && spawnPressure.enteringCap) || ((plan && plan.simultaneousCap) || 26) + 5,
      bossGuardCap: (spawnPressure && spawnPressure.bossGuardCap) || (plan && plan.bossGuardCap) || 12,
      typeWeights: (spawnPressure && spawnPressure.typeWeights) || { small: 0.65, shooter: 0.2, charger: 0.08, shield: 0.07 },
      activePhaseId: "",
      waveIndex: 0
    };
    return state.spawnDirector;
  }

  function countActiveEnemies(state) {
    var count = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy && !enemy.dead && enemy.spawnState === "active") count += 1;
    }
    return count;
  }

  function countLiveEnemies(state) {
    var count = 0;
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy && !enemy.dead) count += 1;
    }
    return count;
  }

  function createEnemy(state, level, enemyType, index, total, phase) {
    var heavy = enemyType === "elite" || enemyType === "core" || enemyType === "guard";

    // Lookup unitId from codex roster
    var unitId = null;
    var unitDef = null;
    var displayName = null;
    var category = enemyType === "elite" ? "elite" : (heavy ? "fighter" : "mob");
    if (combatCodexConfig.getStageEnemyRoster) {
      var roster = combatCodexConfig.getStageEnemyRoster(level.chapterIndex || 0, level.stageInChapter || 1);
      if (roster) {
        var candidates = [];
        if (enemyType === "elite") candidates = roster.elites || [];
        else if (heavy) candidates = roster.fighters || [];
        else candidates = roster.mobs || [];
        if (candidates.length > 0) {
          // Use roster weights or fallback equal weights
          var weights2 = roster.weights || {};
          var totalW = 0;
          for (var ci = 0; ci < candidates.length; ci++) {
            var cw = weights2[candidates[ci]] || 1 / candidates.length;
            totalW += cw;
          }
          var roll = Math.random() * totalW;
          for (var ci2 = 0; ci2 < candidates.length; ci2++) {
            roll -= weights2[candidates[ci2]] || 1 / candidates.length;
            if (roll <= 0) { unitId = candidates[ci2]; break; }
          }
          if (!unitId && candidates.length > 0) unitId = candidates[0];
        }
      }
    }
    if (unitId && combatCodexConfig.getEnemyUnit) {
      unitDef = combatCodexConfig.getEnemyUnit(unitId);
      if (unitDef) {
        displayName = unitDef.name;
        category = unitDef.category;
      }
    }

    var runtimeStats = scope.enemyAI.getRuntimeStats(level, enemyType, unitId);
    var fireProfile = scope.enemyAI.getRuntimeFireProfile(level, enemyType, phase);
    var entry = pickEntry(state, level, enemyType, index, total, phase);

    var radius = enemyType === "elite" ? 30 :
      enemyType === "core" ? 31 :
      enemyType === "guard" ? 28 :
      enemyType === "shield" ? 26 :
      enemyType === "bomber" ? 27 :
      enemyType === "rotor" ? 26 :
      enemyType === "sniper" ? 23 :
      enemyType === "charger" ? 20 : 22;
    var spriteMap = (assetsConfig.ASSET_PATHS && assetsConfig.ASSET_PATHS.enemySprites) || {};
    var assetList = spriteMap[enemyType] ||
      (heavy ? (assetsConfig.ASSET_PATHS && assetsConfig.ASSET_PATHS.eliteEnemies) : (assetsConfig.ASSET_PATHS && assetsConfig.ASSET_PATHS.smallEnemies)) || [];
    var hp = runtimeStats.hp;
    var activationDelay = 0;
    var threatBudget = state.spawnDirector && typeof state.spawnDirector.threatBudget === "number" ? state.spawnDirector.threatBudget : 1;
    var intervalScale = threatBudget >= 1
      ? Math.max(0.86, 1 - (threatBudget - 1) * 0.18)
      : Math.min(1.18, 1 + (1 - threatBudget) * 0.24);
    var enemy = {
      id: createId(state),
      x: entry.x,
      y: entry.y,
      vx: entry.vx,
      vy: entry.vy,
      entrySide: entry.side,
      spawnPattern: entry.pattern,
      spawnState: "entering",
      activationX: getField(state).width - radius - 4,
      activationDelay: activationDelay,
      activationTimer: activationDelay,
      canTakeDamage: false,
      canFire: false,
      radius: radius,
      hp: hp,
      maxHp: hp,
      damageTakenMultiplier: runtimeStats.damageTakenMultiplier,
      speed: runtimeStats.moveSpeed || (heavy ? 85 : enemyType === "charger" ? 220 : 130),
      wobble: Math.random() * Math.PI * 2,
      shootTimer: fireProfile.firstFireDelay == null ? 999 : activationDelay,
      shootInterval: (fireProfile.fireInterval || runtimeStats.fireInterval || (heavy ? 1.1 : 1.8)) * intervalScale,
      enemyType: enemyType,
      attackDamage: runtimeStats.attackDamage || runtimeStats.baseDamage || (heavy ? 100 : 10),
      bulletSpeed: (runtimeStats.bulletSpeed || (heavy ? 330 : 260)) * (fireProfile.bulletSpeedMultiplier || 1),
      bulletPattern: fireProfile.bulletPattern || runtimeStats.bulletPattern || (heavy ? "elite_spread" : enemyType === "shooter" ? "triple" : "single"),
      fireProfile: fireProfile,
      variant: runtimeStats.variant || null,
      waveConfig: runtimeStats.waveConfig || null,
      image: assetList[Math.floor(Math.random() * assetList.length)],
      heavy: heavy,
      value: heavy ? 80 : 18,
      unitId: unitId,
      displayName: displayName,
      category: category,
      motionProfile: unitDef ? unitDef.motionProfile : null,
      attackProfile: unitDef ? unitDef.attackProfile : null,
      supportProfile: unitDef ? unitDef.supportProfile : null,
      drawWidth: (unitDef && unitDef.art) ? unitDef.art.drawWidth : null,
      drawHeight: (unitDef && unitDef.art) ? unitDef.art.drawHeight : null,
      drawAngle: (unitDef && unitDef.art) ? unitDef.art.drawAngle : null,
      hitRadiusX: (unitDef && unitDef.art) ? unitDef.art.hitRadiusX : null,
      hitRadiusY: (unitDef && unitDef.art) ? unitDef.art.hitRadiusY : null,
      artStatus: (unitDef && unitDef.art) ? unitDef.art.artStatus : null
    };

    return enemy;
  }

  function pickEntry(state, level, enemyType, index, total, phase) {
    var field = getField(state);
    var height = field.height;
    var side = "right";
    var patterns = (phase && phase.entryPatterns) || ["lane"];
    var pattern = patterns[(index + ((state.spawnDirector && state.spawnDirector.waveIndex) || 0)) % patterns.length] || "lane";
    var lane = (index + 1) / (total + 1);
    var laneCount = 5;
    var laneIndex = ((index + ((state.spawnDirector && state.spawnDirector.waveIndex) || 0)) % laneCount) + 1;
    var y = scaleY(state, 58) + lane * (height - scaleY(state, 116)) + (Math.random() - 0.5) * scaleY(state, 34);
    var x = field.width + field.spawnPadding + Math.random() * 80;
    var baseSpeed = enemyType === "charger" ? 235 :
      enemyType === "bomber" ? 92 :
      enemyType === "sniper" ? 108 :
      enemyType === "guard" ? 92 :
      enemyType === "rotor" ? 88 :
      enemyType === "core" ? 78 :
      enemyType === "elite" ? 105 : 145;
    var vx = -baseSpeed;
    var vy = (Math.random() - 0.5) * 35;
    if (pattern === "lane") {
      y = scaleY(state, 64) + laneIndex * ((height - scaleY(state, 128)) / (laneCount + 1));
      vy = (Math.random() - 0.5) * 18;
    } else if (pattern === "diagonal") {
      y = index % 2 === 0 ? scaleY(state, 68 + Math.random() * 80) : scaleY(state, 392 + Math.random() * 80);
      vy = index % 2 === 0 ? 42 + Math.random() * 18 : -42 - Math.random() * 18;
    } else if (pattern === "formation") {
      y = scaleY(state, 132 + ((index + ((state.spawnDirector && state.spawnDirector.waveIndex) || 0)) % 4) * 82);
      x += index * 34;
      vy = Math.sin(index) * 16;
    } else if (pattern === "fishScale") {
      y = scaleY(state, 124 + ((index * 2 + ((state.spawnDirector && state.spawnDirector.waveIndex) || 0)) % 5) * 68);
      x += index * 42;
      vy = (index % 2 === 0 ? 18 : -18) + (Math.random() - 0.5) * 10;
    } else if (pattern === "crossLayer") {
      y = scaleY(state, index % 2 === 0 ? 112 + (index % 4) * 54 : 424 - (index % 4) * 54);
      vy = index % 2 === 0 ? 34 : -34;
      x += index * 30;
    } else if (pattern === "shieldLine") {
      y = scaleY(state, 86) + laneIndex * ((height - scaleY(state, 172)) / (laneCount + 1));
      x += index * 26;
      vx = -Math.max(82, baseSpeed * 0.72);
      vy = 0;
    } else if (pattern === "charger") {
      vx = -Math.max(240, baseSpeed * 1.18);
      vy = (Math.random() - 0.5) * 80;
    } else if (pattern === "chargeThrough") {
      vx = -Math.max(270, baseSpeed * 1.28);
      y = scaleY(state, 88) + laneIndex * ((height - scaleY(state, 176)) / (laneCount + 1));
      vy = (Math.random() - 0.5) * 36;
    } else if (pattern === "delayedPincer") {
      y = index % 2 === 0 ? scaleY(state, -28 - Math.random() * 40) : height + scaleY(state, 28 + Math.random() * 40);
      x = field.width + 22 + index * 38 + Math.random() * 60;
      vx = -Math.max(118, baseSpeed * 0.92);
      vy = index % 2 === 0 ? 88 + Math.random() * 26 : -88 - Math.random() * 26;
    } else if (pattern === "topDive") {
      y = -34 - Math.random() * 42;
      x = field.width + 40 + index * 36 + Math.random() * 50;
      vx = -Math.max(116, baseSpeed * 0.9);
      vy = 96 + Math.random() * 34;
    } else if (pattern === "bottomRise") {
      y = height + scaleY(state, 34 + Math.random() * 42);
      x = field.width + 40 + index * 36 + Math.random() * 50;
      vx = -Math.max(116, baseSpeed * 0.9);
      vy = -96 - Math.random() * 34;
    } else if (pattern === "eliteEscort") {
      y = scaleY(state, 150 + ((index + ((state.spawnDirector && state.spawnDirector.waveIndex) || 0)) % 3) * 110);
      x += index * 50;
      vx = -Math.max(92, baseSpeed * 0.78);
      vy = (index % 2 === 0 ? 14 : -14);
    } else if (pattern === "mothershipGuard") {
      y = scaleY(state, 88) + laneIndex * ((height - scaleY(state, 176)) / (laneCount + 1));
      x += index * 58;
      vx = -Math.max(88, baseSpeed * 0.7);
      vy = Math.sin((index + 1) * 1.7) * 28;
    }

    return { side: side, x: x, y: y, vx: vx, vy: vy, pattern: pattern };
  }

  function updateEnemies(state, dt) {
    state.lastDt = dt;
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.dead) continue;
      enemy.x += (enemy.vx != null ? enemy.vx : -enemy.speed) * dt;
      enemy.y += (enemy.vy || 0) * dt + Math.sin(enemy.wobble + state.elapsed * 2.5) * 22 * dt;
      if (enemy.y < scaleY(state, 36) || enemy.y > getField(state).height - scaleY(state, 36)) enemy.vy = -(enemy.vy || 0);
      if (enemy.spawnState === "entering" && enemy.x <= enemy.activationX) {
        enemy.spawnState = "active";
        enemy.canTakeDamage = true;
        enemy.canFire = enemy.bulletPattern !== "none" && (!enemy.fireProfile || enemy.fireProfile.canFire !== false);
        enemy.shootTimer = enemy.canFire ? 0 : 999;
        if (enemy.canFire) {
          fireEnemyShot(state, enemy, true);
          enemy.shootTimer = enemy.shootInterval || 1.4;
        }
        if (enemy.heavy) state.notices.push({ text: "精英接敌", color: "#ffd166", x: enemy.x, y: enemy.y - 28, life: 0.8 });
      }
      enemy.shootTimer -= dt;

      if (enemy.spawnState === "active" && enemy.canFire && enemy.shootTimer <= 0 && enemy.x < 948 && enemy.x > -20 && enemy.bulletPattern !== "none") {
        fireEnemyShot(state, enemy);
        enemy.shootTimer = enemy.shootInterval || 1.4;
      }
    }

    state.enemies = state.enemies.filter(function (e) {
      return !e.dead && e.x > -90 && e.x < 1080 && e.y > -90 && e.y < 630;
    });
  }

  function fireEnemyShot(state, enemy, openingShot) {
    if (!enemy || enemy.dead || !weaponSys.createBullet) return;
    if (!canAddEnemyBullets(state, enemy.heavy ? 3 : 1)) return;

    var pattern = enemy.bulletPattern || (enemy.heavy ? "elite_spread" : "single");
    var damage = enemy.attackDamage || (enemy.heavy ? 40 : 10);
    var speed = enemy.bulletSpeed || (enemy.heavy ? 330 : 260);
    if (openingShot) {
      if (!enemy.heavy || pattern === "cross_fire" || pattern === "slow_wall" || pattern === "triple" || pattern === "escort_volley") {
        fireAimedShot(state, enemy, damage, Math.max(145, speed * 0.78), enemy.heavy ? 5.4 : 4.5, enemy.heavy ? "#ff9fc5" : "#ff6b45", 0, pattern + "_entry");
        return;
      }
      speed = Math.max(150, speed * 0.84);
    }

    if (pattern === "elite_spread" || pattern === "elite_tutorial" || pattern === "elite_fan") {
      var eliteWave = enemy.waveConfig || {};
      fireSpread(
        state,
        enemy,
        Math.min(eliteWave.bulletCount || 5, 5),
        ((Math.min(eliteWave.arcDegrees || 48, 44)) * Math.PI) / 180,
        damage,
        speed,
        5.5,
        "#ff6b8a",
        pattern
      );
      if (eliteWave.aimShot !== false) {
        fireAimedShot(state, enemy, damage, speed + 25, 6.5, "#ff9fc5", 0, pattern + "_aim");
      }
      return;
    }

    if (pattern === "elite_guard" || pattern === "elite_shield_column" || pattern === "elite_guard_volley" || pattern === "escort_volley") {
      fireOffsetVolley(state, enemy, [-34, 0, 34], damage, speed + 10, 5.5, "#ff8f5a", pattern);
      return;
    }

    if (pattern === "elite_cross" || pattern === "cross_fire") {
      fireAimedShot(state, enemy, damage, speed, 5, "#ff6b8a", -0.22, pattern);
      fireAimedShot(state, enemy, damage, speed, 5, "#ff6b8a", 0.22, pattern);
      return;
    }

    if (pattern === "elite_sniper" || pattern === "sniper_warning") {
      state.notices.push({ text: "锁定", color: "#ffcf5a", x: enemy.x - 24, y: enemy.y - 22, life: 0.35 });
      state.enemyTelegraphs = state.enemyTelegraphs || [];
      state.enemyTelegraphs.push({
        type: "sniper",
        x: enemy.x,
        y: state.player ? state.player.y : enemy.y,
        life: 0.34,
        duration: 0.34,
        color: "#ffcf5a"
      });
      fireAimedShot(state, enemy, damage, speed + 130, 5, "#ffcf5a", 0, pattern);
      return;
    }

    if (pattern === "bomb_mine") {
      fireOffsetVolley(state, enemy, [-24, 24], damage, Math.max(130, speed - 70), 8, "#ffd166", pattern);
      fireAimedShot(state, enemy, Math.max(1, Math.floor(damage * 0.75)), Math.max(150, speed - 40), 7, "#ffb347", 0.08, pattern);
      return;
    }

    if (pattern === "elite_rotating" || pattern === "elite_mothership" || pattern === "delayed_burst") {
      var turn = Math.sin((state.elapsed || 0) * 1.8 + enemy.id.length) * 0.55;
      fireSpreadFromBase(state, enemy, Math.PI + turn, pattern === "delayed_burst" ? 4 : 5, (46 * Math.PI) / 180, damage, speed - 24, 5.6, "#ff5d73", pattern);
      return;
    }

    if (pattern === "elite_summon") {
      fireSpread(state, enemy, 3, (32 * Math.PI) / 180, damage, speed - 18, 5.5, "#ff784d", pattern);
      return;
    }

    if (pattern === "slow_wall") {
      fireOffsetVolley(state, enemy, [-44, 0, 44], damage, Math.max(140, speed - 105), 7.2, "#ffb347", pattern);
      return;
    }

    if (pattern === "triple") {
      fireSpread(state, enemy, 3, (18 * Math.PI) / 180, damage, speed, 4.8, "#ff7c93", pattern);
      return;
    }

    fireAimedShot(state, enemy, damage, speed, enemy.heavy ? 5.5 : 4.5, enemy.heavy ? "#ff9fc5" : "#ff6b45", (Math.random() - 0.5) * 0.3, pattern);
  }

  function fireSpread(state, enemy, count, arc, damage, speed, radius, color, patternSource) {
    fireSpreadFromBase(state, enemy, Math.PI, count, arc, damage, speed, radius, color, patternSource);
  }

  function fireSpreadFromBase(state, enemy, base, count, arc, damage, speed, radius, color, patternSource) {
    var step = count > 1 ? arc / (count - 1) : 0;
    var start = base - arc / 2;
    for (var i = 0; i < count; i++) {
      pushEnemyBullet(state, enemy, start + step * i, damage, speed, radius, color, patternSource);
    }
  }

  function fireOffsetVolley(state, enemy, offsets, damage, speed, radius, color, patternSource) {
    for (var i = 0; i < offsets.length; i++) {
      var fakeEnemy = {
        x: enemy.x,
        y: enemy.y + offsets[i],
        radius: enemy.radius,
        enemyType: enemy.enemyType,
        heavy: enemy.heavy
      };
      pushEnemyBullet(state, fakeEnemy, Math.PI, damage, speed, radius, color, patternSource);
    }
  }

  function fireAimedShot(state, enemy, damage, speed, radius, color, offset, patternSource) {
    var aim = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
    pushEnemyBullet(state, enemy, aim + (offset || 0), damage, speed, radius, color, patternSource);
  }

  function pushEnemyBullet(state, enemy, angle, damage, speed, radius, color, patternSource) {
    if (!canAddEnemyBullets(state, 1)) return;
    var visual = getEnemyBulletVisual(patternSource);
    var bullet = weaponSys.createBullet(
      enemy.x - enemy.radius * 0.7,
      enemy.y,
      angle,
      "enemy",
      damage,
      speed,
      visual.radius || radius,
      visual.color || color,
      { owner: "enemy", shape: visual.shape || "circle", width: visual.width, height: visual.height, pierceRemaining: 0, bulletVisualId: visual.id }
    );
    bullet.age = 0;
    bullet.patternSource = patternSource || "enemy";
    bullet.sourceEnemyType = enemy.enemyType || (enemy.heavy ? "elite" : "small");
    bullet.sourceEnemyClass = enemy.heavy ? "heavy" : "normal";
    state.enemyBullets.push(bullet);
  }

  function getEnemyBulletCap(state) {
    var chapter = state && state.level ? Number(state.level.chapterIndex) || 0 : 0;
    var caps = [8, 14, 18, 24, 28, 32, 36, 40, 44, 48];
    return caps[Math.max(0, Math.min(caps.length - 1, chapter))] || 24;
  }

  function canAddEnemyBullets(state, nextCount) {
    var list = state && state.enemyBullets ? state.enemyBullets : [];
    return list.length + Math.max(1, nextCount || 1) <= getEnemyBulletCap(state);
  }

  function getEnemyBulletVisual(patternSource) {
    var source = patternSource || "single";
    var codex = assetsConfig.ENEMY_BULLET_CODEX || {};
    if (source.indexOf("bomb_mine") >= 0) return codex.bomb_mine || {};
    if (source.indexOf("mothership") >= 0) return codex.mothership_core || {};
    if (source.indexOf("rotating") >= 0) return codex.rotating || {};
    if (source.indexOf("delayed_burst") >= 0) return codex.delayed_burst || {};
    if (source.indexOf("sniper") >= 0) return codex.sniper_warning || {};
    if (source.indexOf("slow_wall") >= 0 || source.indexOf("escort") >= 0 || source.indexOf("shield") >= 0) return codex.slow_wall || {};
    if (source.indexOf("triple") >= 0 || source.indexOf("cross") >= 0 || source.indexOf("fan") >= 0 || source.indexOf("elite") >= 0) return codex.triple || {};
    return codex.single || {};
  }

  function createId(state) {
    return (typeof crypto !== "undefined" && crypto.randomUUID)
      ? crypto.randomUUID()
      : (state.elapsed || 0) + "-" + Math.random();
  }

  function getField(state) {
    return scope.battleGeometry.getField(state);
  }

  function scaleY(state, value) {
    return scope.battleGeometry.scaleY(state, value);
  }

  var api = {
    spawnEnemies: spawnEnemies,
    spawnWave: spawnWave,
    updateEnemies: updateEnemies,
    fireEnemyShot: fireEnemyShot
  };

  scope.enemySystem = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
