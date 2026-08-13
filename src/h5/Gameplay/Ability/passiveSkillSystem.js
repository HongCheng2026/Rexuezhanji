(function registerPassiveSkillSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var fireHandlers = Object.create(null);

  function registerFireHandler(skillId, handler) {
    var id = String(skillId || "");
    if (!id || typeof handler !== "function") return false;
    fireHandlers[id] = handler;
    return true;
  }

  /**
   * 局外自动技能唯一运行入口。
   *
   * 这里只读取 battleState 在开战时复制出的 runtime.resolvedStats。
   * 禁止读取存档、局外等级表、state.player.weapons 或任意局内武器等级。
   */
  function fireRuntime(state, runtime, loadout) {
    if (!state || !state.player || !runtime || !runtime.resolvedStats) return false;
    var handler = fireHandlers[String(runtime.id || "")];
    return handler ? Boolean(handler(state, runtime, loadout)) : false;
  }

  function fireFrontSpread(state, runtime) {
    var weapon = scope.weaponSystem;
    if (!weapon || !weapon.emitSpreadVolley) return false;
    var stats = runtime.resolvedStats;
    var visual = getAutoVisual("auto-front-spread", "#b9ff70", "rgba(105,255,163,0.44)");
    var created = weapon.emitSpreadVolley(state, state.bullets, {
      x: state.player.x + 34,
      y: state.player.y,
      projectileCount: Math.max(1, Math.floor(Number(stats.projectileCount) || 1)),
      coverageRadians: Math.max(0, Number(stats.coverageAngle) || 0) * Math.PI / 180,
      damage: Math.max(1, Number(stats.damagePerProjectile) || 1),
      speed: Math.max(1, Number(stats.projectileSpeed) || 700),
      radius: 5,
      color: visual.primary,
      width: 20,
      height: 7,
      shape: "lance",
      trailColor: visual.trail,
      armorPierceRatio: Math.max(0, Number(stats.armorPierceRatio) || 0),
      bulletVisualId: "auto-front-spread",
      extensionWeaponId: runtime.id,
      normalBulletCancelRate: Math.max(0, Number(stats.normalBulletCancelRate) || 0),
      eliteBulletCancelRate: Math.max(0, Number(stats.eliteBulletCancelRate) || 0)
    });
    return created.length > 0;
  }

  function fireRailgun(state, runtime) {
    var weapon = scope.weaponSystem;
    if (!weapon || !weapon.emitLaserVolley) return false;
    var stats = runtime.resolvedStats;
    var count = Math.max(1, Math.floor(Number(stats.projectileCount) || 1));
    var offsets = [];
    for (var i = 0; i < count; i += 1) offsets.push((i - (count - 1) / 2) * 10);
    var visual = getAutoVisual("auto-railgun", "#e7fff4", "rgba(84,255,183,0.52)");
    var created = weapon.emitLaserVolley(state, state.bullets, {
      x: state.player.x + 42,
      y: state.player.y,
      angle: 0,
      offsets: offsets,
      damage: Math.max(1, Number(stats.damagePerProjectile) || 1),
      speed: Math.max(1, Number(stats.projectileSpeed) || 1400),
      radius: 7,
      color: visual.primary,
      width: 56,
      height: 8,
      shape: "beam",
      pierceRemaining: Math.max(0, Math.floor(Number(stats.pierceTargets) || 1) - 1),
      trailColor: visual.trail,
      armorPierceRatio: Math.max(0, Number(stats.armorPierceRatio) || 0),
      bulletVisualId: "auto-railgun",
      extensionWeaponId: runtime.id
    });
    return created.length > 0;
  }

  function fireShockwave(state, runtime, loadout) {
    var collision = scope.collisionSystem;
    if (!collision || !collision.damageArea) return false;
    var stats = runtime.resolvedStats;
    var rings = Math.max(1, Math.floor(Number(stats.rings) || 1));
    var radius = Math.max(1, Number(stats.radius) || 130);
    var damage = Math.max(1, Number(stats.damagePerRing || stats.damagePerProjectile) || 1);
    var clearRate = Math.max(0, Math.min(1, Number(stats.clearRate) || 0));
    var visual = getAutoVisual("auto-shockwave", "#63ffb4", "rgba(99,255,180,0.42)");
    for (var ring = 0; ring < rings; ring += 1) {
      collision.damageArea(state, { x: state.player.x, y: state.player.y, color: visual.primary }, radius, damage, loadout);
      clearEnemyBulletsInRadius(state, radius, clearRate);
    }
    var duration = Math.max(0.1, Number(stats.duration) || 0.55);
    state.skillEffects = state.skillEffects || [];
    state.skillEffects.push({
      type: "passive-shockwave",
      visualId: "auto-shockwave",
      presentationTier: "automatic",
      color: visual.primary,
      x: state.player.x,
      y: state.player.y,
      radius: radius,
      rings: rings,
      life: duration,
      duration: duration
    });
    return true;
  }

  function fireChainLightning(state, runtime, loadout) {
    var collision = scope.collisionSystem;
    if (!collision || !collision.damageArea) return false;
    var targets = getEnemies(state);
    if (!targets.length) return false;
    targets.sort(function byDistance(a, b) { return dist2(state.player, a) - dist2(state.player, b); });
    var stats = runtime.resolvedStats;
    var targetCap = Math.max(1, Math.floor(Number(stats.targetCount) || 1));
    var chainCount = Math.max(0, Math.floor(Number(stats.chainCount) || 0));
    var maxHits = Math.min(targetCap, chainCount + 1);
    var damage = Math.max(1, Number(stats.damagePerHit || stats.damagePerProjectile) || 1);
    var visual = getAutoVisual("auto-chain-lightning", "#76ffc2", "rgba(86,255,181,0.42)");
    var hit = typeof Set !== "undefined" ? new Set() : createSetFallback();
    var previous = { x: state.player.x, y: state.player.y };
    for (var index = 0; index < maxHits; index += 1) {
      var target = nearestUnhit(targets, previous, hit);
      if (!target) break;
      collision.damageArea(state, { x: target.x, y: target.y, color: visual.primary }, 26, damage, loadout);
      state.skillEffects = state.skillEffects || [];
      state.skillEffects.push({
        type: "passive-chain",
        visualId: "auto-chain-lightning",
        presentationTier: "automatic",
        color: visual.primary,
        x: previous.x,
        y: previous.y,
        x2: target.x,
        y2: target.y,
        life: 0.22,
        duration: 0.22
      });
      hit.add(target.id);
      previous = target;
    }
    return hit.size > 0;
  }

  function clearEnemyBulletsInRadius(state, radius, clearRate) {
    if (!(clearRate > 0) || !Array.isArray(state.enemyBullets)) return;
    var px = state.player.x;
    var py = state.player.y;
    for (var i = 0; i < state.enemyBullets.length; i += 1) {
      var bullet = state.enemyBullets[i];
      if (!bullet || bullet.dead || !canClearBullet(bullet)) continue;
      var dx = bullet.x - px;
      var dy = bullet.y - py;
      if (dx * dx + dy * dy > radius * radius) continue;
      if (Math.random() < clearRate) bullet.dead = true;
    }
  }

  function canClearBullet(bullet) {
    var source = bullet && bullet.patternSource || "";
    if (source.indexOf("slow_wall") >= 0) return true;
    if (bullet.sourceEnemyClass === "normal") return true;
    return bullet.sourceEnemyType === "elite";
  }

  function getEnemies(state) {
    var list = Array.isArray(state.enemies) ? state.enemies.filter(isValidTarget) : [];
    if (state.boss && isValidTarget(state.boss)) list.push(state.boss);
    return list;
  }

  function isValidTarget(target) {
    return Boolean(target && !target.dead && target.canTakeDamage !== false && Number(target.hp) > 0);
  }

  function nearestUnhit(targets, from, hit) {
    var best = null;
    var bestDistance = Infinity;
    for (var i = 0; i < targets.length; i += 1) {
      var target = targets[i];
      if (!target || hit.has(target.id)) continue;
      var distance = dist2(from, target);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = target;
      }
    }
    return best;
  }

  function dist2(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function createSetFallback() {
    return {
      size: 0,
      values: Object.create(null),
      add: function add(value) {
        if (!this.values[value]) {
          this.values[value] = true;
          this.size += 1;
        }
      },
      has: function has(value) { return Boolean(this.values[value]); }
    };
  }

  function getAutoVisual(visualId, primary, trail) {
    var theme = scope.skillVisualTheme && scope.skillVisualTheme.getAutoVisual
      ? scope.skillVisualTheme.getAutoVisual(visualId)
      : null;
    return theme || { primary: primary, trail: trail };
  }

  registerFireHandler("passive-front-spread", fireFrontSpread);
  registerFireHandler("passive-railgun", fireRailgun);
  registerFireHandler("passive-shockwave", fireShockwave);
  registerFireHandler("passive-chain-lightning", fireChainLightning);

  var api = {
    registerFireHandler: registerFireHandler,
    getFireHandler: function getFireHandler(skillId) { return fireHandlers[String(skillId || "")] || null; },
    getFireHandlerIds: function getFireHandlerIds() { return Object.keys(fireHandlers); },
    fireRuntime: fireRuntime
  };

  scope.passiveSkillSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
