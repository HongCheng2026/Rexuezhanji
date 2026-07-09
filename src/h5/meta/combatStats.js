(function registerCombatStats(root) {
  const scope = root.RXGame || (root.RXGame = {});

  // 本地测试开关：为 true 时解锁全部关卡（不解锁则仅依赖 unlockedLevel）
  const LOCAL_TEST_UNLOCK_ALL_LEVELS = true;

  // 本地测试开关：为 true 时全部战姬视为已拥有
  const LOCAL_TEST_UNLOCK_ALL_PILOTS = true;

  // 本地测试开关：为 true 时全部战机视为已拥有
  const LOCAL_TEST_UNLOCK_ALL_SHIPS = true;

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
    var fireMultiplier = Math.min(2, 1 + (ups.fire || 0) * 0.1);
    var attack = Math.round(baseAttack * fireMultiplier + fighterAttackBonus);

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
    var weaponDamageMultiplier = fireMultiplier;

    // --- 初始武器等级 ---
    var fire = ups.fire || 0;
    var maxWeapon = (balance && balance.MAX_WEAPON_LEVEL) || levelsConfig.MAX_WEAPON_LEVEL || 5;
    function getInitialWeaponLevel(offset, step) {
      return Math.max(1, Math.min(maxWeapon, 1 + Math.floor(Math.max(0, fire - offset) / step)));
    }
    var primaryWeapon = ship.primaryWeapon || "spread";
    var initialWeapons = { spread: 0, laser: 0, missile: 0 };
    if (ship.rank === "B") {
      initialWeapons[primaryWeapon] = getInitialWeaponLevel(0, 3);
    } else {
      var rarityWeaponFloor = ship.rank === "S" ? 2 : 1;
      initialWeapons.spread = Math.max(rarityWeaponFloor, getInitialWeaponLevel(0, 3));
      initialWeapons.laser = Math.max(rarityWeaponFloor, getInitialWeaponLevel(2, 4));
      initialWeapons.missile = Math.max(rarityWeaponFloor, getInitialWeaponLevel(4, 4));
    }
    var passiveSkill = ship.rank === "S" ? (ship.passiveSkill || ship.exclusiveSkill || null) : null;
    var activeSkill = ship.rank === "S" ? (ship.activeSkill || null) : null;
    var skillPierceSlots = passiveSkill && passiveSkill.pierceSlots ? passiveSkill.pierceSlots : {};
    var weaponPierceSlots = {
      spread: Math.max(0, Math.floor(Number(skillPierceSlots.spread) || 0)),
      laser: Math.max(0, Math.floor(Number(skillPierceSlots.laser) || 0)),
      missile: Math.max(0, Math.floor(Number(skillPierceSlots.missile) || 0))
    };

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
        exclusiveSkill: passiveSkill,
        passiveSkill: passiveSkill,
        activeSkill: activeSkill
      },
      upgrades: {
        fire: fire,
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
      activeSkill: activeSkill
    };
  }

  var api = {
    LOCAL_TEST_UNLOCK_ALL_LEVELS: LOCAL_TEST_UNLOCK_ALL_LEVELS,
    LOCAL_TEST_UNLOCK_ALL_PILOTS: LOCAL_TEST_UNLOCK_ALL_PILOTS,
    LOCAL_TEST_UNLOCK_ALL_SHIPS: LOCAL_TEST_UNLOCK_ALL_SHIPS,
    generateBattleLoadout: generateBattleLoadout
  };

  scope.combatStats = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
