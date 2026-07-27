(function registerFighterUpgradeApi(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  var ARCHIVE_TOKEN_BY_GRADE = Object.freeze({
    C: "active_skill_module_c",
    B: "active_skill_module_b",
    A: "active_skill_module_a",
    S: "active_skill_module_s",
    SS: "active_skill_module_ss",
    SSS: "active_skill_module_sss"
  });

  function getLevels(profile) {
    var f = (profile && profile.fighterUpgrades) || {};
    return {
      attack: Math.max(1, Math.floor(Number(f.attack) || 1)),
      armorPenetration: Math.max(1, Math.floor(Number(f.armorPenetration) || 1)),
      hp: Math.max(1, Math.floor(Number(f.hp) || 1))
    };
  }

  function getUpgradeResult(profile, statType) {
    var levels = getLevels(profile);
    var current = levels[statType] || 1;
    var targetLevel = current + 1;
    var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
    var levelsConfig = scope.levels || {};
    var cost = levelsConfig.getFighterUpgradeCost && levelsConfig.getFighterUpgradeCost(statType, targetLevel);
    if (!cost) return { canUpgrade: false, reason: "MAX_LEVEL", targetLevel: targetLevel };
    if (targetLevel > commanderLevel) return { canUpgrade: false, reason: "COMMANDER_LEVEL_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
    var gold = Number(profile.resources && profile.resources.gold || (profile.resources && profile.resources.coins) || profile.coins || 0);
    if (gold < cost) return { canUpgrade: false, reason: "GOLD_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
    return { canUpgrade: true, targetLevel: targetLevel, cost: cost };
  }

  function applyUpgrade(profile, statType, targetLevel) {
    if (!profile) return;
    // Single-writer rule: profile.fighterUpgrades is only mutated by
    // profileStore.applyFighterUpgrade (falls back to inline if not loaded).
    if (scope.profileStore && scope.profileStore.applyFighterUpgrade) {
      scope.profileStore.applyFighterUpgrade(profile, statType, targetLevel);
      return;
    }
    profile.fighterUpgrades = profile.fighterUpgrades || {};
    profile.fighterUpgrades[statType] = Math.max(1, Math.floor(Number(targetLevel) || 1));
  }

  function generateBattleLoadout(profile) {
    var combatStats = scope.combatStats || {};
    return combatStats.generateBattleLoadout ? combatStats.generateBattleLoadout(profile) : null;
  }

  function calculateActivePower(profile) {
    var pc = scope.powerCalculator || {};
    return pc.calculateActivePower ? pc.calculateActivePower(profile) : 0;
  }

  function calculateTotalPower(profile) {
    var pc = scope.powerCalculator || {};
    return pc.calculateTotalPower ? pc.calculateTotalPower(profile) : { total: 0, pilotTotal: 0, shipTotal: 0, sharedUpgradePower: 0, pilots: [], ships: [] };
  }

  function createDefaultLevels() {
    return { attack: 1, armorPenetration: 1, hp: 1 };
  }

  function getActiveGradeUpgradePlan(profile, shipId, slotIndex, targetGrade) {
    targetGrade = String(targetGrade || "").toUpperCase();
    if (!ARCHIVE_TOKEN_BY_GRADE[targetGrade]) return { ok: false, reason: "INVALID_TARGET_GRADE" };
    var gradeConfig = scope.skillGradeConfig;
    if (!gradeConfig) return { ok: false, reason: "GRADE_CONFIG_UNAVAILABLE" };
    var tactical = scope.tacticalLoadoutSystem;
    if (!tactical) return { ok: false, reason: "LOADOUT_SYSTEM_UNAVAILABLE" };
    var idx = gradeConfig.activeGradeIndex(targetGrade);
    if (idx < 0) return { ok: false, reason: "INVALID_TARGET_GRADE" };
    var loadout = tactical.getLoadout(profile, shipId);
    var slot = loadout && Array.isArray(loadout.activeSlots) ? loadout.activeSlots[Math.floor(Number(slotIndex) || 0)] : null;
    if (!slot || !slot.skillId) return { ok: false, reason: "SLOT_EMPTY" };
    var activeGrades = profile.activeSkillGrades && typeof profile.activeSkillGrades === "object" ? profile.activeSkillGrades : {};
    var currentGrade = activeGrades[slot.skillId] ? String(activeGrades[slot.skillId]).toUpperCase() : "D";
    var currentIdx = gradeConfig.activeGradeIndex(currentGrade);
    if (currentIdx < 0) return { ok: false, reason: "INVALID_CURRENT_GRADE" };
    if (currentIdx >= idx) return { ok: false, reason: "ALREADY_AT_OR_ABOVE" };
    if (idx !== currentIdx + 1) return { ok: false, reason: "GRADE_SEQUENCE_INVALID" };
    var ships = scope.assets && Array.isArray(scope.assets.SHIP_ASSETS) ? scope.assets.SHIP_ASSETS : [];
    var ship = ships.find(function (s) { return s.id === shipId; }) || null;
    var shipRank = profile.shipRanks && profile.shipRanks[shipId]
      ? String(profile.shipRanks[shipId]).toUpperCase()
      : (ship && ship.rank ? String(ship.rank).toUpperCase() : "");
    var maxGrade = gradeConfig.getMaxActiveGradeForTier(shipRank);
    if (!maxGrade) return { ok: false, reason: "SHIP_TIER_UNKNOWN" };
    if (idx > gradeConfig.activeGradeIndex(maxGrade)) return { ok: false, reason: "SHIP_TIER_LIMIT" };
    var tokenId = ARCHIVE_TOKEN_BY_GRADE[targetGrade];
    var owned = Math.max(0, Math.floor(Number(profile.resources && profile.resources.inventory && profile.resources.inventory[tokenId]) || 0));
    if (owned < 1) return { ok: false, reason: "TOKEN_NOT_OWNED", tokenId: tokenId, targetGrade: targetGrade };
    var nextLoadout = {
      activeSlots: loadout.activeSlots.map(function (s) {
        return s ? { skillId: s.skillId, autoEnabled: Boolean(s.autoEnabled) } : null;
      }),
      fixedWeaponOverrides: (loadout.fixedWeaponOverrides || [null, null, null]).map(function (id) { return id || null; }),
      autoWeaponIds: (loadout.autoWeaponIds || []).map(function (id) { return id || null; })
    };
    var nextActiveSkillGrades = Object.assign({}, activeGrades);
    nextActiveSkillGrades[slot.skillId] = targetGrade;
    return {
      ok: true,
      tokenId: tokenId,
      targetGrade: targetGrade,
      currentGrade: currentGrade,
      skillId: slot.skillId,
      shipRank: shipRank,
      nextLoadout: nextLoadout,
      nextActiveSkillGrades: nextActiveSkillGrades
    };
  }

  function getPassiveUpgradePlan(profile, skillId) {
    var gradeConfig = scope.skillGradeConfig;
    if (!gradeConfig) return { ok: false, reason: "GRADE_CONFIG_UNAVAILABLE" };
    var tacticalConfig = scope.tacticalLoadoutConfig || {};
    var autoDef = tacticalConfig.ALL_AUTO_SKILLS && tacticalConfig.ALL_AUTO_SKILLS[skillId];
    if (!autoDef || tacticalConfig.AUTO_WEAPONS && tacticalConfig.AUTO_WEAPONS[skillId]) return { ok: false, reason: "NOT_AUTO_SKILL" };
    var levels = tacticalConfig.normalizeAutoWeaponLevels ? tacticalConfig.normalizeAutoWeaponLevels(profile.autoWeaponLevels) : (profile.autoWeaponLevels || {});
    var maxLevel = Math.max(1, Number(autoDef.maxLevel) || Number(tacticalConfig.AUTO_SKILL_MAX_LEVEL) || 10);
    var currentGrade = Math.max(0, Math.min(maxLevel, Math.floor(Number(levels[skillId]) || 0)));
    if (currentGrade >= maxLevel) return { ok: false, reason: "MAX_GRADE", skillId: skillId, currentGrade: currentGrade };
    var cost = gradeConfig.getPassiveUpgradeCost(skillId, currentGrade);
    if (!cost) return { ok: false, reason: "COST_UNAVAILABLE", skillId: skillId };
    var inv = profile.resources && profile.resources.inventory ? profile.resources.inventory : {};
    var ownedItems = Math.max(0, Math.floor(Number(inv[cost.itemId]) || 0));
    var gold = Math.max(0, Number(profile.resources && profile.resources.gold || 0));
    var canUpgrade = ownedItems >= cost.itemCount && gold >= cost.gold;
    return {
      ok: canUpgrade,
      reason: canUpgrade ? "" : (!canUpgrade && ownedItems < cost.itemCount ? "ITEM_NOT_ENOUGH" : "GOLD_NOT_ENOUGH"),
      skillId: skillId,
      currentGrade: currentGrade,
      targetGrade: cost.targetLevel,
      itemId: cost.itemId,
      itemCount: cost.itemCount,
      itemOwned: ownedItems,
      goldCost: cost.gold,
      goldOwned: gold
    };
  }

  var api = {
    getLevels: getLevels,
    getUpgradeResult: getUpgradeResult,
    applyUpgrade: applyUpgrade,
    generateBattleLoadout: generateBattleLoadout,
    calculateActivePower: calculateActivePower,
    calculateTotalPower: calculateTotalPower,
    createDefaultLevels: createDefaultLevels,
    getActiveGradeUpgradePlan: getActiveGradeUpgradePlan,
    getPassiveUpgradePlan: getPassiveUpgradePlan
  };

  scope.fighterUpgradeApi = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
