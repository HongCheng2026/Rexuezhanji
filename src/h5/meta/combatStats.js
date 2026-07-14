(function registerCombatStats(root) {
  const scope = root.RXGame || (root.RXGame = {});

  // 本地测试开关：为 true 时解锁全部关卡（不解锁则仅依赖 unlockedLevel）
  const LOCAL_TEST_UNLOCK_ALL_LEVELS = false;

  // 本地测试开关：为 true 时全部战姬视为已拥有
  const LOCAL_TEST_UNLOCK_ALL_PILOTS = false;

  // 本地测试开关：为 true 时全部战机视为已拥有
  const LOCAL_TEST_UNLOCK_ALL_SHIPS = false;

  function scoreStats(stats) {
    stats = stats || {};
    return Math.max(0, Math.round(
      (Number(stats.attack) || 0) * 10 +
      (Number(stats.maxHp) || 0) * 2 +
      (Number(stats.armorPenetration) || 0) * 1800
    ));
  }

  function calculateUnitPower(asset, type) {
    if (!asset || (type !== "pilot" && type !== "ship")) return 0;
    var balance = scope.balance || {};
    var rarityStats = type === "pilot" ? balance.PILOT_RARITY_STATS : balance.FIGHTER_RARITY_STATS;
    var rarity = rarityStats && rarityStats[asset.rank] ? rarityStats[asset.rank] : {};
    return scoreStats({
      attack: Number(asset.damage) || 0,
      maxHp: Number(asset.hp) || 0,
      armorPenetration: Number(rarity.armorPenetration) || Number(asset.armorPenetration) || 0
    });
  }

  /**
   * 从 profile 生成 BattleLoadout 出战属性快照。
   * 养成系统调用此函数，战斗系统只消费返回的快照，不直接读 profile。
   *
   * @param {Object} profile - 已通过 shared/profile.normalizeProfile() 规范化后的存档
   * @returns {Object} BattleLoadout
   */
  function generateBattleLoadout(profile) {
    const assets = scope.assets;
    const balance = scope.balance;
    const levelsConfig = scope.levels;

    // --- 战姬 ---
    const pilot =
      assets.PILOT_ASSETS.find(function (a) { return a.id === profile.scene.pilotId; }) ||
      assets.PILOT_ASSETS.find(function (a) { return a.id === assets.DEFAULT_PILOT_ID; });

    // --- 战机 ---
    const ship =
      assets.SHIP_ASSETS.find(function (a) { return a.id === profile.scene.shipId; }) ||
      assets.SHIP_ASSETS.find(function (a) { return a.id === assets.DEFAULT_SHIP_ID; });

    // --- 强化 ---
    var ups = profile.upgrades || {};
    var fighterUps = profile.fighterUpgrades || {};

    // --- 破甲率 ---
    var pilotPen = (balance.PILOT_RARITY_STATS && balance.PILOT_RARITY_STATS[pilot.rank])
      ? balance.PILOT_RARITY_STATS[pilot.rank].armorPenetration : 0;
    var shipPen = (balance.FIGHTER_RARITY_STATS && balance.FIGHTER_RARITY_STATS[ship.rank])
      ? balance.FIGHTER_RARITY_STATS[ship.rank].armorPenetration : 0;
    var upgradePenPerLevel = (levelsConfig.FIGHTER_UPGRADE_STAT_GAIN &&
      levelsConfig.FIGHTER_UPGRADE_STAT_GAIN.armorPenetrationPerLevel) || 0.001;
    var upgradePen = (fighterUps.armorPenetration || 1) * upgradePenPerLevel;
    var totalArmorPenetration = pilotPen + shipPen + upgradePen;

    // --- 攻击 ---
    var attackPerLevel = (levelsConfig.FIGHTER_UPGRADE_STAT_GAIN &&
      levelsConfig.FIGHTER_UPGRADE_STAT_GAIN.attackPerLevel) || 1;
    var fighterAttackBonus = Math.max(0, (fighterUps.attack || 1) - 1) * attackPerLevel;
    var baseAttack = (pilot.damage || 0) + (ship.damage || 0);
    var attack = Math.round(baseAttack + fighterAttackBonus);

    // --- 生命 ---
    var hpPerLevel = (levelsConfig.FIGHTER_UPGRADE_STAT_GAIN &&
      levelsConfig.FIGHTER_UPGRADE_STAT_GAIN.hpPerLevel) || 10;
    var armorHpBonus = (ups.armor || 0) * 20;
    var fighterHpBonus = Math.max(0, (fighterUps.hp || 1) - 1) * hpPerLevel;
    var pilotHpBonus = Math.max(0, Number(pilot.hp) || 0);
    var shipHpBonus = Math.max(0, Number(ship.hp) || 0);
    var maxHp = 100 + pilotHpBonus + shipHpBonus + armorHpBonus + fighterHpBonus;
    var maxLives = Math.max(1, Math.ceil(maxHp / 100));

    // --- 移动速度 ---
    var moveSpeed = 300 + (ups.engine || 0) * 15;

    // --- 金币加成 ---
    var coinBonus = 1 + (ups.bounty || 0) * 0.12;

    // --- 武器伤害倍率 ---
    var weaponDamageMultiplier = 1;

    // --- 初始武器等级 ---
    var primaryWeapon = ship.primaryWeapon || "spread";
    var initialWeapons = balance && balance.getInitialWeaponsForRank
      ? balance.getInitialWeaponsForRank(ship.rank)
      : { spread: ship.rank === "S" ? 3 : ship.rank === "A" ? 2 : 1, laser: ship.rank === "S" ? 3 : ship.rank === "A" ? 2 : 1, missile: ship.rank === "S" ? 3 : ship.rank === "A" ? 2 : 1 };
    var passiveSkill = ship.rank === "S" ? (ship.passiveSkill || null) : null;
    var activeSlots = Array.isArray(ship.activeSkills) ? ship.activeSkills.slice(0, 4) : [];
    while (activeSlots.length < 4) activeSlots.push(null);
    var passiveSlots = Array.isArray(ship.passiveSkills) ? ship.passiveSkills.slice(0, 4) : (passiveSkill ? [passiveSkill] : []);
    var insuranceRule = scope.battleRules && scope.battleRules.getInsuranceRule
      ? scope.battleRules.getInsuranceRule(ship.rank)
      : { maxCharges: ship.rank === "S" ? 4 : ship.rank === "A" ? 3 : 2, initialCharges: 1, rechargeSeconds: 18 };
    var configuredInsurance = ship.insuranceSkill || null;
    var insurance = Object.assign({
      id: "emergency-clear",
      name: "紧急清屏",
      description: "清除敌方子弹和普通敌机。"
    }, configuredInsurance || {}, insuranceRule);
    var skillPierceSlots = passiveSkill && passiveSkill.pierceSlots ? passiveSkill.pierceSlots : {};
    var weaponPierceSlots = {
      spread: Math.max(0, Math.floor(Number(skillPierceSlots.spread) || 0)),
      laser: Math.max(0, Math.floor(Number(skillPierceSlots.laser) || 0)),
      missile: Math.max(0, Math.floor(Number(skillPierceSlots.missile) || 0))
    };
    var moduleRule = balance && balance.FIGHTER_BATTLE_RULES ? balance.FIGHTER_BATTLE_RULES[ship.rank] : null;
    var moduleSlots = moduleRule ? Math.max(0, Math.floor(Number(moduleRule.moduleSlots) || 0)) : 0;
    var moduleState = profile.weaponModules || {};
    var ownedModuleIds = Array.isArray(moduleState.ownedIds) ? moduleState.ownedIds : [];
    var equippedModuleId = moduleSlots > 0 && ownedModuleIds.indexOf(moduleState.equippedId) >= 0
      ? moduleState.equippedId
      : null;
    var equippedWeaponModule = equippedModuleId && balance && balance.WEAPON_MODULES
      ? balance.WEAPON_MODULES[equippedModuleId] || null
      : null;
    if (equippedWeaponModule && passiveSlots.length < 4) {
      passiveSlots.push({
        id: equippedWeaponModule.id,
        name: equippedWeaponModule.name,
        description: equippedWeaponModule.description || equippedWeaponModule.effectText || "武器模块",
        icon: equippedWeaponModule.icon || ""
      });
    }

    return {
      pilot: {
        id: pilot.id,
        name: pilot.name,
        rank: pilot.rank,
        damage: pilot.damage,
        hp: pilotHpBonus,
        armorPenetration: pilotPen,
        avatarSrc: pilot.src
      },
      ship: {
        id: ship.id,
        name: ship.name,
        rank: ship.rank,
        damage: ship.damage,
        hp: shipHpBonus,
        armorPenetration: shipPen,
        src: ship.src,
        primaryWeapon: primaryWeapon,
        passiveSkill: passiveSkill,
        insuranceSkill: insurance
      },
      upgrades: {
        fire: 0,
        armor: ups.armor || 0,
        engine: ups.engine || 0,
        bounty: ups.bounty || 0
      },
      fighterUpgrades: {
        attack: fighterUps.attack || 1,
        armorPenetration: fighterUps.armorPenetration || 1,
        hp: fighterUps.hp || 1
      },
      finalStats: {
        maxHp: maxHp,
        maxLives: maxLives,
        attack: attack,
        armorPenetration: totalArmorPenetration,
        moveSpeed: moveSpeed,
        coinBonus: coinBonus,
        weaponDamageMultiplier: weaponDamageMultiplier
      },
      initialWeapons: initialWeapons,
      weaponPierceSlots: weaponPierceSlots,
      abilities: {
        activeSlots: activeSlots,
        insurance: insurance,
        passiveSlots: passiveSlots
      },
      moduleSlots: moduleSlots,
      equippedWeaponModule: equippedWeaponModule
    };
  }

  function calculateActivePower(profile) {
    var loadout = generateBattleLoadout(profile);
    return scoreStats(loadout && loadout.finalStats);
  }

  function calculateTotalPower(profile) {
    var assets = scope.assets || {};
    var pilotAssets = Array.isArray(assets.PILOT_ASSETS) ? assets.PILOT_ASSETS : [];
    var shipAssets = Array.isArray(assets.SHIP_ASSETS) ? assets.SHIP_ASSETS : [];
    var owned = profile && profile.owned ? profile.owned : {};
    var pilotIds = Array.from(new Set(Array.isArray(owned.pilots) ? owned.pilots : []));
    var shipIds = Array.from(new Set(Array.isArray(owned.ships) ? owned.ships : []));
    var pilots = pilotIds.map(function (id) {
      var asset = pilotAssets.find(function (candidate) { return candidate.id === id; });
      return asset ? { id: asset.id, name: asset.name, power: calculateUnitPower(asset, "pilot") } : null;
    }).filter(Boolean);
    var ships = shipIds.map(function (id) {
      var asset = shipAssets.find(function (candidate) { return candidate.id === id; });
      return asset ? { id: asset.id, name: asset.name, power: calculateUnitPower(asset, "ship") } : null;
    }).filter(Boolean);
    var pilotTotal = pilots.reduce(function (sum, item) { return sum + item.power; }, 0);
    var shipTotal = ships.reduce(function (sum, item) { return sum + item.power; }, 0);

    var defaultPilot = pilotAssets.find(function (asset) { return asset.id === assets.DEFAULT_PILOT_ID; }) || pilotAssets[0];
    var defaultShip = shipAssets.find(function (asset) { return asset.id === assets.DEFAULT_SHIP_ID; }) || shipAssets[0];
    var sharedUpgradePower = 0;
    if (defaultPilot && defaultShip && profile) {
      var baselineProfile = Object.assign({}, profile, {
        scene: Object.assign({}, profile.scene || {}, { pilotId: defaultPilot.id, shipId: defaultShip.id })
      });
      var unupgradedProfile = Object.assign({}, baselineProfile, {
        upgrades: { fire: 0, armor: 0, engine: 0, bounty: 0 },
        fighterUpgrades: { attack: 1, armorPenetration: 1, hp: 1 }
      });
      sharedUpgradePower = Math.max(0, calculateActivePower(baselineProfile) - calculateActivePower(unupgradedProfile));
    }

    return {
      total: pilotTotal + shipTotal + sharedUpgradePower,
      pilotTotal: pilotTotal,
      shipTotal: shipTotal,
      sharedUpgradePower: sharedUpgradePower,
      pilots: pilots,
      ships: ships
    };
  }

  var api = {
    LOCAL_TEST_UNLOCK_ALL_LEVELS: LOCAL_TEST_UNLOCK_ALL_LEVELS,
    LOCAL_TEST_UNLOCK_ALL_PILOTS: LOCAL_TEST_UNLOCK_ALL_PILOTS,
    LOCAL_TEST_UNLOCK_ALL_SHIPS: LOCAL_TEST_UNLOCK_ALL_SHIPS,
    generateBattleLoadout: generateBattleLoadout,
    calculateUnitPower: calculateUnitPower,
    calculateActivePower: calculateActivePower,
    calculateTotalPower: calculateTotalPower
  };

  scope.combatStats = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
