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
    checkProjectileCollisions(state);

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

  /** Player bullets vs enemy bullets. */
  function checkProjectileCollisions(state) {
    var playerBullets = state && state.bullets ? state.bullets : [];
    var enemyBullets = state && state.enemyBullets ? state.enemyBullets : [];
    if (!playerBullets.length || !enemyBullets.length) return;

    // Enemy bullets are capped at a small number. Build a compact list once,
    // skip elite/BOSS bullets entirely, then use cheap axis and squared checks.
    var cancellableBullets = [];
    for (var enemyIndex = 0; enemyIndex < enemyBullets.length; enemyIndex++) {
      var indexedEnemyBullet = enemyBullets[enemyIndex];
      if (!indexedEnemyBullet || indexedEnemyBullet.dead || !canCancelEnemyBullet(indexedEnemyBullet)) continue;
      cancellableBullets.push(indexedEnemyBullet);
    }
    if (!cancellableBullets.length) return;

    for (var i = 0; i < playerBullets.length; i++) {
      var playerBullet = playerBullets[i];
      if (!playerBullet || playerBullet.dead) continue;
      for (var j = 0; j < cancellableBullets.length; j++) {
        var enemyBullet = cancellableBullets[j];
        if (!enemyBullet || enemyBullet.dead) continue;
        if (!circlesOverlap(playerBullet, enemyBullet)) continue;

        var isRoadblock = isRoadblockBullet(enemyBullet);
        if (!isRoadblock && Math.random() >= 0.1) continue;

        playerBullet.dead = true;
        enemyBullet.dead = true;
        burst(
          state,
          (playerBullet.x + enemyBullet.x) / 2,
          (playerBullet.y + enemyBullet.y) / 2,
          isRoadblock ? "#ffcf70" : "#9cf7ff",
          7
        );
        break;
      }
    }
  }

  function isRoadblockBullet(bullet) {
    return ((bullet && bullet.patternSource) || "").indexOf("slow_wall") >= 0;
  }

  function canCancelEnemyBullet(bullet) {
    return isRoadblockBullet(bullet) || bullet.sourceEnemyClass === "normal";
  }

  function circlesOverlap(a, b) {
    var dx = a.x - b.x;
    var radius = (Number(a.radius) || 0) + (Number(b.radius) || 0);
    if (dx <= -radius || dx >= radius) return false;
    var dy = a.y - b.y;
    if (dy <= -radius || dy >= radius) return false;
    return dx * dx + dy * dy < radius * radius;
  }

  function clearForDecisiveCommand(state, rewardSource) {
    var result = { enemyBulletsCleared: 0, normalEnemiesCleared: 0 };
    if (!state) return result;

    var enemyBullets = state.enemyBullets || [];
    for (var i = 0; i < enemyBullets.length; i++) {
      if (!enemyBullets[i].dead) result.enemyBulletsCleared += 1;
      enemyBullets[i].dead = true;
    }
    state.enemyBullets = [];

    var enemies = state.enemies || [];
    for (var j = 0; j < enemies.length; j++) {
      var enemy = enemies[j];
      if (!enemy || enemy.dead || isHeavyEnemy(enemy)) continue;
      enemy.dead = true;
      result.normalEnemiesCleared += 1;
      recordKill(state, enemy, rewardSource);
      maybeDropPowerup(state, enemy);
      queueSfx(enemy.maxHp > 5 ? "explosionHeavy" : "explosionSmall");
      burst(state, enemy.x, enemy.y, enemy.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 24);
      shockwave(state, enemy.x, enemy.y, enemy.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 0.32, enemy.maxHp > 5 ? 190 : 145);
    }
    state.enemies = enemies.filter(function (enemy) { return !enemy.dead; });
    return result;
  }

  function isHeavyEnemy(enemy) {
    return enemy.heavy === true || enemy.enemyType === "elite" || enemy.enemyType === "core" || enemy.enemyType === "guard";
  }

  /** Player bullets vs an enemy target. */
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
      if (!targetIntersectsCircle(target, bullet)) continue;

      // 标记命中
      if (typeof hitIds.add === "function") {
        hitIds.add(target.id);
      } else if (Array.isArray(hitIds)) {
        hitIds.push(target.id);
      }

      target.hp -= bullet.damage * getBulletDamageTakenMultiplier(state, target, bullet);
      if (bullet.armorBreakRatio > 0 && bullet.armorBreakDuration > 0 &&
        (!bullet.armorBreakTargetId || bullet.armorBreakTargetId === target.id)) {
        target.armorBreakRatio = Math.max(Number(target.armorBreakRatio) || 0, bullet.armorBreakRatio);
        target.armorBreakUntil = Math.max(
          Number(target.armorBreakUntil) || 0,
          (Number(state.elapsed) || 0) + bullet.armorBreakDuration
        );
      }
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
      if (source.splashExcludesDirect && hasBulletHitTarget(source, enemy.id)) continue;
      enemy.hp -= damage * getBulletDamageTakenMultiplier(state, enemy, source);
      if (enemy.hp <= 0) {
        enemy.dead = true;
        recordKill(state, enemy, null);
        maybeDropPowerup(state, enemy);
        queueSfx(enemy.maxHp > 5 ? "explosionHeavy" : "explosionSmall");
        burst(state, enemy.x, enemy.y, "#ff9f43", 20);
        shockwave(state, enemy.x, enemy.y, "#ff9f43", 0.28, 145);
      }
    }
    if (state.boss && !(source.splashExcludesDirect && hasBulletHitTarget(source, state.boss.id)) && targetIntersectsCircle(state.boss, { x: source.x, y: source.y, radius: radius })) {
      state.boss.hp -= damage * getBulletDamageTakenMultiplier(state, state.boss, source);
      if (state.boss.hp <= 0 && !state.boss.dead) {
        state.boss.dead = true;
        recordKill(state, state.boss, null);
        queueSfx("bossExplosion");
        burst(state, state.boss.x, state.boss.y, "#ff6b8a", 34);
        shockwave(state, state.boss.x, state.boss.y, "#ff6b8a", 0.5, 260);
      }
    }
  }

  function hasBulletHitTarget(bullet, targetId) {
    var hitIds = bullet && bullet.hitIds;
    if (!hitIds || !targetId) return false;
    if (typeof hitIds.has === "function") return hitIds.has(targetId);
    return Array.isArray(hitIds) && hitIds.indexOf(targetId) >= 0;
  }

  /** Damage every valid target in a world-space circle. */
  function damageArea(state, source, radius, damage, rewardSource) {
    if (!state || !source) return { hits: 0, kills: 0 };
    var result = { hits: 0, kills: 0 };
    var targets = Array.isArray(state.enemies) ? state.enemies.slice() : [];
    if (state.boss) targets.push(state.boss);
    for (var i = 0; i < targets.length; i++) {
      var target = targets[i];
      if (!target || target.dead || target.canTakeDamage === false) continue;
      if (distance(source, target) > Math.max(0, Number(radius) || 0) + (Number(target.radius) || 0)) continue;
      target.hp -= Math.max(0, Number(damage) || 0) * getBulletDamageTakenMultiplier(state, target, source);
      result.hits += 1;
      burst(state, target.x, target.y, source.color || "#b86cff", 8);
      if (target.hp > 0) continue;
      target.dead = true;
      result.kills += 1;
      recordKill(state, target, rewardSource);
      if (target !== state.boss) maybeDropPowerup(state, target);
      queueSfx(target === state.boss ? "bossExplosion" : (target.maxHp > 5 ? "explosionHeavy" : "explosionSmall"));
      burst(state, target.x, target.y, target === state.boss ? "#ff6b8a" : "#b86cff", target === state.boss ? 34 : 20);
      shockwave(state, target.x, target.y, target === state.boss ? "#ff6b8a" : "#b86cff", target === state.boss ? 0.5 : 0.28, target === state.boss ? 260 : 145);
    }
    return result;
  }

  function targetIntersectsCircle(target, circle) {
    var hitRadiusX = Number(target && target.hitRadiusX);
    var hitRadiusY = Number(target && target.hitRadiusY);
    var circleRadius = Math.max(0, Number(circle && circle.radius) || 0);
    if (!(hitRadiusX > 0) || !(hitRadiusY > 0)) {
      return distance(target, circle) < (Number(target && target.radius) || 0) + circleRadius;
    }
    var dx = (circle.x - target.x) / (hitRadiusX + circleRadius);
    var dy = (circle.y - target.y) / (hitRadiusY + circleRadius);
    return dx * dx + dy * dy < 1;
  }

  function getBulletDamageTakenMultiplier(state, target, bullet) {
    var base = target && target.damageTakenMultiplier != null ? target.damageTakenMultiplier : 1;
    var pierce = Math.max(0, Number(bullet && bullet.armorPierceRatio) || 0);
    var breakActive = target && Number(target.armorBreakUntil) > (Number(state && state.elapsed) || 0);
    var armorBreak = breakActive ? Math.max(0, Number(target.armorBreakRatio) || 0) : 0;
    var damageReduction = target && target.damageReductionRate != null
      ? Math.max(0, Number(target.damageReductionRate) || 0)
      : Math.max(0, 1 - Number(base || 0));
    var multiplier = Math.max(0, 1 - Math.max(0, damageReduction - pierce - armorBreak));
    var original = target && target.originalDamageTakenMultiplier != null ? Number(target.originalDamageTakenMultiplier) : Number(base);
    if (Number(base) > original) multiplier = Math.max(multiplier, Number(base));
    if (Number(base) < original) multiplier = Math.min(multiplier, Math.max(0, Number(base)));
    return Math.max(0, multiplier);
  }

  /**
   * 玩家受伤
   */
  function damagePlayer(state, profile, damage) {
    if (state.player.shield > 0) {
      state.player.shield = 0;
      state.player.invincible = 0.8;
      addNotice(state, "\u62a4\u76fe\u62b5\u6d88\u4f24\u5bb3", "#9bffcb", 1.5);
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
      if (pw && pw.life) addNotice(state, "\u751f\u547d +1", pw.life.color, 1.5);
      return;
    }
    if (type === "shield") {
      state.player.shield = 15;
      if (pw && pw.shield) addNotice(state, "\u62a4\u76fe\u542f\u52a8", pw.shield.color, 1.5);
      return;
    }
    var maxWpn = (scope.balance && scope.balance.MAX_WEAPON_LEVEL) || 10;
    state.player.weapons[type] = Math.min(maxWpn, (state.player.weapons[type] || 0) + 1);
    if (pw && pw[type]) addNotice(state, pw[type].name + " Lv." + state.player.weapons[type], pw[type].color, 1.5);
  }

  function addNotice(state, text, color, life) {
    var field = scope.battleGeometry.getField(state);
    state.notices.push({ text: text, color: color, x: field.width / 2, y: field.noticeY, life: life });
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
    var types = ["spread", "laser", "missile", "life"];
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
    getBulletDamageTakenMultiplier: getBulletDamageTakenMultiplier,
    splashDamage: splashDamage,
    damageArea: damageArea,
    damagePlayer: damagePlayer,
    applyPowerup: applyPowerup,
    clearForDecisiveCommand: clearForDecisiveCommand,
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
