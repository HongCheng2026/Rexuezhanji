const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const levelLabelEl = document.querySelector("#levelLabel");
const timeLabelEl = document.querySelector("#timeLabel");
const livesEl = document.querySelector("#lives");
const weaponEl = document.querySelector("#weapon");
const coinsEl = document.querySelector("#coins");
const overlay = document.querySelector("#overlay");
const messageEl = document.querySelector("#message");
const startButton = document.querySelector("#startButton");
const pauseButton = document.querySelector("#pauseButton");
const restartButton = document.querySelector("#restartButton");
const shopButton = document.querySelector("#shopButton");
const chapterSelect = document.querySelector("#chapterSelect");
const shopScreen = document.querySelector("#shopScreen");
const shopCoinsEl = document.querySelector("#shopCoins");
const shopMessageEl = document.querySelector("#shopMessage");
const upgradeList = document.querySelector("#upgradeList");
const nextLevelButton = document.querySelector("#nextLevelButton");
const replayButton = document.querySelector("#replayButton");
const backToChapterButton = document.querySelector("#backToChapterButton");
const lobbyScreen = document.querySelector("#lobbyScreen");
const battleScreen = document.querySelector("#battleScreen");
const battleEntryButton = document.querySelector("#battleEntryButton");
const homeButton = document.querySelector("#homeButton");
const featurePanel = document.querySelector("#featurePanel");
const closeFeaturePanel = document.querySelector("#closeFeaturePanel");
const featurePanelKicker = document.querySelector("#featurePanelKicker");
const featurePanelTitle = document.querySelector("#featurePanelTitle");
const featurePanelBody = document.querySelector("#featurePanelBody");
const featurePanelSlots = document.querySelector("#featurePanelSlots");
const pilotAvatar = document.querySelector("#pilotAvatar");
const pilotName = document.querySelector("#pilotName");
const pilotLevel = document.querySelector("#pilotLevel");
const pilotExpText = document.querySelector("#pilotExpText");
const pilotExpBar = document.querySelector("#pilotExpBar");
const pilotBadge = document.querySelector("#pilotBadge");
const energyValue = document.querySelector("#energyValue");
const goldValue = document.querySelector("#goldValue");
const diamondValue = document.querySelector("#diamondValue");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const LEVEL_DURATION = 90;
const MAX_WEAPON_LEVEL = 10;
const keys = new Set();
const pointer = { active: false, x: 90, y: HEIGHT / 2 };

const levels = [
  {
    id: 1,
    code: "1-1",
    name: "星港外围",
    desc: "敌机数量较少，适合熟悉横版节奏。",
    spawn: 1.05,
    eliteRate: 0.12,
    bossHp: 520,
    reward: 260
  },
  {
    id: 2,
    code: "1-2",
    name: "碎星航道",
    desc: "精英敌机增多，敌方弹幕更密。",
    spawn: 0.82,
    eliteRate: 0.22,
    bossHp: 760,
    reward: 390
  },
  {
    id: 3,
    code: "1-3",
    name: "核心闸门",
    desc: "第一章最终小关，Boss 护甲更厚。",
    spawn: 0.64,
    eliteRate: 0.32,
    bossHp: 1040,
    reward: 560
  }
];

const upgrades = {
  fire: {
    name: "火力核心",
    desc: "提升所有子弹伤害，并让基础弹幕更密。",
    max: 10,
    baseCost: 90
  },
  armor: {
    name: "装甲舱",
    desc: "每级增加 1 点初始生命。",
    max: 6,
    baseCost: 130
  },
  engine: {
    name: "推进器",
    desc: "提升战机移动速度。",
    max: 6,
    baseCost: 110
  },
  bounty: {
    name: "代币回收器",
    desc: "击落敌机时获得更多代币。",
    max: 8,
    baseCost: 100
  }
};

const POWERUPS = {
  spread: { name: "散射", color: "#ffd166", mark: "S" },
  laser: { name: "激光", color: "#5ee7ff", mark: "L" },
  missile: { name: "导弹", color: "#ff9f43", mark: "M" },
  shield: { name: "护盾", color: "#9bffcb", mark: "D" },
  life: { name: "生命", color: "#7bed9f", mark: "+" }
};

const LOBBY_DEFAULTS = {
  player: {
    name: "王牌飞行员",
    avatar: "角色资产/导购.png",
    level: 56,
    exp: 12080,
    expMax: 23600,
    badge: "V"
  },
  resources: {
    energy: 0,
    diamonds: 0
  }
};

