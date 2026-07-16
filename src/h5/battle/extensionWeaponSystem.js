(function registerExtensionWeaponSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var WAKE_POLL_SECONDS = 0.08;

  function update(state) {
    if (!state || state.mode !== "fight" || !state.player) return false;
    var skills = state.player.weaponSkills;
    var slots = skills && Array.isArray(skills.extensions) ? skills.extensions : [];
    if (!slots.length) return false;
    var now = Math.max(0, Number(state.elapsed) || 0);
    if (Number(skills.nextWakeAt) > now) return false;

    var hasTargets = hasValidTarget(state);
    var nextWakeAt = Infinity;
    var fired = false;
    for (var index = 0; index < slots.length; index += 1) {
      var runtime = slots[index];
      if (!runtime || !runtime.resolvedStats) continue;
      var readyAt = Math.max(0, Number(runtime.nextFireAt) || 0);
      if (readyAt > now) {
        runtime.status = "cooldown";
        runtime.waitingForTarget = false;
        nextWakeAt = Math.min(nextWakeAt, readyAt);
        continue;
      }
      if (!hasTargets) {
        runtime.status = "waiting-target";
        runtime.waitingForTarget = true;
        nextWakeAt = Math.min(nextWakeAt, now + WAKE_POLL_SECONDS);
        continue;
      }
      if (!fireRuntime(state, runtime)) {
        runtime.status = "waiting-target";
        runtime.waitingForTarget = true;
        nextWakeAt = Math.min(nextWakeAt, now + WAKE_POLL_SECONDS);
        continue;
      }
      var interval = Math.max(0.01, Number(runtime.resolvedStats.fireInterval) || 1);
      runtime.lastFiredAt = now;
      runtime.nextFireAt = now + interval;
      runtime.waitingForTarget = false;
      runtime.status = "cooldown";
      nextWakeAt = Math.min(nextWakeAt, runtime.nextFireAt);
      fired = true;
    }
    skills.nextWakeAt = Number.isFinite(nextWakeAt) ? nextWakeAt : now + 1;
    return fired;
  }

  function hasValidTarget(state) {
    var weapon = scope.weaponSystem || {};
    var enemies = Array.isArray(state && state.enemies) ? state.enemies : [];
    for (var i = 0; i < enemies.length; i += 1) {
      if (!weapon.isValidMissileTarget || weapon.isValidMissileTarget(enemies[i], state)) return true;
    }
    return Boolean(state && state.boss && (!weapon.isValidMissileTarget || weapon.isValidMissileTarget(state.boss, state)));
  }

  function fireRuntime(state, runtime) {
    if (runtime.category === "sidewing") return fireSidewing(state, runtime);
    if (runtime.category === "orbital") return fireOrbital(state, runtime);
    if (runtime.category === "missile") return fireSwarm(state, runtime);
    return false;
  }

  function fireSidewing(state, runtime) {
    var weapon = scope.weaponSystem || {};
    if (!weapon.createBullet) return false;
    var stats = runtime.resolvedStats;
    var count = Math.max(1, Math.floor(Number(stats.trajectoryCount) || 1));
    var coverage = Math.max(0, Number(stats.coverageAngle) || 0) * Math.PI / 180;
    var originX = state.player.x + 28;
    var wingOffset = 16;
    for (var i = 0; i < count; i += 1) {
      var ratio = count === 1 ? 0.5 : i / (count - 1);
      var angle = -coverage / 2 + coverage * ratio;
      var bullet = weapon.createBullet(
        originX,
        state.player.y + (i % 2 === 0 ? -wingOffset : wingOffset),
        angle,
        "extension-sidewing",
        stats.damagePerProjectile,
        stats.projectileSpeed,
        4,
        "#64ecff",
        {
          owner: "player",
          shape: "bolt",
          width: 16,
          height: 5,
          trailColor: "rgba(74,225,255,0.34)",
          armorPierceRatio: stats.armorPierceRatio
        }
      );
      bullet.extensionWeaponId = runtime.id;
      bullet.normalBulletCancelRate = stats.normalBulletCancelRate;
      bullet.eliteBulletCancelRate = stats.eliteBulletCancelRate;
      state.bullets.push(bullet);
    }
    queueSfx("shootSpread");
    return true;
  }

  function fireOrbital(state, runtime) {
    var weapon = scope.weaponSystem || {};
    if (!weapon.createBullet || !weapon.nearestTarget) return false;
    var stats = runtime.resolvedStats;
    var origin = { x: state.player.x + 38, y: state.player.y - 30 };
    var target = weapon.nearestTarget(state, origin);
    if (!target) return false;
    var angle = Math.atan2(target.y - origin.y, target.x - origin.x);
    var bullet = weapon.createBullet(
      origin.x,
      origin.y,
      angle,
      "extension-orbital",
      stats.damagePerProjectile,
      stats.projectileSpeed,
      6,
      "#5af2ff",
      {
        owner: "player",
        shape: "beam",
        width: 48,
        height: 7,
        trailColor: "rgba(90,242,255,0.36)",
        pierceRemaining: Math.max(0, Number(stats.pierceTargets) - 1),
        armorPierceRatio: stats.armorPierceRatio
      }
    );
    bullet.extensionWeaponId = runtime.id;
    state.bullets.push(bullet);
    queueSfx("shootLaser");
    return true;
  }

  function fireSwarm(state, runtime) {
    var weapon = scope.weaponSystem || {};
    if (!weapon.createBullet || !weapon.isValidMissileTarget) return false;
    var targets = getPriorityTargets(state, Math.max(1, Number(runtime.resolvedStats.targetCount) || 1));
    if (!targets.length) return false;
    var stats = runtime.resolvedStats;
    var count = Math.max(1, Math.floor(Number(stats.projectileCount) || 1));
    for (var i = 0; i < count; i += 1) {
      var normalized = count === 1 ? 0 : i / (count - 1) * 2 - 1;
      var speed = Math.max(1, Number(stats.projectileSpeed) || 470);
      var missile = weapon.createBullet(
        state.player.x + 24,
        state.player.y + normalized * Math.min(50, count * 6),
        normalized * 0.2,
        "missile",
        stats.damagePerProjectile,
        speed,
        7,
        "#ffb45b",
        {
          owner: "player",
          shape: "lance",
          width: 22,
          height: 10,
          trailColor: "rgba(255,180,91,0.34)",
          armorPierceRatio: stats.armorPierceRatio
        }
      );
      missile.extensionWeaponId = runtime.id;
      missile.targetId = targets[i % targets.length].id || "";
      missile.homingStartAge = 0.08;
      missile.homingTurnRate = Math.max(0.1, Number(stats.turnRate) || 6);
      missile.homingSteerGain = 9;
      missile.launchSpeed = speed;
      missile.maxSpeed = speed * Math.max(1, Number(stats.maxSpeedMultiplier) || 1.3);
      missile.accelerationDuration = Math.max(0.01, Number(stats.accelerationDuration) || 0.35);
      state.bullets.push(missile);
    }
    queueSfx("shootMissile");
    return true;
  }

  function getPriorityTargets(state, maxCount) {
    var weapon = scope.weaponSystem || {};
    var origin = state.player || { x: 0, y: 0 };
    var enemies = Array.isArray(state.enemies) ? state.enemies.filter(function valid(target) {
      return !weapon.isValidMissileTarget || weapon.isValidMissileTarget(target, state);
    }) : [];
    enemies.sort(function byDistance(a, b) {
      var adx = a.x - origin.x;
      var ady = a.y - origin.y;
      var bdx = b.x - origin.x;
      var bdy = b.y - origin.y;
      return adx * adx + ady * ady - (bdx * bdx + bdy * bdy);
    });
    if (!enemies.length && state.boss && (!weapon.isValidMissileTarget || weapon.isValidMissileTarget(state.boss, state))) enemies.push(state.boss);
    return enemies.slice(0, Math.max(1, Math.floor(Number(maxCount) || 1)));
  }

  function queueSfx(id) {
    if (scope.audioSystem && scope.audioSystem.queueSfx) scope.audioSystem.queueSfx(id);
  }

  var api = {
    update: update,
    hasValidTarget: hasValidTarget,
    fireRuntime: fireRuntime
  };

  scope.extensionWeaponSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
