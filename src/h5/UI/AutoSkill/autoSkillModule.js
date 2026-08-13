(function registerAutoSkillModule(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var DETAIL_KEYS = Object.freeze([
    "damageMultiplier", "damageBudget",
    "projectileCount", "trajectoryCount", "shotCount",
    "pierceTargets", "targetCount", "chainCount",
    "coverageAngle", "radius", "duration", "fireInterval",
    "normalBulletCancelRate", "eliteBulletCancelRate",
    "armorPierceBonus", "projectileSpeed"
  ]);

  function getConfig(shared) {
    return (shared || scope).tacticalLoadoutConfig || {};
  }

  function getDefinitions(shared) {
    return getConfig(shared).ALL_AUTO_SKILLS || {};
  }

  function getDefinition(shared, skillId) {
    return getDefinitions(shared)[String(skillId || "")] || null;
  }

  function getLevel(data, skillId) {
    var definition = getDefinition(scope, skillId);
    var maxLevel = Math.max(1, Number(definition && definition.maxLevel) || Number(getConfig(scope).AUTO_SKILL_MAX_LEVEL) || 10);
    return Math.max(0, Math.min(maxLevel, Math.floor(Number(
      data && data.autoSkillLevels && data.autoSkillLevels[skillId]
    ) || 0)));
  }

  function getStats(shared, skillId, level) {
    var config = getConfig(shared);
    return config.getAutoSkillLevelStats
      ? config.getAutoSkillLevelStats(skillId, Math.max(1, Number(level) || 1)) || {}
      : {};
  }

  function getDetailRows(shared, skillId, level) {
    var definition = getDefinition(shared, skillId);
    var maxLevel = Math.max(1, Number(definition && definition.maxLevel) || Number(getConfig(shared).AUTO_SKILL_MAX_LEVEL) || 10);
    var current = getStats(shared, skillId, level);
    var next = level < maxLevel ? getStats(shared, skillId, level + 1) : current;
    return DETAIL_KEYS.filter(function hasValue(key) {
      return current[key] != null;
    }).slice(0, 7).map(function createRow(key) {
      return {
        key: key,
        current: current[key],
        next: next[key],
        changes: level < maxLevel && next[key] != null && next[key] !== current[key]
      };
    });
  }

  function findEquippedSlot(loadout, skillId) {
    var id = String(skillId || "");
    var normalized = normalizeLoadout(loadout);
    var fixed = normalized.fixedWeaponOverrides.indexOf(id);
    if (fixed >= 0) return fixed;
    var extension = normalized.autoWeaponIds.indexOf(id);
    return extension >= 0 ? extension + 3 : -1;
  }

  function equip(loadout, absoluteIndex, skillId) {
    var next = normalizeLoadout(loadout);
    var index = normalizeSlotIndex(absoluteIndex);
    var id = String(skillId || "");
    if (index < 0 || !id) return next;

    // Equipping into another slot is a move: clear the old slot before saving.
    for (var fixed = 0; fixed < 3; fixed += 1) {
      if (next.fixedWeaponOverrides[fixed] === id) next.fixedWeaponOverrides[fixed] = null;
    }
    for (var extension = 0; extension < 3; extension += 1) {
      if (next.autoWeaponIds[extension] === id) next.autoWeaponIds[extension] = null;
    }
    if (index < 3) next.fixedWeaponOverrides[index] = id;
    else next.autoWeaponIds[index - 3] = id;
    return next;
  }

  function unequip(loadout, absoluteIndex) {
    var next = normalizeLoadout(loadout);
    var index = normalizeSlotIndex(absoluteIndex);
    if (index < 0) return next;
    if (index < 3) next.fixedWeaponOverrides[index] = null;
    else next.autoWeaponIds[index - 3] = null;
    return next;
  }

  function normalizeLoadout(loadout) {
    var input = loadout || {};
    return {
      activeSlots: normalizeArray(input.activeSlots, 4).map(function cloneActive(slot) {
        return slot && slot.skillId
          ? { skillId: String(slot.skillId), autoEnabled: Boolean(slot.autoEnabled) }
          : null;
      }),
      fixedWeaponOverrides: normalizeArray(input.fixedWeaponOverrides, 3).map(normalizeId),
      autoWeaponIds: normalizeArray(input.autoWeaponIds, 3).map(normalizeId)
    };
  }

  function normalizeArray(value, length) {
    var result = Array.isArray(value) ? value.slice(0, length) : [];
    while (result.length < length) result.push(null);
    return result;
  }

  function normalizeId(value) {
    return value == null || value === "" ? null : String(value);
  }

  function normalizeSlotIndex(value) {
    var index = Number(value);
    return Number.isInteger(index) && index >= 0 && index <= 5 ? index : -1;
  }

  var api = {
    DETAIL_KEYS: DETAIL_KEYS,
    getDefinitions: getDefinitions,
    getDefinition: getDefinition,
    getLevel: getLevel,
    getStats: getStats,
    getDetailRows: getDetailRows,
    findEquippedSlot: findEquippedSlot,
    equip: equip,
    unequip: unequip,
    normalizeLoadout: normalizeLoadout
  };

  scope.autoSkillModule = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