const featurePanels = {
  profile: {
    kicker: "PILOT",
    title: "飞行员资料",
    body: "头像、名字、等级、经验和徽章都已经做成变量，后续可以替换成真实角色数据。",
    slots: ["头像资产", "称号徽章", "经验等级"]
  },
  energy: {
    kicker: "RESOURCE",
    title: "体力",
    body: "体力当前从 0 开始，后续可以接入自然恢复、道具领取和充值补充。",
    slots: ["恢复规则", "购买体力", "体力道具"]
  },
  gold: {
    kicker: "RESOURCE",
    title: "金币",
    body: "金币当前从 0 开始，战斗奖励会累计到这里，也可以继续接充值支付入口。",
    slots: ["战斗产出", "商城消费", "充值累积"]
  },
  diamond: {
    kicker: "RESOURCE",
    title: "钻石",
    body: "钻石当前从 0 开始，预留给充值、活动奖励和高级抽取。",
    slots: ["充值支付", "活动赠送", "高级兑换"]
  },
  chapter: {
    kicker: "MAP",
    title: "关卡地图",
    body: "关卡选择已经放入开始战斗流程。这里保留为章节总览入口。",
    slots: ["章节进度", "星级奖励", "地图素材"]
  },
  hangar: {
    kicker: "HANGAR",
    title: "战机仓库",
    body: "这里用于展示已拥有战机、皮肤和出战配置。",
    slots: ["战机列表", "皮肤", "出战"]
  },
  upgrade: {
    kicker: "UPGRADE",
    title: "升级",
    body: "这里用于放置火力、装甲、推进器、金币回收等养成入口。",
    slots: ["火力核心", "装甲舱", "推进器"]
  },
  task: {
    kicker: "TASK",
    title: "任务",
    body: "每日任务、主线任务和成就型任务入口已预留。",
    slots: ["每日", "主线", "周常"]
  },
  event: {
    kicker: "EVENT",
    title: "活动",
    body: "限时活动、节日活动和概率提升活动入口已预留。",
    slots: ["限时活动", "概率提升", "兑换商店"]
  },
  achievement: {
    kicker: "ACHIEVEMENT",
    title: "成就",
    body: "击杀、通关、收集、养成类成就入口已预留。",
    slots: ["战斗成就", "收集成就", "成长成就"]
  },
  ranking: {
    kicker: "RANKING",
    title: "排行榜",
    body: "战力榜、通关榜、积分榜入口已预留。",
    slots: ["战力榜", "通关榜", "积分榜"]
  },
  mail: {
    kicker: "MAIL",
    title: "邮件",
    body: "系统邮件、奖励邮件和公告邮件入口已预留。",
    slots: ["系统", "奖励", "公告"]
  },
  signin: {
    kicker: "SIGN IN",
    title: "签到",
    body: "每日签到和连续签到奖励入口已预留。",
    slots: ["今日奖励", "连续奖励", "补签"]
  },
  shop: {
    kicker: "SHOP",
    title: "商店",
    body: "金币、钻石、礼包、皮肤和道具商店入口已预留。",
    slots: ["道具", "礼包", "充值"]
  },
  friend: {
    kicker: "FRIEND",
    title: "好友",
    body: "好友列表、赠送体力和邀请入口已预留。",
    slots: ["好友列表", "赠送体力", "邀请"]
  },
  setting: {
    kicker: "SETTING",
    title: "设置",
    body: "音量、画质、账号和语言设置入口已预留。",
    slots: ["声音", "画质", "账号"]
  },
  promo: {
    kicker: "PROMO",
    title: "星穹之翼",
    body: "限时概率提升活动入口已预留，后续可以放活动图、抽取规则和奖励池。",
    slots: ["活动图", "奖励池", "抽取规则"]
  },
  firstTopup: {
    kicker: "TOP-UP",
    title: "首充礼包",
    body: "首充入口已预留，后续可以接入支付、奖励展示和领取状态。",
    slots: ["支付入口", "礼包奖励", "领取状态"]
  },
  chat: {
    kicker: "CHAT",
    title: "世界频道",
    body: "聊天入口已预留，后续可以加入系统公告、玩家消息和战队频道。",
    slots: ["世界", "战队", "系统"]
  }
};

const ASSET_PATHS = {
  player: "角色资产/透明/主角.png",
  boss: "角色资产/透明/BOSS.png",
  smallEnemies: ["角色资产/透明/小兵01.png", "角色资产/透明/小兵02.png", "角色资产/透明/小兵03.png"],
  eliteEnemies: ["角色资产/透明/精英01.png", "角色资产/透明/精英02.png"]
};

const assets = loadAssets(ASSET_PATHS);
let profile = loadProfile();
let selectedLevel = clamp(profile.unlockedLevel, 1, 3);
let state = createMenuState();
let lastTime = 0;
let animationId = 0;

renderChapterSelect();
renderShop();
renderLobby();
updateHud();
drawScene();

function loadAssets(paths) {
  const loadImage = (src) => {
    const image = new Image();
    image.src = encodeURI(src);
    return image;
  };

  return {
    player: loadImage(paths.player),
    boss: loadImage(paths.boss),
    smallEnemies: paths.smallEnemies.map(loadImage),
    eliteEnemies: paths.eliteEnemies.map(loadImage)
  };
}

function loadProfile() {
  const fallback = {
    coins: 0,
    unlockedLevel: 1,
    completed: [],
    upgrades: { fire: 0, armor: 0, engine: 0, bounty: 0 },
    player: { ...LOBBY_DEFAULTS.player },
    resources: { ...LOBBY_DEFAULTS.resources }
  };

  try {
    return normalizeProfile({ ...fallback, ...JSON.parse(localStorage.getItem("sideShooterProfile") || "{}") });
  } catch {
    return fallback;
  }
}

function normalizeProfile(nextProfile) {
  return {
    ...nextProfile,
    completed: Array.isArray(nextProfile.completed) ? nextProfile.completed : [],
    upgrades: { fire: 0, armor: 0, engine: 0, bounty: 0, ...(nextProfile.upgrades || {}) },
    player: { ...LOBBY_DEFAULTS.player, ...(nextProfile.player || {}) },
    resources: { ...LOBBY_DEFAULTS.resources, ...(nextProfile.resources || {}) }
  };
}

function saveProfile() {
  localStorage.setItem("sideShooterProfile", JSON.stringify(profile));
}

function createMenuState() {
  return {
    mode: "menu",
    level: levels[selectedLevel - 1],
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
    notices: []
  };
}

function createPlayer() {
  return {
    x: 92,
    y: HEIGHT / 2,
    radius: 23,
    cooldown: 0,
    invincible: 1,
    shield: 0,
    lives: 3 + profile.upgrades.armor,
    weapons: {
      spread: Math.min(MAX_WEAPON_LEVEL, Math.floor(profile.upgrades.fire / 3)),
      laser: Math.min(MAX_WEAPON_LEVEL, Math.floor(profile.upgrades.fire / 4)),
      missile: Math.min(MAX_WEAPON_LEVEL, Math.floor(profile.upgrades.fire / 5))
    }
  };
}

function createStars() {
  return Array.from({ length: 110 }, () => ({
    x: Math.random() * WIDTH,
    y: Math.random() * HEIGHT,
    size: Math.random() * 1.8 + 0.5,
    speed: Math.random() * 120 + 70
  }));
}

function startLevel(levelId = selectedLevel) {
  selectedLevel = clamp(levelId, 1, 3);
  state = createMenuState();
  state.mode = "fight";
  showBattleScreen();
  hideShop();
  overlay.classList.add("hidden");
  pauseButton.textContent = "暂停";
  lastTime = performance.now();
  cancelAnimationFrame(animationId);
  animationId = requestAnimationFrame(loop);
  updateHud();
}

function loop(now) {
  if (state.mode !== "fight") return;
  const dt = Math.min((now - lastTime) / 1000, 0.033);
  lastTime = now;
  update(dt);
  drawScene();
  animationId = requestAnimationFrame(loop);
}

function update(dt) {
  state.elapsed += dt;
  state.enemyTimer -= dt;
  state.powerTimer -= dt;
  state.bossWarning = Math.max(0, state.bossWarning - dt);
  state.shake = Math.max(0, state.shake - dt);
  state.player.cooldown -= dt;
  state.player.invincible = Math.max(0, state.player.invincible - dt);
  state.player.shield = Math.max(0, state.player.shield - dt);

  updateStars(dt);
  updatePlayer(dt);
  autoShoot();
  spawnEnemies();
  spawnBossIfNeeded();
  spawnPowerups();
  updateBullets(dt);
  updateEnemyBullets(dt);
  updateEnemies(dt);
  updateBoss(dt);
  updateCoins(dt);
  updatePowerups(dt);
  updateParticles(dt);
  updateShockwaves(dt);
  updateNotices(dt);
  checkCollisions();
  updateHud();
}

