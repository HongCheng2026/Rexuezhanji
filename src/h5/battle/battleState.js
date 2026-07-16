(function registerBattleState(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var balanceConfig = scope.balance || {};
  var geometry = scope.battleGeometry || {};

  /**
   * 创建初始菜单/战斗状态
   */
  function createMenuState(levelId) {
    var selectedLevel = (levelsConfig.levels || []).find(function (l) { return l.id === levelId; }) ||
      (levelsConfig.levels || [])[0];
    var field = geometry.createField();
    return {
      field: field,
      mode: "menu",
      level: selectedLevel,
      elapsed: 0,
      levelCoins: 0,
      enemyTimer: 0,
      powerTimer: 10,
      bossWarning: 0,
      bossSpawned: false,
      shake: 0,
      player: createPlayer(null, field),
      stars: createStars(field),
      bullets: [],
      enemyBullets: [],
      enemies: [],
      boss: null,
      coins: [],
      powerups: [],
      particles: [],
      shockwaves: [],
      skillEffects: [],
      notices: [],
      itemFeed: [],
      killStats: {
        small: 0,
        elite: 0,
        boss: 0,
        total: 0,
        baseGold: 0
      },
      damageTaken: 0,
      damageTakenAmount: 0,
      powerupsSpawned: 0,
      powerupsCollected: 0,
      storyRuntime: null,
      storyMessage: null,
      storyMessageUntil: 0
    };
  }

  /**
   * 创建玩家对象（使用 BattleLoadout 的 finalStats + initialWeapons）
   */
  function createPlayer(loadout, fieldOverride) {
    var lo = loadout || {};
    var fs = lo.finalStats || {};
    var initWeapons = lo.initialWeapons || {};
    var field = fieldOverride || geometry.createField();
    var maxHp = Math.max(1, Math.floor(fs.maxHp || 100));
    var abilities = lo.abilities || {};
    var activeSlots = Array.isArray(abilities.activeSlots) ? abilities.activeSlots.slice(0, 4) : [];
    while (activeSlots.length < 4) activeSlots.push(null);
    var decisiveCommand = abilities.decisiveCommand || null;
    var weaponSkills = createWeaponSkills(lo, initWeapons);
    return {
      x: field.playerLeft,
      y: field.height / 2,
      radius: 23,
      cooldown: 0,
      invincible: 1,
      shield: 0,
      phaseShieldRemaining: 0,
      hp: maxHp,
      maxHp: maxHp,
      lives: fs.maxLives || Math.max(1, Math.ceil(maxHp / 100)),
      weapons: {
        spread: initWeapons.spread || 0,
        laser: initWeapons.laser || 0,
        missile: initWeapons.missile || 0
      },
      weaponSkills: weaponSkills,
      abilities: {
        activeSlots: activeSlots.map(createActiveSlotRuntime),
        decisiveCommand: decisiveCommand ? createDecisiveCommandRuntime(decisiveCommand) : null
      }
    };
  }

  function createActiveSlotRuntime(skill, index) {
    if (!skill || !skill.id) return null;
    return {
      id: skill.id,
      name: skill.name || ("主动技能 " + (index + 1)),
      icon: skill.icon || "",
      iconText: skill.iconText || "",
      cooldown: Math.max(0, Number(skill.cooldown) || 0),
      cooldownTimer: 0,
      duration: Math.max(0, Number(skill.duration) || 0),
      activeRemaining: 0,
      autoEnabled: Boolean(skill.autoEnabled),
      castLocked: false,
      data: null,
      charges: skill.charges == null ? null : Math.max(0, Math.floor(Number(skill.charges) || 0))
    };
  }

  function createWeaponSkills(loadout, initialWeapons) {
    var autoWeapons = loadout && loadout.autoWeapons ? loadout.autoWeapons : {};
    var fixedDefinitions = Array.isArray(autoWeapons.fixed) ? autoWeapons.fixed.slice(0, 3) : [];
    var extensionDefinitions = Array.isArray(autoWeapons.extensionSlots) ? autoWeapons.extensionSlots.slice(0, 3) : [];
    while (fixedDefinitions.length < 3) fixedDefinitions.push(null);
    while (extensionDefinitions.length < 3) extensionDefinitions.push(null);
    return {
      fixed: fixedDefinitions.map(function createFixed(definition) {
        if (!definition || !definition.weaponType) return null;
        var type = String(definition.weaponType);
        return createFixedWeaponRuntime(definition, Number(initialWeapons && initialWeapons[type]) || Number(definition.level) || 0);
      }),
      extensions: extensionDefinitions.map(createExtensionWeaponRuntime),
      nextWakeAt: 0
    };
  }

  function createFixedWeaponRuntime(definition, level) {
    var normalizedLevel = Math.max(0, Math.min(Number(balanceConfig.MAX_WEAPON_LEVEL) || 10, Math.floor(Number(level) || 0)));
    return {
      id: String(definition.id || definition.weaponType || ""),
      name: String(definition.name || definition.weaponType || ""),
      weaponType: String(definition.weaponType || ""),
      source: "battle",
      level: normalizedLevel,
      resolvedStats: normalizedLevel > 0 && balanceConfig.getWeaponLevelStats
        ? Object.assign({}, balanceConfig.getWeaponLevelStats(definition.weaponType, normalizedLevel))
        : null,
      nextFireAt: 0
    };
  }

  function createExtensionWeaponRuntime(snapshot) {
    if (!snapshot || !snapshot.id || !snapshot.resolvedStats) return null;
    return {
      id: String(snapshot.id),
      name: String(snapshot.name || snapshot.id),
      category: String(snapshot.category || ""),
      source: "meta",
      level: Math.max(1, Math.floor(Number(snapshot.level) || 1)),
      resolvedStats: Object.assign({}, snapshot.resolvedStats),
      nextFireAt: 0,
      lastFiredAt: -Infinity,
      waitingForTarget: false,
      status: "ready"
    };
  }

  function refreshFixedWeaponSkill(player, weaponType) {
    if (!player || !player.weaponSkills || !Array.isArray(player.weaponSkills.fixed)) return null;
    var type = String(weaponType || "");
    var index = player.weaponSkills.fixed.findIndex(function findWeapon(entry) { return entry && entry.weaponType === type; });
    if (index < 0) return null;
    var current = player.weaponSkills.fixed[index];
    player.weaponSkills.fixed[index] = createFixedWeaponRuntime(current, Number(player.weapons && player.weapons[type]) || 0);
    return player.weaponSkills.fixed[index];
  }

  function createDecisiveCommandRuntime(command) {
    var maxCharges = Math.max(1, Math.floor(Number(command.maxCharges) || 2));
    return {
      id: command.id || "decisive-command",
      name: command.name || "决胜指令",
      icon: command.icon || "",
      iconText: command.iconText || "令",
      charges: Math.max(0, Math.min(maxCharges, Math.floor(Number(command.initialCharges) || 1))),
      maxCharges: maxCharges,
      rechargeSeconds: Math.max(1, Number(command.rechargeSeconds) || 18),
      rechargeTimer: 0
    };
  }

  /**
   * 创建星空背景
   */
  function createStars(fieldOverride) {
    var count = 110;
    var field = fieldOverride || geometry.createField();
    var stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * field.width,
        y: Math.random() * field.height,
        size: Math.random() * 1.8 + 0.5,
        speed: Math.random() * 120 + 70
      });
    }
    return stars;
  }

  var api = {
    createMenuState: createMenuState,
    createPlayer: createPlayer,
    refreshFixedWeaponSkill: refreshFixedWeaponSkill,
    createStars: createStars
  };

  scope.battleState = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
