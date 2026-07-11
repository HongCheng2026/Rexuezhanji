(function registerBattleState(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var balanceConfig = scope.balance || {};

  /**
   * 创建初始菜单/战斗状态
   */
  function createMenuState(levelId) {
    var selectedLevel = (levelsConfig.levels || []).find(function (l) { return l.id === levelId; }) ||
      (levelsConfig.levels || [])[0];
    return {
      mode: "menu",
      level: selectedLevel,
      elapsed: 0,
      levelCoins: 0,
      enemyTimer: 0,
      powerTimer: 10,
      bossWarning: 0,
      bossSpawned: false,
      shake: 0,
      player: createPlayer(),
      stars: createStars(),
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
  function createPlayer(loadout) {
    var lo = loadout || {};
    var fs = lo.finalStats || {};
    var initWeapons = lo.initialWeapons || {};
    var maxHp = Math.max(1, Math.floor(fs.maxHp || 100));
    var activeSkill = lo.activeSkill || (lo.ship && lo.ship.activeSkill) || null;
    return {
      x: 92,
      y: (root.innerHeight || 540) / 2,
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
      activeSkill: activeSkill ? {
        id: activeSkill.id,
        name: activeSkill.name || "主动技能",
        charges: Math.max(0, Math.min(
          Math.floor(Number(activeSkill.maxCharges) || 2),
          Math.floor(Number(activeSkill.initialCharges) || 1)
        )),
        maxCharges: Math.max(1, Math.floor(Number(activeSkill.maxCharges) || 2)),
        rechargeSeconds: Math.max(1, Number(activeSkill.rechargeSeconds) || 18),
        rechargeTimer: 0
      } : null
    };
  }

  /**
   * 创建星空背景
   */
  function createStars() {
    var count = 110;
    var WIDTH = typeof root.innerWidth !== "undefined" ? 960 : 960;
    var HEIGHT = 540;
    var stars = [];
    for (var i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
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