function updateStars(dt) {
  for (const star of state.stars) {
    star.x -= star.speed * dt * (state.boss ? 1.25 : 1);
    if (star.x < -8) {
      star.x = WIDTH + 8;
      star.y = Math.random() * HEIGHT;
    }
  }
}

function updatePlayer(dt) {
  const speed = 320 + profile.upgrades.engine * 26;
  let dx = 0;
  let dy = 0;

  if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
  if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
  if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
  if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;

  if (pointer.active) {
    state.player.x += (pointer.x - state.player.x) * 12 * dt;
    state.player.y += (pointer.y - state.player.y) * 12 * dt;
  } else if (dx || dy) {
    const length = Math.hypot(dx, dy) || 1;
    state.player.x += (dx / length) * speed * dt;
    state.player.y += (dy / length) * speed * dt;
  }

  state.player.x = clamp(state.player.x, 38, WIDTH * 0.48);
  state.player.y = clamp(state.player.y, 42, HEIGHT - 42);
}

function autoShoot() {
  if (state.player.cooldown > 0) return;
  shoot();
  state.player.cooldown = getActiveWeapons().length ? 0.16 : 0.2;
}

function shoot() {
  const { x, y } = state.player;
  const activeWeapons = getActiveWeapons();
  const fireBonus = profile.upgrades.fire;

  if (!activeWeapons.length) {
    const lanes = fireBonus >= 4 ? [-8, 8] : [0];
    for (const lane of lanes) {
      state.bullets.push(createBullet(x + 34, y + lane, 0, "normal", 1 + Math.floor(fireBonus / 2), 650, 4, "#d7fff5"));
    }
    return;
  }

  for (const [weapon, level] of activeWeapons) {
    fireWeapon(weapon, level, x, y);
  }
  fireFusionWeapons(x, y);
}

function fireWeapon(weapon, level, x, y) {
  const damageBonus = Math.floor(profile.upgrades.fire / 2);

  if (weapon === "spread") {
    const count = Math.min(11, 2 + level);
    const step = count > 1 ? 0.1 : 0;
    const start = -step * (count - 1) / 2;
    for (let i = 0; i < count; i += 1) {
      state.bullets.push(createBullet(x + 32, y, start + step * i, "spread", 1 + Math.floor(level / 4) + damageBonus, 610, 4, "#ffd166"));
    }
    return;
  }

  if (weapon === "laser") {
    const offsets = level >= 8 ? [-22, -11, 0, 11, 22] : level >= 5 ? [-16, -5, 5, 16] : level >= 2 ? [-10, 10] : [0];
    for (const offset of offsets) {
      state.bullets.push(createBullet(x + 34, y + offset, 0, "laser", 2 + Math.ceil(level * 0.75) + damageBonus, 820, 5, "#5ee7ff", true));
    }
    return;
  }

  if (weapon === "missile") {
    const count = Math.min(5, Math.ceil(level / 2));
    const offsets = count === 1 ? [0] : count === 2 ? [-12, 12] : count === 3 ? [-18, 0, 18] : count === 4 ? [-24, -8, 8, 24] : [-30, -15, 0, 15, 30];
    for (let i = 0; i < offsets.length; i += 1) {
      const angle = offsets.length === 1 ? 0 : (i - (offsets.length - 1) / 2) * 0.05;
      state.bullets.push(createBullet(x + 28, y + offsets[i], angle, "missile", 3 + Math.ceil(level * 0.75) + damageBonus, 460 + level * 14, 7, "#ff9f43"));
    }
  }
}

function fireFusionWeapons(x, y) {
  const { spread, laser, missile } = state.player.weapons;
  if (spread >= 3 && laser >= 3) state.bullets.push(createBullet(x + 42, y, 0, "prism", 6, 880, 6, "#8fffea", true));
  if (spread >= 3 && missile >= 3) {
    state.bullets.push(createBullet(x + 34, y - 18, -0.08, "cluster", 6, 520, 7, "#ffc857"));
    state.bullets.push(createBullet(x + 34, y + 18, 0.08, "cluster", 6, 520, 7, "#ffc857"));
  }
  if (laser >= 3 && missile >= 3) state.bullets.push(createBullet(x + 46, y, 0, "rail", 10, 930, 7, "#b89cff", true));
  if (spread >= 6 && laser >= 6 && missile >= 6) state.bullets.push(createBullet(x + 50, y, 0, "nova", 22, 690, 12, "#ffffff", true));
}

function createBullet(x, y, angle, type, damage, speed, radius, color, piercing = false) {
  return { x, y, angle, type, damage, speed, radius, color, piercing, hitIds: new Set(), age: 0 };
}

