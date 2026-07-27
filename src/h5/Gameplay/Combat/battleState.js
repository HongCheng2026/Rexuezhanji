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
    var disabledWeaponTypes = Array.isArray(lo.disabledWeaponTypes) ? lo.disabledWeaponTypes.slice() : [];
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
        spread: disabledWeaponTypes.indexOf("spread") >= 0 ? 0 : (initWeapons.spread || 0),
        laser: disabledWeaponTypes.indexOf("laser") >= 0 ? 0 : (initWeapons.laser || 0),
        missile: disabledWeaponTypes.indexOf("missile") >= 0 ? 0 : (initWeapons.missile || 0)
      },
      disabledWeaponTypes: disabledWeaponTypes,
      suppressFallbackWeapon: disabledWeaponTypes.length >= 3,
      weaponSkills: weaponSkills,
      abilities: {
        activeSlots: activeSlots.map(createActiveSlotRuntime),
        decisiveCommand: decisiveCommand ? createDecisiveCommandRuntime(decisiveCommand) : null
      }
    };
  }

  function createActiveSlotRuntime(skill, index) {
    if (!skill || !skill.id) return null;
    var maxCharges = skill.maxCharges == null ? null : Math.max(1, Math.floor(Number(skill.maxCharges) || 1));
    var initialCharges = maxCharges == null
      ? null
      : Math.max(0, Math.min(maxCharges, Math.floor(Number(skill.initialCharges) || 1)));
    var rechargeSeconds = maxCharges == null
      ? 0
      : Math.max(1, Number(skill.rechargeSeconds) || Number(skill.cooldown) || 20);
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
      charges: initialCharges,
      maxCharges: maxCharges,
      rechargeSeconds: rechargeSeconds,
      rechargeTimer: maxCharges != null && initialCharges < maxCharges ? rechargeSeconds : 0
    };
  }

  function createWeaponSkills(loadout, initialWeapons) {
    var autoSkills = loadout && loadout.autoSkills ? loadout.autoSkills : {};
    var snapshots = Array.isArray(autoSkills.slots) ? autoSkills.slots.slice(0, 6) : [];
    while (snapshots.length < 6) snapshots.push(null);
    var slots = snapshots.map(function createRuntime(snapshot, index) {
      if (!snapshot) return null;
      return snapshot.source === "battle"
        ? createFixedWeaponRuntime(snapshot, Number(initialWeapons && initialWeapons[snapshot.weaponType]) || Number(snapshot.level) || 0, index)
        : createExtensionWeaponRuntime(snapshot, index);
    });
    return {
      slots: slots,
      fixed: slots.slice(0, 3).map(function onlyBattle(runtime) { return runtime && runtime.source === "battle" ? runtime : null; }),
      extensions: slots.slice(3),
      meta: slots.filter(function onlyMeta(runtime) { return runtime && runtime.source === "meta"; }),
      nextWakeAt: 0
    };
  }

  function createFixedWeaponRuntime(definition, level, slotIndex) {
    var normalizedLevel = Math.max(0, Math.min(Number(balanceConfig.MAX_WEAPON_LEVEL) || 10, Math.floor(Number(level) || 0)));
    return {
      id: String(definition.id || definition.weaponType || ""),
      name: String(definition.name || definition.weaponType || ""),
      weaponType: String(definition.weaponType || ""),
      source: "battle",
      slotIndex: Math.max(0, Math.floor(Number(slotIndex) || 0)),
      level: normalizedLevel,
      resolvedStats: normalizedLevel > 0 && balanceConfig.getWeaponLevelStats
        ? Object.assign({}, balanceConfig.getWeaponLevelStats(definition.weaponType, normalizedLevel))
        : null,
      nextFireAt: 0
    };
  }

  function createExtensionWeaponRuntime(snapshot, slotIndex) {
    if (!snapshot || !snapshot.id || !snapshot.resolvedStats) return null;
    return {
      id: String(snapshot.id),
      name: String(snapshot.name || snapshot.id),
      category: String(snapshot.category || ""),
      source: "meta",
      slotIndex: Math.max(0, Math.floor(Number(slotIndex) || 0)),
      level: Math.max(1, Math.floor(Number(snapshot.level) || 1)),
      resolvedStats: Object.freeze(Object.assign({}, snapshot.resolvedStats)),
      visualId: String(snapshot.visualId || snapshot.id),
      autoCondition: snapshot.autoCondition || null,
      nextFireAt: 0,
      lastFiredAt: -Infinity,
      activeRemaining: 0,
      data: null,
      status: "auto"
    };
  }

  function refreshFixedWeaponSkill(player, weaponType) {
    if (!player || !player.weaponSkills || !Array.isArray(player.weaponSkills.fixed)) return null;
    var type = String(weaponType || "");
    var index = player.weaponSkills.fixed.findIndex(function findWeapon(entry) { return entry && entry.weaponType === type; });
    if (index < 0) return null;
    var current = player.weaponSkills.fixed[index];
    player.weaponSkills.fixed[index] = createFixedWeaponRuntime(current, Number(player.weapons && player.weapons[type]) || 0, current.slotIndex);
    if (Array.isArray(player.weaponSkills.slots)) player.weaponSkills.slots[current.slotIndex] = player.weaponSkills.fixed[index];
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
