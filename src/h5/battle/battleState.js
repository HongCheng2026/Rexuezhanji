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
    var field = geometry.createField ? geometry.createField() : { width: 960, height: 473 };
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
    var field = fieldOverride || (geometry.createField ? geometry.createField() : { width: 960, height: 473 });
    var maxHp = Math.max(1, Math.floor(fs.maxHp || 100));
    var abilities = lo.abilities || {};
    var activeSlots = Array.isArray(abilities.activeSlots) ? abilities.activeSlots.slice(0, 4) : [];
    while (activeSlots.length < 4) activeSlots.push(null);
    var insurance = abilities.insurance || null;
    return {
      x: 92,
      y: field.height / 2,
      radius: 23,
      cooldown: 0,
      invincible: 1,
      shield: 0,
      hp: maxHp,
      maxHp: maxHp,
      lives: fs.maxLives || Math.max(1, Math.ceil(maxHp / 100)),
      weapons: {
        spread: initWeapons.spread || 0,
        laser: initWeapons.laser || 0,
        missile: initWeapons.missile || 0
      },
      abilities: {
        activeSlots: activeSlots.map(createActiveSlotRuntime),
        insurance: insurance ? createInsuranceRuntime(insurance) : null,
        passiveSlots: Array.isArray(abilities.passiveSlots) ? abilities.passiveSlots.slice(0, 4) : []
      }
    };
  }

  function createActiveSlotRuntime(skill, index) {
    if (!skill || !skill.id) return null;
    return {
      id: skill.id,
      name: skill.name || ("主动技能 " + (index + 1)),
      icon: skill.icon || "",
      cooldown: Math.max(0, Number(skill.cooldown) || 0),
      cooldownTimer: 0,
      charges: skill.charges == null ? null : Math.max(0, Math.floor(Number(skill.charges) || 0))
    };
  }

  function createInsuranceRuntime(insurance) {
    var maxCharges = Math.max(1, Math.floor(Number(insurance.maxCharges) || 2));
    return {
      id: insurance.id || "emergency-clear",
      name: insurance.name || "紧急清屏",
      icon: insurance.icon || "",
      charges: Math.max(0, Math.min(maxCharges, Math.floor(Number(insurance.initialCharges) || 1))),
      maxCharges: maxCharges,
      rechargeSeconds: Math.max(1, Number(insurance.rechargeSeconds) || 18),
      rechargeTimer: 0
    };
  }

  /**
   * 创建星空背景
   */
  function createStars(fieldOverride) {
    var count = 110;
    var field = fieldOverride || (geometry.createField ? geometry.createField() : { width: 960, height: 473 });
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
    createStars: createStars
  };

  scope.battleState = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
