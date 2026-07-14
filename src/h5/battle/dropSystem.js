(function registerDropSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var POWERUPS = levelsConfig.POWERUPS || {};
  var MAX_WEAPON_LEVEL = (scope.balance && scope.balance.MAX_WEAPON_LEVEL) || 5;
  var WEAPON_TYPES = ["spread", "laser", "missile"];

  /**
   * 生成道具
   */
  function spawnPowerups(state) {
    var director = ensureSupplyDirector(state);
    var forceReason = getForcedSupplyReason(state, director);
    if (state.powerTimer > 0 && !forceReason) return;
    if (state.boss && director.bossPrepDropped) return;
    if (!canSpawnSupply(state, forceReason)) {
      state.powerTimer = Math.min(state.powerTimer > 0 ? state.powerTimer : 1, 1.2);
      return;
    }

    var type = choosePowerupType(state, director, forceReason || "scheduled");
    if (!type) {
      state.powerTimer = getNextSupplyDelay(state, director);
      return;
    }
    createPowerup(state, type, getField(state).width + 26, getSafeSupplyY(state), 118);
    director.spawned += 1;
    if (type === "life") director.lifeSpawned = (director.lifeSpawned || 0) + 1;
    director.lastDropAt = state.elapsed || 0;
    if (isWeaponType(type)) director.lastWeaponAt = state.elapsed || 0;
    if (forceReason === "bossPrep" || ((state.elapsed || 0) >= 55 && (state.elapsed || 0) < 64 && !state.boss)) {
      director.bossPrepDropped = true;
    }
    state.powerTimer = getNextSupplyDelay(state, director);
  }

  function ensureSupplyDirector(state) {
    if (state.supplyDirector) return state.supplyDirector;
    state.supplyDirector = { spawned: 0, collected: 0, lifeSpawned: 0, lastDropAt: -99, lastWeaponAt: -99, bossPrepDropped: false };
    return state.supplyDirector;
  }

  function isWeaponType(type) {
    return type === "spread" || type === "laser" || type === "missile";
  }

  function getForcedSupplyReason(state, director) {
    var elapsed = state.elapsed || 0;
    var sinceDrop = elapsed - getDirectorTime(director.lastDropAt);
    var sinceWeapon = elapsed - getDirectorTime(director.lastWeaponAt);
    if (elapsed >= 55 && elapsed < 64 && !director.bossPrepDropped) return "bossPrep";
    if (getHpRatio(state) < 0.3 && sinceDrop >= 9 && (director.lifeSpawned || 0) < 1) return "rescue";
    if (elapsed < 58 && !allWeaponsMaxed(state) && sinceWeapon >= 9) return "weaponNudge";
    if (sinceDrop >= 12) return "antiDry";
    return "";
  }

  function getDirectorTime(value) {
    return typeof value === "number" ? value : -99;
  }

  function getNextSupplyDelay(state) {
    var elapsed = state.elapsed || 0;
    if (elapsed < 20) return 6 + Math.random() * 2;
    if (elapsed < 50) return 8 + Math.random() * 2;
    if (elapsed < 60) return 6 + Math.random() * 1.5;
    if (getHpRatio(state) < 0.45) return 6 + Math.random() * 2;
    return 10 + Math.random() * 3;
  }

  function getHpRatio(state) {
    var player = state.player || {};
    return Math.max(0, Math.min(1, (player.hp || 0) / Math.max(1, player.maxHp || 100)));
  }

  function allWeaponsMaxed(state) {
    return WEAPON_TYPES.every(function (type) {
      var weapons = (state.player && state.player.weapons) || {};
      return Math.floor(Number(weapons[type]) || 0) >= MAX_WEAPON_LEVEL;
    });
  }

  function getWeaponLevel(state, type) {
    var weapons = (state.player && state.player.weapons) || {};
    return Math.max(0, Math.floor(Number(weapons[type]) || 0));
  }

  function getHighestWeaponLevel(state) {
    var level = 0;
    for (var i = 0; i < WEAPON_TYPES.length; i++) {
      level = Math.max(level, getWeaponLevel(state, WEAPON_TYPES[i]));
    }
    return level;
  }

  function getWeaponTotalLevel(state) {
    var total = 0;
    for (var i = 0; i < WEAPON_TYPES.length; i++) total += getWeaponLevel(state, WEAPON_TYPES[i]);
    return total;
  }

  function getAvailableWeaponTypes(state) {
    var types = [];
    for (var i = 0; i < WEAPON_TYPES.length; i++) {
      if (getWeaponLevel(state, WEAPON_TYPES[i]) < MAX_WEAPON_LEVEL) types.push(WEAPON_TYPES[i]);
    }
    return types;
  }

  function pickLowestWeaponPickup(state, available) {
    available = available || getAvailableWeaponTypes(state);
    if (!available.length) return null;
    var minLevel = MAX_WEAPON_LEVEL;
    var lowest = [];
    for (var i = 0; i < available.length; i++) {
      var type = available[i];
      var level = getWeaponLevel(state, type);
      if (level < minLevel) {
        minLevel = level;
        lowest = [type];
      } else if (level === minLevel) {
        lowest.push(type);
      }
    }
    return lowest[Math.floor(Math.random() * lowest.length)] || available[0];
  }

  function chooseWeaponPickup(state, source) {
    var available = getAvailableWeaponTypes(state);
    if (!available.length) return "";
    return pickLowestWeaponPickup(state, available) || available[0];
  }

  function weightedPick(items) {
    var total = 0;
    for (var i = 0; i < items.length; i++) total += Math.max(0, items[i].weight || 0);
    if (total <= 0) return items.length ? items[0].type : "";
    var roll = Math.random() * total;
    for (var j = 0; j < items.length; j++) {
      roll -= Math.max(0, items[j].weight || 0);
      if (roll <= 0) return items[j].type;
    }
    return items[items.length - 1].type;
  }

  function canSpawnSupply(state, forceReason) {
    var active = countActivePowerups(state);
    var hardCap = getPowerupHardCap(state);
    if (active >= hardCap) return false;
    if (forceReason === "rescue" || forceReason === "bossPrep") return true;
    return active < getPowerupSoftCap(state);
  }

  function countActivePowerups(state) {
    var powerups = state.powerups || [];
    var count = 0;
    for (var i = 0; i < powerups.length; i++) {
      if (!powerups[i].dead && powerups[i].x > -20 && powerups[i].x < 1040) count += 1;
    }
    return count;
  }

  function getPowerupSoftCap(state) {
    return (state.elapsed || 0) < 60 ? 3 : 4;
  }

  function getPowerupHardCap(state) {
    return (state.elapsed || 0) < 60 ? 4 : 5;
  }

  function choosePowerupType(state, director, source) {
    var hpRatio = getHpRatio(state);
    var elapsed = state.elapsed || 0;
    var totalLevel = getWeaponTotalLevel(state);
    var weaponsMaxed = allWeaponsMaxed(state);

    if (source === "rescue") return (hpRatio < 0.3 && (director.lifeSpawned || 0) < 1) ? "life" : "";
    if (source === "weaponNudge") return chooseWeaponPickup(state, source);
    if (source === "bossPrep") {
      var bossPick = weightedPick([
        { type: "weapon", weight: weaponsMaxed ? 0 : (totalLevel < MAX_WEAPON_LEVEL * WEAPON_TYPES.length ? 90 : 0) },
        { type: "life", weight: hpRatio < 0.3 && (director.lifeSpawned || 0) < 1 ? 12 : 0 }
      ]);
      return bossPick === "weapon" ? chooseWeaponPickup(state, source) : bossPick;
    }

    var weaponWeight = 35;
    var lifeWeight = 0;
    if (elapsed < 20) {
      weaponWeight = 80;
    } else if (elapsed < 50) {
      weaponWeight = 65;
    } else if (elapsed < 60) {
      weaponWeight = 45;
    } else {
      weaponWeight = 35;
    }
    if (hpRatio < 0.3 && (director.lifeSpawned || 0) < 1) {
      weaponWeight = Math.min(weaponWeight, 10);
      lifeWeight = 45;
    }
    if (source === "kill") {
      weaponWeight *= 0.85;
      lifeWeight = hpRatio < 0.3 && (director.lifeSpawned || 0) < 1 ? Math.max(lifeWeight, 12) : 0;
    }

    if (weaponsMaxed) weaponWeight = 0;
    var pick = weightedPick([
      { type: "weapon", weight: weaponWeight },
      { type: "life", weight: lifeWeight }
    ]);
    return pick === "weapon" ? chooseWeaponPickup(state, source) : pick;
  }

  function getSafeSupplyY(state) {
    var field = getField(state);
    var playerY = state.player ? state.player.y : field.height / 2;
    var margin = scaleY(state, 72);
    var y = Math.max(margin, Math.min(field.height - margin, playerY + (Math.random() - 0.5) * scaleY(state, 190)));
    var enemies = state.enemies || [];
    for (var i = 0; i < enemies.length; i++) {
      if (Math.abs(enemies[i].y - y) < 42 && enemies[i].x > 520) y += y < 270 ? 68 : -68;
    }
    return Math.max(72, Math.min(468, y));
  }

  function createPowerup(state, type, x, y, speed) {
    state.powerups.push({
      x: x,
      y: y,
      radius: 15,
      speed: speed || 112,
      wobble: Math.random() * Math.PI * 2,
      type: type
    });
    state.powerupsSpawned = (state.powerupsSpawned || 0) + 1;
  }

  /**
   * 更新金币
   */
  function updateCoins(state, dt, bountyLevel) {
    for (var i = 0; i < state.coins.length; i++) {
      var coin = state.coins[i];
      var dx = state.player.x - coin.x;
      var dy = state.player.y - coin.y;
      var d = Math.sqrt(dx * dx + dy * dy) || 1;
      var pullRadius = 120 + (bountyLevel || 0) * 18;
      if (d < pullRadius) {
        coin.x += (dx / d) * (260 + (bountyLevel || 0) * 18) * dt;
        coin.y += (dy / d) * (260 + (bountyLevel || 0) * 18) * dt;
      } else {
        coin.x -= coin.speed * dt;
        coin.y += Math.sin(coin.wobble + state.elapsed * 3) * 18 * dt;
      }
    }
    state.coins = state.coins.filter(function (coin) { return coin.x > -30; });
  }

  /**
   * 更新道具
   */
  function updatePowerups(state, dt) {
    for (var i = 0; i < state.powerups.length; i++) {
      var powerup = state.powerups[i];
      powerup.wobble += dt * 3;
      powerup.x -= powerup.speed * dt;
      powerup.y += Math.sin(powerup.wobble) * 22 * dt;
    }
    state.powerups = state.powerups.filter(function (p) { return p.x > -30; });
  }

  /**
   * 更新粒子
   */
  function updateParticles(state, dt) {
    for (var i = 0; i < state.particles.length; i++) {
      var particle = state.particles[i];
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.life -= dt;
      particle.radius *= 0.985;
    }
    state.particles = state.particles.filter(function (p) { return p.life > 0; });
  }

  /**
   * 更新冲击波
   */
  function updateShockwaves(state, dt) {
    for (var i = 0; i < state.shockwaves.length; i++) {
      var wave = state.shockwaves[i];
      wave.radius += wave.speed * dt;
      wave.life -= dt;
    }
    state.shockwaves = state.shockwaves.filter(function (w) { return w.life > 0; });
  }

  /**
   * 更新浮动文字
   */
  function updateNotices(state, dt) {
    for (var i = 0; i < state.notices.length; i++) {
      var notice = state.notices[i];
      notice.y -= 18 * dt;
      notice.life -= dt;
    }
    state.notices = state.notices.filter(function (n) { return n.life > 0; });
  }

  /**
   * 敌机爆炸掉落金币
   */
  function dropCoins(state, x, y, value, bountyLevel) {
    var total = Math.ceil(value * (1 + (bountyLevel || 0) * 0.12));
    var count = Math.max(1, Math.min(8, Math.ceil(total / 8)));
    for (var i = 0; i < count; i++) {
      state.coins.push({
        x: x, y: y, radius: 8,
        value: Math.ceil(total / count),
        speed: 72 + Math.random() * 48,
        wobble: Math.random() * Math.PI * 2
      });
    }
  }

  /**
   * 累计关卡金币
   */
  function gainCoins(state, amount) {
    state.levelCoins = (state.levelCoins || 0) + amount;
  }

  /**
   * 可能掉落道具
   */
  function maybeDropPowerup(state, enemy) {
    var director = ensureSupplyDirector(state);
    if (!canSpawnSupply(state, "")) return;
    var elapsed = state.elapsed || 0;
    var chance = enemy.heavy ? 0.12 : 0.025;
    if (elapsed < 35 && getHighestWeaponLevel(state) < 3) chance += enemy.heavy ? 0.03 : 0.012;
    if (elapsed > 60) chance *= 0.9;
    if (getWeaponTotalLevel(state) >= 12) chance *= 0.65;
    if (Math.random() > chance) return;
    var type = choosePowerupType(state, director, "kill");
    if (!type) return;
    createPowerup(state, type, enemy.x, enemy.y, 110);
    if (type === "life") director.lifeSpawned = (director.lifeSpawned || 0) + 1;
    director.lastDropAt = state.elapsed || 0;
    if (isWeaponType(type)) director.lastWeaponAt = state.elapsed || 0;
  }

  /**
   * 应用道具效果
   */
  function applyPowerup(state, loadout, type) {
    state.hudDirty = true;
    var MAX_HP = loadout && loadout.finalStats ? (loadout.finalStats.maxHp || ((loadout.finalStats.maxLives || 3) * 100)) : 100;
    if (type === "life") {
      state.player.maxHp = Math.max(state.player.maxHp || MAX_HP, MAX_HP);
      state.player.hp = Math.min(state.player.maxHp, (state.player.hp || state.player.maxHp) + Math.ceil(state.player.maxHp * 0.25));
      state.player.lives = Math.max(1, Math.ceil(state.player.hp / 100));
      addNotice(state, "\u751f\u547d +1", (POWERUPS.life || {}).color || "#ff6b6b");
      playSfx("pickup");
      return;
    }
    if (type === "shield") {
      state.player.shield = 15;
      addNotice(state, "\u62a4\u76fe\u542f\u52a8", (POWERUPS.shield || {}).color || "#9bffcb");
      playSfx("pickup");
      return;
    }
    var before = state.player.weapons[type] || 0;
    state.player.weapons[type] = Math.min(MAX_WEAPON_LEVEL, (state.player.weapons[type] || 0) + 1);
    if (state.supplyDirector) state.supplyDirector.collected += 1;
    addNotice(state,
      "武器升级 · " + ((POWERUPS[type] || {}).name || type) + " Lv." + state.player.weapons[type] + (before < MAX_WEAPON_LEVEL && state.player.weapons[type] >= MAX_WEAPON_LEVEL ? " MAX" : ""),
      (POWERUPS[type] || {}).color || "#ffffff",
      2.2
    );
    playSfx("pickup");
  }

  /**
   * 屏幕上浮动文字
   */
  function addNotice(state, text, color, life) {
    var field = getField(state);
    state.notices.push({
      text: text, color: color,
      x: field.width / 2, y: field.noticeY, life: life || 1.5
    });
  }

  function getField(state) {
    return scope.battleGeometry.getField(state);
  }

  function scaleY(state, value) {
    return scope.battleGeometry.scaleY(state, value);
  }

  function playSfx(id) {
    if (scope.audioSystem && scope.audioSystem.playSfx) scope.audioSystem.playSfx(id);
  }

  var api = {
    spawnPowerups: spawnPowerups,
    updateCoins: updateCoins,
    updatePowerups: updatePowerups,
    updateParticles: updateParticles,
    updateShockwaves: updateShockwaves,
    updateNotices: updateNotices,
    dropCoins: dropCoins,
    gainCoins: gainCoins,
    maybeDropPowerup: maybeDropPowerup,
    applyPowerup: applyPowerup,
    addNotice: addNotice
  };

  scope.dropSystem = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
