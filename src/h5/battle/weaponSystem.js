(function registerWeaponSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var balanceConfig = scope.balance || {};
  var levelsConfig = scope.levels || {};
  var POWERUPS = levelsConfig.POWERUPS || {};

  var WEAPON_VISUALS = {
    normal: { displayName: "脉冲弹", shape: "bolt", color: "#bffcff", trailColor: "rgba(191,252,255,0.24)", radius: 4, width: 13, height: 6 },
    spread: { displayName: (POWERUPS.spread && POWERUPS.spread.name) || "裂星霰翼", shape: "bolt", color: "#ffd166", trailColor: "rgba(255,209,102,0.24)", radius: 4, width: 14, height: 6 },
    laser: { displayName: (POWERUPS.laser && POWERUPS.laser.name) || "苍蓝贯星炮", shape: "beam", color: "#5ee7ff", trailColor: "rgba(94,231,255,0.2)", radius: 5, width: 34, height: 5 },
    missile: { displayName: (POWERUPS.missile && POWERUPS.missile.name) || "灵蜂追猎弹", shape: "lance", color: "#ffb347", trailColor: "rgba(255,159,67,0.22)", radius: 7, width: 20, height: 10 }
  };

  var WEAPON_LEVEL_TABLE = balanceConfig.PLAYER_WEAPON_LEVELS || {};

  function getWeaponLevelStats(type, level) {
    if (balanceConfig.getWeaponLevelStats) return balanceConfig.getWeaponLevelStats(type, level);
    var table = WEAPON_LEVEL_TABLE[type] || [];
    return table[Math.max(1, Math.min(10, Math.floor(Number(level) || 1)))] || {
      damageMultiplier: 1,
      projectileCount: 1,
      offsets: [0],
      angleStep: 0
    };
  }

  function getEquippedModule(loadout, weaponType) {
    var module = loadout && loadout.equippedWeaponModule;
    return module && module.weaponType === weaponType ? module : null;
  }

  function getModuleEffects(loadout, weaponType) {
    var module = getEquippedModule(loadout, weaponType);
    return module && module.effects ? module.effects : {};
  }

  function getActiveWeapons(weapons) {
    weapons = weapons || {};
    var active = [];
    if (weapons.spread > 0) active.push(["spread", weapons.spread]);
    if (weapons.laser > 0) active.push(["laser", weapons.laser]);
    if (weapons.missile > 0) active.push(["missile", weapons.missile]);
    return active;
  }

  function getFusionLabels(weapons) {
    weapons = weapons || {};
    var count = (weapons.spread > 0 ? 1 : 0) + (weapons.laser > 0 ? 1 : 0) + (weapons.missile > 0 ? 1 : 0);
    if (count >= 3) return "星河齐射";
    if (weapons.spread > 0 && weapons.laser > 0) return "裂星贯流";
    if (weapons.spread > 0 && weapons.missile > 0) return "蜂群霰翼";
    if (weapons.laser > 0 && weapons.missile > 0) return "苍蜂锁星";
    if (weapons.spread > 0) return WEAPON_VISUALS.spread.displayName;
    if (weapons.laser > 0) return WEAPON_VISUALS.laser.displayName;
    if (weapons.missile > 0) return WEAPON_VISUALS.missile.displayName;
    return "";
  }

  function getPlayerDamage(loadout, type, weaponLevel) {
    var fs = loadout ? (loadout.finalStats || {}) : {};
    var pilotDamage = loadout && loadout.pilot ? loadout.pilot.damage : 0;
    var shipDamage = loadout && loadout.ship ? loadout.ship.damage : 0;
    var fireMultiplier = fs.weaponDamageMultiplier || 1;
    var wl = Math.max(1, weaponLevel || 1);
    var finalAttack = Math.max(0, Number(fs.attack) || 0);

    if (finalAttack > 0) {
      var pickupMultiplier = balanceConfig.getPickupDamageMultiplier
        ? balanceConfig.getPickupDamageMultiplier(type, wl)
        : (1 + (wl - 1) * 0.1);
      return Math.round(finalAttack * pickupMultiplier);
    }

    if (balanceConfig.getPlayerWeaponDamage) {
      return balanceConfig.getPlayerWeaponDamage({
        pilotDamage: pilotDamage,
        fighterDamage: shipDamage,
        fighterUpgradeMultiplier: fireMultiplier,
        weaponType: type,
        weaponLevel: wl
      });
    }

    var base = (pilotDamage + shipDamage) * fireMultiplier;
    return Math.round(base * (1 + (wl - 1) * 0.1));
  }

  function getPierceBudget(loadout, state) {
    var slots = (loadout && loadout.weaponPierceSlots) ||
      (state && state.player && state.player.weaponPierceSlots) ||
      { spread: 0, laser: 0, missile: 0 };
    return Math.max(0,
      Math.floor(Number(slots.spread) || 0) +
      Math.floor(Number(slots.laser) || 0) +
      Math.floor(Number(slots.missile) || 0)
    );
  }

  function getWeaponPierce(loadout, state, type) {
    var slots = (loadout && loadout.weaponPierceSlots) ||
      (state && state.player && state.player.weaponPierceSlots) ||
      { spread: 0, laser: 0, missile: 0 };
    return Math.max(0, Math.floor(Number(slots[type]) || 0));
  }

  function getReferenceVolleyDamage(loadout, level) {
    var referenceLevel = Math.max(1, Math.min(10, Math.floor(Number(level) || 8)));
    var total = 0;
    ["spread", "laser", "missile"].forEach(function addWeapon(type) {
      var stats = getWeaponLevelStats(type, referenceLevel);
      var count = Array.isArray(stats.offsets)
        ? stats.offsets.length
        : Math.max(1, Math.floor(Number(stats.projectileCount) || 1));
      total += getPlayerDamage(loadout, type, referenceLevel) * count;
    });
    return Math.max(1, Math.round(total));
  }

  function createBullet(x, y, angle, type, damage, speed, radius, color, options) {
    var visual = WEAPON_VISUALS[type] || {};
    var opts = typeof options === "object" && options !== null
      ? options
      : { pierceRemaining: options ? 999 : 0 };
    var owner = opts.owner || (type === "enemy" ? "enemy" : "player");
    return {
      x: x,
      y: y,
      angle: angle,
      type: type,
      owner: owner,
      damage: damage,
      speed: speed,
      radius: radius || visual.radius || 4,
      color: color || visual.color || (owner === "enemy" ? "#ff6b8a" : "#d7fff5"),
      trailColor: opts.trailColor || visual.trailColor || "",
      shape: opts.shape || visual.shape || "circle",
      width: opts.width || visual.width || Math.max(8, (radius || 4) * 2),
      height: opts.height || visual.height || Math.max(8, (radius || 4) * 2),
      splashRadius: Math.max(0, Number(opts.splashRadius) || 0),
      splashExcludesDirect: opts.splashExcludesDirect === true,
      armorPierceRatio: Math.max(0, Math.min(1, Number(opts.armorPierceRatio) || 0)),
      armorBreakRatio: Math.max(0, Math.min(1, Number(opts.armorBreakRatio) || 0)),
      armorBreakDuration: Math.max(0, Number(opts.armorBreakDuration) || 0),
      armorBreakTargetId: opts.armorBreakTargetId || "",
      bulletVisualId: opts.bulletVisualId || "",
      pierceRemaining: Math.max(0, Math.floor(Number(opts.pierceRemaining) || 0)),
      hitIds: new (typeof Set !== "undefined" ? Set : Array)(),
      age: 0
    };
  }

  function autoShoot(state, loadout, bullets) {
    if (state.player.cooldown > 0) return;
    shoot(state, loadout, bullets);
    var active = getActiveWeapons(state.player.weapons);
    state.player.cooldown = active.length ? 0.16 : 0.2;
  }

  function shoot(state, loadout, bullets) {
    var x = state.player.x;
    var y = state.player.y;
    var activeWeapons = getActiveWeapons(state.player.weapons);
    playWeaponSfx(activeWeapons);

    if (!activeWeapons.length) {
      bullets.push(createBullet(
        x + 34, y, 0, "normal",
        getPlayerDamage(loadout, "normal", 1),
        650, 4, WEAPON_VISUALS.normal.color,
        { owner: "player", shape: "bolt", width: WEAPON_VISUALS.normal.width, height: WEAPON_VISUALS.normal.height, pierceRemaining: getPierceBudget(loadout, state), trailColor: WEAPON_VISUALS.normal.trailColor }
      ));
      return;
    }

    for (var w = 0; w < activeWeapons.length; w++) {
      fireWeapon(state, loadout, bullets, activeWeapons[w][0], activeWeapons[w][1], x, y);
    }
    fireFusionWeapons(state, loadout, bullets, x, y);
    if (scope.abilitySystem && scope.abilitySystem.onVolleyFired) {
      scope.abilitySystem.onVolleyFired(state, loadout, bullets, { x: x, y: y });
    }
  }

  function fireWeapon(state, loadout, bullets, weapon, level, x, y) {
    level = Math.max(1, Math.min(balanceConfig.MAX_WEAPON_LEVEL || 5, Math.floor(Number(level) || 1)));
    var stats = getWeaponLevelStats(weapon, level);
    var effects = getModuleEffects(loadout, weapon);
    var damageMultiplier = Math.max(0, Number(effects.damageMultiplier) || 1);
    var baseDamage = Math.round(getPlayerDamage(loadout, weapon, level) * damageMultiplier);
    if (weapon === "spread") {
      var count = Math.max(1, Math.floor(Number(stats.projectileCount) || 1));
      count += Math.max(0, Math.floor(Number(effects.projectileBonus) || 0));
      if (Number(effects.projectileCap) > 0) count = Math.min(count, Math.floor(Number(effects.projectileCap)));
      var step = Math.max(0, Number(stats.angleStep) || 0.055) * Math.max(0.1, Number(effects.angleMultiplier) || 1);
      var start = -step * (count - 1) / 2;
      for (var i = 0; i < count; i++) {
        bullets.push(createBullet(
          x + 32, y, start + step * i, "spread",
          baseDamage,
          610 + level * 5, 4, WEAPON_VISUALS.spread.color,
          { owner: "player", shape: "bolt", width: WEAPON_VISUALS.spread.width, height: WEAPON_VISUALS.spread.height, pierceRemaining: getWeaponPierce(loadout, state, "spread"), trailColor: WEAPON_VISUALS.spread.trailColor }
        ));
      }
      return;
    }

    if (weapon === "laser") {
      var offsets = Array.isArray(stats.offsets) ? stats.offsets : [0];
      var laserPierce = getWeaponPierce(loadout, state, "laser") + Math.max(0, Math.floor(Number(effects.pierceBonus) || 0));
      for (var j = 0; j < offsets.length; j++) {
        bullets.push(createBullet(
          x + 38, y + offsets[j], 0, "laser",
          baseDamage,
          920 + level * 6, 5, WEAPON_VISUALS.laser.color,
          { owner: "player", shape: "beam", width: 38 + Math.floor(level / 2), height: 5 + (level >= 8 ? 1 : 0), pierceRemaining: laserPierce, trailColor: WEAPON_VISUALS.laser.trailColor }
        ));
      }
      if (Number(effects.triggerEvery) > 0) {
        state.player.weaponVolleyCounts = state.player.weaponVolleyCounts || {};
        var laserVolley = (state.player.weaponVolleyCounts.laser || 0) + 1;
        state.player.weaponVolleyCounts.laser = laserVolley;
        if (laserVolley % Math.floor(Number(effects.triggerEvery)) === 0) {
          bullets.push(createBullet(
            x + 42, y, 0, "laser",
            Math.round(getPlayerDamage(loadout, "laser", level) * Math.max(1, Number(effects.bonusBeamDamageMultiplier) || 2)),
            980 + level * 6, 7, "#bff8ff",
            { owner: "player", shape: "beam", width: 62, height: 9, pierceRemaining: laserPierce + 1, trailColor: "rgba(191,248,255,0.34)" }
          ));
        }
      }
      return;
    }

    if (weapon === "missile") {
      var mCount = Math.max(1, Math.floor(Number(stats.projectileCount) || 1));
      mCount += Math.max(0, Math.floor(Number(effects.projectileBonus) || 0));
      if (Number(effects.projectileCap) > 0) mCount = Math.min(mCount, Math.floor(Number(effects.projectileCap)));
      var mOffsets = createCenteredOffsets(mCount, 14, 52);
      var missileLocks = getMissileLocks(state);
      for (var k = 0; k < mOffsets.length; k++) {
        var normalizedSlot = mOffsets.length === 1 ? 0 : (k / (mOffsets.length - 1)) * 2 - 1;
        var angle = normalizedSlot * 0.22;
        var launchSpeed = (460 + level * 12) * Math.max(0.1, Number(effects.speedMultiplier) || 1);
        var missile = createBullet(
          x + 28, y + mOffsets[k], angle, "missile",
          baseDamage,
          launchSpeed, 7, WEAPON_VISUALS.missile.color,
          { owner: "player", shape: "lance", width: 20, height: 10, pierceRemaining: getWeaponPierce(loadout, state, "missile"), trailColor: WEAPON_VISUALS.missile.trailColor, splashRadius: Math.max(0, Number(effects.splashRadius) || 0), splashExcludesDirect: Number(effects.splashRadius) > 0 }
        );
        missile.homingStartAge = 0.08;
        missile.homingTurnRate = 6 * Math.max(0.1, Number(effects.turnMultiplier) || 1);
        missile.homingSteerGain = 9;
        missile.launchSpeed = launchSpeed;
        missile.maxSpeed = launchSpeed * 1.3;
        missile.accelerationDuration = 0.35;
        var target = selectMissileTarget(state, missile, missileLocks);
        missile.targetId = target && target.id ? target.id : "";
        if (missile.targetId) missileLocks[missile.targetId] = (missileLocks[missile.targetId] || 0) + 1;
        bullets.push(missile);
      }
    }
  }

  function fireFusionWeapons(state, loadout, bullets, x, y) {
    // Reserved for future combined weapon skills.
  }

  function createCenteredOffsets(count, step, maxAbs) {
    count = Math.max(1, Math.floor(Number(count) || 1));
    step = Math.max(1, Number(step) || 14);
    maxAbs = Math.max(step, Number(maxAbs) || 52);
    if (count === 1) return [0];
    var offsets = [];
    var start = -step * (count - 1) / 2;
    for (var i = 0; i < count; i++) {
      offsets.push(Math.max(-maxAbs, Math.min(maxAbs, Math.round(start + step * i))));
    }
    return offsets;
  }

  function playSfx(id) {
    if (scope.audioSystem && scope.audioSystem.playSfx) scope.audioSystem.playSfx(id);
  }

  function queueSfx(id) {
    if (scope.audioSystem && scope.audioSystem.queueSfx) {
      scope.audioSystem.queueSfx(id);
      return;
    }
    playSfx(id);
  }

  function playWeaponSfx(activeWeapons) {
    if (!activeWeapons || !activeWeapons.length) {
      queueSfx("shootSpread");
      return;
    }
    var selected = "shootSpread";
    for (var i = 0; i < activeWeapons.length; i++) {
      var type = activeWeapons[i][0];
      if (type === "missile") {
        selected = "shootMissile";
        break;
      }
      if (type === "laser") selected = "shootLaser";
    }
    queueSfx(selected);
  }

  function updateBullets(state, dt) {
    var missileLocks = getMissileLocks(state);
    for (var i = 0; i < state.bullets.length; i++) {
      var bullet = state.bullets[i];
      bullet.age += dt;
      if (bullet.type === "missile") {
        var accelerationDuration = Math.max(0.01, Number(bullet.accelerationDuration) || 0.35);
        var launchSpeed = Math.max(1, Number(bullet.launchSpeed) || Number(bullet.speed) || 1);
        var maxSpeed = Math.max(launchSpeed, Number(bullet.maxSpeed) || launchSpeed);
        var accelerationProgress = Math.min(1, bullet.age / accelerationDuration);
        bullet.speed = launchSpeed + (maxSpeed - launchSpeed) * accelerationProgress;

        var target = findMissileTarget(state, bullet.targetId);
        if (!target) {
          target = selectMissileTarget(state, bullet, missileLocks);
          bullet.targetId = target && target.id ? target.id : "";
          if (bullet.targetId) missileLocks[bullet.targetId] = (missileLocks[bullet.targetId] || 0) + 1;
        }
        if (target && bullet.age > Math.max(0, Number(bullet.homingStartAge) || 0.08)) {
          var aim = Math.atan2(target.y - bullet.y, target.x - bullet.x);
          var diff = aim - bullet.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          var maxTurn = Math.max(0.1, Number(bullet.homingTurnRate) || 6) * dt;
          var steer = diff * Math.max(0.1, Number(bullet.homingSteerGain) || 9) * dt;
          bullet.angle += Math.max(-maxTurn, Math.min(maxTurn, steer));
        }
      }
      if (scope.abilitySystem && scope.abilitySystem.updateBullet) scope.abilitySystem.updateBullet(state, bullet, dt);
      bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
      bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    }
    var field = getField(state);
    state.bullets = state.bullets.filter(function (b) {
      return !b.dead && b.x < field.width + field.cullPadding && b.x > -field.cullPadding && b.y > -field.cullPadding && b.y < field.height + field.cullPadding;
    });
  }

  function updateEnemyBullets(state, dt) {
    for (var i = 0; i < state.enemyBullets.length; i++) {
      var bullet = state.enemyBullets[i];
      bullet.age += dt;
      if (!bullet.dead && bullet.patternSource && bullet.patternSource.indexOf("delayed_burst") >= 0 && !bullet.splitDone && bullet.age >= 0.55) {
        bullet.splitDone = true;
        bullet.dead = true;
        splitEnemyBurst(state, bullet);
        continue;
      }
      bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
      bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    }
    var field = getField(state);
    state.enemyBullets = state.enemyBullets.filter(function (b) {
      return !b.dead && b.x > -field.cullPadding && b.x < field.width + field.cullPadding && b.y > -field.cullPadding && b.y < field.height + field.cullPadding;
    });
    updateEnemyTelegraphs(state, dt);
  }

  function splitEnemyBurst(state, source) {
    var count = 6;
    for (var i = 0; i < count; i++) {
      var angle = Math.PI + (i - (count - 1) / 2) * 0.18;
      var bullet = createBullet(
        source.x,
        source.y,
        angle,
        "enemy",
        Math.max(1, Math.floor((source.damage || 10) * 0.72)),
        Math.max(160, (source.speed || 260) * 0.78),
        Math.max(4.5, (source.radius || 5) * 0.84),
        "#ff7c93",
        { owner: "enemy", shape: "circle", pierceRemaining: 0 }
      );
      bullet.sourceEnemyType = source.sourceEnemyType || "small";
      bullet.sourceEnemyClass = source.sourceEnemyClass || "normal";
      state.enemyBullets.push(bullet);
    }
  }

  function updateEnemyTelegraphs(state, dt) {
    var list = state.enemyTelegraphs || [];
    for (var i = 0; i < list.length; i++) list[i].life -= dt;
    state.enemyTelegraphs = list.filter(function (item) { return item.life > 0; });
  }

  function getMissileLocks(state) {
    var locks = {};
    var bullets = state && state.bullets ? state.bullets : [];
    for (var i = 0; i < bullets.length; i++) {
      var bullet = bullets[i];
      if (bullet && bullet.type === "missile" && bullet.targetId) {
        locks[bullet.targetId] = (locks[bullet.targetId] || 0) + 1;
      }
    }
    return locks;
  }

  function isValidMissileTarget(target, state) {
    if (!target || target.dead) return false;
    if (target.spawnState && target.spawnState !== "active") return false;
    if (target.canTakeDamage === false || Number(target.hp) <= 0) return false;
    var field = getField(state);
    return target.x > 0 && target.x < field.width + 10 && target.y > 20 && target.y < field.height - 20;
  }

  function findMissileTarget(state, targetId) {
    if (!targetId) return null;
    var enemies = state && state.enemies ? state.enemies : [];
    for (var i = 0; i < enemies.length; i++) {
      if (enemies[i] && enemies[i].id === targetId && isValidMissileTarget(enemies[i], state)) return enemies[i];
    }
    return state && state.boss && state.boss.id === targetId && isValidMissileTarget(state.boss, state)
      ? state.boss
      : null;
  }

  function selectMissileTarget(state, bullet, locks) {
    var enemies = state && state.enemies ? state.enemies.filter(function (target) { return isValidMissileTarget(target, state); }) : [];
    var targets = enemies.length ? enemies : (isValidMissileTarget(state && state.boss, state) ? [state.boss] : []);
    var nearest = null;
    var bestScore = Infinity;
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      if (!isValidMissileTarget(target, state)) continue;
      var dx = bullet.x - target.x;
      var dy = bullet.y - target.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var lockPenalty = (locks && target.id ? (locks[target.id] || 0) : 0) * 180;
      var forwardBonus = target.x >= bullet.x ? -140 : 160;
      var threatBonus = target.enemyType === "elite" ? -90 : target.enemyType === "shooter" ? -50 : target.enemyType === "shield" ? -20 : 0;
      var hpPenalty = Math.min(180, Math.max(0, (target.hp || 0) / Math.max(1, target.maxHp || target.hp || 1) * 60));
      var score = d + lockPenalty + forwardBonus + threatBonus + hpPenalty;
      if (score < bestScore) {
        bestScore = score;
        nearest = target;
      }
    }
    return nearest;
  }

  function nearestTarget(state, bullet) {
    return selectMissileTarget(state, bullet, {});
  }

  function getField(state) {
    return scope.battleGeometry && scope.battleGeometry.getField
      ? scope.battleGeometry.getField(state)
      : (state && state.field) || { width: 960, height: 473, cullPadding: 40 };
  }

  var api = {
    WEAPON_VISUALS: WEAPON_VISUALS,
    WEAPON_LEVEL_TABLE: WEAPON_LEVEL_TABLE,
    getActiveWeapons: getActiveWeapons,
    getFusionLabels: getFusionLabels,
    getPlayerDamage: getPlayerDamage,
    getPierceBudget: getPierceBudget,
    createBullet: createBullet,
    autoShoot: autoShoot,
    shoot: shoot,
    fireWeapon: fireWeapon,
    fireFusionWeapons: fireFusionWeapons,
    updateBullets: updateBullets,
    updateEnemyBullets: updateEnemyBullets,
    getReferenceVolleyDamage: getReferenceVolleyDamage,
    nearestTarget: nearestTarget,
    selectMissileTarget: selectMissileTarget,
    findMissileTarget: findMissileTarget,
    isValidMissileTarget: isValidMissileTarget
  };

  scope.weaponSystem = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