function spawnEnemies() {
  if (state.boss || state.elapsed >= LEVEL_DURATION) return;
  if (state.enemyTimer > 0) return;

  const level = state.level;
  const heavy = Math.random() < level.eliteRate && state.elapsed > 12;
  const assetList = heavy ? assets.eliteEnemies : assets.smallEnemies;
  const enemy = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${state.elapsed}-${Math.random()}`,
    x: WIDTH + 44,
    y: 48 + Math.random() * (HEIGHT - 96),
    radius: heavy ? 30 : 22,
    hp: heavy ? 5 + level.id * 2 : 2 + level.id,
    maxHp: heavy ? 5 + level.id * 2 : 2 + level.id,
    speed: heavy ? 85 + level.id * 9 : 125 + level.id * 14,
    wobble: Math.random() * Math.PI * 2,
    shootTimer: heavy ? 1 + Math.random() * 0.6 : 1.8 + Math.random(),
    shootInterval: heavy ? 1.4 : 2.4,
    image: assetList[Math.floor(Math.random() * assetList.length)],
    heavy,
    value: heavy ? 22 + level.id * 8 : 9 + level.id * 4
  };

  state.enemies.push(enemy);
  state.enemyTimer = Math.max(0.32, level.spawn + Math.random() * 0.35);
}

function spawnBossIfNeeded() {
  if (state.bossSpawned || state.elapsed < LEVEL_DURATION) return;
  state.bossSpawned = true;
  state.bossWarning = 3;
  state.enemies = [];
  state.enemyBullets = [];
  state.boss = {
    id: `boss-${state.level.id}`,
    x: WIDTH + 130,
    y: HEIGHT / 2,
    targetX: WIDTH - 126,
    radius: 78,
    hp: state.level.bossHp,
    maxHp: state.level.bossHp,
    fireTimer: 0.7,
    waveTimer: 0.2,
    direction: 1
  };
  addNotice("BOSS 来袭", "#ff6b6b");
}

function spawnPowerups() {
  if (state.powerTimer > 0 || state.boss) return;
  const types = ["spread", "laser", "missile", "shield", "life"];
  const type = types[Math.floor(Math.random() * types.length)];
  state.powerups.push({ x: WIDTH + 26, y: 60 + Math.random() * (HEIGHT - 120), radius: 15, speed: 120, wobble: Math.random() * Math.PI * 2, type });
  state.powerTimer = 16 + Math.random() * 8;
}

function updateBullets(dt) {
  for (const bullet of state.bullets) {
    bullet.age += dt;
    if (bullet.type === "missile" || bullet.type === "cluster") {
      const target = nearestTarget(bullet);
      if (target) {
        const desired = Math.atan2(target.y - bullet.y, target.x - bullet.x);
        bullet.angle += clamp(desired - bullet.angle, -2.8 * dt, 2.8 * dt);
      }
      trail(bullet.x, bullet.y, "#ffb74d", 1);
    }
    bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
    bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    if (["laser", "prism", "rail", "nova"].includes(bullet.type)) trail(bullet.x - 8, bullet.y, bullet.color, 1);
  }
  state.bullets = state.bullets.filter((bullet) => bullet.x < WIDTH + 70 && bullet.y > -50 && bullet.y < HEIGHT + 50);
}

function updateEnemyBullets(dt) {
  for (const bullet of state.enemyBullets) {
    bullet.x += Math.cos(bullet.angle) * bullet.speed * dt;
    bullet.y += Math.sin(bullet.angle) * bullet.speed * dt;
    bullet.age += dt;
    if (Math.random() > 0.35) trail(bullet.x, bullet.y, bullet.color, 1);
  }
  state.enemyBullets = state.enemyBullets.filter((bullet) => bullet.x > -50 && bullet.y > -40 && bullet.y < HEIGHT + 40);
}

function updateEnemies(dt) {
  for (const enemy of state.enemies) {
    enemy.wobble += dt * 2.4;
    enemy.x -= enemy.speed * dt;
    enemy.y += Math.sin(enemy.wobble) * 24 * dt;
    enemy.shootTimer -= dt;
    if (enemy.shootTimer <= 0 && enemy.x < WIDTH - 40 && enemy.x > WIDTH * 0.35) {
      fireEnemyShot(enemy);
      enemy.shootTimer = enemy.shootInterval + Math.random() * 0.6;
    }
  }

  const escaped = state.enemies.filter((enemy) => enemy.x + enemy.radius < 0);
  if (escaped.length) {
    state.player.lives = Math.max(0, state.player.lives - escaped.length);
    burst(state.player.x, state.player.y, "#ff5555", 18);
  }
  state.enemies = state.enemies.filter((enemy) => enemy.x + enemy.radius >= 0);
  if (state.player.lives <= 0) failLevel();
}

function fireEnemyShot(enemy) {
  const aim = Math.atan2(state.player.y - enemy.y, state.player.x - enemy.x);
  const shots = enemy.heavy ? [-0.16, 0, 0.16] : [0];
  for (const offset of shots) {
    state.enemyBullets.push({ x: enemy.x - enemy.radius * 0.7, y: enemy.y, radius: enemy.heavy ? 5.5 : 4.5, speed: enemy.heavy ? 210 : 185, angle: aim + offset, color: enemy.heavy ? "#ff9fc5" : "#ffcf5a", age: 0 });
  }
  muzzleFlash(enemy.x - enemy.radius * 0.8, enemy.y, enemy.heavy ? "#ff9fc5" : "#ffcf5a", enemy.heavy ? 8 : 5);
}

function updateBoss(dt) {
  const boss = state.boss;
  if (!boss) return;
  if (boss.x > boss.targetX) {
    boss.x -= 90 * dt;
    return;
  }

  boss.y += boss.direction * 82 * dt;
  if (boss.y < 96 || boss.y > HEIGHT - 96) boss.direction *= -1;
  boss.fireTimer -= dt;
  boss.waveTimer -= dt;

  if (boss.fireTimer <= 0) {
    for (let i = -2; i <= 2; i += 1) {
      state.enemyBullets.push({ x: boss.x - 58, y: boss.y + i * 18, radius: 6, speed: 230 + Math.abs(i) * 10, angle: Math.PI + i * 0.12, color: "#ff5d73", age: 0 });
    }
    boss.fireTimer = Math.max(0.48, 1 - state.level.id * 0.12);
  }

  if (boss.waveTimer <= 0) {
    const aim = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
    state.enemyBullets.push({ x: boss.x - 70, y: boss.y, radius: 8, speed: 250, angle: aim, color: "#ff9fc5", age: 0 });
    boss.waveTimer = 1.35;
  }
}

function updateCoins(dt) {
  for (const coin of state.coins) {
    const dx = state.player.x - coin.x;
    const dy = state.player.y - coin.y;
    const d = Math.hypot(dx, dy) || 1;
    const pullRadius = 120 + profile.upgrades.bounty * 18;
    if (d < pullRadius) {
      coin.x += (dx / d) * (260 + profile.upgrades.bounty * 18) * dt;
      coin.y += (dy / d) * (260 + profile.upgrades.bounty * 18) * dt;
    } else {
      coin.x -= coin.speed * dt;
      coin.y += Math.sin(coin.wobble + state.elapsed * 3) * 18 * dt;
    }
  }
  state.coins = state.coins.filter((coin) => coin.x > -30);
}

function updatePowerups(dt) {
  for (const powerup of state.powerups) {
    powerup.wobble += dt * 3;
    powerup.x -= powerup.speed * dt;
    powerup.y += Math.sin(powerup.wobble) * 22 * dt;
  }
  state.powerups = state.powerups.filter((powerup) => powerup.x > -30);
}

function updateParticles(dt) {
  for (const particle of state.particles) {
    particle.x += particle.vx * dt;
    particle.y += particle.vy * dt;
    particle.life -= dt;
    particle.radius *= 0.985;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function updateShockwaves(dt) {
  for (const wave of state.shockwaves) {
    wave.radius += wave.speed * dt;
    wave.life -= dt;
  }
  state.shockwaves = state.shockwaves.filter((wave) => wave.life > 0);
}

function updateNotices(dt) {
  for (const notice of state.notices) {
    notice.y -= 18 * dt;
    notice.life -= dt;
  }
  state.notices = state.notices.filter((notice) => notice.life > 0);
}

function checkCollisions() {
  for (const enemy of state.enemies) {
    hitTargetWithBullets(enemy);
    if (!enemy.dead && state.player.invincible <= 0 && distance(enemy, state.player) < enemy.radius + state.player.radius * 0.75) {
      enemy.dead = true;
      damagePlayer();
      burst(enemy.x, enemy.y, "#ff5555", 26);
      shockwave(enemy.x, enemy.y, "#ff5555", 0.42, 180);
    }
  }

  if (state.boss) {
    hitTargetWithBullets(state.boss);
    if (state.boss.hp <= 0) completeLevel();
  }

  for (const bullet of state.enemyBullets) {
    if (bullet.dead || state.player.invincible > 0) continue;
    if (distance(bullet, state.player) < bullet.radius + state.player.radius * 0.72) {
      bullet.dead = true;
      damagePlayer();
      burst(state.player.x, state.player.y, "#ff5555", 22);
      shockwave(state.player.x, state.player.y, "#ff5555", 0.35, 150);
    }
  }

  for (const coin of state.coins) {
    if (coin.dead || distance(coin, state.player) >= coin.radius + state.player.radius) continue;
    coin.dead = true;
    gainCoins(coin.value);
    burst(coin.x, coin.y, "#ffd166", 8);
  }

  for (const powerup of state.powerups) {
    if (powerup.dead || distance(powerup, state.player) >= powerup.radius + state.player.radius) continue;
    powerup.dead = true;
    applyPowerup(powerup.type);
    burst(powerup.x, powerup.y, POWERUPS[powerup.type].color, 18);
  }

  state.bullets = state.bullets.filter((bullet) => !bullet.dead);
  state.enemyBullets = state.enemyBullets.filter((bullet) => !bullet.dead);
  state.enemies = state.enemies.filter((enemy) => !enemy.dead);
  state.coins = state.coins.filter((coin) => !coin.dead);
  state.powerups = state.powerups.filter((powerup) => !powerup.dead);
}

function hitTargetWithBullets(target) {
  for (const bullet of state.bullets) {
    if (target.dead || bullet.dead || bullet.hitIds.has(target.id)) continue;
    if (distance(target, bullet) >= target.radius + bullet.radius) continue;

    bullet.hitIds.add(target.id);
    target.hp -= bullet.damage;
    const explosive = bullet.type === "missile" || bullet.type === "cluster" || bullet.type === "nova";
    burst(bullet.x, bullet.y, bullet.color, explosive ? 16 : 6);
    if (explosive) {
      splashDamage(bullet, bullet.type === "nova" ? 76 : bullet.type === "cluster" ? 52 : 42, bullet.damage);
      bullet.dead = true;
    } else if (!bullet.piercing) {
      bullet.dead = true;
    }

    if (target.hp <= 0 && target !== state.boss) {
      target.dead = true;
      dropCoins(target.x, target.y, target.value);
      maybeDropPowerup(target);
      burst(target.x, target.y, target.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 24);
      shockwave(target.x, target.y, target.maxHp > 5 ? "#ff8a5c" : "#42d6b5", 0.32, target.maxHp > 5 ? 190 : 145);
    }
  }
}

function splashDamage(source, radius, damage) {
  for (const enemy of state.enemies) {
    if (enemy.dead || distance(source, enemy) > radius + enemy.radius) continue;
    enemy.hp -= damage;
    if (enemy.hp <= 0) {
      enemy.dead = true;
      dropCoins(enemy.x, enemy.y, enemy.value);
      maybeDropPowerup(enemy);
      burst(enemy.x, enemy.y, "#ff9f43", 20);
      shockwave(enemy.x, enemy.y, "#ff9f43", 0.28, 145);
    }
  }
  if (state.boss && distance(source, state.boss) < radius + state.boss.radius) state.boss.hp -= damage;
}

function damagePlayer() {
  if (state.player.shield > 0) {
    state.player.shield = 0;
    state.player.invincible = 0.8;
    addNotice("护盾抵消伤害", "#9bffcb");
    return;
  }
  state.player.lives -= 1;
  state.player.invincible = 1.25;
  if (state.player.lives <= 0) failLevel();
}

function applyPowerup(type) {
  if (type === "life") {
    state.player.lives = Math.min(9 + profile.upgrades.armor, state.player.lives + 1);
    addNotice("生命 +1", POWERUPS.life.color);
    return;
  }
  if (type === "shield") {
    state.player.shield = 15;
    addNotice("护盾启动", POWERUPS.shield.color);
    return;
  }
  state.player.weapons[type] = Math.min(MAX_WEAPON_LEVEL, state.player.weapons[type] + 1);
  addNotice(`${POWERUPS[type].name} Lv.${state.player.weapons[type]}`, POWERUPS[type].color);
}

function maybeDropPowerup(enemy) {
  if (Math.random() > (enemy.heavy ? 0.13 : 0.04)) return;
  const types = ["spread", "laser", "missile", "shield", "life"];
  const type = types[Math.floor(Math.random() * types.length)];
  state.powerups.push({ x: enemy.x, y: enemy.y, radius: 15, speed: 110, wobble: Math.random() * Math.PI * 2, type });
}

function dropCoins(x, y, value) {
  const total = Math.ceil(value * (1 + profile.upgrades.bounty * 0.12));
  const count = clamp(Math.ceil(total / 8), 1, 8);
  for (let i = 0; i < count; i += 1) {
    state.coins.push({ x, y, radius: 8, value: Math.ceil(total / count), speed: 72 + Math.random() * 48, wobble: Math.random() * Math.PI * 2 });
  }
}

function gainCoins(amount) {
  profile.coins += amount;
  state.levelCoins += amount;
  saveProfile();
  renderLobby();
}

function completeLevel() {
  if (state.mode !== "fight") return;
  const reward = state.level.reward;
  gainCoins(reward);
  profile.completed = Array.from(new Set([...profile.completed, state.level.id]));
  profile.unlockedLevel = Math.max(profile.unlockedLevel, Math.min(3, state.level.id + 1));
  saveProfile();
  state.mode = "shop";
  cancelAnimationFrame(animationId);
  burst(state.boss.x, state.boss.y, "#ffcf5a", 90);
  shockwave(state.boss.x, state.boss.y, "#ffcf5a", 0.9, 250);
  state.boss = null;
  renderChapterSelect();
  renderShop(`过关奖励 +${reward} 代币。第一章 ${state.level.code} 已完成。`);
  renderLobby();
  showShop();
}

function failLevel() {
  if (state.mode !== "fight") return;
  state.mode = "gameover";
  cancelAnimationFrame(animationId);
  showOverlay("任务失败", `本关获得 ${state.levelCoins} 代币。升级后可以再次挑战。`, "再次挑战");
}

function nearestTarget(bullet) {
  const targets = state.boss ? [state.boss, ...state.enemies] : state.enemies;
  let nearest = null;
  let nearestDistance = Infinity;
  for (const target of targets) {
    const d = distance(bullet, target);
    if (d < nearestDistance) {
      nearestDistance = d;
      nearest = target;
    }
  }
  return nearest;
}

function addNotice(text, color) {
  state.notices.push({ text, color, x: WIDTH / 2, y: 86, life: 1.5 });
}

function burst(x, y, color, count) {
  state.shake = Math.max(state.shake, Math.min(0.22, count / 260));
  for (let i = 0; i < count; i += 1) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 170 + 45;
    state.particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, radius: Math.random() * 3.5 + 1.5, color, life: Math.random() * 0.48 + 0.24 });
  }
}

function shockwave(x, y, color, life = 0.35, speed = 170) {
  state.shockwaves.push({ x, y, color, life, maxLife: life, radius: 8, speed });
}

function muzzleFlash(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({ x, y, vx: (Math.random() - 0.5) * 90, vy: (Math.random() - 0.5) * 90, radius: Math.random() * 3 + 2, color, life: 0.12 + Math.random() * 0.12 });
  }
}

function trail(x, y, color, count) {
  for (let i = 0; i < count; i += 1) {
    state.particles.push({ x, y, vx: (Math.random() - 0.5) * 35, vy: (Math.random() - 0.5) * 35, radius: Math.random() * 2 + 1, color, life: 0.22 });
  }
}

function drawScene() {
  const gradient = ctx.createLinearGradient(0, 0, WIDTH, 0);
  gradient.addColorStop(0, "#07111e");
  gradient.addColorStop(0.58, "#111827");
  gradient.addColorStop(1, state.boss ? "#210d1f" : "#182331");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const shakeX = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 14 : 0;
  const shakeY = state.shake > 0 ? (Math.random() - 0.5) * state.shake * 14 : 0;
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawStars();
  drawShockwaves();
  drawPowerups();
  drawCoins();
  drawBullets();
  drawEnemyBullets();
  drawEnemies();
  drawBoss();
  drawPlayer();
  drawParticles();
  ctx.restore();
  drawProgress();
  drawBossWarning();
  drawNotices();
}

function drawStars() {
  ctx.save();
  for (const star of state.stars) {
    ctx.globalAlpha = 0.45 + star.size / 4;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function imageReady(image) {
  return image && image.complete && image.naturalWidth > 0;
}

function drawSprite(image, x, y, size, rotation = 0) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(rotation);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, -size / 2, -size / 2, size, size);
  ctx.restore();
}

function drawPlayer() {
  const player = state.player;
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.globalAlpha = player.invincible > 0 && Math.floor(player.invincible * 12) % 2 === 0 ? 0.45 : 1;
  if (imageReady(assets.player)) drawSprite(assets.player, 0, 0, 66, Math.PI / 2);
  else drawFallbackShip("#42d6b5", 1);
  drawEngineFlame(-30, 0, 12, "#ffb74d");
  if (player.shield > 0) {
    ctx.strokeStyle = "rgba(155, 255, 203, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 38 + Math.sin(state.elapsed * 8) * 2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    ctx.save();
    ctx.translate(enemy.x, enemy.y);
    if (imageReady(enemy.image)) drawSprite(enemy.image, 0, 0, enemy.heavy ? 74 : 54, -Math.PI / 2);
    else drawFallbackShip(enemy.heavy ? "#ff7a59" : "#ef476f", -1);
    if (enemy.maxHp > 5) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
      ctx.fillRect(-24, enemy.radius + 8, 48, 5);
      ctx.fillStyle = "#7bed9f";
      ctx.fillRect(-24, enemy.radius + 8, 48 * Math.max(0, enemy.hp / enemy.maxHp), 5);
    }
    ctx.restore();
  }
}

function drawBoss() {
  const boss = state.boss;
  if (!boss) return;
  ctx.save();
  ctx.translate(boss.x, boss.y);
  if (imageReady(assets.boss)) drawSprite(assets.boss, 0, 0, 172, -Math.PI / 2);
  else drawFallbackBoss();
  ctx.restore();

  ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
  ctx.fillRect(WIDTH * 0.52, 16, WIDTH * 0.42, 12);
  ctx.fillStyle = "#ff5d73";
  ctx.fillRect(WIDTH * 0.52, 16, WIDTH * 0.42 * Math.max(0, boss.hp / boss.maxHp), 12);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.35)";
  ctx.strokeRect(WIDTH * 0.52, 16, WIDTH * 0.42, 12);
}

function drawFallbackShip(color, direction) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(32 * direction, 0);
  ctx.lineTo(-18 * direction, -18);
  ctx.lineTo(-8 * direction, 0);
  ctx.lineTo(-18 * direction, 18);
  ctx.closePath();
  ctx.fill();
}

function drawFallbackBoss() {
  ctx.fillStyle = "#8b2cff";
  ctx.fillRect(-60, -48, 120, 96);
  ctx.fillStyle = "#ff6bcb";
  ctx.beginPath();
  ctx.arc(-22, 0, 24, 0, Math.PI * 2);
  ctx.fill();
}

function drawEngineFlame(x, y, width, color) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x, y - width / 2);
  ctx.lineTo(x - 24 - Math.sin(state.elapsed * 18) * 7, y);
  ctx.lineTo(x, y + width / 2);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawBullets() {
  ctx.save();
  for (const bullet of state.bullets) {
    ctx.shadowBlur = bullet.type === "normal" ? 12 : 18;
    ctx.shadowColor = bullet.color;
    ctx.fillStyle = bullet.color;
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle);
    if (bullet.type === "missile" || bullet.type === "cluster") {
      ctx.beginPath();
      ctx.moveTo(13, 0);
      ctx.lineTo(-9, 8);
      ctx.lineTo(-5, 0);
      ctx.lineTo(-9, -8);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.roundRect(-12, -bullet.radius * 0.72, bullet.type === "laser" ? 34 : 24, bullet.radius * 1.44, 4);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

function drawEnemyBullets() {
  ctx.save();
  for (const bullet of state.enemyBullets) {
    ctx.fillStyle = bullet.color;
    ctx.shadowBlur = 12;
    ctx.shadowColor = bullet.color;
    ctx.beginPath();
    ctx.arc(bullet.x, bullet.y, bullet.radius + Math.sin(bullet.age * 10), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawCoins() {
  ctx.save();
  for (const coin of state.coins) {
    ctx.fillStyle = "#ffd166";
    ctx.strokeStyle = "#fff6c7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(coin.x, coin.y, coin.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  ctx.restore();
}

function drawPowerups() {
  for (const powerup of state.powerups) {
    const info = POWERUPS[powerup.type];
    ctx.save();
    ctx.translate(powerup.x, powerup.y);
    ctx.rotate(Math.sin(powerup.wobble) * 0.25);
    ctx.fillStyle = info.color;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, powerup.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#102018";
    ctx.font = "bold 15px Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(info.mark, 0, 1);
    ctx.restore();
  }
}

function drawParticles() {
  ctx.save();
  for (const particle of state.particles) {
    ctx.globalAlpha = Math.max(0, particle.life * 2.2);
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawShockwaves() {
  ctx.save();
  ctx.lineWidth = 3;
  for (const wave of state.shockwaves) {
    ctx.globalAlpha = Math.max(0, wave.life / wave.maxLife);
    ctx.strokeStyle = wave.color;
    ctx.beginPath();
    ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
}

function drawProgress() {
  if (state.mode !== "fight") return;
  const progress = clamp(state.elapsed / LEVEL_DURATION, 0, 1);
  ctx.fillStyle = "rgba(0, 0, 0, 0.38)";
  ctx.fillRect(34, 16, WIDTH * 0.38, 8);
  ctx.fillStyle = "#42d6b5";
  ctx.fillRect(34, 16, WIDTH * 0.38 * progress, 8);
}

function drawBossWarning() {
  if (state.bossWarning <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, state.bossWarning);
  ctx.fillStyle = "#ff5d73";
  ctx.font = "bold 34px Microsoft YaHei, Arial";
  ctx.textAlign = "center";
  ctx.fillText("BOSS 来袭", WIDTH / 2, 82);
  ctx.restore();
}

function drawNotices() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.font = "bold 18px Microsoft YaHei, Arial";
  for (const notice of state.notices) {
    ctx.globalAlpha = Math.min(1, notice.life);
    ctx.fillStyle = notice.color;
    ctx.fillText(notice.text, notice.x, notice.y);
  }
  ctx.restore();
}

function renderChapterSelect() {
  chapterSelect.innerHTML = "";
  for (const level of levels) {
    const button = document.createElement("button");
    const unlocked = level.id <= profile.unlockedLevel;
    button.className = `level-card${selectedLevel === level.id ? " active" : ""}${unlocked ? "" : " locked"}`;
    button.disabled = !unlocked;
    button.type = "button";
    button.innerHTML = `<strong>${level.code} ${level.name}</strong><span>${level.desc}</span><span>${profile.completed.includes(level.id) ? "已通关，可重复挑战" : unlocked ? "已解锁" : "未解锁"}</span>`;
    button.addEventListener("click", () => {
      selectedLevel = level.id;
      state.level = level;
      renderChapterSelect();
      updateHud();
      startButton.textContent = `开始 ${level.code}`;
    });
    chapterSelect.appendChild(button);
  }
  startButton.textContent = `开始 ${levels[selectedLevel - 1].code}`;
}

function renderLobby() {
  const player = profile.player;
  const expMax = Math.max(1, Number(player.expMax) || 1);
  const exp = clamp(Number(player.exp) || 0, 0, expMax);
  pilotAvatar.src = encodeURI(player.avatar);
  pilotName.textContent = player.name;
  pilotLevel.textContent = `Lv.${player.level}`;
  pilotExpText.textContent = `${exp}/${expMax}`;
  pilotExpBar.style.width = `${Math.round((exp / expMax) * 100)}%`;
  pilotBadge.textContent = player.badge;
  energyValue.textContent = formatResource(profile.resources.energy);
  goldValue.textContent = formatResource(profile.coins);
  diamondValue.textContent = formatResource(profile.resources.diamonds);
}

function renderShop(message = "欢迎回来，飞行员。把战斗代币换成实打实的性能吧。") {
  shopMessageEl.textContent = message;
  shopCoinsEl.textContent = `${profile.coins} 代币`;
  upgradeList.innerHTML = "";
  for (const [key, upgrade] of Object.entries(upgrades)) {
    const level = profile.upgrades[key];
    const cost = upgradeCost(key);
    const card = document.createElement("article");
    card.className = "upgrade-card";
    card.innerHTML = `<h3>${upgrade.name} Lv.${level}/${upgrade.max}</h3><p>${upgrade.desc}</p>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = level >= upgrade.max ? "已满级" : `升级 ${cost} 代币`;
    button.disabled = level >= upgrade.max || profile.coins < cost;
    button.addEventListener("click", () => buyUpgrade(key));
    card.appendChild(button);
    upgradeList.appendChild(card);
  }
  nextLevelButton.disabled = selectedLevel >= 3 && profile.completed.includes(3);
  nextLevelButton.textContent = selectedLevel >= 3 ? "第一章已完成" : `进入 ${levels[Math.min(selectedLevel, 2)].code}`;
}

