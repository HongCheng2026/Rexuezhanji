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
const avatarUpload = document.querySelector("#avatarUpload");
const lobbyBackgroundLayer = document.querySelector("#lobbyBackgroundLayer");
const lobbyPilotLayer = document.querySelector("#lobbyPilotLayer");
const lobbyShipLayer = document.querySelector("#lobbyShipLayer");
const lobbyGreeting = document.querySelector("#lobbyGreeting");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const keys = new Set();
const pointer = { active: false, x: 90, y: HEIGHT / 2 };

const shared = window.RXGame;
const cloud = window.RXCloud;
const {
  LEVEL_DURATION,
  BOSS_SPAWN_TIME,
  ENERGY_MAX,
  ENERGY_COST,
  levels,
  upgrades,
  POWERUPS
} = shared.levels;
const {
  DEFAULT_AVATAR,
  DEFAULT_PILOT_ID,
  DEFAULT_SHIP_ID,
  PILOT_ASSETS,
  SHIP_ASSETS,
  BACKGROUND_ASSETS,
  ASSET_PATHS
} = shared.assets;
const { MAX_WEAPON_LEVEL } = shared.balance;
const getEnemyScaling = (level) => shared.balance.getEnemyScalingForLevel(level, {
  pilotRarity: getPilotAsset().rank,
  fighterRarity: getShipAsset().rank
});
const getEnemyHp = shared.balance.getEnemyHp;

