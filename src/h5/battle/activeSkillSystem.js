(function registerActiveSkillSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var handlers = Object.create(null);

  function registerActiveSkillHandler(skillId, handler) {
    var id = String(skillId || "");
    if (!id || !handler || typeof handler.activate !== "function") return false;
    handlers[id] = handler;
    return true;
  }

  function update(state, loadout, dt) {
    if (!state || state.mode !== "fight" || !state.player) return;
    var runtimeSlots = getRuntimeSlots(state);
    var configuredSlots = getConfiguredSlots(loadout);
    for (var index = 0; index < runtimeSlots.length; index += 1) {
      var runtime = runtimeSlots[index];
      var skill = configuredSlots[index];
      if (!runtime || !skill || runtime.id !== skill.id) continue;
      var handler = handlers[skill.id];
      runtime.cooldownTimer = Math.max(0, (Number(runtime.cooldownTimer) || 0) - dt);

      if (runtime.activeRemaining > 0) {
        runtime.activeRemaining = Math.max(0, runtime.activeRemaining - dt);
        if (handler && typeof handler.update === "function") {
          handler.update(createContext(state, loadout, skill, runtime, index), dt);
        }
        if (runtime.activeRemaining <= 0) finishActiveSkill(state, loadout, skill, runtime, index, handler);
        continue;
      }

      if (runtime.autoEnabled && runtime.cooldownTimer <= 0) {
        tryCastActiveSlot(state, loadout, index, "auto");
      }
    }
  }

  function tryCastActiveSlot(state, loadout, slotIndex, source) {
    var index = normalizeSlotIndex(slotIndex);
    if (index < 0 || !state || state.mode !== "fight") return false;
    var runtime = getRuntimeSlots(state)[index];
    var skill = getConfiguredSlots(loadout)[index];
    var handler = skill && handlers[skill.id];
    if (!runtime || !skill || !handler || runtime.id !== skill.id) return false;
    if (runtime.cooldownTimer > 0 || runtime.activeRemaining > 0 || runtime.castLocked) return false;
    if (runtime.charges != null && runtime.charges <= 0) return false;

    var context = createContext(state, loadout, skill, runtime, index);
    context.source = source || "manual";
    if (typeof handler.canCast === "function" && handler.canCast(context) === false) return false;

    runtime.castLocked = true;
    runtime.data = Object.create(null);
    var casted;
    try {
      casted = handler.activate(context);
    } finally {
      runtime.castLocked = false;
    }
    if (casted === false) {
      runtime.data = null;
      return false;
    }

    runtime.activeRemaining = Math.max(0, Number(skill.duration) || Number(runtime.duration) || 0);
    runtime.cooldownTimer = Math.max(0, Number(skill.cooldown) || Number(runtime.cooldown) || 0);
    if (runtime.charges != null) runtime.charges = Math.max(0, runtime.charges - 1);
    if (scope.audioSystem && scope.audioSystem.playSfx) scope.audioSystem.playSfx("skill");
    if (runtime.activeRemaining <= 0) finishActiveSkill(state, loadout, skill, runtime, index, handler);
    return true;
  }

  function toggleActiveSlotAuto(state, loadout, slotIndex) {
    var index = normalizeSlotIndex(slotIndex);
    if (index < 0) return null;
    var runtime = getRuntimeSlots(state)[index];
    var skill = getConfiguredSlots(loadout)[index];
    if (!runtime || !skill || runtime.id !== skill.id) return null;
    runtime.autoEnabled = !runtime.autoEnabled;
    return runtime.autoEnabled;
  }

  function getWeaponModifiers(state, loadout, weaponType) {
    var modifiers = { damageMultiplier: 1, armorPierceBonus: 0 };
    var runtimeSlots = getRuntimeSlots(state);
    var configuredSlots = getConfiguredSlots(loadout);
    for (var index = 0; index < runtimeSlots.length; index += 1) {
      var runtime = runtimeSlots[index];
      var skill = configuredSlots[index];
      var handler = skill && handlers[skill.id];
      if (!runtime || !skill || runtime.activeRemaining <= 0 || !handler || typeof handler.getWeaponModifiers !== "function") continue;
      var next = handler.getWeaponModifiers(createContext(state, loadout, skill, runtime, index), weaponType) || {};
      modifiers.damageMultiplier *= Math.max(0, Number(next.damageMultiplier) || 1);
      modifiers.armorPierceBonus = Math.min(1, modifiers.armorPierceBonus + Math.max(0, Number(next.armorPierceBonus) || 0));
    }
    return modifiers;
  }

  function drawEffect(ctx, effect, alpha, progress) {
    if (!effect || !effect.activeSkillId) return false;
    var handler = handlers[effect.activeSkillId];
    if (!handler || typeof handler.drawEffect !== "function") return false;
    handler.drawEffect(ctx, effect, alpha, progress);
    return true;
  }

  function finishActiveSkill(state, loadout, skill, runtime, index, handler) {
    if (handler && typeof handler.deactivate === "function") {
      handler.deactivate(createContext(state, loadout, skill, runtime, index));
    }
    runtime.activeRemaining = 0;
    runtime.data = null;
  }

  function createContext(state, loadout, skill, runtime, slotIndex) {
    return {
      state: state,
      loadout: loadout,
      skill: skill,
      runtime: runtime,
      slotIndex: slotIndex
    };
  }

  function getRuntimeSlots(state) {
    var abilities = state && state.player ? state.player.abilities || {} : {};
    return Array.isArray(abilities.activeSlots) ? abilities.activeSlots : [];
  }

  function getConfiguredSlots(loadout) {
    var abilities = loadout && loadout.abilities ? loadout.abilities : {};
    return Array.isArray(abilities.activeSlots) ? abilities.activeSlots : [];
  }

  function normalizeSlotIndex(slotIndex) {
    var index = Number(slotIndex);
    return Number.isInteger(index) && index >= 0 && index <= 3 ? index : -1;
  }

  var api = {
    registerActiveSkillHandler: registerActiveSkillHandler,
    update: update,
    tryCastActiveSlot: tryCastActiveSlot,
    toggleActiveSlotAuto: toggleActiveSlotAuto,
    getWeaponModifiers: getWeaponModifiers,
    drawEffect: drawEffect
  };

  scope.activeSkillSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
