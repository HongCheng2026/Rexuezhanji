(function registerTacticalLoadoutSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function createEmptyLoadout() {
    var config = scope.tacticalLoadoutConfig || {};
    return {
      activeSlots: Array.from({ length: Number(config.ACTIVE_SLOT_COUNT) || 4 }, function emptyActive() { return null; }),
      autoWeaponIds: Array.from({ length: Number(config.AUTO_WEAPON_SLOT_COUNT) || 3 }, function emptyWeapon() { return null; })
    };
  }

  function getShip(shipId) {
    var ships = scope.assets && Array.isArray(scope.assets.SHIP_ASSETS) ? scope.assets.SHIP_ASSETS : [];
    return ships.find(function findShip(item) { return item.id === shipId; }) || null;
  }

  function getUnlockedActiveSkillIds(profile) {
    var result = new Set(["phase-shield"]);
    var ownedShips = profile && profile.owned && Array.isArray(profile.owned.ships) ? profile.owned.ships : [];
    ownedShips.forEach(function unlockShipSkill(shipId) {
      var ship = getShip(shipId);
      if (ship && ship.activeSkillId) result.add(String(ship.activeSkillId));
    });
    return result;
  }

  function getLoadout(profile, shipId) {
    var state = profile && profile.shipSkillLoadouts && profile.shipSkillLoadouts[shipId];
    if (!state) return createEmptyLoadout();
    return {
      activeSlots: Array.isArray(state.activeSlots) ? state.activeSlots.map(function cloneSlot(slot) {
        return slot ? { skillId: String(slot.skillId || ""), autoEnabled: Boolean(slot.autoEnabled) } : null;
      }) : createEmptyLoadout().activeSlots,
      autoWeaponIds: Array.isArray(state.autoWeaponIds) ? state.autoWeaponIds.map(function cloneId(id) { return id ? String(id) : null; }) : createEmptyLoadout().autoWeaponIds
    };
  }

  function validate(profile, shipId, input) {
    var config = scope.tacticalLoadoutConfig || {};
    var ownedShips = profile && profile.owned && Array.isArray(profile.owned.ships) ? profile.owned.ships : [];
    if (ownedShips.indexOf(shipId) < 0 || !getShip(shipId)) throw new Error("不能为尚未拥有的战机保存配装。");
    if (!input || !Array.isArray(input.activeSlots) || input.activeSlots.length !== (Number(config.ACTIVE_SLOT_COUNT) || 4)) {
      throw new Error("主动技能槽必须恰好为 4 格。");
    }
    if (!Array.isArray(input.autoWeaponIds) || input.autoWeaponIds.length !== (Number(config.AUTO_WEAPON_SLOT_COUNT) || 3)) {
      throw new Error("扩展自动武装槽必须恰好为 3 格。");
    }

    var unlockedSkills = getUnlockedActiveSkillIds(profile);
    var seenSkills = new Set();
    var activeSlots = input.activeSlots.map(function validateActiveSlot(slot) {
      if (slot == null) return null;
      var skillId = String(slot.skillId || "");
      if (!scope.shipSkills || !scope.shipSkills.getActiveSkill || !scope.shipSkills.getActiveSkill(skillId)) throw new Error("主动技能 ID 不合法。");
      if (!unlockedSkills.has(skillId)) throw new Error("该主动技能尚未解锁。");
      if (seenSkills.has(skillId)) throw new Error("同一战机不能重复装备同一主动技能。");
      seenSkills.add(skillId);
      return { skillId: skillId, autoEnabled: Boolean(slot.autoEnabled) };
    });

    var definitions = config.AUTO_WEAPONS || {};
    var levels = config.normalizeAutoWeaponLevels
      ? config.normalizeAutoWeaponLevels(profile.autoWeaponLevels)
      : (profile.autoWeaponLevels || {});
    var seenWeapons = new Set();
    var autoWeaponIds = input.autoWeaponIds.map(function validateAutoWeapon(moduleId) {
      if (moduleId == null || moduleId === "") return null;
      var id = String(moduleId);
      if (!definitions[id]) throw new Error("自动武装 ID 不合法。");
      if (!(Number(levels[id]) > 0)) throw new Error("请先解锁该自动武装。");
      if (seenWeapons.has(id)) throw new Error("同一战机不能重复装备同一自动武装。");
      seenWeapons.add(id);
      return id;
    });
    return { activeSlots: activeSlots, autoWeaponIds: autoWeaponIds };
  }

  function save(profile, shipId, input) {
    var normalized = validate(profile, String(shipId || ""), input);
    profile.shipSkillLoadouts = profile.shipSkillLoadouts || {};
    profile.shipSkillLoadouts[shipId] = normalized;
    return { profile: profile, shipId: shipId, loadout: normalized };
  }

  function upgradeAutoWeapon(profile, moduleId, operationId) {
    var config = scope.tacticalLoadoutConfig || {};
    var id = String(moduleId || "");
    if (!config.AUTO_WEAPONS || !config.AUTO_WEAPONS[id]) throw new Error("自动武装不存在。");
    profile.tacticalOperationIds = Array.isArray(profile.tacticalOperationIds) ? profile.tacticalOperationIds : [];
    var normalizedOperationId = String(operationId || "");
    if (normalizedOperationId && profile.tacticalOperationIds.indexOf(normalizedOperationId) >= 0) {
      return { profile: profile, moduleId: id, level: Number(profile.autoWeaponLevels && profile.autoWeaponLevels[id]) || 0, cost: 0, duplicate: true };
    }
    profile.autoWeaponLevels = config.normalizeAutoWeaponLevels
      ? config.normalizeAutoWeaponLevels(profile.autoWeaponLevels)
      : (profile.autoWeaponLevels || {});
    var result = config.getAutoWeaponUpgrade(id, profile.autoWeaponLevels[id]);
    if (!result.ok && result.code === "MAX_LEVEL") throw new Error("该自动武装已达 MAX。");
    if (!result.ok) throw new Error("该自动武装无法升级。");
    var gold = scope.profile.getGold(profile);
    if (gold < result.cost) throw new Error("金币不足。");
    scope.profile.setGold(profile, gold - result.cost);
    profile.autoWeaponLevels[id] = result.targetLevel;
    if (normalizedOperationId) {
      profile.tacticalOperationIds.push(normalizedOperationId);
      profile.tacticalOperationIds = profile.tacticalOperationIds.slice(-32);
    }
    return { profile: profile, moduleId: id, level: result.targetLevel, cost: result.cost };
  }

  var api = {
    createEmptyLoadout: createEmptyLoadout,
    getUnlockedActiveSkillIds: getUnlockedActiveSkillIds,
    getLoadout: getLoadout,
    validate: validate,
    save: save,
    upgradeAutoWeapon: upgradeAutoWeapon
  };

  scope.tacticalLoadoutSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