function buyUpgrade(key) {
  const cost = upgradeCost(key);
  if (profile.upgrades[key] >= upgrades[key].max || profile.coins < cost) return;
  profile.coins -= cost;
  profile.upgrades[key] += 1;
  saveProfile();
  renderShop(`${upgrades[key].name} 已升级。`);
  renderLobby();
  updateHud();
}

function upgradeCost(key) {
  const level = profile.upgrades[key];
  return upgrades[key].baseCost * (level + 1);
}

function showShop() {
  overlay.classList.add("hidden");
  shopScreen.classList.remove("hidden");
  renderShop(shopMessageEl.textContent);
}

function hideShop() {
  shopScreen.classList.add("hidden");
}

function showOverlay(title, message, buttonText) {
  overlay.querySelector("h1").textContent = title;
  messageEl.textContent = message;
  startButton.textContent = buttonText;
  overlay.classList.remove("hidden");
  hideShop();
}

function updateHud() {
  const level = levels[selectedLevel - 1];
  levelLabelEl.textContent = level.code;
  const remaining = state.mode === "fight" && !state.bossSpawned ? Math.max(0, Math.ceil(LEVEL_DURATION - state.elapsed)) : state.boss ? "BOSS" : LEVEL_DURATION;
  timeLabelEl.textContent = remaining;
  livesEl.textContent = state.player?.lives ?? 3 + profile.upgrades.armor;
  coinsEl.textContent = profile.coins;
  const activeWeapons = getActiveWeapons();
  const fusionCount = getFusionLabels().length;
  weaponEl.textContent = activeWeapons.length
    ? `${activeWeapons.map(([type, levelValue]) => `${POWERUPS[type].mark}${levelValue}`).join(" ")}${fusionCount ? ` 合${fusionCount}` : ""}`
    : profile.upgrades.fire ? `火${profile.upgrades.fire}` : "普通";
}