const featurePanels = {
  profile: {
    kicker: "PILOT",
    title: "飞行员资料",
    body: "头像、等级、经验、体力、金币和钻石都会写入本地存档。头像可以换成自己的图片。",
    slots: ["更换头像", "保存存档", "读取存档"]
  },
  energy: {
    kicker: "RESOURCE",
    title: "体力",
    body: `体力上限为 ${ENERGY_MAX}/${ENERGY_MAX}，每次进入战斗消耗 ${ENERGY_COST} 点。`,
    slots: ["战斗消耗", "恢复规则", "体力道具"]
  },
  gold: {
    kicker: "RESOURCE",
    title: "金币",
    body: "战斗获得的金币会累计到这里，升级战机时会从金币里扣除。",
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
    title: "作战任务",
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

const assets = loadAssets(ASSET_PATHS);
let profile = loadProfile();
let selectedLevel = clamp(profile.unlockedLevel, 1, levels.length);
let state = createMenuState();
let lastTime = 0;
let animationId = 0;
let activeBattleTicket = null;

saveProfile();
renderChapterSelect();
renderShop();
renderLobby();
updateHud();
drawScene();
initializeCloudProfile();

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
  try {
    return shared.profile.createProfile(JSON.parse(localStorage.getItem("sideShooterProfile") || "{}"));
  } catch {
    return shared.profile.createProfile();
  }
}

function normalizeProfile(nextProfile) {
  return shared.profile.normalizeProfile(nextProfile);
}

function saveProfile() {
  recoverEnergy(profile);
  profile = normalizeProfile(profile);
  localStorage.setItem("sideShooterProfile", JSON.stringify(profile));
  saveCloudState();
}

async function initializeCloudProfile() {
  if (!cloud?.configured?.()) return;
  try {
    const result = await cloud.bootstrap();
    if (!result?.profile) return;
    profile = normalizeProfile(result.profile);
    localStorage.setItem("sideShooterProfile", JSON.stringify(profile));
    selectedLevel = clamp(profile.unlockedLevel, 1, levels.length);
    state = createMenuState();
    renderChapterSelect();
    renderLobby();
    updateHud();
    drawScene();
  } catch (error) {
    console.warn("云端存档暂不可用，继续使用本地缓存。", error);
  }
}

async function syncCosmetics() {
  if (!cloud?.configured?.()) return;
  try {
    const result = await cloud.saveCosmetics(profile);
    if (result?.profile) {
      profile = normalizeProfile(result.profile);
      saveProfile();
      renderLobby();
    }
  } catch (error) {
    console.warn("外观存档同步失败。", error);
  }
}

function saveCloudState() {
  const cloudState = {
    resources: profile.resources,
    unownedPilots: PILOT_ASSETS.filter((asset) => !profile.owned.pilots.includes(asset.id)).map((asset) => asset.id),
    unownedShips: SHIP_ASSETS.filter((asset) => !profile.owned.ships.includes(asset.id)).map((asset) => asset.id),
    unownedBackgrounds: BACKGROUND_ASSETS.filter((asset) => !profile.owned.backgrounds.includes(asset.id)).map((asset) => asset.id),
    savedAt: Date.now()
  };
  localStorage.setItem("sideShooterCloudState", JSON.stringify(cloudState));
}

function recoverEnergy(targetProfile = profile) {
  return shared.profile.recoverEnergy(targetProfile);
}

function reloadProfileFromSave() {
  profile = loadProfile();
  selectedLevel = clamp(profile.unlockedLevel, 1, levels.length);
  state = createMenuState();
  renderChapterSelect();
  renderShop("存档已读取。");
  renderLobby();
  updateHud();
  drawScene();
}

function getGold() {
  return shared.profile.getGold(profile);
}

function setGold(value) {
  shared.profile.setGold(profile, value);
}

function spendEnergy(amount) {
  if (!shared.profile.spendEnergy(profile, amount)) return false;
  saveProfile();
  renderLobby();
  return true;
}

function gainExperience(amount) {
  const result = shared.battleRules.applyExperience(profile.player, amount);
  saveProfile();
  renderLobby();
  return result;
}

function battleExperience(baseReward = 0) {
  return shared.battleRules.getBattleExperience({
    levelId: state.level.id,
    levelCoins: state.levelCoins,
    baseReward
  });
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
    notices: [],
    damageTaken: 0,
    powerupsSpawned: 0,
    powerupsCollected: 0
    ,storyRuntime: null
    ,storyMessage: null
    ,storyMessageUntil: 0
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

async function startLevel(levelId = selectedLevel) {
  selectedLevel = clamp(levelId, 1, levels.length);
  const selected = levels[selectedLevel - 1];
  try {
    const result = await cloud.startBattle(selected.id);
    profile = normalizeProfile(result.profile);
    activeBattleTicket = result.ticket;
    saveProfile();
  } catch (error) {
    showBattleScreen();
    showOverlay("无法开始战斗", error.message || "云端战斗服务暂不可用，请稍后再试。", "返回关卡");
    updateHud();
    return;
  }
  state = createMenuState();
  state.mode = "fight";
  const pilot = getPilotAsset();
  state.storyRuntime = shared.battleStorySystem?.createBattleStoryRuntime({
    chapterIndex: selected.chapterIndex || 1,
    stageInChapter: selected.stageInChapter || selected.id,
    selectedPilot: { id: pilot.id, name: pilot.name, avatarId: pilot.src },
    hasBoss: true
  });
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
  updateBattleStory();

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

function updateBattleStory() {
  const runtime = state.storyRuntime;
  if (!runtime) return;
  for (const event of runtime.getEventsToShow(state.elapsed)) {
    if (shared.battleStorySystem.shouldRenderBattleStoryMessage(event)) {
      state.storyMessage = event;
      state.storyMessageUntil = performance.now() + event.durationMs;
    }
  }
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

  state.player.x = clamp(state.player.x, 38, WIDTH - 38);
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
      state.bullets.push(createBullet(x + 34, y + lane, 0, "normal", getPlayerDamage("normal", 1), 650, 4, "#d7fff5"));
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
      state.bullets.push(createBullet(x + 32, y, start + step * i, "spread", getPlayerDamage("spread", level), 610, 4, "#ffd166"));
    }
    return;
  }

  if (weapon === "laser") {
    const offsets = level >= 8 ? [-22, -11, 0, 11, 22] : level >= 5 ? [-16, -5, 5, 16] : level >= 2 ? [-10, 10] : [0];
    for (const offset of offsets) {
      state.bullets.push(createBullet(x + 34, y + offset, 0, "laser", getPlayerDamage("laser", level), 820, 5, "#5ee7ff", true));
    }
    return;
  }

  if (weapon === "missile") {
    const count = Math.min(5, Math.ceil(level / 2));
    const offsets = count === 1 ? [0] : count === 2 ? [-12, 12] : count === 3 ? [-18, 0, 18] : count === 4 ? [-24, -8, 8, 24] : [-30, -15, 0, 15, 30];
    for (let i = 0; i < offsets.length; i += 1) {
      const angle = offsets.length === 1 ? 0 : (i - (offsets.length - 1) / 2) * 0.05;
      state.bullets.push(createBullet(x + 28, y + offsets[i], angle, "missile", getPlayerDamage("missile", level), 460 + level * 14, 7, "#ff9f43"));
    }
  }
}

function fireFusionWeapons(x, y) {
  const { spread, laser, missile } = state.player.weapons;
  if (spread >= 3 && laser >= 3) state.bullets.push(createBullet(x + 42, y, 0, "prism", getPlayerDamage("laser", Math.max(spread, laser)) * 1.25, 880, 6, "#8fffea", true));
  if (spread >= 3 && missile >= 3) {
    state.bullets.push(createBullet(x + 34, y - 18, -0.08, "cluster", getPlayerDamage("missile", Math.max(spread, missile)), 520, 7, "#ffc857"));
    state.bullets.push(createBullet(x + 34, y + 18, 0.08, "cluster", getPlayerDamage("missile", Math.max(spread, missile)), 520, 7, "#ffc857"));
  }
  if (laser >= 3 && missile >= 3) state.bullets.push(createBullet(x + 46, y, 0, "rail", getPlayerDamage("laser", Math.max(laser, missile)) * 1.45, 930, 7, "#b89cff", true));
  if (spread >= 6 && laser >= 6 && missile >= 6) state.bullets.push(createBullet(x + 50, y, 0, "nova", getPlayerDamage("missile", 10) * 2, 690, 12, "#ffffff", true));
}

function getPlayerDamage(type, weaponLevel = 1) {
  return shared.balance.getPlayerWeaponDamage({
    pilotDamage: getPilotAsset().damage,
    fighterDamage: getShipAsset().damage,
    fighterUpgradeMultiplier: Math.min(2, 1 + profile.upgrades.fire * 0.1),
    weaponType: type,
    weaponLevel
  });
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
  const hp = getEnemyHp(heavy ? "elite" : "small", level);
  const scaling = getEnemyScaling(level);
  const enemy = {
    id: crypto.randomUUID ? crypto.randomUUID() : `${state.elapsed}-${Math.random()}`,
    x: WIDTH + 44,
    y: 48 + Math.random() * (HEIGHT - 96),
    radius: heavy ? 30 : 22,
    hp,
    maxHp: hp,
    damageTakenMultiplier: scaling.damageTakenMultiplier,
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
  if (state.bossSpawned || state.elapsed < BOSS_SPAWN_TIME) return;
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
    hp: getEnemyHp("boss", state.level),
    maxHp: getEnemyHp("boss", state.level),
    damageTakenMultiplier: getEnemyScaling(state.level).damageTakenMultiplier,
    spawnedAt: state.elapsed,
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
  state.powerupsSpawned += 1;
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
    state.damageTaken += escaped.length;
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
    state.powerupsCollected += 1;
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
    target.hp -= bullet.damage * (target.damageTakenMultiplier || 1);
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
    enemy.hp -= damage * (enemy.damageTakenMultiplier || 1);
    if (enemy.hp <= 0) {
      enemy.dead = true;
      dropCoins(enemy.x, enemy.y, enemy.value);
      maybeDropPowerup(enemy);
      burst(enemy.x, enemy.y, "#ff9f43", 20);
      shockwave(enemy.x, enemy.y, "#ff9f43", 0.28, 145);
    }
  }
  if (state.boss && distance(source, state.boss) < radius + state.boss.radius) state.boss.hp -= damage * (state.boss.damageTakenMultiplier || 1);
}

function damagePlayer() {
  if (state.player.shield > 0) {
    state.player.shield = 0;
    state.player.invincible = 0.8;
    addNotice("护盾抵消伤害", "#9bffcb");
    return;
  }
  state.player.lives -= 1;
  state.damageTaken += 1;
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
  state.powerupsSpawned += 1;
}

function dropCoins(x, y, value) {
  const total = Math.ceil(value * (1 + profile.upgrades.bounty * 0.12));
  const count = clamp(Math.ceil(total / 8), 1, 8);
  for (let i = 0; i < count; i += 1) {
    state.coins.push({ x, y, radius: 8, value: Math.ceil(total / count), speed: 72 + Math.random() * 48, wobble: Math.random() * Math.PI * 2 });
  }
}

function gainCoins(amount) {
  state.levelCoins += amount;
}

async function completeLevel() {
  if (state.mode !== "fight") return;
  const bossClearTime = state.boss ? Math.max(0, state.elapsed - state.boss.spawnedAt) : 999;
  const rating = calculateRating(bossClearTime);
  state.mode = "settling";
  cancelAnimationFrame(animationId);
  let settlement;
  try {
    const result = await cloud.finishBattle(activeBattleTicket, state.level.id, rating);
    profile = normalizeProfile(result.profile);
    settlement = result.settlement;
    activeBattleTicket = null;
    saveProfile();
  } catch (error) {
    state.mode = "gameover";
    showOverlay("结算未完成", error.message || "云端结算失败，请稍后重试。", "返回关卡");
    renderLobby();
    return;
  }
  state.mode = "settlement";
  burst(state.boss.x, state.boss.y, "#ffcf5a", 90);
  shockwave(state.boss.x, state.boss.y, "#ffcf5a", 0.9, 250);
  state.boss = null;
  renderChapterSelect();
  renderShop(`过关奖励 +${settlement.gold} 金币，经验 +${settlement.experience}。第一章 ${state.level.code} 已完成。`);
  renderLobby();
  showOverlay("关卡结算", `${settlement.rating.label} ${settlement.rating.icons}｜金币 +${settlement.gold}｜经验 +${settlement.experience}｜点击“再次挑战”重打一局，或点下方“大厅”返回。`, "再次挑战");
}

async function failLevel() {
  if (state.mode !== "fight") return;
  state.mode = "gameover";
  cancelAnimationFrame(animationId);
  if (activeBattleTicket) cloud.abandonBattle(activeBattleTicket).catch(() => {});
  activeBattleTicket = null;
  showOverlay("任务失败", "本次战斗未完成，未发放奖励。", "再次挑战");
}

function calculateRating(bossClearTime) {
  return shared.battleRules.calculateRating({
    damageTaken: state.damageTaken,
    powerupsSpawned: state.powerupsSpawned,
    powerupsCollected: state.powerupsCollected,
    bossClearTime
  });
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
  drawBattleStory();
}

function drawBattleStory() {
  const message = state.storyMessage;
  if (!message || performance.now() > state.storyMessageUntil) return;
  const remaining = state.storyMessageUntil - performance.now();
  ctx.save();
  ctx.globalAlpha = Math.min(1, remaining / 160);
  ctx.fillStyle = "rgba(6, 13, 25, 0.82)";
  ctx.fillRect(24, HEIGHT - 105, Math.min(WIDTH - 48, 390), 78);
  ctx.fillStyle = "#42d6b5";
  ctx.beginPath();
  ctx.arc(56, HEIGHT - 66, 22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#08111c";
  ctx.font = "bold 19px Microsoft YaHei, Arial";
  ctx.textAlign = "center";
  ctx.fillText(String(message.speakerName || "飞行员").slice(0, 1), 56, HEIGHT - 59);
  ctx.textAlign = "left";
  ctx.fillStyle = "#ffd166";
  ctx.font = "bold 14px Microsoft YaHei, Arial";
  ctx.fillText(message.speakerName, 91, HEIGHT - 80);
  ctx.fillStyle = "#ffffff";
  ctx.font = "14px Microsoft YaHei, Arial";
  ctx.fillText(message.text, 91, HEIGHT - 52);
  ctx.restore();
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
  const progress = clamp(state.elapsed / BOSS_SPAWN_TIME, 0, 1);
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
  const sweepButton = document.createElement("button");
  const sweepLevel = levels[selectedLevel - 1];
  sweepButton.className = "level-card";
  sweepButton.type = "button";
  sweepButton.disabled = !profile.completed.includes(sweepLevel.id);
  sweepButton.innerHTML = `<strong>扫荡 ${sweepLevel.code}</strong><span>已通关关卡可直接获得奖励，消耗 ${ENERGY_COST} 体力。</span>`;
  sweepButton.addEventListener("click", () => sweepSelectedLevel());
  chapterSelect.appendChild(sweepButton);
  startButton.textContent = `开始 ${levels[selectedLevel - 1].code}`;
}

async function sweepSelectedLevel() {
  const level = levels[selectedLevel - 1];
  if (!profile.completed.includes(level.id)) return;
  try {
    const result = await cloud.sweep(level.id);
    profile = normalizeProfile(result.profile);
    saveProfile();
    renderChapterSelect();
    renderLobby();
    showOverlay("扫荡完成", `${level.code} 获得金币 +${result.settlement.gold}，经验 +${result.settlement.experience}。`, "再次扫荡");
  } catch (error) {
    showOverlay("无法扫荡", error.message || "云端扫荡服务暂不可用。", "返回关卡");
  }
}

function renderLobby() {
  recoverEnergy(profile);
  const player = profile.player;
  const expMax = Math.max(1, Number(player.expMax) || 1);
  const exp = clamp(Number(player.exp) || 0, 0, expMax);
  const avatar = player.avatar || DEFAULT_AVATAR;
  const pilotAsset = getPilotAsset();
  const shipAsset = getShipAsset();
  const backgroundAsset = getBackgroundAsset();
  setImageSource(pilotAvatar, avatar);
  setImageSource(lobbyPilotLayer, pilotAsset.src);
  setImageSource(lobbyShipLayer, shipAsset.src);
  if (backgroundAsset?.src) {
    setImageSource(lobbyBackgroundLayer, backgroundAsset.src);
    lobbyBackgroundLayer.classList.add("has-image");
  } else {
    lobbyBackgroundLayer.removeAttribute("src");
    lobbyBackgroundLayer.classList.remove("has-image");
  }
  pilotName.textContent = player.name;
  pilotLevel.textContent = `Lv.${player.level}`;
  pilotExpText.textContent = `${exp}/${expMax}`;
  pilotExpBar.style.width = `${Math.round((exp / expMax) * 100)}%`;
  pilotBadge.textContent = player.badge;
  energyValue.textContent = `${formatResource(profile.resources.energy)}/${formatResource(profile.resources.maxEnergy)}`;
  goldValue.textContent = formatResource(getGold());
  diamondValue.textContent = formatResource(profile.resources.diamonds);
}

function getPilotAsset(id = profile.scene.pilotId) {
  return PILOT_ASSETS.find((asset) => asset.id === id) || PILOT_ASSETS.find((asset) => asset.id === DEFAULT_PILOT_ID);
}

function getShipAsset(id = profile.scene.shipId) {
  return SHIP_ASSETS.find((asset) => asset.id === id) || SHIP_ASSETS.find((asset) => asset.id === DEFAULT_SHIP_ID);
}

function getBackgroundAsset(id = profile.scene.backgroundId) {
  return BACKGROUND_ASSETS.find((asset) => asset.id === id) || BACKGROUND_ASSETS[0];
}

function setImageSource(image, source) {
  if (!image) return;
  image.src = source.startsWith("data:") ? source : encodeURI(source);
}

function renderShop(message = "欢迎回来，飞行员。把战斗金币换成实打实的性能吧。") {
  shopMessageEl.textContent = message;
  shopCoinsEl.textContent = `${getGold()} 金币`;
  upgradeList.innerHTML = "";
  for (const [key, upgrade] of Object.entries(upgrades)) {
    const level = profile.upgrades[key];
    const cost = upgradeCost(key);
    const card = document.createElement("article");
    card.className = "upgrade-card";
    card.innerHTML = `<h3>${upgrade.name} Lv.${level}/${upgrade.max}</h3><p>${upgrade.desc}</p>`;
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = level >= upgrade.max ? "已满级" : `升级 ${cost} 金币`;
    button.disabled = level >= upgrade.max || getGold() < cost;
    button.addEventListener("click", () => buyUpgrade(key));
    card.appendChild(button);
    upgradeList.appendChild(card);
  }
  nextLevelButton.disabled = selectedLevel >= levels.length && profile.completed.includes(levels[levels.length - 1].id);
  nextLevelButton.textContent = selectedLevel >= levels.length ? "第一章已完成" : `进入 ${levels[Math.min(selectedLevel, levels.length - 1)].code}`;
}

async function buyUpgrade(key) {
  try {
    const result = await cloud.upgrade(key);
    profile = normalizeProfile(result.profile);
    saveProfile();
    renderShop(`${upgrades[key].name} 已升级，消耗 ${result.cost} 金币。`);
    renderLobby();
    updateHud();
  } catch (error) {
    renderShop(error.message || "云端升级服务暂不可用。");
  }
}

function upgradeCost(key) {
  const level = profile.upgrades[key];
  return shared.battleRules.getUpgradeCost(upgrades[key], level);
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
  const remaining = state.mode === "fight" && !state.bossSpawned ? Math.max(0, Math.ceil(BOSS_SPAWN_TIME - state.elapsed)) : state.boss ? "BOSS" : LEVEL_DURATION;
  timeLabelEl.textContent = remaining;
  livesEl.textContent = state.player?.lives ?? 3 + profile.upgrades.armor;
  coinsEl.textContent = getGold();
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
  featurePanelSlots.classList.remove("profile-slots");
  for (const slot of panel.slots) {
    const item = document.createElement("div");
    item.className = "feature-slot";
    item.textContent = slot;
    featurePanelSlots.appendChild(item);
  }
  if (key === "profile") renderProfileActions();
  if (key === "setting") renderSettingActions();
  featurePanel.classList.remove("hidden");
}

function renderSettingActions() {
  featurePanelSlots.innerHTML = "";
  featurePanelSlots.classList.add("profile-slots");
  const item = document.createElement("div");
  item.className = "feature-slot action";
  item.innerHTML = "<strong>兑换码</strong><small>奖励由云端校验；同一账号每个兑换码只能领取一次。</small>";
  const input = document.createElement("input");
  input.type = "text";
  input.maxLength = 24;
  input.placeholder = "请输入兑换码";
  const button = document.createElement("button");
  button.className = "feature-button";
  button.type = "button";
  button.textContent = "兑换";
  button.addEventListener("click", async () => {
    try {
      const result = await cloud.redeem(input.value);
      profile = normalizeProfile(result.profile);
      saveProfile();
      renderLobby();
      featurePanelBody.textContent = "兑换成功，奖励已写入云端存档。";
      input.value = "";
    } catch (error) {
      featurePanelBody.textContent = error.message || "兑换失败，请稍后再试。";
    }
  });
  item.append(input, button);
  featurePanelSlots.appendChild(item);
}

function renderProfileActions() {
  const actions = [
    {
      title: "头像",
      note: "替换左上角玩家头像。",
      label: "上传头像",
      onClick: () => avatarUpload?.click()
    },
    {
      title: "飞行员",
      note: "从已获得飞行员中选择。",
      label: "更换飞行员",
      onClick: () => renderAssetSelector("pilot")
    },
    {
      title: "战机",
      note: "从已获得战机中选择。",
      label: "更换战机",
      onClick: () => renderAssetSelector("ship")
    },
    {
      title: "背景",
      note: "选择大厅背景。",
      label: "更换背景",
      onClick: () => renderAssetSelector("background")
    },
    {
      title: "账号",
      note: `当前身份：${cloud?.accountLabel?.() || "本地游客"}。绑定邮箱后可跨设备恢复存档。`,
      label: "绑定 / 登录邮箱",
      onClick: renderEmailAuth
    },
    {
      title: "云端存档",
      note: "云端是金币、体力、关卡和升级的唯一权威来源。",
      label: "立即同步",
      onClick: async () => {
        await initializeCloudProfile();
        openFeaturePanel("profile");
        featurePanelBody.textContent = "已请求同步云端存档。";
      }
    },
    {
      title: "保存存档",
      note: "保存等级、经验、头像、体力、金币和钻石。",
      label: "立即保存",
      onClick: () => {
        saveProfile();
        openFeaturePanel("profile");
        featurePanelBody.textContent = "存档已保存到当前浏览器。";
      }
    },
    {
      title: "读取存档",
      note: "从当前浏览器恢复最近一次存档。",
      label: "立即读取",
      onClick: () => {
        reloadProfileFromSave();
        openFeaturePanel("profile");
        featurePanelBody.textContent = "存档已读取。";
      }
    }
  ];
  featurePanelSlots.innerHTML = "";
  featurePanelSlots.classList.add("profile-slots");
  for (const action of actions) {
    const item = document.createElement("div");
    item.className = "feature-slot action";
    item.innerHTML = `<strong>${action.title}</strong><small>${action.note}</small>`;
    const button = document.createElement("button");
    button.className = "feature-button";
    button.type = "button";
    button.textContent = action.label;
    button.addEventListener("click", action.onClick);
    item.appendChild(button);
    featurePanelSlots.appendChild(item);
  }
}

function renderEmailAuth() {
  featurePanelKicker.textContent = "ACCOUNT";
  featurePanelTitle.textContent = "绑定 / 登录邮箱";
  featurePanelBody.textContent = "输入邮箱获取六码验证码。验证成功后，游客存档会迁移到新账号；已有账号则以云端存档为准。";
  featurePanelSlots.classList.remove("profile-slots");
  featurePanelSlots.innerHTML = "";
  const card = document.createElement("div");
  card.className = "feature-slot action";
  const email = document.createElement("input");
  email.type = "email";
  email.placeholder = "name@example.com";
  email.autocomplete = "email";
  const code = document.createElement("input");
  code.type = "text";
  code.inputMode = "numeric";
  code.maxLength = 6;
  code.placeholder = "六码验证码";
  const send = document.createElement("button");
  send.className = "feature-button";
  send.type = "button";
  send.textContent = "发送验证码";
  const verify = document.createElement("button");
  verify.className = "feature-button";
  verify.type = "button";
  verify.textContent = "验证并同步";
  send.addEventListener("click", async () => {
    try {
      await cloud.sendEmailCode(email.value);
      featurePanelBody.textContent = "验证码已发送，请在 10 分钟内填写。";
    } catch (error) {
      featurePanelBody.textContent = error.message || "验证码发送失败。";
    }
  });
  verify.addEventListener("click", async () => {
    try {
      const result = await cloud.verifyEmailCode(email.value, code.value);
      profile = normalizeProfile(result.profile);
      saveProfile();
      renderLobby();
      openFeaturePanel("profile");
      featurePanelBody.textContent = "邮箱账号已登录，云端存档已同步。";
    } catch (error) {
      featurePanelBody.textContent = error.message || "验证码验证失败。";
    }
  });
  card.innerHTML = "<strong>邮箱验证码</strong><small>首次验证会把当前游客存档迁移到邮箱账号。</small>";
  card.append(email, code, send, verify);
  featurePanelSlots.appendChild(card);
}

function renderAssetSelector(kind) {
  const configs = {
    pilot: { title: "选择飞行员", list: PILOT_ASSETS, owned: profile.owned.pilots, selected: profile.scene.pilotId, field: "pilotId", label: "攻击" },
    ship: { title: "选择战机", list: SHIP_ASSETS, owned: profile.owned.ships, selected: profile.scene.shipId, field: "shipId", label: "攻击" },
    background: { title: "选择背景", list: BACKGROUND_ASSETS, owned: profile.owned.backgrounds, selected: profile.scene.backgroundId, field: "backgroundId", label: "背景" }
  };
  const config = configs[kind];
  featurePanelKicker.textContent = "ASSET";
  featurePanelTitle.textContent = config.title;
  featurePanelBody.textContent = "只有已获得的资产可以替换使用。";
  featurePanelSlots.classList.remove("profile-slots");
  featurePanelSlots.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "asset-select-grid";
  for (const asset of config.list) {
    const owned = config.owned.includes(asset.id);
    const card = document.createElement("button");
    card.type = "button";
    card.className = `asset-card${owned ? "" : " locked"}`;
    card.disabled = !owned;
    card.innerHTML = `<img src="${encodeURI(asset.src)}" alt=""><strong>${asset.rank} ${asset.name}</strong><small>${asset.damage ? `${config.label} ${asset.damage}` : config.label}${config.selected === asset.id ? " · 当前" : owned ? " · 已获得" : " · 未获得"}</small>`;
    card.addEventListener("click", () => {
      profile.scene[config.field] = asset.id;
      saveProfile();
      syncCosmetics();
      renderLobby();
      renderAssetSelector(kind);
    });
    grid.appendChild(card);
  }
  const back = document.createElement("button");
  back.className = "feature-button";
  back.type = "button";
  back.textContent = "返回资料";
  back.addEventListener("click", () => openFeaturePanel("profile"));
  featurePanelSlots.appendChild(grid);
  featurePanelSlots.appendChild(back);
}

function handleAvatarUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    featurePanelBody.textContent = "请选择图片文件作为头像。";
    event.target.value = "";
    return;
  }
  resizeImageFile(file, { maxWidth: 256, maxHeight: 256, mimeType: "image/png" }).then((dataUrl) => {
    profile.player.avatar = dataUrl || DEFAULT_AVATAR;
    saveProfile();
    syncCosmetics();
    renderLobby();
    openFeaturePanel("profile");
    featurePanelBody.textContent = "头像已更新并保存。";
    event.target.value = "";
  }).catch(() => {
    featurePanelBody.textContent = "头像读取失败，请换一张图片。";
    event.target.value = "";
  });
}

