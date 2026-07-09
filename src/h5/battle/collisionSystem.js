(function registerCollisionSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var POWERUPS = levelsConfig.POWERUPS || {};

  /**
   * 计算两点距离
   */
  function distance(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 检测所有碰撞
   */
  function checkCollisions(state, profile, loadout) {
    // 玩家子弹 vs 敌军
    for (var i = 0; i < state.enemies.length; i++) {
      hitTargetWithBullets(state, state.enemies[i], loadout || profile);
      // 玩家与敌军碰撞
      if (!state.enemies[i].dead &&
        state.player.invincible <= 0 &&
        distance(state.enemies[i], state.player) < state.enemies[i].radius + state.player.radius * 0.75) {
        state.enemies[i].dead = true;
        damagePlayer(state, profile, state.enemies[i].attackDamage || 10);
        burst(state, state.enemies[i].x, state.enemies[i].y, "#ff5555", 26);
        shockwave(state, state.enemies[i].x, state.enemies[i].y, "#ff5555", 0.42, 180);
      }
    }

    // BOSS 碰撞
    if (state.boss) {
      hitTargetWithBullets(state, state.boss, loadout || profile);
    }

    // 敌方子弹 vs 玩家
    for (var j = 0; j < state.enemyBullets.length; j++) {
      var bullet = state.enemyBullets[j];
      if (bullet.dead || state.player.invincible > 0) continue;
      if (distance(bullet, state.player) < bullet.radius + state.player.radius * 0.72) {
        bullet.dead = true;
        damagePlayer(state, profile, bullet.damage || 10);
        burst(state, state.player.x, state.player.y, "#ff5555", 22);
        shockwave(state, state.player.x, state.player.y, "#ff5555", 0.35, 150);
      }
    }

    // 金币拾取
    for (var k = 0; k < state.coins.length; k++) {
      var coin = state.coins[k];
      if (coin.dead || distance(coin, state.player) >= coin.radius + state.player.radius) continue;
      coin.dead = true;
      burst(state, coin.x, coin.y, "#ffd166", 8);
    }

    // 道具拾取
    for (var m = 0; m < state.powerups.length; m++) {
      var powerup = state.powerups[m];
      if (powerup.dead || distance(powerup, state.player) >= powerup.radius + state.player.radius) continue;
      powerup.dead = true;
      state.powerupsCollected += 1;
      applyPowerup(state, profile, powerup.type);
      recordPowerupPickup(state, powerup.type);
      var pwColor = (POWERUPS && POWERUPS[powerup.type]) ? POWERUPS[powerup.type].color : "#ffffff";
      burst(state, powerup.x, powerup.y, pwColor, 18);
    }

    // 回收死亡对象
    state.bullets = state.bullets.filter(function (b) { return !b.dead; });
    state.enemyBullets = state.enemyBullets.filter(function (b) { return !b.dead; });
    state.enemies = state.enemies.filter(function (e) { return !e.dead; });
    state.coins = state.coins.filter(function (c) { return !c.dead; });
    state.powerups = state.powerups.filter(function (p) { return !p.dead; });
  }

  /**
   * 子弹命中目标
   */
  function hitTargetWithBullets(state, target, rewardSource) {
    if (target && target.canTakeDamage === false) return;
    for (var i = 0; i < state.bullets.length; i++) {
      var bullet = state.bullets[i];
      if (target.dead || bullet.dead) continue;

      // 检查 Set 或 Array 的 has
      var hitIds = bullet.hitIds;
      var alreadyHit = false;
      if (typeof hitIds.has === "function") {
        alreadyHit = hitIds.has(target.id);
      } else if (Array.isArray(hitIds)) {
        alreadyHit = hitIds.indexOf(target.id) >= 0;
      }

      if (alreadyHit) continue;
      if (distance(target, bullet) >= target.radius + bullet.radius) continue;

      // 标记命中
      if (typeof hitIds.add === "function") {
        hitIds.add(target.id);
      } else if (Array.isArray(hitIds)) {
        hitIds.push(target.id);
      }

      target.hp -= bullet.damage * getBulletDamageTakenMultiplier(target, bullet);
      if (target === state.boss || (target.audioHitCount = (target.audioHitCount || 0) + 1) >= 3) {
        target.audioHitCount = 0;
        queueSfx("enemyHit");
      }

      var explosive = bullet.type === "cluster" || bullet.type === "nova" || bullet.type === "darkCore" || bullet.splashRadius > 0;
      burst(state, bullet.x, bullet.y, bullet.color, explosive ? 16 : 6);

      if (explosive) {
        var r = bullet.splashRadius || (bullet.type === "darkCore" ? 112 : bullet.type === "nova" ? 76 : bullet.type === "cluster" ? 52 : 42);
        splashDamage(state, bullet, r, bullet.damage);
        bullet.dead = true;
      } else if (Math.max(0, Math.floor(Number(bullet.pierceRemaining) || 0)) > 0) {
        bullet.pierceRemaining = Math.max(0, Math.floor(Number(bullet.pierceRemaining) || 0)) - 1;
      } else {
        bullet.dead = true;
      }

      if (target.hp <= 0 && target !== state.boss) {
        target.dead = true;
        recordKill(state, target, rewardSource);
        maybeDropPowerup(state, target);
        queueSfx(target.maxHp > 5 ? "explosionHeavy" : "explosionSmall");
        burst(state, target.x, target.y, target.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 24);
        shockwave(state, target.x, target.y, target.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 0.32, target.maxHp > 5 ? 190 : 145);
      } else if (target.hp <= 0 && target === state.boss && !target.dead) {
        target.dead = true;
        recordKill(state, target, rewardSource);
        queueSfx("bossExplosion");
        burst(state, target.x, target.y, "#ff6b8a", 34);
        shockwave(state, target.x, target.y, "#ff6b8a", 0.5, 260);
      }
    }
  }

  /**
   * 溅射伤害
   */
  function splashDamage(state, source, radius, damage) {
    for (var i = 0; i < state.enemies.length; i++) {
      var enemy = state.enemies[i];
      if (enemy.canTakeDamage === false) continue;
      if (enemy.dead || distance(source, enemy) > radius + enemy.radius) continue;
      enemy.hp -= damage * getBulletDamageTakenMultiplier(enemy, source);
      if (enemy.hp <= 0) {
        enemy.dead = true;
        recordKill(state, enemy, null);
        maybeDropPowerup(state, enemy);
        queueSfx(enemy.maxHp > 5 ? "explosionHeavy" : "explosionSmall");
        burst(state, enemy.x, enemy.y, "#ff9f43", 20);
        shockwave(state, enemy.x, enemy.y, "#ff9f43", 0.28, 145);
      }
    }
    if (state.boss && distance(source, state.boss) < radius + state.boss.radius) {
      state.boss.hp -= damage * getBulletDamageTakenMultiplier(state.boss, source);
      if (state.boss.hp <= 0 && !state.boss.dead) {
        state.boss.dead = true;
        recordKill(state, state.boss, null);
        queueSfx("bossExplosion");
        burst(state, state.boss.x, state.boss.y, "#ff6b8a", 34);
        shockwave(state, state.boss.x, state.boss.y, "#ff6b8a", 0.5, 260);
      }
    }
  }

  function getBulletDamageTakenMultiplier(target, bullet) {
    var base = target && target.damageTakenMultiplier != null ? target.damageTakenMultiplier : 1;
    var pierce = Math.max(0, Math.min(1, Number(bullet && bullet.armorPierceRatio) || 0));
    return Math.max(base, base + (1 - base) * pierce);
  }

  /**
   * 玩家受伤
   */
  function damagePlayer(state, profile, damage) {
    if (state.player.shield > 0) {
      state.player.shield = 0;
      state.player.invincible = 0.8;
      state.notices.push({ text: "\u62a4\u76fe\u62b5\u6d88\u4f24\u5bb3", color: "#9bffcb", x: 960 / 2, y: 86, life: 1.5 });
      return;
    }
    var hitDamage = Math.max(1, Math.floor(Number(damage) || 10));
    var fallbackHp = (state.player.lives != null ? state.player.lives : 1) * 100;
    if (state.player.maxHp == null) state.player.maxHp = Math.max(100, fallbackHp);
    if (state.player.hp == null) state.player.hp = Math.min(state.player.maxHp, fallbackHp);
    state.player.hp = Math.max(0, state.player.hp - hitDamage);
    state.player.lives = Math.max(0, Math.ceil(state.player.hp / 100));
    state.damageTaken += 1;
    state.player.invincible = 1.25;
  }

  /**
   * 应用道具
   */
  function applyPowerup(state, profile, type) {
    if (scope.dropSystem && scope.dropSystem.applyPowerup) {
      scope.dropSystem.applyPowerup(state, profile, type);
      return;
    }
    var pw = POWERUPS;
    if (type === "life") {
      var maxHp = state.player.maxHp || ((state.player.lives || 1) * 100);
      state.player.hp = Math.min(maxHp, (state.player.hp || maxHp) + Math.ceil(maxHp * 0.25));
      state.player.lives = Math.max(1, Math.ceil(state.player.hp / 100));
      if (pw && pw.life) state.notices.push({ text: "\u751f\u547d +1", color: pw.life.color, x: 960 / 2, y: 86, life: 1.5 });
      return;
    }
    if (type === "shield") {
      state.player.shield = 15;
      if (pw && pw.shield) state.notices.push({ text: "\u62a4\u76fe\u542f\u52a8", color: pw.shield.color, x: 960 / 2, y: 86, life: 1.5 });
      return;
    }
    var maxWpn = (scope.balance && scope.balance.MAX_WEAPON_LEVEL) || 10;
    state.player.weapons[type] = Math.min(maxWpn, (state.player.weapons[type] || 0) + 1);
    if (pw && pw[type]) state.notices.push({
      text: pw[type].name + " Lv." + state.player.weapons[type],
      color: pw[type].color, x: 960 / 2, y: 86, life: 1.5
    });
  }

  /**
   * 可能掉落道具
   */
  function maybeDropPowerup(state, enemy) {
    if (scope.dropSystem && scope.dropSystem.maybeDropPowerup) {
      scope.dropSystem.maybeDropPowerup(state, enemy);
      return;
    }
    if (Math.random() > (enemy.heavy ? 0.13 : 0.04)) return;
    var types = ["spread", "laser", "missile", "shield", "life"];
    var type = types[Math.floor(Math.random() * types.length)];
    state.powerups.push({
      x: enemy.x, y: enemy.y, radius: 15, speed: 110,
      wobble: Math.random() * Math.PI * 2, type: type
    });
    state.powerupsSpawned += 1;
  }

  /**
   * 掉落金币
   */
  function dropCoins(state, profile, x, y, value) {
    var bountyBonus = profile && profile.upgrades ? profile.upgrades.bounty || 0 : 0;
    var total = Math.ceil(value * (1 + bountyBonus * 0.12));
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

  function recordKill(state, target, rewardSource) {
    state.killStats = state.killStats || { small: 0, elite: 0, boss: 0, total: 0, baseGold: 0 };
    var type = target.enemyType || (target === state.boss ? "boss" : (target.heavy ? "elite" : "small"));
    if (type !== "elite" && type !== "boss") type = "small";
    var bountyBonus = rewardSource && rewardSource.upgrades ? rewardSource.upgrades.bounty || 0 : 0;
    var fallbackValue = type === "boss"
      ? Math.max(200, Math.floor(((state.level && state.level.reward) || 200) * 0.8))
      : 0;
    var baseGold = Math.max(0, Math.ceil(((target.value || fallbackValue) || 0) * (1 + bountyBonus * 0.12)));
    state.killStats[type] = (state.killStats[type] || 0) + 1;
    state.killStats.total = (state.killStats.total || 0) + 1;
    state.killStats.baseGold = (state.killStats.baseGold || 0) + baseGold;
  }

  function recordPowerupPickup(state, type) {
    var config = POWERUPS && POWERUPS[type] ? POWERUPS[type] : null;
    state.itemFeed = Array.isArray(state.itemFeed) ? state.itemFeed : [];
    state.itemFeed.push({
      type: type,
      name: config && config.name ? config.name : type,
      at: state.elapsed || 0
    });
    if (state.itemFeed.length > 6) state.itemFeed = state.itemFeed.slice(-6);
  }

  // 辅助函数引用
  function playSfx(id) {
    if (scope.audioSystem && scope.audioSystem.playSfx) scope.audioSystem.playSfx(id);
  }

  function queueSfx(id, options) {
    if (scope.audioSystem && scope.audioSystem.queueSfx) {
      scope.audioSystem.queueSfx(id, options);
      return;
    }
    playSfx(id);
  }

  var burst = scope.fxSystem ? scope.fxSystem.burst : function () {};
  var shockwave = scope.fxSystem ? scope.fxSystem.shockwave : function () {};

  var api = {
    checkCollisions: checkCollisions,
    hitTargetWithBullets: hitTargetWithBullets,
    splashDamage: splashDamage,
    damagePlayer: damagePlayer,
    applyPowerup: applyPowerup,
    maybeDropPowerup: maybeDropPowerup,
    dropCoins: dropCoins,
    recordKill: recordKill,
    distance: distance
  };

  scope.collisionSystem = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