function getActiveWeapons() {
  return Object.entries(state.player.weapons).filter(([, level]) => level > 0);
}

function getFusionLabels() {
  const { spread, laser, missile } = state.player.weapons;
  const labels = [];
  if (spread >= 3 && laser >= 3) labels.push("棱镜");
  if (spread >= 3 && missile >= 3) labels.push("集束");
  if (laser >= 3 && missile >= 3) labels.push("轨道");
  if (spread >= 6 && laser >= 6 && missile >= 6) labels.push("星爆");
  return labels;
}

function formatShopOpen() {
  showBattleScreen();
  state.mode = "shop";
  cancelAnimationFrame(animationId);
  renderShop();
  showShop();
}

function pauseGame() {
  if (state.mode !== "fight") return;
  state.mode = "paused";
  pauseButton.textContent = "继续";
  cancelAnimationFrame(animationId);
  showOverlay("已暂停", "战机停泊中。继续后会回到当前关卡。", "继续游戏");
}

function resumeGame() {
  if (state.mode !== "paused") return;
  state.mode = "fight";
  overlay.classList.add("hidden");
  pauseButton.textContent = "暂停";
  lastTime = performance.now();
  animationId = requestAnimationFrame(loop);
}

function showBattleScreen() {
  lobbyScreen.classList.add("hidden");
  battleScreen.classList.remove("hidden");
}