function resizeImageFile(file, { maxWidth, maxHeight, mimeType, quality = 0.9 }) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("error", reject);
    reader.addEventListener("load", () => {
      const image = new Image();
      image.addEventListener("error", reject);
      image.addEventListener("load", () => {
        const scale = Math.min(1, maxWidth / image.width, maxHeight / image.height);
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const tempCanvas = document.createElement("canvas");
        tempCanvas.width = width;
        tempCanvas.height = height;
        const tempCtx = tempCanvas.getContext("2d");
        if (mimeType === "image/jpeg") {
          tempCtx.fillStyle = "#08111c";
          tempCtx.fillRect(0, 0, width, height);
        }
        tempCtx.drawImage(image, 0, 0, width, height);
        resolve(tempCanvas.toDataURL(mimeType, quality));
      });
      image.src = String(reader.result);
    });
    reader.readAsDataURL(file);
  });
}

function greetCommander() {
  lobbyPilotLayer.classList.add("smile");
  lobbyGreeting.textContent = `${getPilotAsset().name}：指挥官，欢迎回来。`;
  lobbyGreeting.classList.remove("hidden");
  window.setTimeout(() => {
    lobbyPilotLayer.classList.remove("smile");
    lobbyGreeting.classList.add("hidden");
  }, 1800);
}

function flyLobbyShip() {
  lobbyShipLayer.classList.remove("fly-loop");
  void lobbyShipLayer.offsetWidth;
  lobbyShipLayer.classList.add("fly-loop");
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
avatarUpload?.addEventListener("change", handleAvatarUpload);
lobbyPilotLayer?.addEventListener("click", greetCommander);
lobbyShipLayer?.addEventListener("click", flyLobbyShip);
lobbyBackgroundLayer?.addEventListener("click", () => renderAssetSelector("background"));
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
