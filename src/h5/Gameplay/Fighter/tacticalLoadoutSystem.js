(function registerTacticalLoadoutSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var RANK_ORDER = Object.freeze({ B: 1, A: 2, S: 3, SS: 4, SSS: 5 });

  function getShip(shipId) {
    var ships = scope.assets && Array.isArray(scope.assets.SHIP_ASSETS) ? scope.assets.SHIP_ASSETS : [];
    return ships.find(function findShip(item) { return item.id === shipId; }) || null;
  }

  function getShipRank(profile, shipId) {
    var promoted = profile && profile.shipRanks && profile.shipRanks[shipId];
    if (promoted) return String(promoted).toUpperCase();
    var ship = getShip(shipId);
    return ship && ship.rank ? String(ship.rank).toUpperCase() : "";
  }

  function createEmptyLoadout() {
    return {
      activeSlots: [null, null, null, null],
      fixedWeaponOverrides: [null, null, null],
      autoWeaponIds: [null, null, null]
    };
  }

  function cloneActiveSlot(slot) {
    return slot && slot.skillId
      ? { skillId: String(slot.skillId), autoEnabled: Boolean(slot.autoEnabled) }
      : null;
  }

  function cloneLoadout(value) {
    var empty = createEmptyLoadout();
    var raw = value && typeof value === "object" ? value : {};
    empty.activeSlots = empty.activeSlots.map(function clone(_, i) {
      return cloneActiveSlot(Array.isArray(raw.activeSlots) ? raw.activeSlots[i] : null);
    });
    empty.fixedWeaponOverrides = empty.fixedWeaponOverrides.map(function clone(_, i) {
      var id = Array.isArray(raw.fixedWeaponOverrides) && raw.fixedWeaponOverrides[i];
      return id ? String(id) : null;
    });
    empty.autoWeaponIds = empty.autoWeaponIds.map(function clone(_, i) {
      var id = Array.isArray(raw.autoWeaponIds) && raw.autoWeaponIds[i];
      return id ? String(id) : null;
    });
    return empty;
  }

  function getLoadout(profile, shipId) {
    var state = profile && profile.shipSkillLoadouts && profile.shipSkillLoadouts[shipId];
    return cloneLoadout(state);
  }

  function getUnlockedActiveSkillIds() {
    var skills = scope.shipSkills && scope.shipSkills.ACTIVE_SKILLS ? scope.shipSkills.ACTIVE_SKILLS : {};
    return new Set(Object.keys(skills));
  }

  function ownsSourceShip(profile, skillId) {
    if (skillId === "phase-shield") return true;
    var owned = profile && profile.owned && Array.isArray(profile.owned.ships) ? profile.owned.ships : [];
    return owned.some(function owns(shipId) {
      var ship = getShip(shipId);
      return ship && String(ship.activeSkillId || "") === skillId;
    });
  }

  function getUnlockedAutoSkillIds(profile) {
    var config = scope.tacticalLoadoutConfig || {};
    var levels = config.normalizeAutoWeaponLevels ? config.normalizeAutoWeaponLevels(profile && profile.autoWeaponLevels) : {};
    var result = new Set();
    Object.keys(config.ALL_AUTO_SKILLS || {}).forEach(function addUnlocked(id) {
      if (Number(levels[id]) > 0 && (!config.AUTO_PROTOCOL_SKILLS || !config.AUTO_PROTOCOL_SKILLS[id] || ownsSourceShip(profile, id))) {
        result.add(id);
      }
    });
    return result;
  }

  function isActiveSlotUnlocked(rank, index) {
    var balance = scope.balance || {};
    var required = balance.getActiveSkillSlotUnlockRank ? balance.getActiveSkillSlotUnlockRank(index) : (index < 2 ? "S" : "SS");
    return (RANK_ORDER[String(rank || "").toUpperCase()] || 0) >= (RANK_ORDER[String(required || "").toUpperCase()] || 99);
  }

  function canUseActiveSkill(rank, skillId) {
    var definitions = scope.shipSkills && scope.shipSkills.ACTIVE_SKILLS || {};
    var definition = definitions[String(skillId || "")];
    if (!definition) return false;
    var required = String(definition.minimumFighterRank || "B").toUpperCase();
    return (RANK_ORDER[String(rank || "").toUpperCase()] || 0) >= (RANK_ORDER[required] || 99);
  }

  function requireFixedLength(value, length, message) {
    if (!Array.isArray(value) || value.length !== length) throw new Error(message);
  }

  function validate(profile, shipId, input) {
    var config = scope.tacticalLoadoutConfig || {};
    var ship = getShip(shipId);
    var ownedShips = profile && profile.owned && Array.isArray(profile.owned.ships) ? profile.owned.ships : [];
    if (!ship || ownedShips.indexOf(shipId) < 0) throw new Error("不能为尚未拥有的战机保存配装。");
    var rank = getShipRank(profile, shipId);
    requireFixedLength(input && input.activeSlots, 4, "主动技能槽必须恰好为 4 格。");
    requireFixedLength(input && input.fixedWeaponOverrides, 3, "基础武器替换槽必须恰好为 3 格。");
    requireFixedLength(input && input.autoWeaponIds, 3, "扩展自动技能槽必须恰好为 3 格。");

    var activeDefinitions = scope.shipSkills && scope.shipSkills.ACTIVE_SKILLS || {};
    var seenActive = new Set();
    var activeSlots = input.activeSlots.map(function validateActive(slot, index) {
      if (slot == null) return null;
      if (!isActiveSlotUnlocked(rank, index)) throw new Error("当前战机品级尚未解锁该主动技能槽。");
      var skillId = String(slot.skillId || "");
      if (!activeDefinitions[skillId]) throw new Error("主动技能 ID 不合法。");
      if (!canUseActiveSkill(rank, skillId)) {
        throw new Error((activeDefinitions[skillId].name || "该主动技能") + "仅限 " + activeDefinitions[skillId].minimumFighterRank + " 级以上战机使用。");
      }
      if (seenActive.has(skillId)) throw new Error("同一战机不能重复装备同一主动技能。");
      seenActive.add(skillId);
      return { skillId: skillId, autoEnabled: Boolean(slot.autoEnabled) };
    });

    var allAuto = config.ALL_AUTO_SKILLS || {};
    var unlockedAuto = getUnlockedAutoSkillIds(profile);
    var seenAuto = new Set();
    function validateAutoId(raw) {
      if (raw == null || raw === "") return null;
      var id = String(raw);
      if (!allAuto[id]) throw new Error("自动技能 ID 不合法。");
      if (!unlockedAuto.has(id)) throw new Error("该自动技能尚未解锁。");
      if (seenAuto.has(id)) throw new Error("六个自动技能槽不能重复装备同一技能。");
      seenAuto.add(id);
      return id;
    }

    var fixedWeaponOverrides = input.fixedWeaponOverrides.map(validateAutoId);
    var maxOverrides = config.getFixedWeaponOverrideCount ? config.getFixedWeaponOverrideCount(rank) : 0;
    var overrideCount = fixedWeaponOverrides.filter(Boolean).length;
    if (overrideCount > maxOverrides) throw new Error(rank + " 战机最多替换 " + maxOverrides + " 个基础武器。");

    var autoWeaponIds = input.autoWeaponIds.map(validateAutoId);
    var extensionCount = config.getAutoWeaponSlotCount ? config.getAutoWeaponSlotCount(rank) : 0;
    for (var i = extensionCount; i < autoWeaponIds.length; i += 1) {
      if (autoWeaponIds[i]) throw new Error("当前战机品级尚未解锁该扩展自动技能槽。");
    }
    return { activeSlots: activeSlots, fixedWeaponOverrides: fixedWeaponOverrides, autoWeaponIds: autoWeaponIds };
  }

  function save(profile, shipId, input) {
    var normalized = validate(profile, String(shipId || ""), input || {});
    profile.shipSkillLoadouts = profile.shipSkillLoadouts || {};
    profile.shipSkillLoadouts[shipId] = normalized;
    return { profile: profile, shipId: shipId, loadout: cloneLoadout(normalized) };
  }

  function rememberOperation(profile, operationId) {
    profile.tacticalOperationIds = Array.isArray(profile.tacticalOperationIds) ? profile.tacticalOperationIds : [];
    var id = String(operationId || "");
    if (!id) return false;
    if (profile.tacticalOperationIds.indexOf(id) >= 0) return true;
    profile.tacticalOperationIds.push(id);
    profile.tacticalOperationIds = profile.tacticalOperationIds.slice(-64);
    return false;
  }

  function getGold(profile) {
    return scope.profile && scope.profile.getGold ? scope.profile.getGold(profile) : Math.max(0, Math.floor(Number(profile.resources && profile.resources.gold) || Number(profile.coins) || 0));
  }
  function setGold(profile, value) {
    if (scope.profile && scope.profile.setGold) return scope.profile.setGold(profile, value);
    profile.resources = profile.resources || {};
    profile.resources.gold = Math.max(0, Math.floor(Number(value) || 0));
    profile.coins = profile.resources.gold;
  }

  function prepareAutoUpgrade(profile, skillId, operationId) {
    var config = scope.tacticalLoadoutConfig || {};
    var id = String(skillId || "");
    if (!config.ALL_AUTO_SKILLS || !config.ALL_AUTO_SKILLS[id]) throw new Error("自动技能不存在。");
    profile.autoWeaponLevels = config.normalizeAutoWeaponLevels ? config.normalizeAutoWeaponLevels(profile.autoWeaponLevels) : (profile.autoWeaponLevels || {});
    if (String(operationId || "") && Array.isArray(profile.tacticalOperationIds) && profile.tacticalOperationIds.indexOf(String(operationId)) >= 0) {
      return { duplicate: true, id: id, level: Number(profile.autoWeaponLevels[id]) || 0 };
    }
    return { id: id, level: Number(profile.autoWeaponLevels[id]) || 0, config: config };
  }

  function upgradeAutoWeapon(profile, moduleId, operationId) {
    // 统一入口：所有非固定凹槽自动技能（扩展武器模块 + 战术技能）均走双材料消耗
    return upgradeAutoSkillUnified(profile, moduleId, operationId);
  }

  function upgradeAutoWeaponWithComponents(profile, moduleId, operationId) {
    // 旧名兼容，统一走新逻辑
    return upgradeAutoSkillUnified(profile, moduleId, operationId);
  }

  function upgradeAutoSkillUnified(profile, skillId, operationId) {
    var prepared = prepareAutoUpgrade(profile, skillId, operationId);
    if (prepared.duplicate) return { profile: profile, skillId: prepared.id, level: prepared.level, coreCount: 0, goldCost: 0, duplicate: true };
    // 双材料消耗：蓝模块(L1-10) + 紫核心(L7-10)
    var plan = prepared.config.getAutoSkillUpgrade ? prepared.config.getAutoSkillUpgrade(prepared.id, prepared.level) : null;
    if (!plan || !plan.ok) {
      var code = (plan && plan.code) || "UNKNOWN";
      if (code === "MAX_LEVEL") throw new Error("该自动技能已达 MAX。");
      throw new Error("该自动技能无法升级。");
    }
    // 协议类技能所有权检查
    if (prepared.config.AUTO_PROTOCOL_SKILLS && prepared.config.AUTO_PROTOCOL_SKILLS[prepared.id]
      && prepared.id !== "phase-shield" && !ownsSourceShip(profile, prepared.id)) {
      throw new Error("尚未拥有该专属自动技能。");
    }
    profile.resources = profile.resources || {};
    var inventory = profile.resources.inventory = profile.resources.inventory || {};
    // 蓝色自动武器模块（L1-10 必需）
    var blueOwned = Math.max(0, Math.floor(Number(inventory[plan.itemId] || "auto_weapon_module_purple") || 0));
    if (blueOwned < plan.itemCount) throw new Error("自动武器模块不足，还需 " + (plan.itemCount - blueOwned) + " 个。");
    // 紫色自动武器核心（L7+ 额外需要）
    var secondaryNeed = Math.max(0, plan.secondaryItemCount || 0);
    var purpleOwned = 0;
    if (secondaryNeed > 0 && plan.secondaryItemId) {
      purpleOwned = Math.max(0, Math.floor(Number(inventory[plan.secondaryItemId] || "auto_weapon_module_gold") || 0));
      if (purpleOwned < secondaryNeed) throw new Error("自动武器核心不足，还需 " + (secondaryNeed - purpleOwned) + " 个。");
    }
    if (getGold(profile) < plan.goldCost) throw new Error("金币不足。");
    // 扣减
    inventory[plan.itemId] = blueOwned - plan.itemCount;
    if (secondaryNeed > 0 && plan.secondaryItemId) {
      inventory[plan.secondaryItemId] = purpleOwned - secondaryNeed;
    }
    setGold(profile, getGold(profile) - plan.goldCost);
    profile.autoWeaponLevels[prepared.id] = plan.targetLevel;
    rememberOperation(profile, operationId);
    return { profile: profile, skillId: prepared.id, currentGrade: prepared.level, targetGrade: plan.targetLevel, blueCount: plan.itemCount, purpleCount: secondaryNeed, goldCost: plan.goldCost };
  }

  function upgradePassiveSkill(profile, skillId, operationId) {
    // 统一走同一套消耗逻辑（与扩展武器模块完全一致）
    return upgradeAutoSkillUnified(profile, skillId, operationId);
  }

  var api = {
    createEmptyLoadout: createEmptyLoadout,
    getShipRank: getShipRank,
    canUseActiveSkill: canUseActiveSkill,
    getUnlockedActiveSkillIds: getUnlockedActiveSkillIds,
    getUnlockedAutoSkillIds: getUnlockedAutoSkillIds,
    getLoadout: getLoadout,
    validate: validate,
    save: save,
    upgradeAutoWeapon: upgradeAutoWeapon,
    upgradeAutoWeaponWithComponents: upgradeAutoWeaponWithComponents,
    upgradePassiveSkill: upgradePassiveSkill
  };
  scope.tacticalLoadoutSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