function showLobby() {
  cancelAnimationFrame(animationId);
  state = createMenuState();
  hideShop();
  overlay.classList.remove("hidden");
  lobbyScreen.classList.remove("hidden");
  battleScreen.classList.add("hidden");
  featurePanel.classList.add("hidden");
  pauseButton.textContent = "暂停";
  renderLobby();
  renderChapterSelect();
  updateHud();
  drawScene();
}

function openBattleSelect() {
  showBattleScreen();
  state = createMenuState();
  hideShop();
  overlay.querySelector("h1").textContent = "选择关卡";
  messageEl.textContent = "选择关卡后开始战斗。关卡入口统一放在这里。";
  overlay.classList.remove("hidden");
  renderChapterSelect();
  updateHud();
  drawScene();
}

function openFeaturePanel(key) {
  const panel = featurePanels[key] || {
    kicker: "SYSTEM",
    title: "功能界面",
    body: "该入口已经接通，内容待填充。",
    slots: ["素材", "规则", "奖励"]
  };
  featurePanelKicker.textContent = panel.kicker;
  featurePanelTitle.textContent = panel.title;
  featurePanelBody.textContent = panel.body;
  featurePanelSlots.innerHTML = "";
  for (const slot of panel.slots) {
    const item = document.createElement("div");
    item.className = "feature-slot";
    item.textContent = slot;
    featurePanelSlots.appendChild(item);
  }
  featurePanel.classList.remove("hidden");
}

