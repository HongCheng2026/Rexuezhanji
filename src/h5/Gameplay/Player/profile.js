(function registerProfile(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const assets = scope.assets || {};
  // level/exp/energy 逻辑已抽到 commanderLevel.js，此处只委托
  const CL = scope.commanderLevel || {};

  // These modules are loaded independently in the browser. Read them when a
  // profile is normalized instead of permanently capturing an empty object.
  function getTacticalConfig() { return scope.tacticalLoadoutConfig || {}; }
  function getStageHonorSystem() { return scope.stageHonorSystem || {}; }
  function getLevelConfig() { return scope.levels || {}; }

  const SAVE_VERSION = 8;
  const ENERGY_COST = CL.getEnergyCost ? CL.getEnergyCost() : 5;

  function getEnergyMax() { return CL.getDefaultEnergyMax ? CL.getDefaultEnergyMax() : 120; }
  function getEnergyRecoverMs() { return CL.getEnergyRecoverMs ? CL.getEnergyRecoverMs() : 300000; }
  function getStaminaRuleVersion() { return CL.getStaminaRuleVersion ? CL.getStaminaRuleVersion() : 2; }

  const LOBBY_DEFAULTS = {
    player: {
      uid: "",
      name: "王牌飞行员",
      signature: "保持航线，火力覆盖。",
      avatar: assets.DEFAULT_AVATAR || "",
      level: 1,
      exp: 0,
      expMax: CL.getCommanderExpToNextLevel ? CL.getCommanderExpToNextLevel(1) : 130,
      totalExp: 0,
      badge: "I",
      honorLevel: 1,
      equippedHonorLevel: 1
    },
    resources: {
      energy: getEnergyMax(),
      maxEnergy: getEnergyMax(),
      gold: 0,
      diamonds: 0,
      lastEnergyAt: Date.now()
    },
    scene: {
      pilotId: assets.DEFAULT_PILOT_ID || "pilot-b-linzhihan",
      shipId: assets.DEFAULT_SHIP_ID || "ship-b-01",
      backgroundId: assets.DEFAULT_BACKGROUND_ID || "bg-hangar-01"
    },
    owned: {
      pilots: [assets.DEFAULT_PILOT_ID || "pilot-b-linzhihan"],
      ships: [assets.DEFAULT_SHIP_ID || "ship-b-01"],
      backgrounds: [assets.DEFAULT_BACKGROUND_ID || "bg-hangar-01"]
    }
  };

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || 0));
  }

  function uniqueList(list) {
    return Array.from(new Set(Array.isArray(list) ? list.filter(Boolean) : []));
  }

  function normalizeHonorLevel(value, fallbackBadge) {
    if (CL.normalizeHonorLevel) return CL.normalizeHonorLevel(value, fallbackBadge);
    const direct = Math.floor(Number(value) || 0);
    if (direct >= 1 && direct <= 10) return direct;
    const map = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10 };
    return map[String(fallbackBadge || "").trim().toUpperCase()] || 1;
  }

  function honorLevelToText(value) {
    if (CL.honorLevelToText) return CL.honorLevelToText(value);
    const labels = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return labels[Math.max(1, Math.min(10, Math.floor(Number(value) || 1)))] || "I";
  }

  function migrateLegacyFireUpgrade(incomingVersion, upgrades, fighterUpgrades, resources, player) {
    if (incomingVersion >= 6) return;
    const fireLevel = clamp(Math.floor(Number(upgrades.fire) || 0), 0, 10);
    upgrades.fire = 0;
    if (!fireLevel) return;

    let credit = 90 * fireLevel * (fireLevel + 1) / 2;
    const maxAttackLevel = CL.getFighterMaxUpgradeLevel
      ? CL.getFighterMaxUpgradeLevel(player.level)
      : Math.min(Math.max(1, Math.floor(Number(player.level) || 1)), 60);
    let attackLevel = clamp(Math.floor(Number(fighterUpgrades.attack) || 1), 1, maxAttackLevel);
    while (attackLevel < maxAttackLevel) {
      const targetLevel = attackLevel + 1;
      const cost = CL.getFighterUpgradeCost
        ? Math.max(0, Math.floor(Number(CL.getFighterUpgradeCost("attack", targetLevel)) || 0))
        : 0;
      if (!cost || cost > credit) break;
      credit -= cost;
      attackLevel = targetLevel;
    }
    fighterUpgrades.attack = attackLevel;
    resources.gold = Math.max(0, Math.floor(Number(resources.gold) || 0)) + credit;
  }

  function migrateLegacyWeaponModules(incomingVersion, nextProfile, resources, migrationFlags) {
    if (incomingVersion >= 7 || migrationFlags.weaponModulesV7Refunded) return;
    const tacticalConfig = getTacticalConfig();
    const legacyIds = Array.isArray(tacticalConfig.LEGACY_WEAPON_MODULE_IDS)
      ? tacticalConfig.LEGACY_WEAPON_MODULE_IDS
      : [];
    const incomingModules = nextProfile.weaponModules || {};
    const refundableIds = uniqueList(incomingModules.ownedIds).filter(function keepRefundable(id) {
      return legacyIds.includes(id);
    });
    resources.gold += refundableIds.length * 50000;
    migrationFlags.weaponModulesV7Refunded = true;
  }

  function getNativeActiveSkillId(shipId) {
    const ships = Array.isArray(assets.SHIP_ASSETS) ? assets.SHIP_ASSETS : [];
    const ship = ships.find(function findShip(item) { return item.id === shipId; });
    return ship && ship.activeSkillId ? String(ship.activeSkillId) : null;
  }

  function getShipRank(nextProfile, shipId) {
    if (nextProfile && nextProfile.shipRanks && nextProfile.shipRanks[shipId]) return String(nextProfile.shipRanks[shipId]).toUpperCase();
    const ships = Array.isArray(assets.SHIP_ASSETS) ? assets.SHIP_ASSETS : [];
    const ship = ships.find(function findShip(item) { return item.id === shipId; });
    return ship && ship.rank ? String(ship.rank).toUpperCase() : "";
  }

  function normalizeActiveSkillGrades(nextProfile, incomingVersion, migrationFlags) {
    const gradeConfig = scope.skillGradeConfig || {};
    const order = gradeConfig.ACTIVE_GRADES || ["D", "C", "B", "A", "S", "SS", "SSS"];
    const activeDefinitions = scope.shipSkills && scope.shipSkills.ACTIVE_SKILLS || {};
    const incoming = nextProfile.activeSkillGrades && typeof nextProfile.activeSkillGrades === "object" ? nextProfile.activeSkillGrades : {};
    const result = {};
    Object.keys(activeDefinitions).forEach(function defaultGrade(id) {
      const candidate = String(incoming[id] || "D").toUpperCase();
      result[id] = order.includes(candidate) ? candidate : "D";
    });
    if (incomingVersion < 8 || !migrationFlags.activeSkillGradesV8Migrated) {
      const loadouts = nextProfile.shipSkillLoadouts && typeof nextProfile.shipSkillLoadouts === "object" ? nextProfile.shipSkillLoadouts : {};
      Object.keys(loadouts).forEach(function collectHighest(shipId) {
        const slots = Array.isArray(loadouts[shipId] && loadouts[shipId].activeSlots) ? loadouts[shipId].activeSlots : [];
        slots.forEach(function collect(slot) {
          const id = slot && String(slot.skillId || "");
          if (!activeDefinitions[id]) return;
          const candidate = String(slot.grade || "D").toUpperCase();
          if (order.indexOf(candidate) > order.indexOf(result[id])) result[id] = candidate;
        });
      });
      migrationFlags.activeSkillGradesV8Migrated = true;
    }
    return result;
  }

  function migrateAutoSkillLevels(nextProfile, ownedShipIds, autoWeaponLevels, incomingVersion, migrationFlags) {
    const tacticalConfig = getTacticalConfig();
    const needsMigration = incomingVersion < 8 || !migrationFlags.autoSkillLevelsV8Migrated;
    if (needsMigration) {
      const passiveIds = tacticalConfig.PASSIVE_SKILLS || {};
      const oldPassives = Array.isArray(nextProfile.passiveSkills) ? nextProfile.passiveSkills : [];
      oldPassives.forEach(function migratePassive(entry) {
        const id = entry && String(entry.skillId || "");
        if (!passiveIds[id]) return;
        autoWeaponLevels[id] = Math.max(Number(autoWeaponLevels[id]) || 0, Math.max(1, Math.min(10, Math.floor(Number(entry.grade) || 1))));
      });
    }
    // 专属自动技能跟随战机所有权持续解锁；购买战机发生在 v8 之后也必须生效。
    uniqueList(ownedShipIds).forEach(function unlockExclusive(shipId) {
      const id = getNativeActiveSkillId(shipId);
      if (tacticalConfig.AUTO_PROTOCOL_SKILLS && tacticalConfig.AUTO_PROTOCOL_SKILLS[id]) autoWeaponLevels[id] = Math.max(1, Number(autoWeaponLevels[id]) || 0);
    });
    if (needsMigration) {
      const loadouts = nextProfile.shipSkillLoadouts && typeof nextProfile.shipSkillLoadouts === "object" ? nextProfile.shipSkillLoadouts : {};
      Object.keys(loadouts).forEach(function unlockEquipped(shipId) {
        const slots = Array.isArray(loadouts[shipId] && loadouts[shipId].activeSlots) ? loadouts[shipId].activeSlots : [];
        slots.forEach(function unlock(slot) {
          const id = slot && String(slot.skillId || "");
          if (tacticalConfig.AUTO_PROTOCOL_SKILLS && tacticalConfig.AUTO_PROTOCOL_SKILLS[id]) autoWeaponLevels[id] = Math.max(1, Number(autoWeaponLevels[id]) || 0);
        });
      });
    }
    // 玩家向自动技能（扩展武器模块 + 战术技能）默认解锁 Lv1，进功能区即可直接装备，
    // 避免未解锁（Lv0）空槽导致的"只剩图标、无法装备、局内不生效"困惑。
    Object.keys(tacticalConfig.EXTENDED_WEAPON_MODULES || {}).forEach(function unlockExtended(id) {
      autoWeaponLevels[id] = Math.max(1, Number(autoWeaponLevels[id]) || 0);
    });
    Object.keys(tacticalConfig.TACTICAL_SKILLS || {}).forEach(function unlockPassive(id) {
      autoWeaponLevels[id] = Math.max(1, Number(autoWeaponLevels[id]) || 0);
    });
    migrationFlags.autoSkillLevelsV8Migrated = true;
    return autoWeaponLevels;
  }

  function normalizeTacticalLoadouts(nextProfile, ownedShipIds, currentShipId, incomingVersion, autoWeaponLevels) {
    const tacticalConfig = getTacticalConfig();
    const activeSlotCount = Math.max(1, Number(tacticalConfig.ACTIVE_SLOT_COUNT) || 4);
    const autoSlotCount = 3;
    const knownAutoWeapons = tacticalConfig.ALL_AUTO_SKILLS || tacticalConfig.AUTO_WEAPONS || {};
    const activeDefinitions = scope.shipSkills && scope.shipSkills.ACTIVE_SKILLS || {};
    const incoming = nextProfile.shipSkillLoadouts && typeof nextProfile.shipSkillLoadouts === "object"
      ? nextProfile.shipSkillLoadouts
      : {};
    const result = {};

    uniqueList(ownedShipIds).forEach(function normalizeShipLoadout(shipId) {
      const raw = incoming[shipId];
      if (!raw || typeof raw !== "object") return;
      const seenSkills = new Set();
      const seenWeapons = new Set();
      const rank = getShipRank(nextProfile, shipId);
      const extensionCount = tacticalConfig.getAutoWeaponSlotCount ? tacticalConfig.getAutoWeaponSlotCount(rank) : 0;
      const overrideCount = tacticalConfig.getFixedWeaponOverrideCount ? tacticalConfig.getFixedWeaponOverrideCount(rank) : 0;
      const activeSlots = Array.from({ length: activeSlotCount }, function normalizeActiveSlot(_, index) {
        const slot = Array.isArray(raw.activeSlots) ? raw.activeSlots[index] : null;
        const skillId = slot && String(slot.skillId || "");
        const required = scope.balance && scope.balance.getActiveSkillSlotUnlockRank ? scope.balance.getActiveSkillSlotUnlockRank(index) : (index < 2 ? "S" : "SS");
        const rankOrder = { B: 1, A: 2, S: 3, SS: 4, SSS: 5 };
        const minimumRank = activeDefinitions[skillId] && String(activeDefinitions[skillId].minimumFighterRank || "B").toUpperCase();
        if (!skillId || !activeDefinitions[skillId] || seenSkills.has(skillId) ||
          (rankOrder[rank] || 0) < (rankOrder[required] || 99) ||
          (rankOrder[rank] || 0) < (rankOrder[minimumRank] || 99)) return null;
        seenSkills.add(skillId);
        return { skillId, autoEnabled: Boolean(slot.autoEnabled) };
      });
      const fixedWeaponOverrides = Array.from({ length: 3 }, function normalizeFixed(_, index) {
        const id = Array.isArray(raw.fixedWeaponOverrides) && raw.fixedWeaponOverrides[index] ? String(raw.fixedWeaponOverrides[index]) : "";
        if (!id || !knownAutoWeapons[id] || !(Number(autoWeaponLevels[id]) > 0) || seenWeapons.has(id)) return null;
        seenWeapons.add(id);
        return id;
      });
      while (fixedWeaponOverrides.filter(Boolean).length > overrideCount) {
        const last = fixedWeaponOverrides.map(function map(v, i) { return v ? i : -1; }).filter(function keep(i) { return i >= 0; }).pop();
        if (last == null) break;
        seenWeapons.delete(fixedWeaponOverrides[last]);
        fixedWeaponOverrides[last] = null;
      }
      const autoWeaponIds = Array.from({ length: autoSlotCount }, function normalizeAutoSlot(_, index) {
        const moduleId = Array.isArray(raw.autoWeaponIds) && raw.autoWeaponIds[index]
          ? String(raw.autoWeaponIds[index])
          : "";
        if (index >= extensionCount || !moduleId || !knownAutoWeapons[moduleId] || seenWeapons.has(moduleId) || !(Number(autoWeaponLevels[moduleId]) > 0)) return null;
        seenWeapons.add(moduleId);
        return moduleId;
      });
      if (incomingVersion < 8) {
        const migratedIds = (Array.isArray(raw.activeSlots) ? raw.activeSlots : []).map(function mapOld(slot) {
          const id = slot && String(slot.skillId || "");
          return tacticalConfig.AUTO_PROTOCOL_SKILLS && tacticalConfig.AUTO_PROTOCOL_SKILLS[id] ? id : null;
        }).filter(Boolean);
        migratedIds.forEach(function placeMigrated(id) {
          if (seenWeapons.has(id) || !(Number(autoWeaponLevels[id]) > 0)) return;
          for (let i = 0; i < extensionCount; i += 1) {
            if (!autoWeaponIds[i]) { autoWeaponIds[i] = id; seenWeapons.add(id); return; }
          }
        });
      }
      result[shipId] = { activeSlots, fixedWeaponOverrides, autoWeaponIds };
    });

    if (incomingVersion < 7 && !result[currentShipId]) {
      const nativeSkillId = getNativeActiveSkillId(currentShipId);
      const activeSlots = Array.from({ length: activeSlotCount }, function emptyActive() { return null; });
      const autoWeaponIds = Array.from({ length: autoSlotCount }, function emptyWeapon() { return null; });
      const rank = getShipRank(nextProfile, currentShipId);
      const extensionCount = tacticalConfig.getAutoWeaponSlotCount ? tacticalConfig.getAutoWeaponSlotCount(rank) : 0;
      if (nativeSkillId && knownAutoWeapons[nativeSkillId] && extensionCount > 0 && Number(autoWeaponLevels[nativeSkillId]) > 0) autoWeaponIds[0] = nativeSkillId;
      result[currentShipId] = { activeSlots, fixedWeaponOverrides: [null, null, null], autoWeaponIds };
    }
    return result;
  }

  // 局外自动技能：无战机品级限制（F2），仅校验技能 ID 与品级合法性。
  function normalizePassiveSkills(raw) {
    if (!Array.isArray(raw)) return [];
    const cfg = scope.skillGradeConfig;
    return raw.map(function normalize(entry) {
      if (!entry || !entry.skillId) return null;
      const skillId = String(entry.skillId);
      const grade = entry.grade != null ? String(entry.grade) : "1";
      if (cfg) {
        const def = cfg.SKILL_GRADE_TABLES && cfg.SKILL_GRADE_TABLES[skillId];
        if (!def || def.type !== "passive") return null;
        if (!cfg.getSkillGradeStats(skillId, grade)) return null;
      }
      return { skillId, grade };
    }).filter(function keep(x) { return x; });
  }

  function normalizePilotProgression(nextProfile, ownedPilotIds) {
    const rankOrder = { B: 1, A: 2, S: 3, SS: 4, SSS: 5 };
    const pilots = Array.isArray(assets.PILOT_ASSETS) ? assets.PILOT_ASSETS : [];
    const ranks = {};
    const stars = {};
    ownedPilotIds.forEach(function normalizeOwnedPilot(id) {
      const asset = pilots.find(function findPilot(item) { return item.id === id; });
      if (!asset) return;
      const nativeRank = String(asset.rank || "B").toUpperCase();
      const savedRank = String(nextProfile.pilotRanks && nextProfile.pilotRanks[id] || nativeRank).toUpperCase();
      const reachable = nativeRank === "B"
        ? ["B", "A", "S"]
        : nativeRank === "A" ? ["A", "S"]
          : nativeRank === "SS" ? ["SS", "SSS"] : [nativeRank];
      const rank = reachable.includes(savedRank) ? savedRank : nativeRank;
      if ((rankOrder[rank] || 0) > (rankOrder[nativeRank] || 0)) ranks[id] = rank;
      if (nativeRank === "SS") {
        const starLevel = clamp(Math.floor(Number(nextProfile.pilotStars && nextProfile.pilotStars[id]) || 0), 0, 6);
        if (starLevel) stars[id] = starLevel;
      }
    });
    return { ranks, stars };
  }

  function normalizeShipProgression(nextProfile, ownedShipIds) {
    const rankOrder = { B: 1, A: 2, S: 3, SS: 4, SSS: 5 };
    const ships = Array.isArray(assets.SHIP_ASSETS) ? assets.SHIP_ASSETS : [];
    const ranks = {};
    const stars = {};
    ownedShipIds.forEach(function normalizeOwnedShip(id) {
      const asset = ships.find(function findShip(item) { return item.id === id; });
      if (!asset) return;
      const nativeRank = String(asset.rank || "B").toUpperCase();
      const savedRank = String(nextProfile.shipRanks && nextProfile.shipRanks[id] || nativeRank).toUpperCase();
      const reachable = nativeRank === "B"
        ? ["B", "A", "S"]
        : nativeRank === "A" ? ["A", "S"]
          : nativeRank === "SS" ? ["SS", "SSS"] : [nativeRank];
      const rank = reachable.includes(savedRank) ? savedRank : nativeRank;
      if ((rankOrder[rank] || 0) > (rankOrder[nativeRank] || 0)) ranks[id] = rank;
      if (nativeRank === "SS") {
        const starLevel = clamp(Math.floor(Number(nextProfile.shipStars && nextProfile.shipStars[id]) || 0), 0, 6);
        if (starLevel) stars[id] = starLevel;
      }
    });
    return { ranks, stars };
  }

  function normalizeProfile(nextProfile = {}) {
    const incomingVersion = Number(nextProfile.saveVersion) || 0;
    const incomingStaminaRuleVersion = Math.max(0, Math.floor(Number(nextProfile.staminaRuleVersion) || 0));
    const incomingPlayer = nextProfile.player || {};
    let player = { ...LOBBY_DEFAULTS.player, ...incomingPlayer };
    if (incomingVersion < 5 && (player.avatar === "guide.png" || (Number(player.level) === 56 && Number(player.exp) === 12080))) {
      player = { ...LOBBY_DEFAULTS.player };
    }
    const maxLevel = CL.getCommanderMaxLevel ? CL.getCommanderMaxLevel() : 60;
    player.level = clamp(Math.floor(Number(player.level) || LOBBY_DEFAULTS.player.level), 1, maxLevel);
    // 委托 commanderLevel 处理等级规范化（从 totalExp 反推等级、exp、expMax）
    if (CL.normalizeCommanderLevel) CL.normalizeCommanderLevel(player);
    player.avatar = player.avatar && player.avatar !== "guide.png" ? player.avatar : LOBBY_DEFAULTS.player.avatar;
    player.uid = String(player.uid || "").replace(/\D/g, "").slice(0, 18);
    player.signature = String(player.signature || LOBBY_DEFAULTS.player.signature).trim().slice(0, 36) || LOBBY_DEFAULTS.player.signature;
    player.honorLevel = normalizeHonorLevel(player.honorLevel, player.badge);
    player.badge = honorLevelToText(player.honorLevel);
    const equippedHonorLevel = Math.floor(Number(incomingPlayer.equippedHonorLevel) || 0);
    player.equippedHonorLevel = equippedHonorLevel >= 1
      ? clamp(equippedHonorLevel, 1, player.honorLevel)
      : player.honorLevel;

    const resources = { ...LOBBY_DEFAULTS.resources, ...(nextProfile.resources || {}) };
    resources.maxEnergy = CL.getMaxEnergyByLevel ? CL.getMaxEnergyByLevel(player.level) : getEnergyMax();
    // 购买获得的体力允许超过自然恢复上限；自然恢复在达到上限后停止。
    resources.energy = Math.max(0, Math.floor(Number(resources.energy) || 0));
    resources.diamonds = Math.max(0, Math.floor(Number(resources.diamonds) || 0));
    resources.gold = Math.max(0, Math.floor(Number(resources.gold ?? nextProfile.coins) || 0));
    resources.lastEnergyAt = Math.floor(Number(resources.lastEnergyAt) || Date.now());
    resources.inventory = resources.inventory && typeof resources.inventory === "object" ? { ...resources.inventory } : {};
    const legacyBlackMoonCopies = Math.max(0, Math.floor(Number(nextProfile.pilotCopies && nextProfile.pilotCopies["pilot-ss-heiyue"]) || 0));
    if (legacyBlackMoonCopies) {
      resources.inventory.pilot_ss_heiyue_copy = Math.max(
        legacyBlackMoonCopies,
        Math.max(0, Math.floor(Number(resources.inventory.pilot_ss_heiyue_copy) || 0))
      );
    }
    const legacyFighterModules = Math.max(0, Math.floor(Number(resources.inventory.sss_weapon_module) || 0));
    if (legacyFighterModules) {
      resources.inventory.sss_fighter_module = Math.max(0, Math.floor(Number(resources.inventory.sss_fighter_module) || 0)) + legacyFighterModules;
    }
    delete resources.inventory.sss_weapon_module;

    const upgrades = { fire: 0, armor: 0, engine: 0, bounty: 0, ...(nextProfile.upgrades || {}) };
    const fighterUpgrades = { attack: 1, armorPenetration: 1, hp: 1, ...(nextProfile.fighterUpgrades || {}) };
    migrateLegacyFireUpgrade(incomingVersion, upgrades, fighterUpgrades, resources, player);
    const migrationFlags = { ...(nextProfile.migrationFlags || {}) };
    migrateLegacyWeaponModules(incomingVersion, nextProfile, resources, migrationFlags);

    const starterRosterVersion = Math.max(0, Math.floor(Number(nextProfile.starterRosterVersion) || 0));
    const incomingOwnedPilots = uniqueList((nextProfile.owned && nextProfile.owned.pilots) || []).filter(function migrateLegacyStarterPilot(id) {
      return starterRosterVersion >= 2 || id !== "pilot-s-lingyan";
    });
    const incomingOwnedShips = uniqueList((nextProfile.owned && nextProfile.owned.ships) || []).filter(function migrateLegacyStarterShip(id) {
      return starterRosterVersion >= 2 || id !== "ship-a-06";
    });
    const owned = {
      pilots: uniqueList([...(LOBBY_DEFAULTS.owned.pilots || []), ...incomingOwnedPilots]),
      ships: uniqueList([...(LOBBY_DEFAULTS.owned.ships || []), ...incomingOwnedShips]),
      backgrounds: uniqueList([...(LOBBY_DEFAULTS.owned.backgrounds || []), ...((nextProfile.owned && nextProfile.owned.backgrounds) || [])])
    };

    const scene = { ...LOBBY_DEFAULTS.scene, ...(nextProfile.scene || {}) };
    scene.pilotId = owned.pilots.includes(scene.pilotId) ? scene.pilotId : LOBBY_DEFAULTS.scene.pilotId;
    scene.shipId = owned.ships.includes(scene.shipId) ? scene.shipId : LOBBY_DEFAULTS.scene.shipId;
    scene.backgroundId = owned.backgrounds.includes(scene.backgroundId) ? scene.backgroundId : LOBBY_DEFAULTS.scene.backgroundId;
    const tacticalConfig = getTacticalConfig();
    let autoWeaponLevels = tacticalConfig.normalizeAutoWeaponLevels
      ? tacticalConfig.normalizeAutoWeaponLevels(nextProfile.autoWeaponLevels)
      : { weapon_module_04: 0, weapon_module_05: 1, weapon_module_06: 1 };
    autoWeaponLevels = migrateAutoSkillLevels(nextProfile, owned.ships, autoWeaponLevels, incomingVersion, migrationFlags);
    const activeSkillGrades = normalizeActiveSkillGrades(nextProfile, incomingVersion, migrationFlags);
    const shipSkillLoadouts = normalizeTacticalLoadouts(nextProfile, owned.ships, scene.shipId, incomingVersion, autoWeaponLevels);
    const pilotProgression = normalizePilotProgression(nextProfile, owned.pilots);
    const shipProgression = normalizeShipProgression(nextProfile, owned.ships);
    const legacyCodexEntries = uniqueList(nextProfile.codexBonds);
    const incomingCodex = nextProfile.codex && typeof nextProfile.codex === "object" ? nextProfile.codex : {};
    const codex = {
      activatedUnits: uniqueList([
        ...(Array.isArray(incomingCodex.activatedUnits) ? incomingCodex.activatedUnits : []),
        ...legacyCodexEntries.filter(function isLegacyUnit(id) { return String(id).indexOf("unit:") === 0; })
          .map(function stripLegacyUnitPrefix(id) { return String(id).slice(5); })
      ]).filter(function keepOwnedCodexUnit(id) {
        return owned.pilots.includes(id) || owned.ships.includes(id);
      }),
      activatedBonds: uniqueList([
        ...(Array.isArray(incomingCodex.activatedBonds) ? incomingCodex.activatedBonds : []),
        ...legacyCodexEntries.filter(function isLegacyBond(id) { return String(id).indexOf("unit:") !== 0; })
      ])
    };

    const normalized = {
      ...nextProfile,
      saveVersion: SAVE_VERSION,
      staminaRuleVersion: Math.max(getStaminaRuleVersion(), incomingStaminaRuleVersion),
      starterRosterVersion: 2,
      coins: resources.gold,
      completed: Array.isArray(nextProfile.completed) ? nextProfile.completed : [],
      upgrades,
      fighterUpgrades,
      pilotRanks: pilotProgression.ranks,
      pilotStars: pilotProgression.stars,
      shipRanks: shipProgression.ranks,
      shipStars: shipProgression.stars,
      shipSkillLoadouts,
      activeSkillGrades,
      passiveSkills: [],
      autoWeaponLevels,
      migrationFlags,
      tacticalOperationIds: uniqueList(nextProfile.tacticalOperationIds).slice(-64),
      player,
      resources,
      scene,
      owned,
      codex,
      ratings: nextProfile.ratings || {},
      localEarned: nextProfile.localEarned || { gold: 0, diamonds: 0 }
      ,usedRedeemCodes: uniqueList(nextProfile.usedRedeemCodes)
      ,progress: { clearedStageIds: uniqueList(nextProfile.progress?.clearedStageIds), clearedChapterIds: uniqueList(nextProfile.progress?.clearedChapterIds).map(Number).filter(Number.isFinite), stageStars: nextProfile.progress?.stageStars || {}, stageHonors: nextProfile.progress?.stageHonors || {}, storySeenSceneIds: uniqueList(nextProfile.progress?.storySeenSceneIds), perfectClearCount: Math.max(0, Number(nextProfile.progress?.perfectClearCount) || 0), noDamageBossClearCount: Math.max(0, Number(nextProfile.progress?.noDamageBossClearCount) || 0), clearCount: Math.max(0, Number(nextProfile.progress?.clearCount) || 0), starTotal: Math.max(0, Number(nextProfile.progress?.starTotal) || 0), enemyKillTotal: Math.max(0, Number(nextProfile.progress?.enemyKillTotal) || 0), clearTotalBossKills: Math.max(0, Number(nextProfile.progress?.clearTotalBossKills) || 0), endlessBestKills: Math.max(0, Number(nextProfile.progress?.endlessBestKills) || 0), endlessBestSurvivalSeconds: Math.max(0, Number(nextProfile.progress?.endlessBestSurvivalSeconds) || 0), tacticalOpsCount: Math.max(0, Number(nextProfile.progress?.tacticalOpsCount) || 0), loginDays: Math.max(0, Number(nextProfile.progress?.loginDays) || 0) }
    };
    delete normalized.weaponModules;
    delete normalized.pilotCopies;
    delete normalized.codexBonds;

    const stageHonorSystem = getStageHonorSystem();
    if (stageHonorSystem.migrateProfileStageHonors) {
      stageHonorSystem.migrateProfileStageHonors(normalized, getLevelConfig().levels || []);
    }
    recoverEnergy(normalized);
    for (const statType of ["attack", "armorPenetration", "hp"]) {
      const maxUpgrade = CL.getFighterMaxUpgradeLevel ? CL.getFighterMaxUpgradeLevel(normalized.player.level) : 60;
      normalized.fighterUpgrades[statType] = clamp(Math.floor(Number(normalized.fighterUpgrades[statType]) || 1), 1, maxUpgrade);
    }
    return normalized;
  }

  function createProfile(input = {}) {
    const tacticalConfig = getTacticalConfig();
    return normalizeProfile({
      saveVersion: SAVE_VERSION,
      coins: 0,
      unlockedLevel: 1,
      completed: [],
      upgrades: { fire: 0, armor: 0, engine: 0, bounty: 0 },
      fighterUpgrades: { attack: 1, armorPenetration: 1, hp: 1 },
      shipSkillLoadouts: {},
      activeSkillGrades: {
        "active-summon-wingman": "D",
        "active-decoy": "D",
        "active-chain-lightning": "D",
        "active-black-hole": "D"
      },
      autoWeaponLevels: tacticalConfig.createDefaultAutoWeaponLevels
        ? tacticalConfig.createDefaultAutoWeaponLevels()
        : { weapon_module_04: 0, weapon_module_05: 1, weapon_module_06: 1 },
      migrationFlags: { weaponModulesV7Refunded: true, activeSkillGradesV8Migrated: true, autoSkillLevelsV8Migrated: true },
      player: { ...LOBBY_DEFAULTS.player },
      resources: { ...LOBBY_DEFAULTS.resources },
      scene: { ...LOBBY_DEFAULTS.scene },
      owned: { ...LOBBY_DEFAULTS.owned },
      ...input
    });
  }

  function recoverEnergy(targetProfile, now = Date.now()) {
    // Single-writer rule: route through profileStore (which delegates to the
    // commander-level recovery and bumps the derived-cache version). Falls back
    // to the inline commander-level recovery when the store module is absent
    // (e.g. isolated unit tests that don't register profileStore).
    if (scope.profileStore && scope.profileStore.recoverEnergy) return scope.profileStore.recoverEnergy(targetProfile, now);
    if (CL.recoverEnergy) return CL.recoverEnergy(targetProfile, now);
    const resources = targetProfile.resources;
    const level = targetProfile.player && targetProfile.player.level;
    resources.maxEnergy = CL.getMaxEnergyByLevel ? CL.getMaxEnergyByLevel(level) : Math.max(ENERGY_COST, Math.floor(Number(resources.maxEnergy) || getEnergyMax()));
    resources.energy = Math.max(0, Math.floor(Number(resources.energy) || 0));
    resources.lastEnergyAt = Math.floor(Number(resources.lastEnergyAt) || now);
    if (resources.energy >= resources.maxEnergy) { resources.lastEnergyAt = now; return targetProfile; }
    const recoverMs = getEnergyRecoverMs();
    const recovered = Math.floor((now - resources.lastEnergyAt) / recoverMs);
    if (recovered > 0) {
      resources.energy = clamp(resources.energy + recovered, 0, resources.maxEnergy);
      resources.lastEnergyAt += recovered * recoverMs;
      if (resources.energy >= resources.maxEnergy) resources.lastEnergyAt = now;
    }
    return targetProfile;
  }

  function getGold(profile) {
    recoverEnergy(profile);
    return Math.max(0, Math.floor(Number(profile.resources.gold ?? profile.coins) || 0));
  }

  function setGold(profile, value) {
    // Single-writer rule: route through profileStore (falls back to inline when
    // the store module is not loaded, e.g. isolated unit tests).
    if (scope.profileStore && scope.profileStore.setGold) return scope.profileStore.setGold(profile, value);
    profile.resources.gold = Math.max(0, Math.floor(Number(value) || 0));
    profile.coins = profile.resources.gold;
    return profile;
  }

  function spendEnergy(profile, amount) {
    if (scope.profileStore && scope.profileStore.spendEnergy) return scope.profileStore.spendEnergy(profile, amount);
    recoverEnergy(profile);
    profile.resources.energy = Math.max(0, Math.floor(Number(profile.resources.energy) || 0));
    if (profile.resources.energy < amount) return false;
    profile.resources.energy -= amount;
    return true;
  }

  const api = {
    SAVE_VERSION,
    LOBBY_DEFAULTS,
    uniqueList,
    normalizeHonorLevel,
    honorLevelToText,
    migrateLegacyFireUpgrade,
    migrateLegacyWeaponModules,
    normalizeTacticalLoadouts,
    normalizeProfile,
    createProfile,
    recoverEnergy,
    getGold,
    setGold,
    spendEnergy
  };

  scope.profile = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
