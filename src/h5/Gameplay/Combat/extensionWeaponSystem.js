(function registerExtensionWeaponSystem(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});
  var events = scope.events;
  var fireHandlers = Object.create(null);

  function registerFireHandler(skillId, handler) {
    var id = String(skillId || "");
    if (!id || typeof handler !== "function") return false;
    fireHandlers[id] = handler;
    return true;
  }

  function update(state, loadout, dt) {
    if (!state || state.mode !== "fight" || !state.player) return false;
    var skills = state.player.weaponSkills;
    var slots = skills && Array.isArray(skills.meta) ? skills.meta : [];
    if (!slots.length) return false;
    var now = Math.max(0, Number(state.elapsed) || 0);
    var nextWakeAt = Infinity;
    var fired = false;

    for (var p = 0; p < slots.length; p += 1) updateActiveProtocol(state, slots[p], loadout, dt);
    if (Number(skills.nextWakeAt) > now) return false;

    for (var index = 0; index < slots.length; index += 1) {
      var runtime = slots[index];
      if (!runtime || !runtime.resolvedStats) continue;
      var readyAt = Math.max(0, Number(runtime.nextFireAt) || 0);
      if (readyAt > now) { nextWakeAt = Math.min(nextWakeAt, readyAt); continue; }
      if (runtime.activeRemaining > 0) { nextWakeAt = Math.min(nextWakeAt, now + 0.05); continue; }
      var interval = Math.max(0.01, Number(runtime.resolvedStats.fireInterval) || 1);
      if (fireRuntime(state, runtime, loadout)) {
        runtime.lastFiredAt = now;
        runtime.nextFireAt = now + interval;
        fired = true;
      } else {
        // 目标型自动技能无目标时保持就绪，只做低频轮询；HUD 不暴露该状态。
        runtime.nextFireAt = now;
        nextWakeAt = Math.min(nextWakeAt, now + 0.1);
      }
      runtime.status = "auto";
      if (runtime.nextFireAt > now) nextWakeAt = Math.min(nextWakeAt, runtime.nextFireAt);
    }
    skills.nextWakeAt = Number.isFinite(nextWakeAt) ? nextWakeAt : now + 1;
    return fired;
  }

  function fireRuntime(state, runtime, loadout) {
    if (!runtime || !runtime.id || !runtime.resolvedStats) return false;
    var handler = fireHandlers[String(runtime.id)];
    return handler ? Boolean(handler(state, runtime, loadout)) : false;
  }

  function fireFrontSpread(state, runtime, loadout) {
    return firePassiveRuntime(state, runtime, loadout);
  }

  function fireRailgun(state, runtime, loadout) {
    return firePassiveRuntime(state, runtime, loadout);
  }

  function fireShockwave(state, runtime, loadout) {
    return firePassiveRuntime(state, runtime, loadout);
  }

  function fireChainLightning(state, runtime, loadout) {
    return firePassiveRuntime(state, runtime, loadout);
  }

  function firePassiveRuntime(state, runtime, loadout) {
    return Boolean(scope.passiveSkillSystem && scope.passiveSkillSystem.fireRuntime &&
      scope.passiveSkillSystem.fireRuntime(state, runtime, loadout));
  }

  function fireSkyLockBeam(state, runtime, loadout) {
    return fireProtocol(state, runtime, loadout);
  }

  function fireGravityWell(state, runtime, loadout) {
    return fireProtocol(state, runtime, loadout);
  }

  function fireJudgementBuff(state, runtime, loadout) {
    return fireProtocol(state, runtime, loadout);
  }

  function firePhaseShield(state, runtime, loadout) {
    return fireProtocol(state, runtime, loadout);
  }

  function fireProtocol(state, runtime, loadout) {
    var active = scope.activeSkillSystem;
    var handler = active && active.getHandler ? active.getHandler(runtime.id) : null;
    if (!handler) return false;
    var skill = protocolSkill(runtime);
    var context = { state: state, loadout: loadout, skill: skill, runtime: runtime, slotIndex: runtime.slotIndex, source: "auto" };
    if (typeof handler.canCast === "function" && handler.canCast(context) === false) return false;
    runtime.data = Object.create(null);
    var casted = handler.activate(context);
    if (casted === false) { runtime.data = null; return false; }
    runtime.activeRemaining = Math.max(0.05, Number(skill.duration) || 0.05);
    state.skillEffects = state.skillEffects || [];
    var visual = getAutoVisual(runtime.visualId, "#63ffb4", "rgba(73,255,172,0.42)");
    state.skillEffects.push({
      type: "auto-protocol-cast",
      visualId: runtime.visualId,
      presentationTier: "automatic",
      color: visual.primary,
      x: state.player.x,
      y: state.player.y,
      life: 0.35,
      duration: 0.35,
      autoSkillId: runtime.id
    });
    broadcastWeaponFired("protocol", runtime.id);
    return true;
  }

  function protocolSkill(runtime) {
    var stats = runtime.resolvedStats || {};
    var skill = Object.assign({}, stats, { id: runtime.id, name: runtime.name, tickInterval: 0.5, pullRadius: Number(stats.radius) + 40, pullStrength: 120 });
    if (runtime.id === "sky-lock-beam") {
      skill.duration = Math.max(0.3, (Number(stats.shotCount) || 5) * 0.2 + 0.1);
      skill.shotInterval = 0.2;
    }
    return skill;
  }

  function updateActiveProtocol(state, runtime, loadout, dt) {
    if (!runtime || runtime.category !== "protocol" || !(runtime.activeRemaining > 0)) return;
    var active = scope.activeSkillSystem;
    var handler = active && active.getHandler ? active.getHandler(runtime.id) : null;
    runtime.activeRemaining = Math.max(0, runtime.activeRemaining - Math.max(0, Number(dt) || 0));
    if (handler && typeof handler.update === "function") {
      handler.update({ state: state, loadout: loadout, skill: protocolSkill(runtime), runtime: runtime, slotIndex: runtime.slotIndex, source: "auto" }, dt);
    }
    if (runtime.activeRemaining <= 0) {
      if (handler && typeof handler.deactivate === "function") handler.deactivate({ state: state, loadout: loadout, skill: protocolSkill(runtime), runtime: runtime, slotIndex: runtime.slotIndex, source: "auto" });
      runtime.data = null;
    }
  }

  function getWeaponModifiers(state, weaponType) {
    var result = { damageMultiplier: 1, armorPierceBonus: 0 };
    var slots = state && state.player && state.player.weaponSkills && state.player.weaponSkills.meta || [];
    for (var i = 0; i < slots.length; i += 1) {
      var runtime = slots[i];
      if (!runtime || runtime.id !== "gold-judgement-buff" || !(runtime.activeRemaining > 0)) continue;
      result.damageMultiplier *= Math.max(0, Number(runtime.resolvedStats.damageMultiplier) || 1);
      result.armorPierceBonus += Math.max(0, Number(runtime.resolvedStats.armorPierceBonus) || 0);
    }
    return result;
  }

  function fireSidewing(state, runtime) {
    var weapon = scope.weaponSystem || {};
    if (!weapon.emitSpreadVolley) return false;
    var stats = runtime.resolvedStats;
    var trajectoryCount = Math.max(1, Math.floor(Number(stats.trajectoryCount) || 1));
    var coverageRadians = Math.max(0, Number(stats.coverageAngle) || 0) * Math.PI / 180;
    var visual = getAutoVisual("extension-sidewing", "#63ffb4", "rgba(73,255,172,0.42)");
    var sharedSpec = {
      x: state.player.x + 2, damage: stats.damagePerProjectile, speed: stats.projectileSpeed, radius: 5,
      color: visual.primary, width: 22, height: 10, shape: "bolt", trailColor: visual.trail,
      armorPierceRatio: stats.armorPierceRatio, bulletVisualId: "extension-sidewing", extensionWeaponId: runtime.id,
      normalBulletCancelRate: stats.normalBulletCancelRate, eliteBulletCancelRate: stats.eliteBulletCancelRate
    };
    // 每一侧都使用完整 trajectoryCount；Lv.10 即上方 12 轨 + 下方 12 轨。
    var upper = weapon.emitSpreadVolley(state, state.bullets, Object.assign({}, sharedSpec, {
      y: state.player.y - 22, angle: -Math.PI / 2, projectileCount: trajectoryCount, coverageRadians: coverageRadians
    }));
    var lower = weapon.emitSpreadVolley(state, state.bullets, Object.assign({}, sharedSpec, {
      y: state.player.y + 22, angle: Math.PI / 2, projectileCount: trajectoryCount, coverageRadians: coverageRadians
    }));
    return upper.length + lower.length > 0;
  }

  function fireOrbital(state, runtime) {
    var weapon = scope.weaponSystem || {};
    if (!weapon.emitLaserVolley) return false;
    var stats = runtime.resolvedStats;
    var visual = getAutoVisual("extension-orbital", "#a8ffe0", "rgba(66,255,194,0.48)");
    var created = weapon.emitLaserVolley(state, state.bullets, {
      x: state.player.x + 40, y: state.player.y - 30, angle: 0, offsets: [0],
      damage: stats.damagePerProjectile, speed: stats.projectileSpeed, radius: 7,
      color: visual.primary, width: 62, height: 11, shape: "beam", trailColor: visual.trail,
      pierceRemaining: Math.max(0, Number(stats.pierceTargets) - 1), armorPierceRatio: stats.armorPierceRatio,
      bulletVisualId: "extension-orbital", extensionWeaponId: runtime.id
    });
    if (created.length) broadcastWeaponFired("laser", runtime.id);
    return created.length > 0;
  }

  function fireSwarm(state, runtime) {
    var weapon = scope.weaponSystem || {};
    if (!weapon.emitMissileVolley) return false;
    var stats = runtime.resolvedStats;
    var visual = getAutoVisual("extension-swarm", "#9effc4", "rgba(86,255,181,0.46)");
    var created = weapon.emitMissileVolley(state, state.bullets, {
      x: state.player.x + 24, y: state.player.y, projectileCount: Math.max(1, Math.floor(Number(stats.projectileCount) || 1)),
      targetCount: Math.max(1, Math.floor(Number(stats.targetCount) || 1)), damage: stats.damagePerProjectile,
      speed: stats.projectileSpeed, radius: 8, color: visual.primary, width: 30, height: 14, shape: "lance",
      trailColor: visual.trail, armorPierceRatio: stats.armorPierceRatio,
      bulletVisualId: "extension-swarm", extensionWeaponId: runtime.id, homingStartAge: 0.08,
      turnRate: stats.turnRate, steerGain: 9, maxSpeedMultiplier: stats.maxSpeedMultiplier, accelerationDuration: stats.accelerationDuration
    });
    if (created.length) broadcastWeaponFired("missile", runtime.id);
    return created.length > 0;
  }

  function broadcastWeaponFired(weaponType, autoSkillId) {
    if (scope.bus && typeof scope.bus.emit === "function") scope.bus.emit(events.WEAPON_FIRED, { weaponType: weaponType, source: "auto-skill", extensionWeaponId: autoSkillId, autoSkillId: autoSkillId });
  }

  function getAutoVisual(visualId, primary, trail) {
    var theme = scope.skillVisualTheme && scope.skillVisualTheme.getAutoVisual
      ? scope.skillVisualTheme.getAutoVisual(visualId)
      : null;
    return theme || { primary: primary, trail: trail };
  }

  registerFireHandler("weapon_module_04", fireSidewing);
  registerFireHandler("weapon_module_05", fireOrbital);
  registerFireHandler("weapon_module_06", fireSwarm);
  registerFireHandler("passive-front-spread", fireFrontSpread);
  registerFireHandler("passive-railgun", fireRailgun);
  registerFireHandler("passive-shockwave", fireShockwave);
  registerFireHandler("passive-chain-lightning", fireChainLightning);
  registerFireHandler("sky-lock-beam", fireSkyLockBeam);
  registerFireHandler("obsidian-gravity-well", fireGravityWell);
  registerFireHandler("gold-judgement-buff", fireJudgementBuff);
  registerFireHandler("phase-shield", firePhaseShield);

  var api = {
    update: update,
    fireRuntime: fireRuntime,
    registerFireHandler: registerFireHandler,
    getFireHandler: function getFireHandler(skillId) { return fireHandlers[String(skillId || "")] || null; },
    getFireHandlerIds: function getFireHandlerIds() { return Object.keys(fireHandlers); },
    getWeaponModifiers: getWeaponModifiers
  };
  scope.extensionWeaponSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
