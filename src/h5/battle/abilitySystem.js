(function registerAbilitySystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var activeHandlers = Object.create(null);

  function update(state, loadout, dt) {
    if (!state || !state.player) return;
    updateActiveSlots(state, dt);
    updateInsurance(state, dt);
    updateEffects(state, dt);
  }

  function updateActiveSlots(state, dt) {
    var abilities = state.player.abilities || {};
    var slots = Array.isArray(abilities.activeSlots) ? abilities.activeSlots : [];
    for (var i = 0; i < slots.length; i += 1) {
      if (!slots[i]) continue;
      slots[i].cooldownTimer = Math.max(0, (Number(slots[i].cooldownTimer) || 0) - dt);
    }
  }

  function updateInsurance(state, dt) {
    var runtime = getInsuranceRuntime(state);
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
      addNotice(state, runtime.name + " 充能完成", "#82f7ff", 1.3);
    }
  }

  function tryCastActiveSlot(state, loadout, slotIndex) {
    var index = Math.max(0, Math.min(3, Math.floor(Number(slotIndex) || 0)));
    var abilities = state && state.player ? state.player.abilities || {} : {};
    var runtime = Array.isArray(abilities.activeSlots) ? abilities.activeSlots[index] : null;
    var configured = loadout && loadout.abilities && Array.isArray(loadout.abilities.activeSlots)
      ? loadout.abilities.activeSlots[index]
      : null;
    var handler = configured && activeHandlers[configured.id];
    if (!runtime || !configured || !handler || runtime.cooldownTimer > 0) return false;
    if (runtime.charges != null && runtime.charges <= 0) return false;
    var casted = handler({ state: state, loadout: loadout, skill: configured, runtime: runtime, slotIndex: index });
    if (casted === false) return false;
    runtime.cooldownTimer = Math.max(0, Number(runtime.cooldown) || Number(configured.cooldown) || 0);
    if (runtime.charges != null) runtime.charges = Math.max(0, runtime.charges - 1);
    return true;
  }

  function registerActiveHandler(id, handler) {
    if (!id || typeof handler !== "function") return false;
    activeHandlers[id] = handler;
    return true;
  }

  function tryUseInsurance(state, loadout) {
    if (!state || !state.player) return false;
    var runtime = getInsuranceRuntime(state);
    var insurance = loadout && loadout.abilities ? loadout.abilities.insurance : null;
    if (!runtime || !insurance || runtime.charges <= 0) return false;
    runtime.charges = Math.max(0, runtime.charges - 1);
    if (runtime.charges < runtime.maxCharges && runtime.rechargeTimer <= 0) {
      runtime.rechargeTimer = runtime.rechargeSeconds || 18;
    }
    var collisions = scope.collisionSystem || {};
    if (collisions.clearForInsurance) collisions.clearForInsurance(state, loadout);
    else if (collisions.clearForActiveSkill) collisions.clearForActiveSkill(state, loadout);
    castInsurancePattern(state, loadout, insurance);
    state.shake = Math.max(state.shake || 0, 0.4);
    addNotice(state, insurance.name || runtime.name || "保险", "#ffd166", 1.2);
    return true;
  }

  function onVolleyFired(state, loadout, bullets, origin) {
    var passiveSlots = loadout && loadout.abilities && Array.isArray(loadout.abilities.passiveSlots)
      ? loadout.abilities.passiveSlots
      : [];
    for (var i = 0; i < passiveSlots.length; i += 1) {
      var skill = passiveSlots[i];
      if (!skill || !skill.id) continue;
      firePassive(state, loadout, bullets, origin, skill);
    }
  }

  function firePassive(state, loadout, bullets, origin, skill) {
    if (["sky-lock-beam", "obsidian-gravity-well", "gold-judgement-spear"].indexOf(skill.id) < 0) return;
    state.player.passiveLastAt = state.player.passiveLastAt || {};
    var now = Math.max(0, Number(state.elapsed) || 0);
    var cooldown = Math.max(0.6, Number(skill.cooldown) || 2.4);
    var lastAt = state.player.passiveLastAt[skill.id];
    if (lastAt != null && now - lastAt < cooldown) return;
    var point = origin || { x: state.player.x, y: state.player.y };
    var referenceDamage = getReferenceVolleyDamage(loadout, Number(skill.referenceLevel) || 8);

    if (skill.id === "sky-lock-beam") {
      var beamTarget = selectTarget(state, "threat");
      if (!beamTarget) return;
      state.player.passiveLastAt[skill.id] = now;
      var beamAngle = Math.atan2(beamTarget.y - point.y, beamTarget.x - point.x);
      addEffect(state, { type: "sky-lock-beam", x: point.x + 36, y: point.y, targetX: beamTarget.x, targetY: beamTarget.y, life: 0.18, duration: 0.18, color: "#a8f6ff" });
      bullets.push(createBullet(point.x + 38, point.y, beamAngle, "skyLockBeam", Math.round(referenceDamage * (Number(skill.damageBudget) || 1)), 1260, 7, "#a8f6ff", {
        owner: "player", shape: "beam", width: 88, height: 7, pierceRemaining: 999, trailColor: "rgba(130,247,255,0.3)"
      }));
      return;
    }

    if (skill.id === "obsidian-gravity-well") {
      var wellPoint = selectDensePoint(state);
      if (!wellPoint) return;
      state.player.passiveLastAt[skill.id] = now;
      var ticks = Math.max(1, Math.floor(Number(skill.ticks) || 4));
      var duration = Math.max(0.2, Number(skill.duration) || 0.8);
      addEffect(state, {
        type: "obsidian-gravity-well", x: wellPoint.x, y: wellPoint.y, radius: 120,
        life: duration, duration: duration, color: "#b86cff", ticksRemaining: ticks,
        tickInterval: duration / ticks, tickTimer: 0,
        damagePerTick: Math.round(referenceDamage * (Number(skill.damageBudget) || 2) / ticks), rewardSource: loadout
      });
      return;
    }

    var spearTarget = selectTarget(state, "health");
    if (!spearTarget) return;
    state.player.passiveLastAt[skill.id] = now;
    var spearAngle = Math.atan2(spearTarget.y - point.y, spearTarget.x - point.x);
    addEffect(state, { type: "gold-judgement-spear", x: point.x + 36, y: point.y, targetX: spearTarget.x, targetY: spearTarget.y, life: 0.24, duration: 0.24, color: "#ffe38a" });
    bullets.push(createBullet(point.x + 38, point.y, spearAngle, "goldJudgement", Math.round(referenceDamage * (Number(skill.damageBudget) || 1.25)), 1100, 10, "#ffe38a", {
      owner: "player", shape: "lance", width: 60, height: 14, pierceRemaining: 5,
      trailColor: "rgba(255,209,102,0.34)", armorBreakRatio: Number(skill.armorBreakRatio) || 0.15,
      armorBreakDuration: Number(skill.armorBreakDuration) || 1.5, armorBreakTargetId: spearTarget.id || ""
    }));
  }

  function castInsurancePattern(state, loadout, insurance) {
    var weapon = scope.weaponSystem || {};
    var x = state.player.x;
    var y = state.player.y;
    var bullets = state.bullets || [];
    var damageMultiplier = Number(insurance.damageMultiplier) || 3.5;
    if (insurance.id === "stellar-beam") {
      addEffect(state, { type: "stellar-beam", x: x + 70, y: y, width: getField(state).width, height: 86, life: 0.55, duration: 0.55, color: "#82f7ff" });
      for (var i = 0; i < 5; i += 1) {
        bullets.push(createBullet(x + 54, y + (i - 2) * 10, 0, "stellarBeam", Math.round(weapon.getPlayerDamage(loadout, "laser", 10) * damageMultiplier), 1120, 12, "#82f7ff", {
          owner: "player", shape: "beam", width: 138, height: 10, pierceRemaining: 999,
          trailColor: "rgba(130,247,255,0.34)", armorPierceRatio: 0.35
        }));
      }
      return;
    }
    if (insurance.id === "dark-core") {
      addEffect(state, { type: "dark-core", x: x + 260, y: y, radius: 132, life: 0.95, duration: 0.95, color: "#b86cff" });
      bullets.push(createBullet(x + 44, y, 0, "darkCore", Math.round(weapon.getPlayerDamage(loadout, "missile", 10) * damageMultiplier), 520, 13, "#b889ff", {
        owner: "player", shape: "circle", pierceRemaining: 0, trailColor: "rgba(184,137,255,0.28)", splashRadius: 112
      }));
      return;
    }
    if (insurance.id === "golden-lances") {
      var lanes = [-42, -26, -10, 10, 26, 42];
      addEffect(state, { type: "golden-lances", x: x + 76, y: y, lanes: lanes.slice(), width: getField(state).width, life: 0.62, duration: 0.62, color: "#ffd166" });
      for (var j = 0; j < lanes.length; j += 1) {
        bullets.push(createBullet(x + 46, y + lanes[j], (j - (lanes.length - 1) / 2) * 0.025, "goldenLance", Math.round(weapon.getPlayerDamage(loadout, "spread", 10) * damageMultiplier), 880, 8, "#ffd166", {
          owner: "player", shape: "lance", width: 30, height: 12, pierceRemaining: 8,
          trailColor: "rgba(255,209,102,0.3)", armorPierceRatio: 0.7
        }));
      }
      return;
    }
    addEffect(state, { type: "insurance-pulse", x: x, y: y, radius: 180, life: 0.42, duration: 0.42, color: "#ffd166" });
  }

  function updateBullet(state, bullet, dt) {
    if (!bullet || bullet.type !== "darkCore") return;
    pullTargets(state, bullet.x, bullet.y, 170, 95, dt);
  }

  function updateEffects(state, dt) {
    var list = state && Array.isArray(state.skillEffects) ? state.skillEffects : [];
    for (var i = 0; i < list.length; i += 1) {
      var effect = list[i];
      if (effect.type === "obsidian-gravity-well") updateGravityWell(state, effect, dt);
      effect.life -= dt;
    }
    if (state) state.skillEffects = list.filter(function (item) { return item.life > 0; });
  }

  function updateGravityWell(state, effect, dt) {
    pullTargets(state, effect.x, effect.y, 170, 120, dt);
    effect.tickTimer = (Number(effect.tickTimer) || 0) - dt;
    while (effect.ticksRemaining > 0 && effect.tickTimer <= 0) {
      if (scope.collisionSystem && scope.collisionSystem.damageArea) {
        scope.collisionSystem.damageArea(state, effect, effect.radius || 120, effect.damagePerTick || 1, effect.rewardSource);
      }
      effect.ticksRemaining -= 1;
      effect.tickTimer += Math.max(0.05, Number(effect.tickInterval) || 0.2);
    }
  }

  function pullTargets(state, x, y, radius, strength, dt) {
    var targets = state && Array.isArray(state.enemies) ? state.enemies : [];
    for (var i = 0; i < targets.length; i += 1) {
      var target = targets[i];
      if (!target || target.dead || target.canTakeDamage === false) continue;
      var dx = x - target.x;
      var dy = y - target.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 1;
      if (distance > radius) continue;
      var pull = (1 - distance / radius) * strength * dt;
      target.x += dx / distance * pull;
      target.y += dy / distance * pull;
    }
  }

  function selectTarget(state, mode) {
    var targets = getTargets(state);
    var selected = null;
    var best = -Infinity;
    for (var i = 0; i < targets.length; i += 1) {
      var target = targets[i];
      var hp = Math.max(0, Number(target.hp) || 0);
      var maxHp = Math.max(hp, Number(target.maxHp) || hp);
      var score = mode === "health" ? maxHp : maxHp * 0.2;
      if (target === state.boss) score += mode === "health" ? 1000000 : 500000;
      if (target.enemyType === "elite" || target.heavy) score += 100000;
      if (target.enemyType === "shooter") score += 30000;
      if (score > best) { best = score; selected = target; }
    }
    return selected;
  }

  function selectDensePoint(state) {
    var targets = getTargets(state);
    if (!targets.length) return null;
    var best = targets[0];
    var bestScore = -Infinity;
    for (var i = 0; i < targets.length; i += 1) {
      var score = targets[i] === state.boss ? 3 : 1;
      for (var j = 0; j < targets.length; j += 1) {
        if (i === j) continue;
        var dx = targets[i].x - targets[j].x;
        var dy = targets[i].y - targets[j].y;
        if (dx * dx + dy * dy <= 180 * 180) score += 1;
      }
      if (score > bestScore) { bestScore = score; best = targets[i]; }
    }
    return { x: best.x, y: best.y };
  }

  function getTargets(state) {
    var weapon = scope.weaponSystem || {};
    var targets = state && Array.isArray(state.enemies)
      ? state.enemies.filter(function (target) { return weapon.isValidMissileTarget && weapon.isValidMissileTarget(target, state); })
      : [];
    if (state && state.boss && weapon.isValidMissileTarget && weapon.isValidMissileTarget(state.boss, state)) targets.push(state.boss);
    return targets;
  }

  function getReferenceVolleyDamage(loadout, level) {
    return scope.weaponSystem && scope.weaponSystem.getReferenceVolleyDamage
      ? scope.weaponSystem.getReferenceVolleyDamage(loadout, level)
      : 1;
  }

  function createBullet() {
    return scope.weaponSystem.createBullet.apply(null, arguments);
  }

  function addEffect(state, effect) {
    state.skillEffects = state.skillEffects || [];
    effect.duration = effect.duration || effect.life || 0.8;
    state.skillEffects.push(effect);
  }

  function addNotice(state, text, color, life) {
    if (!state || !state.notices) return;
    var field = getField(state);
    state.notices.push({ text: text, color: color, x: field.width / 2, y: field.noticeY, life: life || 1.2 });
  }

  function getInsuranceRuntime(state) {
    return state && state.player && state.player.abilities ? state.player.abilities.insurance : null;
  }

  function getField(state) {
    return scope.battleGeometry && scope.battleGeometry.getField
      ? scope.battleGeometry.getField(state)
      : (state && state.field) || { width: 960, height: 473, noticeY: 74 };
  }

  var api = {
    update: update,
    updateBullet: updateBullet,
    onVolleyFired: onVolleyFired,
    tryCastActiveSlot: tryCastActiveSlot,
    tryUseInsurance: tryUseInsurance,
    registerActiveHandler: registerActiveHandler
  };

  scope.abilitySystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