function formatResource(value) {
  const number = Number(value) || 0;
  if (number >= 1000000) return `${(number / 1000000).toFixed(1)}M`;
  if (number >= 10000) return `${(number / 1000).toFixed(1)}K`;
  return String(number);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function canvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return { x: ((event.clientX - rect.left) / rect.width) * WIDTH, y: ((event.clientY - rect.top) / rect.height) * HEIGHT };
}

startButton.addEventListener("click", () => {
  if (state.mode === "paused") resumeGame();
  else startLevel(selectedLevel);
});

battleEntryButton.addEventListener("click", openBattleSelect);
homeButton.addEventListener("click", showLobby);
closeFeaturePanel.addEventListener("click", () => featurePanel.classList.add("hidden"));
featurePanel.addEventListener("click", (event) => {
  if (event.target === featurePanel) featurePanel.classList.add("hidden");
});
document.querySelectorAll(".lobby-action").forEach((button) => {
  button.addEventListener("click", () => openFeaturePanel(button.dataset.panel));
});

pauseButton.addEventListener("click", () => {
  if (state.mode === "paused") resumeGame();
  else pauseGame();
});

restartButton.addEventListener("click", () => startLevel(selectedLevel));
shopButton.addEventListener("click", formatShopOpen);
replayButton.addEventListener("click", () => startLevel(selectedLevel));
backToChapterButton.addEventListener("click", () => {
  state = createMenuState();
  renderChapterSelect();
  hideShop();
  overlay.classList.remove("hidden");
  updateHud();
  drawScene();
});
nextLevelButton.addEventListener("click", () => {
  if (selectedLevel < profile.unlockedLevel) selectedLevel += 1;
  startLevel(selectedLevel);
});

window.addEventListener("keydown", (event) => {
  const gameKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"].includes(event.code);
  if (gameKey) event.preventDefault();
  keys.add(event.code);
  if (event.code === "Space" && state.mode === "fight") shoot();
  if (event.code === "KeyP") {
    if (state.mode === "paused") resumeGame();
    else pauseGame();
  }
});

window.addEventListener("keyup", (event) => keys.delete(event.code));

canvas.addEventListener("pointerdown", (event) => {
  pointer.active = true;
  const point = canvasPoint(event);
  pointer.x = point.x;
  pointer.y = point.y;
  canvas.setPointerCapture(event.pointerId);
});

canvas.addEventListener("pointermove", (event) => {
  if (!pointer.active) return;
  const point = canvasPoint(event);
  pointer.x = point.x;
  pointer.y = point.y;
});

canvas.addEventListener("pointerup", (event) => {
  pointer.active = false;
  canvas.releasePointerCapture(event.pointerId);
});

canvas.addEventListener("pointercancel", () => {
  pointer.active = false;
});
