(function registerCollisionSystem(root) {
  var scope = root.RXGame || (root.RXGame = {});
  var events = scope.events;

  var levelsConfig = scope.levels || {};
  var POWERUPS = levelsConfig.POWERUPS || {};
  var COLLISION_CELL_SIZE = 96;

  function getCollisionScratch(state) {
    if (!state._collisionScratch) {
      state._collisionScratch = {
        player: { buckets: [], used: [], candidates: [] },
        enemy: { buckets: [], used: [], candidates: [] }
      };
    }
    return state._collisionScratch;
  }

  function prepareSpatialGrid(state, list, name, predicate) {
    var field = scope.battleGeometry && scope.battleGeometry.getField
      ? scope.battleGeometry.getField(state)
      : { width: 1280, height: 720, cullPadding: 160 };
    var padding = Math.max(96, Number(field.cullPadding) || 160);
    var cols = Math.max(1, Math.ceil((Math.max(1, Number(field.width) || 1280) + padding * 2) / COLLISION_CELL_SIZE));
    var rows = Math.max(1, Math.ceil((Math.max(1, Number(field.height) || 720) + padding * 2) / COLLISION_CELL_SIZE));
    var grid = getCollisionScratch(state)[name];
    if (grid.cols !== cols || grid.rows !== rows || grid.padding !== padding) {
      grid.buckets = new Array(cols * rows);
      grid.used = [];
      grid.cols = cols;
      grid.rows = rows;
      grid.padding = padding;
    } else {
      for (var clearIndex = 0; clearIndex < grid.used.length; clearIndex += 1) {
        grid.buckets[grid.used[clearIndex]].length = 0;
      }
      grid.used.length = 0;
    }
    grid.candidates.length = 0;
    grid.maxRadius = 0;
    for (var i = 0; i < list.length; i += 1) {
      var item = list[i];
      if (!item || item.dead || (predicate && !predicate(item))) continue;
      var cx = clampGridCell(Math.floor(((Number(item.x) || 0) + padding) / COLLISION_CELL_SIZE), cols);
      var cy = clampGridCell(Math.floor(((Number(item.y) || 0) + padding) / COLLISION_CELL_SIZE), rows);
      var bucketIndex = cy * cols + cx;
      var bucket = grid.buckets[bucketIndex];
      if (!bucket) {
        bucket = grid.buckets[bucketIndex] = [];
      }
      if (!bucket.length) grid.used.push(bucketIndex);
      bucket.push(item);
      grid.maxRadius = Math.max(grid.maxRadius, Math.max(0, Number(item.radius) || 0));
    }
    return grid;
  }

  function collectNearby(grid, x, y, radiusX, radiusY) {
    var result = grid.candidates;
    result.length = 0;
    var pad = grid.padding;
    var minX = clampGridCell(Math.floor(((Number(x) || 0) - radiusX + pad) / COLLISION_CELL_SIZE), grid.cols);
    var maxX = clampGridCell(Math.floor(((Number(x) || 0) + radiusX + pad) / COLLISION_CELL_SIZE), grid.cols);
    var minY = clampGridCell(Math.floor(((Number(y) || 0) - radiusY + pad) / COLLISION_CELL_SIZE), grid.rows);
    var maxY = clampGridCell(Math.floor(((Number(y) || 0) + radiusY + pad) / COLLISION_CELL_SIZE), grid.rows);
    for (var cy = minY; cy <= maxY; cy += 1) {
      for (var cx = minX; cx <= maxX; cx += 1) {
        var bucket = grid.buckets[cy * grid.cols + cx];
        if (!bucket || !bucket.length) continue;
        for (var i = 0; i < bucket.length; i += 1) result.push(bucket[i]);
      }
    }
    return result;
  }

  function clampGridCell(value, count) {
    return Math.max(0, Math.min(count - 1, value));
  }

  function compactAlive(list, mode) {
    if (!Array.isArray(list)) return [];
    var write = 0;
    for (var read = 0; read < list.length; read += 1) {
      var item = list[read];
      var keep = mode === "ally"
        ? Boolean(item && !item.dead && Number(item.hp) > 0)
        : Boolean(item && !item.dead);
      if (keep) list[write++] = item;
    }
    list.length = write;
    return list;
  }

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
    var playerGrid = prepareSpatialGrid(state, state.bullets || [], "player");
    checkProjectileCollisions(state);

    // 玩家子弹 vs 敌军
    for (var i = 0; i < state.enemies.length; i++) {
      hitTargetWithBullets(state, state.enemies[i], loadout || profile, playerGrid);
      // 玩家与敌军碰撞
      if (!state.enemies[i].dead &&
        distance(state.enemies[i], state.player) < state.enemies[i].radius + state.player.radius * 0.75) {
        resolveBodyCollision(state, state.enemies[i], false);
      }
    }

    // BOSS 碰撞
    if (state.boss) {
      hitTargetWithBullets(state, state.boss, loadout || profile, playerGrid);
      if (!state.boss.dead &&
        distance(state.boss, state.player) < state.boss.radius + state.player.radius * 0.75) {
        resolveBodyCollision(state, state.boss, true);
      }
    }

    // 敌方子弹 vs 玩家
    for (var j = 0; j < state.enemyBullets.length; j++) {
      var bullet = state.enemyBullets[j];
      if (bullet.dead) continue;
      if (hitAllyWithEnemyBullet(state, bullet)) continue;
      if (state.player.invincible > 0) continue;
      if (distance(bullet, state.player) < bullet.radius + state.player.radius * 0.72) {
        bullet.dead = true;
        var absorbed = damagePlayer(state, profile, bullet.damage || 10, { type: "bullet", x: bullet.x, y: bullet.y });
        if (!absorbed) {
          burst(state, state.player.x, state.player.y, "#ff5555", 22);
          shockwave(state, state.player.x, state.player.y, "#ff5555", 0.35, 150);
        }
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
      if (scope.bus && typeof scope.bus.emit === "function") {
        scope.bus.emit(events.ITEM_COLLECTED, { type: powerup.type, x: powerup.x, y: powerup.y });
      }
      var pwColor = (POWERUPS && POWERUPS[powerup.type]) ? POWERUPS[powerup.type].color : "#ffffff";
      burst(state, powerup.x, powerup.y, pwColor, 18);
    }

    // 回收死亡对象
    compactAlive(state.bullets);
    compactAlive(state.enemyBullets);
    compactAlive(state.enemies);
    compactAlive(state.coins);
    compactAlive(state.powerups);
    if (Array.isArray(state.allies)) compactAlive(state.allies, "ally");
  }

  function hitAllyWithEnemyBullet(state, bullet) {
    var allies = Array.isArray(state.allies) ? state.allies : [];
    for (var i = 0; i < allies.length; i += 1) {
      var ally = allies[i];
      if (!ally || ally.dead || distance(bullet, ally) >= (Number(bullet.radius) || 4) + (Number(ally.radius) || 16)) continue;
      bullet.dead = true;
      damageAlly(state, ally, bullet.damage || 10, bullet.x, bullet.y);
      return true;
    }
    return false;
  }

  function damageAlly(state, ally, damage, x, y) {
    ally.hp = Math.max(0, Number(ally.hp) - Math.max(1, Number(damage) || 1));
    burst(state, Number(x) || ally.x, Number(y) || ally.y, ally.hp > 0 ? "#63ffb4" : "#82f7ff", ally.hp > 0 ? 8 : 24);
    if (ally.hp <= 0) {
      ally.dead = true;
      shockwave(state, ally.x, ally.y, "#82f7ff", 0.36, 130);
    }
  }

  /** Player bullets vs enemy bullets. */
  function checkProjectileCollisions(state) {
    var playerBullets = state && state.bullets ? state.bullets : [];
    var enemyBullets = state && state.enemyBullets ? state.enemyBullets : [];
    if (!playerBullets.length || !enemyBullets.length) return;

    var enemyGrid = prepareSpatialGrid(state, enemyBullets, "enemy", canCancelEnemyBullet);
    if (!enemyGrid.used.length) return;

    for (var i = 0; i < playerBullets.length; i++) {
      var playerBullet = playerBullets[i];
      if (!playerBullet || playerBullet.dead) continue;
      var searchRadius = Math.max(0, Number(playerBullet.radius) || 0) + enemyGrid.maxRadius;
      var cancellableBullets = collectNearby(enemyGrid, playerBullet.x, playerBullet.y, searchRadius, searchRadius);
      for (var j = 0; j < cancellableBullets.length; j++) {
        var enemyBullet = cancellableBullets[j];
        if (!enemyBullet || enemyBullet.dead) continue;
        if (!circlesOverlap(playerBullet, enemyBullet)) continue;

        var isRoadblock = isRoadblockBullet(enemyBullet);
        var cancelRate = getProjectileCancelRate(playerBullet, enemyBullet);
        if (!isRoadblock && (cancelRate <= 0 || Math.random() >= cancelRate)) continue;

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
    return isRoadblockBullet(bullet)
      || bullet.sourceEnemyClass === "normal"
      || bullet.sourceEnemyType === "elite";
  }

  function getProjectileCancelRate(playerBullet, enemyBullet) {
    if (isRoadblockBullet(enemyBullet)) return 1;
    if (enemyBullet && enemyBullet.sourceEnemyType === "elite") {
      return Math.max(0, Math.min(1, Number(playerBullet && playerBullet.eliteBulletCancelRate) || 0));
    }
    if (enemyBullet && enemyBullet.sourceEnemyClass === "normal") {
      if (playerBullet && playerBullet.normalBulletCancelRate != null) {
        return Math.max(0, Math.min(1, Number(playerBullet.normalBulletCancelRate) || 0));
      }
      return 0.1;
    }
    return 0;
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
      burst(state, enemy.x, enemy.y, enemy.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 24);
      shockwave(state, enemy.x, enemy.y, enemy.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 0.32, enemy.maxHp > 5 ? 190 : 145);
    }
    compactAlive(enemies);
    return result;
  }

  function isHeavyEnemy(enemy) {
    return enemy.heavy === true || enemy.enemyType === "elite" || enemy.enemyType === "core" || enemy.enemyType === "guard";
  }

  /** Player bullets vs an enemy target. */
  function hitTargetWithBullets(state, target, rewardSource, playerGrid) {
    if (target && target.canTakeDamage === false) return;
    var bullets = state.bullets;
    if (playerGrid) {
      var targetRadiusX = Math.max(Number(target.hitRadiusX) || 0, Number(target.radius) || 0) + playerGrid.maxRadius;
      var targetRadiusY = Math.max(Number(target.hitRadiusY) || 0, Number(target.radius) || 0) + playerGrid.maxRadius;
      bullets = collectNearby(playerGrid, target.x, target.y, targetRadiusX, targetRadiusY);
    }
    for (var i = 0; i < bullets.length; i++) {
      var bullet = bullets[i];
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
      if (target === state.boss || (target.semanticHitCount = (target.semanticHitCount || 0) + 1) >= 3) {
        target.semanticHitCount = 0;
        if (scope.bus && typeof scope.bus.emit === "function") {
          scope.bus.emit(events.ENEMY_HIT, {
            damage: bullet.damage,
            isBoss: target === state.boss,
            targetId: target.id
          });
        }
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
        burst(state, target.x, target.y, target.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 24);
        shockwave(state, target.x, target.y, target.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 0.32, target.maxHp > 5 ? 190 : 145);
      } else if (target.hp <= 0 && target === state.boss && !target.dead) {
        target.dead = true;
        recordKill(state, target, rewardSource);
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
        burst(state, enemy.x, enemy.y, "#ff9f43", 20);
        shockwave(state, enemy.x, enemy.y, "#ff9f43", 0.28, 145);
      }
    }
    if (state.boss && !(source.splashExcludesDirect && hasBulletHitTarget(source, state.boss.id)) && targetIntersectsCircle(state.boss, { x: source.x, y: source.y, radius: radius })) {
      state.boss.hp -= damage * getBulletDamageTakenMultiplier(state, state.boss, source);
      if (state.boss.hp <= 0 && !state.boss.dead) {
        state.boss.dead = true;
        recordKill(state, state.boss, null);
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
      if (!(source && source.suppressHitFx)) {
        burst(state, target.x, target.y, source.color || "#b86cff", 8);
      }
      if (target.hp > 0) continue;
      target.dead = true;
      result.kills += 1;
      recordKill(state, target, rewardSource);
      if (target !== state.boss) maybeDropPowerup(state, target);
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
  function tryAbsorbPlayerHit(state, source) {
    if (!state || !state.player) return false;
    var decoy = Number(state.player.decoyShieldRemaining) > 0;
    var phase = Number(state.player.phaseShieldRemaining) > 0;
    if (!decoy && !phase) return false;
    var shieldType = decoy ? "decoy" : "phase";
    state.skillEffects = state.skillEffects || [];
    state.skillEffects.push({
      type: "player-hit-absorbed",
      visualId: decoy ? "vfx-decoy-absorb" : "vfx-phase-absorb",
      x: Number(source && source.x) || state.player.x,
      y: Number(source && source.y) || state.player.y,
      life: 0.32,
      duration: 0.32,
      shieldType: shieldType
    });
    if (scope.bus && typeof scope.bus.emit === "function" && events.PLAYER_HIT_ABSORBED) {
      scope.bus.emit(events.PLAYER_HIT_ABSORBED, { shieldType: shieldType, source: source && source.type || "unknown" });
    }
    return true;
  }

  function damagePlayer(state, profile, damage, source) {
    if (tryAbsorbPlayerHit(state, source)) return true;
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
    var hpBeforeHit = state.player.hp;
    state.player.hp = Math.max(0, state.player.hp - hitDamage);
    state.damageTakenAmount = (Number(state.damageTakenAmount) || 0) + Math.max(0, hpBeforeHit - state.player.hp);
    state.player.lives = Math.max(0, Math.ceil(state.player.hp / 100));
    state.damageTaken += 1;
    state.player.invincible = 1.25;
    if (scope.bus && typeof scope.bus.emit === "function") {
      scope.bus.emit(events.PLAYER_DAMAGED, {
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        damage: Math.max(0, hpBeforeHit - state.player.hp),
        lives: state.player.lives
      });
      if (state.player.hp <= 0) {
        scope.bus.emit(events.PLAYER_DIED, { lives: state.player.lives });
      }
    }
    return false;
  }

  function damagePlayerByEnemyCollision(state, enemyCurrentHp) {
    if (tryAbsorbPlayerHit(state, { type: "collision", x: state.player.x, y: state.player.y })) return true;
    var collisionDamage = Math.max(0, Number(enemyCurrentHp) || 0);
    var fallbackHp = (state.player.lives != null ? state.player.lives : 1) * 100;
    if (state.player.maxHp == null) state.player.maxHp = Math.max(100, fallbackHp);
    if (state.player.hp == null) state.player.hp = Math.min(state.player.maxHp, fallbackHp);
    var hpBeforeCollision = state.player.hp;
    state.player.hp = Math.max(0, state.player.hp - collisionDamage);
    state.damageTakenAmount = (Number(state.damageTakenAmount) || 0) + Math.max(0, hpBeforeCollision - state.player.hp);
    state.player.lives = Math.max(0, Math.ceil(state.player.hp / 100));
    state.damageTaken = (Number(state.damageTaken) || 0) + 1;
    state.player.invincible = 1.25;
    if (scope.bus && typeof scope.bus.emit === "function") {
      scope.bus.emit(events.PLAYER_DAMAGED, {
        hp: state.player.hp,
        maxHp: state.player.maxHp,
        damage: Math.max(0, hpBeforeCollision - state.player.hp),
        lives: state.player.lives,
        source: "collision"
      });
      if (state.player.hp <= 0) {
        scope.bus.emit(events.PLAYER_DIED, { lives: state.player.lives, source: "collision" });
      }
    }
    return false;
  }

  function resolveBodyCollision(state, target, isBoss) {
    var playerCurrentHp = getPlayerCurrentHp(state);
    var targetCurrentHp = Math.max(0, Number(target && target.hp) || 0);
    target.hp = Math.max(0, targetCurrentHp - playerCurrentHp);
    target.dead = target.hp <= 0;
    damagePlayerByEnemyCollision(state, targetCurrentHp);
    burst(state, target.x, target.y, isBoss ? "#ff6b8a" : "#ff5555", isBoss ? 34 : 26);
    shockwave(state, target.x, target.y, isBoss ? "#ff6b8a" : "#ff5555", isBoss ? 0.5 : 0.42, isBoss ? 260 : 180);
  }

  function getPlayerCurrentHp(state) {
    var fallbackHp = (state.player.lives != null ? state.player.lives : 1) * 100;
    if (state.player.maxHp == null) state.player.maxHp = Math.max(100, fallbackHp);
    if (state.player.hp == null) state.player.hp = Math.min(state.player.maxHp, fallbackHp);
    return Math.max(0, Number(state.player.hp) || 0);
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
    if (scope.battleState && scope.battleState.refreshFixedWeaponSkill) {
      scope.battleState.refreshFixedWeaponSkill(state.player, type);
    }
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

    // ── Room boundary (Rule ③): broadcast, do NOT call anyone directly ──
    // Combat announces "an enemy died" on the shared event bus. Any room
    // (audio, UI, experience, achievements, loot…) may listen WITHOUT combat
    // knowing about it. This is the only kill broadcast point in the game.
    if (scope.bus && typeof scope.bus.emit === "function") {
      scope.bus.emit(events.ENEMY_DIED, {
        type: type,
        x: target ? target.x : undefined,
        y: target ? target.y : undefined,
        isBoss: type === "boss",
        baseGold: baseGold
      });
    }
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

  function burst() {
    var fx = scope.fxSystem;
    if (fx && typeof fx.burst === "function") return fx.burst.apply(fx, arguments);
  }

  function shockwave() {
    var fx = scope.fxSystem;
    if (fx && typeof fx.shockwave === "function") return fx.shockwave.apply(fx, arguments);
  }

  var api = {
    checkCollisions: checkCollisions,
    hitTargetWithBullets: hitTargetWithBullets,
    getProjectileCancelRate: getProjectileCancelRate,
    getBulletDamageTakenMultiplier: getBulletDamageTakenMultiplier,
    splashDamage: splashDamage,
    damageArea: damageArea,
    tryAbsorbPlayerHit: tryAbsorbPlayerHit,
    damagePlayer: damagePlayer,
    damagePlayerByEnemyCollision: damagePlayerByEnemyCollision,
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
