(function registerWeaponSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var balanceConfig = scope.balance || {};
  var levelsConfig = scope.levels || {};
  var POWERUPS = levelsConfig.POWERUPS || {};

  var WEAPON_VISUALS = {
    normal: { displayName: "脉冲弹", shape: "circle", color: "#bffcff", trailColor: "rgba(191,252,255,0.45)", radius: 4 },
    spread: { displayName: (POWERUPS.spread && POWERUPS.spread.name) || "裂星霰翼", shape: "circle", color: "#ffd166", trailColor: "rgba(255,209,102,0.45)", radius: 4 },
    laser: { displayName: (POWERUPS.laser && POWERUPS.laser.name) || "苍蓝贯星炮", shape: "beam", color: "#5ee7ff", trailColor: "rgba(94,231,255,0.55)", radius: 5, width: 34, height: 6 },
    missile: { displayName: (POWERUPS.missile && POWERUPS.missile.name) || "灵蜂追猎弹", shape: "triangle", color: "#ffb347", trailColor: "rgba(255,159,67,0.48)", radius: 7, width: 18, height: 14 },
    nova: { displayName: "星链超载", shape: "circle", color: "#82f7ff", trailColor: "rgba(130,247,255,0.5)", radius: 10 },
    cluster: { displayName: "暗核重爆", shape: "triangle", color: "#b889ff", trailColor: "rgba(184,137,255,0.48)", radius: 9, width: 22, height: 16 },
    stellarBeam: { displayName: "星链贯星炮", shape: "beam", color: "#82f7ff", trailColor: "rgba(130,247,255,0.62)", radius: 10, width: 130, height: 12 },
    darkCore: { displayName: "暗核坍缩弹", shape: "circle", color: "#b889ff", trailColor: "rgba(184,137,255,0.55)", radius: 13 },
    goldenLance: { displayName: "金矢裁决阵", shape: "triangle", color: "#ffd166", trailColor: "rgba(255,209,102,0.58)", radius: 8, width: 30, height: 12 }
  };

  var WEAPON_LEVEL_TABLE = {
    spread: {
      count: [0, 3, 5, 6, 7, 9, 10, 11, 13, 15, 17],
      angleStep: [0, 0.055, 0.06, 0.064, 0.067, 0.07, 0.072, 0.074, 0.076, 0.078, 0.08]
    },
    laser: {
      offsets: [
        [],
        [0],
        [-10, 10],
        [-14, 0, 14],
        [-18, -6, 6, 18],
        [-22, -11, 0, 11, 22],
        [-26, -13, 0, 13, 26],
        [-30, -18, -6, 6, 18, 30],
        [-32, -19, -6, 6, 19, 32],
        [-36, -24, -12, 0, 12, 24, 36],
        [-42, -31, -20, -10, 0, 10, 20, 31, 42]
      ]
    },
    missile: {
      count: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    }
  };

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
      armorPierceRatio: Math.max(0, Math.min(1, Number(opts.armorPierceRatio) || 0)),
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
        { owner: "player", shape: "circle", pierceRemaining: getPierceBudget(loadout, state), trailColor: WEAPON_VISUALS.normal.trailColor }
      ));
      return;
    }

    for (var w = 0; w < activeWeapons.length; w++) {
      fireWeapon(state, loadout, bullets, activeWeapons[w][0], activeWeapons[w][1], x, y);
    }
    fireFusionWeapons(state, loadout, bullets, x, y);
    fireExclusiveSkill(state, loadout, bullets, x, y);
  }

  function fireWeapon(state, loadout, bullets, weapon, level, x, y) {
    var pierce = getPierceBudget(loadout, state);
    level = Math.max(1, Math.min(balanceConfig.MAX_WEAPON_LEVEL || 5, Math.floor(Number(level) || 1)));
    if (weapon === "spread") {
      var count = WEAPON_LEVEL_TABLE.spread.count[level] || WEAPON_LEVEL_TABLE.spread.count[10];
      var step = WEAPON_LEVEL_TABLE.spread.angleStep[level] || WEAPON_LEVEL_TABLE.spread.angleStep[10];
      var start = -step * (count - 1) / 2;
      for (var i = 0; i < count; i++) {
        bullets.push(createBullet(
          x + 32, y, start + step * i, "spread",
          getPlayerDamage(loadout, "spread", level),
          610 + level * 5, 4, WEAPON_VISUALS.spread.color,
          { owner: "player", shape: "circle", pierceRemaining: pierce, trailColor: WEAPON_VISUALS.spread.trailColor }
        ));
      }
      return;
    }

    if (weapon === "laser") {
      var offsets = WEAPON_LEVEL_TABLE.laser.offsets[level] || WEAPON_LEVEL_TABLE.laser.offsets[10];
      for (var j = 0; j < offsets.length; j++) {
        bullets.push(createBullet(
          x + 38, y + offsets[j], 0, "laser",
          getPlayerDamage(loadout, "laser", level),
          920 + level * 6, 5, WEAPON_VISUALS.laser.color,
          { owner: "player", shape: "beam", width: 38 + Math.floor(level / 2), height: 6 + (level >= 8 ? 2 : 0), pierceRemaining: pierce, trailColor: WEAPON_VISUALS.laser.trailColor }
        ));
      }
      return;
    }

    if (weapon === "missile") {
      var mCount = WEAPON_LEVEL_TABLE.missile.count[level] || WEAPON_LEVEL_TABLE.missile.count[10];
      var mOffsets = createCenteredOffsets(mCount, 14, 52);
      for (var k = 0; k < mOffsets.length; k++) {
        var angle = mOffsets.length === 1 ? 0 : (k - (mOffsets.length - 1) / 2) * 0.05;
        bullets.push(createBullet(
          x + 28, y + mOffsets[k], angle, "missile",
          getPlayerDamage(loadout, "missile", level),
          460 + level * 12, 7, WEAPON_VISUALS.missile.color,
          { owner: "player", shape: "triangle", width: 18, height: 14, pierceRemaining: pierce, trailColor: WEAPON_VISUALS.missile.trailColor }
        ));
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

  function fireExclusiveSkill(state, loadout, bullets, x, y) {
    var skill = loadout && loadout.ship ? (loadout.ship.passiveSkill || loadout.ship.exclusiveSkill) : null;
    if (!skill || !skill.id || skill.id === "golden-pierce") return;
    state.player.exclusiveSkillLastAt = state.player.exclusiveSkillLastAt || {};
    var now = Math.max(0, Number(state.elapsed) || 0);
    var cooldown = Math.max(0.6, Number(skill.cooldown) || 2.4);
    var lastAt = state.player.exclusiveSkillLastAt[skill.id];
    if (lastAt != null && now - lastAt < cooldown) return;
    state.player.exclusiveSkillLastAt[skill.id] = now;

    if (skill.id === "stellar-overload") {
      bullets.push(createBullet(
        x + 42, y, 0, "nova",
        Math.round(getPlayerDamage(loadout, "laser", 2) * (Number(skill.damageMultiplier) || 2.2)),
        760, 10, WEAPON_VISUALS.nova.color,
        { owner: "player", shape: "circle", pierceRemaining: 0, trailColor: WEAPON_VISUALS.nova.trailColor }
      ));
      return;
    }

    if (skill.id === "dark-cluster") {
      var offsets = [-0.08, 0, 0.08];
      for (var i = 0; i < offsets.length; i++) {
        bullets.push(createBullet(
          x + 34, y + (i - 1) * 12, offsets[i], "cluster",
          Math.round(getPlayerDamage(loadout, "missile", 2) * (Number(skill.damageMultiplier) || 1.45)),
          560, 9, WEAPON_VISUALS.cluster.color,
          { owner: "player", shape: "triangle", width: 22, height: 16, pierceRemaining: 0, trailColor: WEAPON_VISUALS.cluster.trailColor }
        ));
      }
    }
  }

  function updateActiveSkill(state, dt) {
    var runtime = state && state.player ? state.player.activeSkill : null;
    if (!runtime || runtime.maxCharges <= 0) return;
    runtime.charges = Math.max(0, Math.min(runtime.maxCharges, Math.floor(Number(runtime.charges) || 0)));
    if (runtime.charges >= runtime.maxCharges) {
      runtime.rechargeTimer = 0;
      return;
    }
    runtime.rechargeTimer = Math.max(0, Number(runtime.rechargeTimer) || 0);
    if (runtime.rechargeTimer <= 0) runtime.rechargeTimer = runtime.rechargeSeconds || 18;
    runtime.rechargeTimer -= dt;
    if (runtime.rechargeTimer <= 0) {
      runtime.charges += 1;
      runtime.rechargeTimer = runtime.charges < runtime.maxCharges ? (runtime.rechargeSeconds || 18) : 0;
      if (state.notices) state.notices.push({ text: runtime.name + " 充能完成", color: "#82f7ff", x: 960 / 2, y: 112, life: 1.3 });
    }
  }

  function tryCastActiveSkill(state, loadout) {
    if (!state || !state.player) return false;
    var runtime = state.player.activeSkill;
    var skill = (loadout && loadout.activeSkill) || (loadout && loadout.ship && loadout.ship.activeSkill) || null;
    if (!runtime || !skill || runtime.charges <= 0) return false;
    runtime.charges = Math.max(0, runtime.charges - 1);
    if (runtime.charges < runtime.maxCharges && runtime.rechargeTimer <= 0) {
      runtime.rechargeTimer = runtime.rechargeSeconds || 18;
    }
    castActiveSkillPattern(state, loadout, skill);
    state.shake = Math.max(state.shake || 0, 0.4);
    if (state.notices) state.notices.push({ text: skill.name || runtime.name || "主动技能", color: "#ffd166", x: 960 / 2, y: 86, life: 1.2 });
    return true;
  }

  function castActiveSkillPattern(state, loadout, skill) {
    var x = state.player.x;
    var y = state.player.y;
    var bullets = state.bullets || [];
    var damageMultiplier = Number(skill.damageMultiplier) || 3.5;

    if (skill.id === "stellar-beam") {
      for (var i = 0; i < 5; i++) {
        var offset = (i - 2) * 10;
        bullets.push(createBullet(
          x + 54, y + offset, 0, "stellarBeam",
          Math.round(getPlayerDamage(loadout, "laser", 10) * damageMultiplier),
          1120, 12, WEAPON_VISUALS.stellarBeam.color,
          { owner: "player", shape: "beam", width: 138, height: 10, pierceRemaining: 999, trailColor: WEAPON_VISUALS.stellarBeam.trailColor, armorPierceRatio: 0.35 }
        ));
      }
      return;
    }

    if (skill.id === "dark-core") {
      bullets.push(createBullet(
        x + 44, y, 0, "darkCore",
        Math.round(getPlayerDamage(loadout, "missile", 10) * damageMultiplier),
        520, 13, WEAPON_VISUALS.darkCore.color,
        { owner: "player", shape: "circle", pierceRemaining: 0, trailColor: WEAPON_VISUALS.darkCore.trailColor, splashRadius: 112 }
      ));
      return;
    }

    if (skill.id === "golden-lances") {
      var lanes = [-42, -26, -10, 10, 26, 42];
      for (var j = 0; j < lanes.length; j++) {
        var angle = (j - (lanes.length - 1) / 2) * 0.025;
        bullets.push(createBullet(
          x + 46, y + lanes[j], angle, "goldenLance",
          Math.round(getPlayerDamage(loadout, "spread", 10) * damageMultiplier),
          880, 8, WEAPON_VISUALS.goldenLance.color,
          { owner: "player", shape: "triangle", width: 30, height: 12, pierceRemaining: 8, trailColor: WEAPON_VISUALS.goldenLance.trailColor, armorPierceRatio: 0.7 }
        ));
      }
    }
  }

  function updateBullets(state, dt) {
    var missileLocks = getMissileLocks(state);
    for (var i = 0; i < state.bullets.length; i++) {
      var bullet = state.bullets[i];
      bullet.age += dt;
      if (bullet.type === "missile" && bullet.age > 0.15) {
        var target = selectMissileTarget(state, bullet, missileLocks);
        if (target) {
          bullet.targetId = target.id;
          var aim = Math.atan2(target.y - bullet.y, target.x - bullet.x);
          var diff = aim - bullet.angle;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          bullet.angle += Math.max(-2.9 * dt, Math.min(2.9 * dt, diff * 4.2 * dt));
        } else {
          bullet.targetId = "";
        }
      }
      if (bullet.type === "darkCore") {
        pullTargetsToDarkCore(state, bullet, dt);
      }
      bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
      bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    }
    state.bullets = state.bullets.filter(function (b) {
      return !b.dead && b.x < 1000 && b.x > -40 && b.y > -40 && b.y < 580;
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
    state.enemyBullets = state.enemyBullets.filter(function (b) {
      return !b.dead && b.x > -40 && b.x < 1000 && b.y > -40 && b.y < 580;
    });
    updateEnemyTelegraphs(state, dt);
  }

  function pullTargetsToDarkCore(state, bullet, dt) {
    var enemies = state.enemies || [];
    for (var i = 0; i < enemies.length; i++) {
      var enemy = enemies[i];
      if (!enemy || enemy.dead || enemy.canTakeDamage === false) continue;
      var dx = bullet.x - enemy.x;
      var dy = bullet.y - enemy.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      if (d > 170) continue;
      var pull = (1 - d / 170) * 95 * dt;
      enemy.x += (dx / d) * pull;
      enemy.y += (dy / d) * pull;
    }
  }

  function splitEnemyBurst(state, source) {
    var count = 6;
    for (var i = 0; i < count; i++) {
      var angle = Math.PI + (i - (count - 1) / 2) * 0.18;
      state.enemyBullets.push(createBullet(
        source.x,
        source.y,
        angle,
        "enemy",
        Math.max(1, Math.floor((source.damage || 10) * 0.72)),
        Math.max(160, (source.speed || 260) * 0.78),
        Math.max(4.5, (source.radius || 5) * 0.84),
        "#ff7c93",
        { owner: "enemy", shape: "circle", pierceRemaining: 0 }
      ));
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

  function isValidMissileTarget(target) {
    if (!target || target.dead) return false;
    if (target.spawnState && target.spawnState !== "active") return false;
    return target.x > 0 && target.x < 970 && target.y > 20 && target.y < 520;
  }

  function selectMissileTarget(state, bullet, locks) {
    var targets = state.boss ? [state.boss].concat(state.enemies) : state.enemies;
    var nearest = null;
    var bestScore = Infinity;
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      if (!isValidMissileTarget(target)) continue;
      var dx = bullet.x - target.x;
      var dy = bullet.y - target.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var lockPenalty = (locks && target.id ? (locks[target.id] || 0) : 0) * 180;
      var forwardBonus = target.x >= bullet.x ? -140 : 160;
      var threatBonus = target.enemyType === "elite" ? -90 : target.enemyType === "shooter" ? -50 : target.enemyType === "shield" ? -20 : 0;
      var bossPenalty = target === state.boss && state.enemies && state.enemies.length ? 260 : -80;
      var hpPenalty = Math.min(180, Math.max(0, (target.hp || 0) / Math.max(1, target.maxHp || target.hp || 1) * 60));
      var score = d + lockPenalty + forwardBonus + threatBonus + (target === state.boss ? bossPenalty : 0) + hpPenalty;
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
    fireExclusiveSkill: fireExclusiveSkill,
    updateActiveSkill: updateActiveSkill,
    tryCastActiveSkill: tryCastActiveSkill,
    updateBullets: updateBullets,
    updateEnemyBullets: updateEnemyBullets,
    nearestTarget: nearestTarget,
    selectMissileTarget: selectMissileTarget
  };

  scope.weaponSystem = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
