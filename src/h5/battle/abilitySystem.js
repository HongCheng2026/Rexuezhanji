(function registerAbilitySystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function update(state, loadout, dt) {
    if (!state || !state.player) return;
    if (scope.activeSkillSystem && scope.activeSkillSystem.update) {
      scope.activeSkillSystem.update(state, loadout, dt);
    }
    updateDecisiveCommand(state, dt);
    updateVisualEffects(state, dt);
  }

  function tryCastActiveSlot(state, loadout, slotIndex) {
    return Boolean(scope.activeSkillSystem && scope.activeSkillSystem.tryCastActiveSlot
      && scope.activeSkillSystem.tryCastActiveSlot(state, loadout, slotIndex, "manual"));
  }

  function toggleActiveSlotAuto(state, loadout, slotIndex) {
    if (!scope.activeSkillSystem || !scope.activeSkillSystem.toggleActiveSlotAuto) return null;
    return scope.activeSkillSystem.toggleActiveSlotAuto(state, loadout, slotIndex);
  }

  function getWeaponModifiers(state, loadout, weaponType) {
    if (!scope.activeSkillSystem || !scope.activeSkillSystem.getWeaponModifiers) {
      return { damageMultiplier: 1, armorPierceBonus: 0 };
    }
    return scope.activeSkillSystem.getWeaponModifiers(state, loadout, weaponType);
  }

  function updateDecisiveCommand(state, dt) {
    var runtime = getDecisiveCommandRuntime(state);
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
      addNotice(state, "决胜指令充能完成", "#82f7ff", 1.3);
    }
  }

  function tryUseDecisiveCommand(state, loadout) {
    if (!state || state.mode !== "fight" || !state.player) return false;
    var runtime = getDecisiveCommandRuntime(state);
    var command = loadout && loadout.abilities ? loadout.abilities.decisiveCommand : null;
    if (!runtime || !command || runtime.charges <= 0) return false;
    runtime.charges = Math.max(0, runtime.charges - 1);
    if (runtime.charges < runtime.maxCharges && runtime.rechargeTimer <= 0) {
      runtime.rechargeTimer = runtime.rechargeSeconds || 18;
    }
    var collisions = scope.collisionSystem || {};
    if (collisions.clearForDecisiveCommand) collisions.clearForDecisiveCommand(state, loadout);
    castDecisiveCommandEffect(state, loadout, command.effect);
    state.shake = Math.max(state.shake || 0, 0.4);
    var effectName = command.effect && command.effect.name ? " · " + command.effect.name : "";
    addNotice(state, "决胜指令" + effectName, "#ffd166", 1.2);
    return true;
  }

  function castDecisiveCommandEffect(state, loadout, effect) {
    var weapon = scope.weaponSystem || {};
    var x = state.player.x;
    var y = state.player.y;
    var bullets = state.bullets || [];
    var configured = effect || {};
    var damageMultiplier = Number(configured.damageMultiplier) || 3.5;
    if (configured.id === "stellar-beam") {
      addEffect(state, { type: "stellar-beam", x: x + 70, y: y, width: getField(state).width, height: 86, life: 0.55, duration: 0.55, color: "#82f7ff" });
      for (var i = 0; i < 5; i += 1) {
        bullets.push(weapon.createBullet(x + 54, y + (i - 2) * 10, 0, "stellarBeam", Math.round(weapon.getPlayerDamage(loadout, "laser", 10) * damageMultiplier), 1120, 12, "#82f7ff", {
          owner: "player", shape: "beam", width: 138, height: 10, pierceRemaining: 999,
          trailColor: "rgba(130,247,255,0.34)", armorPierceRatio: 0.35
        }));
      }
      return;
    }
    if (configured.id === "dark-core") {
      addEffect(state, { type: "dark-core", x: x + 260, y: y, radius: 132, life: 0.95, duration: 0.95, color: "#b86cff" });
      bullets.push(weapon.createBullet(x + 44, y, 0, "darkCore", Math.round(weapon.getPlayerDamage(loadout, "missile", 10) * damageMultiplier), 520, 13, "#b889ff", {
        owner: "player", shape: "circle", pierceRemaining: 0, trailColor: "rgba(184,137,255,0.28)", splashRadius: 112
      }));
      return;
    }
    if (configured.id === "golden-lances") {
      var lanes = [-42, -26, -10, 10, 26, 42];
      addEffect(state, { type: "golden-lances", x: x + 76, y: y, lanes: lanes.slice(), width: getField(state).width, life: 0.62, duration: 0.62, color: "#ffd166" });
      for (var j = 0; j < lanes.length; j += 1) {
        bullets.push(weapon.createBullet(x + 46, y + lanes[j], (j - (lanes.length - 1) / 2) * 0.025, "goldenLance", Math.round(weapon.getPlayerDamage(loadout, "spread", 10) * damageMultiplier), 880, 8, "#ffd166", {
          owner: "player", shape: "lance", width: 30, height: 12, pierceRemaining: 8,
          trailColor: "rgba(255,209,102,0.3)", armorPierceRatio: 0.7
        }));
      }
      return;
    }
    addEffect(state, { type: "decisive-command-pulse", x: x, y: y, radius: 180, life: 0.42, duration: 0.42, color: "#ffd166" });
  }

  function updateBullet(state, bullet, dt) {
    if (!bullet || bullet.type !== "darkCore") return;
    pullEnemies(state, bullet.x, bullet.y, 170, 95, dt);
  }

  function updateVisualEffects(state, dt) {
    var effects = state && Array.isArray(state.skillEffects) ? state.skillEffects : [];
    for (var i = 0; i < effects.length; i += 1) effects[i].life -= dt;
    if (state) state.skillEffects = effects.filter(function keepEffect(effect) { return effect.life > 0; });
  }

  function pullEnemies(state, x, y, radius, strength, dt) {
    var enemies = state && Array.isArray(state.enemies) ? state.enemies : [];
    for (var i = 0; i < enemies.length; i += 1) {
      var enemy = enemies[i];
      if (!enemy || enemy.dead || enemy.canTakeDamage === false) continue;
      var dx = x - enemy.x;
      var dy = y - enemy.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 1;
      if (distance > radius) continue;
      var pull = (1 - distance / radius) * strength * dt;
      enemy.x += dx / distance * pull;
      enemy.y += dy / distance * pull;
    }
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

  function getDecisiveCommandRuntime(state) {
    return state && state.player && state.player.abilities ? state.player.abilities.decisiveCommand : null;
  }

  function getField(state) {
    return scope.battleGeometry.getField(state);
  }

  var api = {
    update: update,
    updateBullet: updateBullet,
    tryCastActiveSlot: tryCastActiveSlot,
    toggleActiveSlotAuto: toggleActiveSlotAuto,
    tryUseDecisiveCommand: tryUseDecisiveCommand,
    getWeaponModifiers: getWeaponModifiers
  };

  scope.abilitySystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
