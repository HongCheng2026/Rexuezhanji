(function bootH5Game(root) {
  "use strict";

  var shared = root.RXGame || {};
  var canvas = document.querySelector("#game");
  var ctx = canvas ? canvas.getContext("2d") : null;

  if (!canvas || !ctx || !shared.levels || !shared.assets || !shared.profile) {
    throw new Error("H5 game bootstrap failed: missing canvas or shared modules.");
  }

  var WIDTH = canvas.width;
  var HEIGHT = canvas.height;
  var BATTLE_SAFE_LEFT = 176;
  var keys = new Set();
  var pointer = { active: false, x: BATTLE_SAFE_LEFT, y: HEIGHT / 2 };
  root.rxKeys = keys;
  root.rxPointer = pointer;

  var dom = {
    levelLabelEl: document.querySelector("#levelLabel"),
    timeLabelEl: document.querySelector("#timeLabel"),
    livesEl: document.querySelector("#lives"),
    weaponEl: document.querySelector("#weapon"),
    coinsEl: document.querySelector("#coins"),
    overlay: document.querySelector("#overlay"),
    messageEl: document.querySelector("#message"),
    startButton: document.querySelector("#startButton"),
    pauseButton: document.querySelector("#pauseButton"),
    activeSkillButton: document.querySelector("#activeSkillButton"),
    shopButton: document.querySelector("#shopButton"),
    chapterSelect: document.querySelector("#chapterSelect"),
    shopScreen: document.querySelector("#shopScreen"),
    shopCoinsEl: document.querySelector("#shopCoins"),
    shopMessageEl: document.querySelector("#shopMessage"),
    upgradeList: document.querySelector("#upgradeList"),
    nextLevelButton: document.querySelector("#nextLevelButton"),
    replayButton: document.querySelector("#replayButton"),
    backToChapterButton: document.querySelector("#backToChapterButton"),
    lobbyScreen: document.querySelector("#lobbyScreen"),
    battleScreen: document.querySelector("#battleScreen"),
    battleEntryButton: document.querySelector("#battleEntryButton"),
    worldChatButton: document.querySelector(".world-chat"),
    featurePanel: document.querySelector("#featurePanel"),
    closeFeaturePanel: document.querySelector("#closeFeaturePanel"),
    featurePanelKicker: document.querySelector("#featurePanelKicker"),
    featurePanelTitle: document.querySelector("#featurePanelTitle"),
    featurePanelBody: document.querySelector("#featurePanelBody"),
    featurePanelSlots: document.querySelector("#featurePanelSlots"),
    pilotAvatar: document.querySelector("#pilotAvatar"),
    pilotName: document.querySelector("#pilotName"),
    pilotLevel: document.querySelector("#pilotLevel"),
    pilotExpText: document.querySelector("#pilotExpText"),
    pilotExpBar: document.querySelector("#pilotExpBar"),
    pilotBadge: document.querySelector("#pilotBadge"),
    energyValue: document.querySelector("#energyValue"),
    goldValue: document.querySelector("#goldValue"),
    diamondValue: document.querySelector("#diamondValue"),
    avatarUpload: document.querySelector("#avatarUpload"),
    lobbyBackgroundLayer: document.querySelector("#lobbyBackgroundLayer"),
    lobbyPilotLayer: document.querySelector("#lobbyPilotLayer"),
    lobbyShipShadow: document.querySelector("#lobbyShipShadow"),
    lobbyShipLayer: document.querySelector("#lobbyShipLayer"),
    lobbyGreeting: document.querySelector("#lobbyGreeting")
  };

  var levelsConfig = shared.levels;
  var levels = levelsConfig.levels || [];
  var upgrades = levelsConfig.upgrades || {};
  var ENERGY_COST = levelsConfig.ENERGY_COST || 5;
  var LEVEL_DURATION = levelsConfig.LEVEL_DURATION || 90;
  var BOSS_SPAWN_TIME = levelsConfig.BOSS_SPAWN_TIME || 60;
  var assetsConfig = shared.assets;
  var audioSystem = shared.audioSystem || null;
  var imageCache = {};
  var LOBBY_POSE_FIELDS = [
    "left", "right", "top", "bottom", "width", "height", "maxHeight",
    "opacity", "translateX", "translateY", "rotate", "scale", "filter"
  ];
  var LOBBY_SHIP_SHADOW_FIELDS = ["left", "top", "width", "height", "rotate", "opacity"];
  var FEATURE_PANEL_MODE_CLASSES = [
    "pilot-dossier-panel",
    "ship-hangar-panel",
    "fighter-upgrade-panel",
    "profile-dossier-panel",
    "main-feature-panel",
    "star-wings-gacha-panel",
    "contact-panel"
  ];
  var demoConfig = createDemoConfig();
  var profile = loadProfile();
  var selectedLevel = demoConfig.enabled ? demoConfig.levelId : clamp(profile.unlockedLevel || 1, 1, levels.length || 1);
  var selectedChapter = getLevelById(selectedLevel).chapterIndex || 0;
  var state = createMenuState(selectedLevel);
  var battleContext = null;
  var battleSession = null;
  var currentLoadout = null;
  var lastBattleResult = null;
  var profilePanelTab = "info";
  var currentLobbyPilotPose = null;
  var lobbyCompositionFrame = 0;
  var finished = false;

  var featurePanels = {
    profile: ["PILOT", "飞行员资料", "头像、等级、经验、体力、金币和钻石都会写入本地存档。"],
    energy: ["RESOURCE", "体力", "每次进入战斗会消耗体力，本地测试仍保留资源规则。"],
    gold: ["RESOURCE", "金币", "战斗、扫荡和结算奖励会累计到金币。"],
    diamond: ["RESOURCE", "钻石", "当前预留给充值、活动奖励和高级抽取。"],
    pilotGallery: ["PILOT", "战姬", "战姬出战属性会通过 BattleLoadout 快照进入战斗。"],
    shipGallery: ["HANGAR", "战机", "战机与战机强化会影响攻击、生命和破甲。"],
    upgrade: ["UPGRADE", "战机强化", "强化后的数值会重新生成出战属性快照。"],
    task: ["TASK", "任务", "任务会读取本地通关、强化和收集进度。"],
    event: ["EVENT", "活动", "活动排程以本地展示态呈现。"],
    achievement: ["ACHIEVEMENT", "成就", "成就根据本地存档计算进度。"],
    shop: ["SHOP", "商店", "补给商品为展示态，不执行本地扣费。"],
    friend: ["FRIEND", "好友", "好友与助战为本地预览，真实社交服务待接入。"],
    ranking: ["RANKING", "排行榜", "榜单会插入本地玩家记录，不上传云端。"],
    mail: ["MAIL", "邮件", "邮件展示公告、补给、活动和维护信息。"],
    signin: ["SIGN IN", "签到", "七日航线奖励为本地展示态。"],
    setting: ["SETTING", "设置", "音乐和音效设置可即时生效并保存到本地。"],
    starWingsGacha: ["STAR WINGS", "星穹之翼", "限时抽取入口已独立接通。"],
    contact: ["CONTACT", "联系我们", "二维码联系入口为本地展示态。"],
    chat: ["CHAT", "世界频道", "频道消息为本地预览，发送待接入。"]  };

  applyRuntimeAssetCssVars();
  saveProfile();
  renderLobby();
  renderChapterSelect();
  renderShop();
  updateHud();
  drawScene();
  bindEvents();
  setupLobbyChatTicker();
  if (demoConfig.enabled) setupInfluencerDemoEntry();

  function applyRuntimeAssetCssVars() {
    var background = assetsConfig.BACKGROUND_ASSETS && assetsConfig.BACKGROUND_ASSETS[0];
    if (!background || !background.src || !root.document || !root.document.documentElement) return;
    var docStyle = root.document.documentElement.style;
    docStyle.setProperty("--rx-hangar-bg", "url(" + JSON.stringify(background.src) + ")");
    var hudAssets = assetsConfig.UI_A_HUD_ASSETS || {};
    Object.keys(hudAssets).forEach(function exposeHudAsset(key) {
      var cssName = "--rx-a-" + key.replace(/[A-Z]/g, function (match) { return "-" + match.toLowerCase(); });
      docStyle.setProperty(cssName, "url(" + JSON.stringify(hudAssets[key]) + ")");
    });
  }

  function loadProfile() {
    if (demoConfig.enabled) return createInfluencerDemoProfile();
    var runtime = shared.profileRuntime;
    var nextProfile = runtime && runtime.loadProfile
      ? runtime.loadProfile()
      : shared.profile.createProfile(JSON.parse(localStorage.getItem("rxgame_save_v5") || "{}"));
    return shared.profile.normalizeProfile(unlockForLocalTest(nextProfile));
  }

  function unlockForLocalTest(nextProfile) {
    nextProfile = nextProfile || {};
    if (shared.combatStats && shared.combatStats.LOCAL_TEST_UNLOCK_ALL_LEVELS) {
      nextProfile.unlockedLevel = levels.length || nextProfile.unlockedLevel || 1;
    }
    var unlockAllPilots = (shared.combatStats && shared.combatStats.LOCAL_TEST_UNLOCK_ALL_PILOTS) ||
      (shared.pilotGalleryView && shared.pilotGalleryView.LOCAL_TEST_UNLOCK_ALL_PILOTS);
    if (unlockAllPilots) {
      nextProfile.owned = nextProfile.owned || {};
      var ownedPilots = Array.isArray(nextProfile.owned.pilots) ? nextProfile.owned.pilots.slice() : [];
      (assetsConfig.PILOT_ASSETS || []).forEach(function unlockPilot(pilot) {
        if (pilot && pilot.id && ownedPilots.indexOf(pilot.id) < 0) {
          ownedPilots.push(pilot.id);
        }
      });
      nextProfile.owned.pilots = ownedPilots;
    }
    var unlockAllShips = (shared.combatStats && shared.combatStats.LOCAL_TEST_UNLOCK_ALL_SHIPS) ||
      (shared.shipGalleryView && shared.shipGalleryView.LOCAL_TEST_UNLOCK_ALL_SHIPS);
    if (unlockAllShips) {
      nextProfile.owned = nextProfile.owned || {};
      var ownedShips = Array.isArray(nextProfile.owned.ships) ? nextProfile.owned.ships.slice() : [];
      (assetsConfig.SHIP_ASSETS || []).forEach(function unlockShip(ship) {
        if (ship && ship.id && ownedShips.indexOf(ship.id) < 0) {
          ownedShips.push(ship.id);
        }
      });
      nextProfile.owned.ships = ownedShips;
    }
    return nextProfile;
  }

  function saveProfile() {
    if (demoConfig.enabled) return;
    profile = shared.profile.normalizeProfile(unlockForLocalTest(profile));
    if (shared.profileRuntime && shared.profileRuntime.saveProfile) {
      shared.profileRuntime.saveProfile(profile);
    } else {
      localStorage.setItem("rxgame_save_v5", JSON.stringify(profile));
    }
  }

  function createDemoConfig() {
    var params = parseQueryParams(root.location && root.location.search);
    var requestedLevel = Math.floor(Number(params.level) || 1);
    return {
      enabled: params.demo === "influencer",
      levelId: clamp(requestedLevel, 1, levels.length || 1)
    };
  }

  function parseQueryParams(search) {
    var params = {};
    String(search || "").replace(/^\?/, "").split("&").forEach(function parse(part) {
      if (!part) return;
      var pair = part.split("=");
      var key = decodeURIComponent(pair[0] || "");
      if (!key) return;
      params[key] = decodeURIComponent((pair.slice(1).join("=") || "").replace(/\+/g, " "));
    });
    return params;
  }

  function createInfluencerDemoProfile() {
    var demoLevel = 30;
    var totalExp = (levelsConfig.COMMANDER_TOTAL_EXP_BY_LEVEL || [])[demoLevel] || 2946;
    var demoProfile = shared.profile.createProfile({
      unlockedLevel: levels.length || 1,
      completed: [1, 2, 3],
      upgrades: { fire: 0, armor: 3, engine: 1, bounty: 0 },
      fighterUpgrades: { attack: 30, armorPenetration: 8, hp: 18 },
      player: {
        name: "Demo Pilot",
        level: demoLevel,
        totalExp: totalExp,
        exp: 0,
        honorLevel: 3,
        badge: "III"
      },
      resources: {
        energy: 999,
        maxEnergy: 999,
        gold: 1800,
        diamonds: 0,
        lastEnergyAt: Date.now()
      }
    });
    demoProfile.__demoInfluencer = true;
    demoProfile.unlockedLevel = levels.length || demoProfile.unlockedLevel || 1;
    demoProfile.resources = demoProfile.resources || {};
    demoProfile.resources.energy = Math.max(demoProfile.resources.energy || 0, ENERGY_COST);
    return shared.profile.normalizeProfile(unlockForLocalTest(demoProfile));
  }

  function setupInfluencerDemoEntry() {
    if (root.document && root.document.body) root.document.body.classList.add("influencer-demo-mode");
    selectedLevel = clamp(demoConfig.levelId || 1, 1, levels.length || 1);
    selectedChapter = getLevelById(selectedLevel).chapterIndex || 0;
    state = createMenuState(selectedLevel);
    renderLobby();
    renderChapterSelect();
    openBattleSelect();
    showOverlay("Influencer Demo", "三武器开局，先清屏变强，再挑战 BOSS。", "开始试玩");
  }

  function createMenuState(levelId) {
    if (shared.battleState && shared.battleState.createMenuState) {
      return shared.battleState.createMenuState(levelId);
    }
    return {
      mode: "menu",
      level: getLevelById(levelId),
      elapsed: 0,
      levelCoins: 0,
      enemyTimer: 0,
      powerTimer: 10,
      bossWarning: 0,
      bossSpawned: false,
      shake: 0,
      player: { x: BATTLE_SAFE_LEFT, y: HEIGHT / 2, radius: 23, hp: 100, maxHp: 100, lives: 1, cooldown: 0, invincible: 1, shield: 0, weapons: {} },
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

  function startSelectedLevel() {
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    battleContext = null;
    battleSession = null;
    var level = getLevelById(selectedLevel);
    if (!level || level.id > (profile.unlockedLevel || 0)) return;

    if (!spendEnergy(ENERGY_COST)) {
      showBattleScreen();
      showOverlay("体力不足", "当前体力不足，进入战斗需要 " + ENERGY_COST + " 点体力。", "返回关卡");
      return;
    }

    finished = false;
    battleSession = createBattleSession(level);
    hideShop();
    showBattleScreen();
    playSfx("start");
    if (audioSystem && audioSystem.playBgm) audioSystem.playBgm("battle");
    dom.battleScreen.classList.remove("select-mode", "overlay-active", "settlement-active");
    dom.overlay.classList.add("hidden");
    currentLoadout = shared.combatStats && shared.combatStats.generateBattleLoadout
      ? shared.combatStats.generateBattleLoadout(profile)
      : null;

    battleContext = shared.battleRuntime.startLevelBattle(level, profile, null, {
      onBattleStart: function onBattleStart(nextState) {
        state = nextState;
        state.player.x = BATTLE_SAFE_LEFT;
        state.player.y = HEIGHT / 2;
      },
      onFrame: function onFrame(nextState) {
        state = nextState;
        drawScene();
      },
      onUpdateHud: function onUpdateHud(nextState) {
        state = nextState;
        updateHud();
        checkBattleEnd();
      }
    });

    if (!battleContext) return;
    state = battleContext.state;
    if (demoConfig.enabled) {
      state.powerTimer = 2;
      state.demoMode = "influencer";
      state.notices = state.notices || [];
      state.notices.push({ text: "三武器启动", color: "#5ee7ff", x: 960 / 2, y: 86, life: 2.2 });
    }
    currentLoadout = battleContext.loadout || currentLoadout;
    if (battleSession) battleSession.loadout = currentLoadout;
    updateHud();
    dom.pauseButton.textContent = "暂停";
    battleContext.lastTime = performance.now();
    battleContext.animationId = requestAnimationFrame(function run(t) {
      shared.battleRuntime.loop(battleContext, t);
    });
  }

  function checkBattleEnd() {
    if (finished || !state || state.mode !== "fight") return;
    if (state.player && (state.player.hp != null ? state.player.hp <= 0 : state.player.lives <= 0)) {
      completeBattle(false);
      return;
    }
    if (state.boss && state.boss.hp <= 0) {
      completeBattle(true);
    }
  }

  function completeBattle(isWin) {
    finished = true;
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    state.mode = "shop";
    dom.battleScreen.classList.remove("select-mode", "overlay-active");
    if (battleSession) battleSession.endReason = isWin ? "win" : "fail";

    var level = state.level || getLevelById(selectedLevel);
    var result = shared.settlementSystem && shared.settlementSystem.generateBattleResult
      ? shared.settlementSystem.generateBattleResult(state, level, isWin, isWin ? "win" : "fail")
      : { isWin: isWin, levelId: level.id, coinsEarned: 0, expEarned: 0, rating: { stars: isWin ? 1 : 0 } };

    var goldReward = Math.max(0, Math.floor(result.coinsEarned || 0));
    var expReward = Math.max(0, Math.floor(result.expEarned || 0));

    if (isWin) {
      updateStageHonorRecord(level, result);
      if (shared.progressionSystem && shared.progressionSystem.completeLevel) {
        profile = shared.progressionSystem.completeLevel(profile, level, result.rating || { stars: 1 });
      }
    }

    addGold(goldReward);
    result.levelProgress = applyBattleExperience(profile, expReward);
    saveProfile();
    battleContext = null;
    battleSession = null;
    renderLobby();
    renderChapterSelect();
    if (isWin) renderVictoryIntro(result);
    else renderSettlement(result);
    if (audioSystem && audioSystem.stopBgm) audioSystem.stopBgm();
    playSfx(isWin ? "victory" : "defeat");
    showShop();
    updateHud();
    drawScene();
  }

  function updateStageHonorRecord(level, result) {
    if (!level || !result || !result.rating) return;
    var stageId = getStageKey(level);
    profile.progress = profile.progress || {};
    profile.progress.stageHonors = profile.progress.stageHonors || {};
    var nextTier = Math.max(0, Math.floor(Number(result.rating.honorTier) || Number(result.rating.stars) || 0));
    var previousTier = Math.max(0, Math.floor(Number(profile.progress.stageHonors[stageId]) || 0));
    result.rating.bestHonorTier = Math.max(previousTier, nextTier);
    result.rating.isNewRecord = nextTier > previousTier;
    if (nextTier > previousTier) profile.progress.stageHonors[stageId] = nextTier;
  }

  function getStageKey(level) {
    if (!level) return "";
    return level.chapterIndex === 0
      ? "prologue_" + level.stageInChapter
      : level.chapterIndex + "_" + level.stageInChapter;
  }

  function createBattleSession(level) {
    return {
      levelId: level && level.id,
      energyCost: ENERGY_COST,
      loadout: currentLoadout,
      startedAt: Date.now(),
      energyRefunded: false,
      endReason: "active"
    };
  }

  function refundBattleEnergy() {
    if (demoConfig.enabled) return 0;
    if (!battleSession || battleSession.energyRefunded) return 0;
    var amount = Math.max(0, Math.floor(battleSession.energyCost || 0));
    profile.resources = profile.resources || {};
    profile.resources.energy = Math.min(
      Math.max(amount, Math.floor(profile.resources.maxEnergy || amount)),
      Math.max(0, Math.floor(profile.resources.energy || 0)) + amount
    );
    battleSession.energyRefunded = true;
    saveProfile();
    renderLobby();
    return amount;
  }

  function abortBattle(target) {
    if (!battleContext && !battleSession) {
      if (target === "chapter") openBattleSelect();
      else showLobby();
      return;
    }
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    var refunded = refundBattleEnergy();
    battleContext = null;
    battleSession = null;
    finished = true;
    state = createMenuState(selectedLevel);
    state.mode = "menu";
    dom.pauseButton.textContent = "暂停";
    dom.overlay.classList.add("hidden");
    dom.battleScreen.classList.remove("overlay-active", "settlement-active");
    hideShop();
    if (target === "chapter") {
      openBattleSelect();
      showOverlay("已撤离战场", "本次主动撤离已返还体力 +" + refunded + "。", "开始 " + getLevelById(selectedLevel).code);
    } else {
      showLobby();
    }
  }

  function openBattleSelect() {
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    battleContext = null;
    state = createMenuState(selectedLevel);
    state.mode = "menu";
    hideShop();
    showBattleScreen();
    dom.battleScreen.classList.add("select-mode");
    showOverlay("选择关卡", "左上角为当前出战属性。选择关卡后点击开始战斗。", "开始 " + getLevelById(selectedLevel).code);
    renderChapterSelect();
    if (demoConfig.enabled) {
      showOverlay("Influencer Demo", "三武器开局，先清屏变强，再挑战 BOSS。", "开始试玩");
    }
    updateHud();
    drawScene();
  }

  function showBattleScreen() {
    dom.lobbyScreen.classList.add("hidden");
    dom.battleScreen.classList.remove("hidden");
  }

  function showLobby() {
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    battleContext = null;
    battleSession = null;
    state = createMenuState(selectedLevel);
    hideShop();
    dom.overlay.classList.remove("hidden");
    dom.lobbyScreen.classList.remove("hidden");
    dom.battleScreen.classList.add("hidden");
    dom.battleScreen.classList.remove("select-mode", "overlay-active", "settlement-active");
    closeFeaturePanel();
    dom.pauseButton.textContent = "暂停";
    renderLobby();
    renderChapterSelect();
    updateHud();
    drawScene();
    if (audioSystem && audioSystem.playBgm) audioSystem.playBgm("lobby");
  }

  function pauseGame() {
    if (!state || state.mode !== "fight" || !battleContext) return;
    state.mode = "paused";
    cancelAnimationFrame(battleContext.animationId);
    dom.battleScreen.classList.remove("select-mode");
    dom.pauseButton.textContent = "继续";
    showPauseOverlay();
  }

  function resumeGame() {
    if (!state || state.mode !== "paused" || !battleContext) return;
    dom.overlay.classList.add("hidden");
    dom.battleScreen.classList.remove("overlay-active");
    state.mode = "fight";
    dom.pauseButton.textContent = "暂停";
    battleContext.lastTime = performance.now();
    shared.battleRuntime.resumeBattle(battleContext);
  }

  function showPauseOverlay() {
    showOverlay("作战暂停", "继续战斗，或主动撤离并返还本次消耗体力。", "继续战斗");
    dom.overlay.classList.add("pause-overlay");
    dom.chapterSelect.innerHTML = '<section class="pause-actions" aria-label="暂停操作">' +
      '<button type="button" data-pause-action="resume">继续战斗</button>' +
      '<button type="button" data-pause-action="chapter">返回关卡</button>' +
      '<button type="button" data-pause-action="lobby">返回大厅</button>' +
    '</section>';
  }

  function showOverlay(title, message, buttonText) {
    dom.overlay.classList.remove("pause-overlay");
    dom.overlay.querySelector("h1").textContent = title;
    dom.messageEl.textContent = message;
    dom.startButton.textContent = buttonText;
    dom.overlay.classList.remove("hidden");
    dom.battleScreen.classList.add("overlay-active");
  }

  function showShop() {
    dom.overlay.classList.add("hidden");
    dom.battleScreen.classList.remove("select-mode", "overlay-active");
    dom.battleScreen.classList.add("settlement-active");
    dom.shopScreen.classList.remove("hidden");
  }

  function hideShop() {
    dom.battleScreen.classList.remove("settlement-active");
    dom.shopScreen.classList.remove("settlement-victory-intro-mode", "settlement-chest-mode", "settlement-ceremony-mode", "settlement-opened-mode", "settlement-win-mode", "settlement-fail-mode");
    dom.shopScreen.classList.add("hidden");
  }

  function renderChapterSelect() {
    var level = getLevelById(selectedLevel);
    selectedChapter = level.chapterIndex || 0;

    if (shared.chapterSelectView && shared.chapterSelectView.renderChapterSelect) {
      shared.chapterSelectView.renderChapterSelect(dom.chapterSelect, profile, selectedChapter, selectedLevel, {
        actionButton: dom.startButton,
        onSelectLevel: function onSelectLevel(levelId, chapterIndex) {
          selectedLevel = clamp(levelId, 1, levels.length);
          selectedChapter = chapterIndex || getLevelById(selectedLevel).chapterIndex || 0;
          if (state) state.level = getLevelById(selectedLevel);
          renderChapterSelect();
          updateHud();
          drawScene();
        },
        onSelectChapter: function onSelectChapter(chapterIndex) {
          selectedChapter = chapterIndex;
          var next = levels.find(function findLevel(item) {
            return item.chapterIndex === chapterIndex && item.id <= (profile.unlockedLevel || 0);
          });
          if (next) selectedLevel = next.id;
          if (state) state.level = getLevelById(selectedLevel);
          renderChapterSelect();
          updateHud();
          drawScene();
        },
        onBackLobby: showLobby,
        onSweepLevel: sweepLevel
      });
    }

    dom.startButton.textContent = state.mode === "paused"
      ? "继续游戏"
      : "开始 " + getLevelById(selectedLevel).code;
  }

  function sweepLevel(levelId) {
    var level = getLevelById(levelId);
    if (!level || !shared.progressionSystem || !shared.progressionSystem.sweepLevel) return;
    var result = shared.progressionSystem.sweepLevel(profile, level);
    if (!result.success) {
      showOverlay("无法扫荡", result.reason === "NO_ENERGY" ? "体力不足。" : "该关卡尚未通关。", "返回关卡");
      return;
    }
    profile = result.profile;
    saveProfile();
    renderLobby();
    renderChapterSelect();
    showOverlay("扫荡完成", "金币 +" + result.goldEarned + "，经验 +" + result.expEarned + "。", "开始 " + level.code);
  }

  function renderLobby() {
    shared.profile.recoverEnergy(profile);
    var player = profile.player || {};
    var resources = profile.resources || {};
    var pilot = getPilotAsset();
    var ship = getShipAsset();
    var background = getBackgroundAsset();

    setImageSource(dom.pilotAvatar, player.avatar || assetsConfig.DEFAULT_AVATAR);
    setImageSource(dom.lobbyPilotLayer, pilot && pilot.src);
    setImageSource(dom.lobbyShipLayer, ship && (ship.lobbySrc || ship.src));
    applyLobbyPose(dom.lobbyPilotLayer, pilot && pilot.lobbyPose, "pilot");
    applyLobbyPose(dom.lobbyShipLayer, ship && ship.lobbyPose, "ship");
    applyShipShadowPose(dom.lobbyShipShadow, ship && ship.lobbyPose);
    currentLobbyPilotPose = pilot && pilot.lobbyPose;
    syncLobbyComposition(currentLobbyPilotPose);
    if (background && background.src) {
      setImageSource(dom.lobbyBackgroundLayer, background.src);
      dom.lobbyBackgroundLayer.classList.add("has-image");
    }

    dom.pilotName.textContent = player.name || "王牌飞行员";
    var progress = createLevelProgressSnapshot(player);
    dom.pilotLevel.textContent = "Lv." + progress.level;
    dom.pilotExpText.textContent = progress.isMaxLevel ? "MAX" : progress.exp + "/" + progress.expMax;
    dom.pilotExpBar.style.width = progress.percent + "%";
    dom.pilotBadge.textContent = getHonorText(player);
    dom.energyValue.textContent = formatResource(resources.energy || 0) + "/" + formatResource(resources.maxEnergy || 0);
    dom.goldValue.textContent = formatResource(getGold());
    dom.diamondValue.textContent = formatResource(resources.diamonds || 0);
  }

  function renderShop(message) {
    var text = message || "把战斗金币换成实打实的性能。";
    dom.shopMessageEl.textContent = text;
    dom.shopCoinsEl.textContent = getGold() + " 金币";
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "upgrade-list";
    dom.replayButton.style.display = "";

    Object.keys(upgrades).forEach(function renderUpgrade(key) {
      var upgrade = upgrades[key];
      var level = profile.upgrades && profile.upgrades[key] ? profile.upgrades[key] : 0;
      var cost = getUpgradeCost(key);
      var card = document.createElement("article");
      var button = document.createElement("button");
      card.className = "upgrade-card";
      card.innerHTML = "<h3>" + upgrade.name + " Lv." + level + "/" + upgrade.max + "</h3><p>" + upgrade.desc + "</p>";
      button.type = "button";
      button.textContent = level >= upgrade.max ? "已满级" : "升级 " + cost + " 金币";
      button.disabled = level >= upgrade.max || getGold() < cost;
      button.addEventListener("click", function buy() {
        buyUpgrade(key);
      });
      card.appendChild(button);
      dom.upgradeList.appendChild(card);
    });

    var next = levels[Math.min(selectedLevel, levels.length - 1)];
    dom.nextLevelButton.textContent = next ? "进入 " + next.code : "返回关卡";
  }

  function buyUpgrade(key) {
    var upgrade = upgrades[key];
    var cost = getUpgradeCost(key);
    profile.upgrades = profile.upgrades || {};
    if (!upgrade || profile.upgrades[key] >= upgrade.max || getGold() < cost) return;
    setGold(getGold() - cost);
    profile.upgrades[key] = (profile.upgrades[key] || 0) + 1;
    saveProfile();
    renderShop(upgrade.name + " 已升级。");
    renderLobby();
    renderChapterSelect();
    updateHud();
  }

  function getUpgradeCost(key) {
    var upgrade = upgrades[key];
    var level = profile.upgrades && profile.upgrades[key] ? profile.upgrades[key] : 0;
    return shared.battleRules && shared.battleRules.getUpgradeCost
      ? shared.battleRules.getUpgradeCost(upgrade, level)
      : Math.round((upgrade.baseCost || 100) * (1 + level * 0.65));
  }

  function updateHud() {
    if (dom.battleScreen && dom.battleScreen.classList.contains("select-mode")) {
      updateSelectHud();
      return;
    }
    setHudLabels(["\u5173\u5361", "\u65f6\u95f4", "\u751f\u547d", "BOSS", "\u51fb\u843d"]);
    if (shared.battleHudView && shared.battleHudView.updateHud) {
      shared.battleHudView.updateHud(state, profile, dom);
    }
  }

  function updateSelectHud() {
    var loadout = shared.combatStats && shared.combatStats.generateBattleLoadout
      ? shared.combatStats.generateBattleLoadout(profile)
      : null;
    var stats = loadout ? loadout.finalStats || {} : {};
    var maxHp = Math.round(stats.maxHp || 100);
    var attack = Math.round(stats.attack || 0);
    var armor = Math.max(0, Math.round(((profile.upgrades && profile.upgrades.armor) || 0) * 20));
    var armorPen = Math.round((stats.armorPenetration || 0) * 100);
    var power = Math.round(attack * 10 + maxHp * 2 + armor * 8 + armorPen * 18);

    setHudLabels(["综合战力", "生命", "攻击", "护甲", "破甲"]);
    if (dom.levelLabelEl) dom.levelLabelEl.textContent = power;
    if (dom.timeLabelEl) dom.timeLabelEl.textContent = maxHp;
    if (dom.livesEl) dom.livesEl.textContent = attack;
    if (dom.weaponEl) dom.weaponEl.textContent = armor;
    if (dom.coinsEl) dom.coinsEl.textContent = armorPen + "%";
  }

  function setHudLabels(labels) {
    var nodes = document.querySelectorAll(".hud .label");
    for (var i = 0; i < nodes.length && i < labels.length; i += 1) {
      nodes[i].textContent = labels[i];
    }
  }

  function drawScene() {
    ctx.save();
    if (state && state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 20, (Math.random() - 0.5) * state.shake * 20);
    }
    drawBackground();
    drawStars();
    drawPlayerBullets();
    drawEnemies();
    drawBoss();
    drawParticles();
    drawShockwaves();
    drawSkillEffects();
    drawPowerups();
    drawEnemyBullets();
    drawPlayer();
    drawEnemyTelegraphs();
    drawBossTelegraphs();
    drawBossIntro();
    drawBossWarning();
    drawStoryMessage();
    drawNotices();
    ctx.restore();
  }

  function drawBackground() {
    var gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, "#07111f");
    gradient.addColorStop(0.55, "#0d1d2c");
    gradient.addColorStop(1, "#17101e");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawStars() {
    var stars = state && state.stars ? state.stars : [];
    ctx.fillStyle = "#d7fff5";
    for (var i = 0; i < stars.length; i += 1) {
      var star = stars[i];
      ctx.globalAlpha = 0.18 + Math.min(0.46, star.size / 2.8);
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    var player = state && state.player;
    if (!player) return;
    ctx.save();
    ctx.globalAlpha = player.invincible > 0 && Math.floor(performance.now() / 90) % 2 ? 0.55 : 1;
    var ship = getShipAsset();
    var battleSrc = ship && ship.battleSrc;
    var image = getImage(battleSrc || assetsConfig.ASSET_PATHS.player);
    if (battleSrc && (!image.complete || !image.naturalWidth)) {
      image = getImage(assetsConfig.ASSET_PATHS.player);
      battleSrc = null;
    }
    if (image.complete && image.naturalWidth) {
      var scale = battleSrc ? Math.max(0.5, Math.min(1.4, Number(ship.battleScale) || 1)) : 1;
      var drawWidth = battleSrc ? (Number(ship.battleWidth) || 110) : 78;
      var drawHeight = battleSrc ? (Number(ship.battleHeight) || 86) : 60;
      drawRotatedImage(image, player.x, player.y, drawWidth * scale, drawHeight * scale, Math.PI / 2);
    } else {
      ctx.fillStyle = "#42d6b5";
      ctx.beginPath();
      ctx.moveTo(player.x + 34, player.y);
      ctx.lineTo(player.x - 24, player.y - 22);
      ctx.lineTo(player.x - 12, player.y);
      ctx.lineTo(player.x - 24, player.y + 22);
      ctx.closePath();
      ctx.fill();
    }
    if (player.shield > 0) {
      ctx.strokeStyle = "rgba(155, 255, 203, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemies() {
    var enemies = state && state.enemies ? state.enemies : [];
    for (var i = 0; i < enemies.length; i += 1) {
      var enemy = enemies[i];
      var image = getImage(enemy.image);
      if (image.complete && image.naturalWidth) {
        var spriteW = enemy.radius * (enemy.heavy ? 2.18 : 2.04);
        var spriteH = enemy.radius * (enemy.heavy ? 2.92 : 2.72);
        drawRotatedImage(image, enemy.x, enemy.y, spriteW, spriteH, -Math.PI / 2);
      } else {
        ctx.fillStyle = enemy.heavy ? "#ff8a5c" : "#ffcf5a";
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      drawHpBar(enemy, enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2, 5);
    }
  }

  function drawBoss() {
    var boss = state && state.boss;
    if (!boss) return;
    drawBossThemeAura(boss);
    var image = getImage(assetsConfig.ASSET_PATHS.boss);
    if (image.complete && image.naturalWidth) {
      drawRotatedImage(image, boss.x - 12, boss.y, 168, 156, -Math.PI / 2);
    } else {
      ctx.fillStyle = "#ff5d73";
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    drawHpBar(boss, WIDTH * 0.28, 36, WIDTH * 0.44, 10);
  }

  function drawBossThemeAura(boss) {
    var color = getBossThemeColor(boss.theme);
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.strokeStyle = color;
    ctx.lineWidth = boss.theme === "armorCore" || boss.theme === "shield" ? 5 : 3;
    ctx.beginPath();
    ctx.arc(boss.x - 8, boss.y, boss.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    if (boss.theme === "rotating" || boss.theme === "mothership") {
      ctx.globalAlpha = 0.22;
      for (var i = 0; i < 6; i += 1) {
        var angle = (state.elapsed || 0) * 1.2 + i * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(boss.x - 8, boss.y);
        ctx.lineTo(boss.x - 8 + Math.cos(angle) * (boss.radius + 32), boss.y + Math.sin(angle) * (boss.radius + 32));
        ctx.stroke();
      }
    }
    if (boss.armorMode === "shielded") {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(boss.x - 8, boss.y, boss.radius + 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function getBossThemeColor(theme) {
    var colors = {
      tutorial: "#5ee7ff",
      fan: "#ffd166",
      shield: "#42f5c8",
      crossfire: "#ff8f5a",
      charge: "#ff4d4d",
      summon: "#ffb347",
      sniper: "#fff2a8",
      armorCore: "#70ffbd",
      rotating: "#ff6bff",
      mothership: "#ff5d73"
    };
    return colors[theme] || "#ff5d73";
  }

  function drawBullets() {
    drawPlayerBullets();
    drawEnemyBullets();
  }

  function drawPlayerBullets() {
    drawBulletList(state && state.bullets, false);
  }

  function drawEnemyBullets() {
    drawBulletList(state && state.enemyBullets, true);
  }

  function drawSkillEffects() {
    var effects = state && state.skillEffects ? state.skillEffects : [];
    if (!effects.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (var i = 0; i < effects.length; i += 1) {
      var effect = effects[i];
      var progress = 1 - Math.max(0, Math.min(1, effect.life / Math.max(0.01, effect.duration || 1)));
      var alpha = Math.max(0, Math.min(1, effect.life / Math.max(0.01, effect.duration || 1)));
      var color = effect.color || "#82f7ff";
      if (effect.type === "stellar-beam") {
        var beamHeight = (effect.height || 80) * (0.38 + Math.sin(progress * Math.PI) * 0.62);
        var grad = ctx.createLinearGradient(effect.x, effect.y - beamHeight / 2, effect.x, effect.y + beamHeight / 2);
        grad.addColorStop(0, "rgba(130, 247, 255, 0)");
        grad.addColorStop(0.36, "rgba(130, 247, 255, " + (0.22 * alpha).toFixed(3) + ")");
        grad.addColorStop(0.5, "rgba(244, 255, 255, " + (0.72 * alpha).toFixed(3) + ")");
        grad.addColorStop(0.64, "rgba(130, 247, 255, " + (0.22 * alpha).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(130, 247, 255, 0)");
        ctx.fillStyle = grad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 28 * alpha;
        ctx.fillRect(effect.x - 20, effect.y - beamHeight / 2, effect.width || 820, beamHeight);
        ctx.strokeStyle = "rgba(220, 255, 255, " + (0.9 * alpha).toFixed(3) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(effect.x - 6, effect.y);
        ctx.lineTo(effect.x + (effect.width || 820), effect.y);
        ctx.stroke();
      } else if (effect.type === "dark-core") {
        var radius = (effect.radius || 120) * (0.42 + progress * 0.58);
        var darkGrad = ctx.createRadialGradient(effect.x, effect.y, radius * 0.1, effect.x, effect.y, radius);
        darkGrad.addColorStop(0, "rgba(255, 255, 255, " + (0.74 * alpha).toFixed(3) + ")");
        darkGrad.addColorStop(0.24, "rgba(184, 108, 255, " + (0.5 * alpha).toFixed(3) + ")");
        darkGrad.addColorStop(0.62, "rgba(91, 43, 172, " + (0.26 * alpha).toFixed(3) + ")");
        darkGrad.addColorStop(1, "rgba(12, 4, 32, 0)");
        ctx.fillStyle = darkGrad;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(205, 166, 255, " + (0.72 * alpha).toFixed(3) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius * (1.04 - progress * 0.34), 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === "golden-lances") {
        ctx.strokeStyle = "rgba(255, 209, 102, " + (0.78 * alpha).toFixed(3) + ")";
        ctx.shadowColor = "#ffd166";
        ctx.shadowBlur = 18 * alpha;
        ctx.lineWidth = 3;
        var lanes = effect.lanes || [];
        for (var lane = 0; lane < lanes.length; lane += 1) {
          var y = effect.y + lanes[lane];
          ctx.beginPath();
          ctx.moveTo(effect.x, y);
          ctx.lineTo(effect.x + (effect.width || 760), y + (lane - lanes.length / 2) * 4);
          ctx.stroke();
          ctx.fillStyle = "rgba(255, 244, 184, " + (0.72 * alpha).toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(effect.x + 42 + progress * 180, y);
          ctx.lineTo(effect.x + 12 + progress * 180, y - 8);
          ctx.lineTo(effect.x + 12 + progress * 180, y + 8);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawBulletList(list, enemy) {
    list = list || [];
    for (var i = 0; i < list.length; i += 1) {
      var bullet = list[i];
      if (enemy) drawEnemyBullet(bullet);
      else drawPlayerBullet(bullet);
    }
  }

  function drawPlayerBullet(bullet) {
    var visual = getPlayerBulletVisual(bullet);
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle || 0);
    ctx.globalCompositeOperation = "lighter";
    drawBulletTrail(visual.trailColor || bullet.trailColor, visual.trailLength, visual.trailHeight);
    ctx.shadowColor = visual.glow;
    ctx.shadowBlur = visual.shadowBlur;
    if (visual.shape === "beam") drawPlasmaBeam(visual);
    else if (visual.shape === "lance") drawLanceBullet(visual);
    else if (visual.shape === "bolt") drawBoltBullet(visual);
    else drawOrbBullet(visual);
    ctx.restore();
  }

  function drawEnemyBullet(bullet) {
    var visual = getEnemyBulletRenderProfile(bullet);
    var sprite = getEnemyBulletSprite(bullet);
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle || 0);
    ctx.shadowColor = visual.glow;
    ctx.shadowBlur = visual.shadowBlur;
    if (sprite && sprite.complete && sprite.naturalWidth) {
      var spriteSize = visual.spriteSize || Math.max(16, (bullet.radius || 5) * 3.2);
      ctx.globalAlpha = visual.spriteAlpha;
      ctx.drawImage(sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      ctx.globalAlpha = 1;
    }
    if (visual.shape === "beam") {
      drawEnemyBeam(visual);
    } else if (visual.shape === "lance") {
      drawLanceBullet(visual);
    } else {
      drawEnemyCore(visual);
    }
    ctx.restore();
  }

  function getPlayerBulletVisual(bullet) {
    var type = bullet.type || "normal";
    var base = {
      shape: bullet.shape || "orb",
      core: bullet.color || "#d7fff5",
      glow: bullet.color || "#d7fff5",
      inner: "rgba(255,255,255,0.9)",
      width: bullet.width || Math.max(10, (bullet.radius || 4) * 3),
      height: bullet.height || Math.max(5, (bullet.radius || 4) * 1.6),
      radius: bullet.radius || 4,
      trailColor: bullet.trailColor || "rgba(191,252,255,0.28)",
      trailLength: 20,
      trailHeight: 2,
      shadowBlur: 10
    };
    if (type === "spread") {
      base.shape = "bolt";
      base.core = "#ffd166";
      base.glow = "rgba(255, 197, 80, 0.78)";
      base.inner = "#fff6bd";
      base.width = Math.max(13, bullet.width || 14);
      base.height = Math.max(5, bullet.height || 6);
      base.trailColor = "rgba(255, 196, 82, 0.24)";
      base.trailLength = 18;
      base.shadowBlur = 8;
    } else if (type === "laser" || type === "stellarBeam") {
      base.shape = "beam";
      base.core = "#5ee7ff";
      base.glow = "rgba(76, 229, 255, 0.72)";
      base.inner = "#e8fbff";
      base.width = Math.max(32, bullet.width || 38);
      base.height = Math.max(4, bullet.height || 6);
      base.trailColor = "rgba(94, 231, 255, 0.2)";
      base.trailLength = Math.max(28, base.width * 0.7);
      base.shadowBlur = 10;
    } else if (type === "missile" || type === "goldenLance" || type === "cluster") {
      base.shape = "lance";
      base.core = type === "cluster" ? "#b889ff" : "#ffb347";
      base.glow = type === "cluster" ? "rgba(184, 137, 255, 0.62)" : "rgba(255, 178, 71, 0.68)";
      base.inner = type === "cluster" ? "#f0dcff" : "#fff0b8";
      base.width = Math.max(18, bullet.width || 22);
      base.height = Math.max(8, bullet.height || 10);
      base.trailColor = type === "cluster" ? "rgba(184, 137, 255, 0.22)" : "rgba(255, 172, 74, 0.22)";
      base.trailLength = 26;
      base.shadowBlur = 9;
    } else if (type === "nova" || type === "darkCore") {
      base.shape = "orb";
      base.core = type === "darkCore" ? "#b889ff" : "#82f7ff";
      base.glow = type === "darkCore" ? "rgba(184, 137, 255, 0.72)" : "rgba(130, 247, 255, 0.74)";
      base.radius = Math.max(8, bullet.radius || 9);
      base.trailLength = 24;
      base.shadowBlur = 16;
    }
    return base;
  }

  function getEnemyBulletRenderProfile(bullet) {
    var source = (bullet && (bullet.bulletVisualId || bullet.patternSource)) || "single";
    var profile = {
      shape: bullet.shape === "beam" ? "beam" : "orb",
      core: bullet.color || "#ff6b45",
      glow: bullet.color || "#ff6b45",
      inner: "#fff3df",
      width: Math.max(12, bullet.width || (bullet.radius || 5) * 3),
      height: Math.max(5, bullet.height || (bullet.radius || 5) * 1.4),
      radius: Math.max(4.5, bullet.radius || 4.5),
      spriteAlpha: 0.72,
      spriteSize: Math.max(16, (bullet.radius || 5) * 3.2),
      shadowBlur: 10
    };
    if (source.indexOf("slow_wall") >= 0 || source.indexOf("wall") >= 0 || source.indexOf("shield") >= 0) {
      profile.shape = "beam";
      profile.core = "#ffb347";
      profile.glow = "rgba(255, 147, 70, 0.78)";
      profile.inner = "#fff0b8";
      profile.width = Math.max(18, bullet.width || 20);
      profile.height = Math.max(5, bullet.height || 6);
      profile.shadowBlur = 9;
    } else if (source.indexOf("sniper") >= 0) {
      profile.shape = "lance";
      profile.core = "#fff2a8";
      profile.glow = "rgba(255, 216, 112, 0.82)";
      profile.inner = "#ffffff";
      profile.width = Math.max(26, bullet.width || 28);
      profile.height = Math.max(5, bullet.height || 6);
      profile.shadowBlur = 14;
    } else if (source.indexOf("rotating") >= 0) {
      profile.shape = "lance";
      profile.core = "#ff6bff";
      profile.glow = "rgba(255, 100, 230, 0.68)";
      profile.inner = "#ffe4ff";
      profile.width = Math.max(18, bullet.width || 18);
      profile.height = Math.max(8, bullet.height || 10);
    } else if (source.indexOf("mothership") >= 0 || source.indexOf("delayed_burst") >= 0) {
      profile.core = "#ff5d73";
      profile.glow = "rgba(255, 73, 112, 0.78)";
      profile.inner = "#ffe1e7";
      profile.radius = Math.max(6, bullet.radius || 6);
      profile.shadowBlur = 14;
    } else if (source.indexOf("triple") >= 0 || source.indexOf("cross") >= 0 || source.indexOf("fan") >= 0) {
      profile.core = "#ff7c93";
      profile.glow = "rgba(255, 97, 126, 0.78)";
      profile.inner = "#ffe5eb";
      profile.radius = Math.max(4.8, bullet.radius || 4.8);
    }
    return profile;
  }

  function drawBulletTrail(color, length, height) {
    if (!color || !length) return;
    var grad = ctx.createLinearGradient(-length, 0, 3, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.58, color);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    drawCapsule(-length, -(height || 2) / 2, length, height || 2, (height || 2) / 2);
  }

  function drawPlasmaBeam(visual) {
    var w = visual.width;
    var h = visual.height;
    ctx.fillStyle = colorOrDefault(visual.glow, "rgba(94,231,255,0.42)");
    drawCapsule(-w * 0.25, -h * 0.72, w, h * 1.44, h);
    ctx.fillStyle = visual.core;
    drawCapsule(-w * 0.18, -h * 0.45, w * 0.9, h * 0.9, h * 0.45);
    ctx.fillStyle = visual.inner;
    drawCapsule(-w * 0.08, -1, w * 0.72, 2, 1);
  }

  function drawBoltBullet(visual) {
    var w = visual.width;
    var h = visual.height;
    ctx.fillStyle = colorOrDefault(visual.glow, "rgba(255,209,102,0.35)");
    ctx.beginPath();
    ctx.moveTo(w * 0.72, 0);
    ctx.lineTo(w * 0.04, -h * 0.74);
    ctx.lineTo(-w * 0.48, -h * 0.36);
    ctx.lineTo(-w * 0.28, 0);
    ctx.lineTo(-w * 0.48, h * 0.36);
    ctx.lineTo(w * 0.04, h * 0.74);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = visual.inner;
    drawCapsule(-w * 0.16, -1, w * 0.56, 2, 1);
  }

  function drawLanceBullet(visual) {
    var w = visual.width;
    var h = visual.height;
    ctx.fillStyle = colorOrDefault(visual.glow, "rgba(255,179,71,0.38)");
    ctx.beginPath();
    ctx.moveTo(w * 0.72, 0);
    ctx.lineTo(-w * 0.34, -h * 0.62);
    ctx.lineTo(-w * 0.12, 0);
    ctx.lineTo(-w * 0.34, h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = visual.core;
    ctx.beginPath();
    ctx.moveTo(w * 0.48, 0);
    ctx.lineTo(-w * 0.18, -h * 0.34);
    ctx.lineTo(-w * 0.04, 0);
    ctx.lineTo(-w * 0.18, h * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = visual.inner;
    drawCapsule(-w * 0.1, -1, w * 0.34, 2, 1);
  }

  function drawOrbBullet(visual) {
    var radius = visual.radius;
    var grad = ctx.createRadialGradient(0, 0, 0, 0, 0, radius * 1.8);
    grad.addColorStop(0, visual.inner || "#ffffff");
    grad.addColorStop(0.38, visual.core);
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = visual.core;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEnemyBeam(visual) {
    ctx.fillStyle = colorOrDefault(visual.glow, "rgba(255,139,71,0.38)");
    drawCapsule(-visual.width * 0.48, -visual.height * 0.62, visual.width, visual.height * 1.24, visual.height);
    ctx.fillStyle = visual.core;
    drawCapsule(-visual.width * 0.42, -visual.height * 0.38, visual.width * 0.84, visual.height * 0.76, visual.height);
    ctx.fillStyle = visual.inner;
    drawCapsule(-visual.width * 0.22, -1, visual.width * 0.44, 2, 1);
  }

  function drawEnemyCore(visual) {
    drawOrbBullet(visual);
    ctx.strokeStyle = colorOrDefault(visual.glow, "rgba(255,107,69,0.62)");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, visual.radius * 1.45, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawCapsule(x, y, width, height, radius) {
    radius = Math.max(0, Math.min(radius || 0, Math.abs(height) / 2, Math.abs(width) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  function colorOrDefault(value, fallback) {
    return value || fallback;
  }

  function getEnemyBulletSprite(bullet) {
    var codex = assetsConfig.ENEMY_BULLET_CODEX || {};
    var visual = bullet && bullet.bulletVisualId ? codex[bullet.bulletVisualId] : null;
    if (!visual && bullet && bullet.patternSource) {
      var source = bullet.patternSource;
      if (source.indexOf("bomb_mine") >= 0) visual = codex.bomb_mine;
      else if (source.indexOf("mothership") >= 0) visual = codex.mothership_core;
      else if (source.indexOf("rotating") >= 0) visual = codex.rotating;
      else if (source.indexOf("delayed_burst") >= 0) visual = codex.delayed_burst;
      else if (source.indexOf("sniper") >= 0) visual = codex.sniper_warning;
      else if (source.indexOf("slow_wall") >= 0 || source.indexOf("escort") >= 0 || source.indexOf("shield") >= 0) visual = codex.slow_wall;
      else if (source.indexOf("triple") >= 0 || source.indexOf("cross") >= 0 || source.indexOf("fan") >= 0 || source.indexOf("elite") >= 0) visual = codex.triple;
      else visual = codex.single;
    }
    return visual && visual.src ? getImage(visual.src) : null;
  }

  function drawPowerups() {
    var powerups = state && state.powerups ? state.powerups : [];
    var config = levelsConfig.POWERUPS || {};
    for (var i = 0; i < powerups.length; i += 1) {
      var item = powerups[i];
      var color = (config[item.type] && config[item.type].color) || "#ffffff";
      var label = (config[item.type] && config[item.type].name) || item.type;
      var pulse = 1 + Math.sin((state.elapsed || 0) * 8 + i) * 0.08;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius * 1.65 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius * 1.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#06111c";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label.charAt(0), item.x, item.y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(3, 10, 18, 0.78)";
      ctx.fillRect(item.x - 30, item.y + 24, 60, 18);
      ctx.fillStyle = "#f4f7fb";
      ctx.font = "bold 11px Microsoft YaHei, Arial";
      ctx.fillText(label, item.x, item.y + 33);
      ctx.restore();
    }
  }

  function drawParticles() {
    var particles = state && state.particles ? state.particles : [];
    for (var i = 0; i < particles.length; i += 1) {
      var particle = particles[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2));
      ctx.fillStyle = particle.color || "#ffffff";
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShockwaves() {
    var waves = state && state.shockwaves ? state.shockwaves : [];
    for (var i = 0; i < waves.length; i += 1) {
      var wave = waves[i];
      ctx.globalAlpha = Math.max(0, wave.life / Math.max(0.01, wave.maxLife || wave.life));
      ctx.strokeStyle = wave.color || "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawBossWarning() {
    if (!state || state.bossWarning <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.bossWarning);
    ctx.fillStyle = "#ff5d73";
    ctx.font = "bold 34px Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.fillText("BOSS 来袭", WIDTH / 2, 82);
    ctx.restore();
  }

  function drawEnemyTelegraphs() {
    var telegraphs = state && state.enemyTelegraphs ? state.enemyTelegraphs : [];
    if (!telegraphs.length) return;
    ctx.save();
    for (var i = 0; i < telegraphs.length; i += 1) {
      var item = telegraphs[i];
      var alpha = Math.max(0, Math.min(1, item.life / Math.max(0.1, item.duration || 1)));
      ctx.globalAlpha = 0.18 + alpha * 0.45;
      ctx.strokeStyle = item.color || "#ffcf5a";
      ctx.fillStyle = item.color || "#ffcf5a";
      ctx.lineWidth = 2;
      if (item.type === "sniper") {
        var y = item.y || HEIGHT / 2;
        ctx.fillRect(0, y - 3, WIDTH, 6);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawBossIntro() {
    var intro = state && state.bossIntro;
    if (!intro) return;
    var progress = Math.max(0, Math.min(1, intro.life / Math.max(0.1, intro.duration || 3)));
    ctx.save();
    ctx.globalAlpha = 0.34 + progress * 0.22;
    ctx.fillStyle = "#020611";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = "#ff5d73";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 10]);
    ctx.beginPath();
    ctx.moveTo(WIDTH - 220, 0);
    ctx.lineTo(WIDTH - 220, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255, 93, 115, 0.14)";
    ctx.fillRect(WIDTH - 230, 0, 22, HEIGHT);
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 15px Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.fillText("BOSS WARNING", WIDTH / 2, 78);
    ctx.fillStyle = "#f4f7fb";
    ctx.font = "bold 30px Microsoft YaHei, Arial";
    ctx.fillText(intro.title || "BOSS 接敌", WIDTH / 2, 116);
    ctx.strokeStyle = "rgba(255, 209, 102, 0.62)";
    ctx.strokeRect(WIDTH * 0.22, 88, WIDTH * 0.56, 48);
    ctx.restore();
  }

  function drawBossTelegraphs() {
    var telegraphs = state && state.bossTelegraphs ? state.bossTelegraphs : [];
    if (!telegraphs.length) return;
    ctx.save();
    for (var i = 0; i < telegraphs.length; i += 1) {
      var item = telegraphs[i];
      var alpha = Math.max(0, Math.min(1, item.life / Math.max(0.1, item.duration || 1)));
      ctx.globalAlpha = 0.18 + alpha * 0.22;
      ctx.fillStyle = item.color || "#ff6b8a";
      ctx.strokeStyle = item.color || "#ff6b8a";
      ctx.lineWidth = 2;
      if (item.type === "lanes") {
        var laneCount = Math.max(1, item.laneCount || 4);
        for (var lane = 0; lane < laneCount; lane += 1) {
          var y = 72 + lane * ((HEIGHT - 144) / Math.max(1, laneCount - 1));
          ctx.fillRect(0, y - 8, WIDTH, 16);
          ctx.globalAlpha = 0.5 + alpha * 0.25;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(WIDTH, y);
          ctx.stroke();
          ctx.globalAlpha = 0.18 + alpha * 0.22;
        }
      } else if (item.type === "summon") {
        ctx.fillRect(WIDTH - 250, 58, 210, HEIGHT - 116);
        ctx.globalAlpha = 0.72;
        ctx.strokeRect(WIDTH - 250, 58, 210, HEIGHT - 116);
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(WIDTH - 250, 58);
        ctx.lineTo(WIDTH - 40, HEIGHT - 58);
        ctx.moveTo(WIDTH - 40, 58);
        ctx.lineTo(WIDTH - 250, HEIGHT - 58);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.92;
        ctx.font = "bold 18px Microsoft YaHei, Arial";
        ctx.textAlign = "center";
        ctx.fillText("护卫投放区", WIDTH - 145, 86);
      } else if (item.type === "sniper") {
        var sy = item.targetY || HEIGHT / 2;
        ctx.fillRect(0, sy - 4, WIDTH, 8);
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(WIDTH, sy);
        ctx.stroke();
      } else if (item.type === "charge") {
        var cy = item.targetY || HEIGHT / 2;
        ctx.fillRect(0, cy - 22, WIDTH, 44);
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(0, cy - 22, WIDTH, 44);
      } else if (item.type === "cross") {
        ctx.beginPath();
        ctx.moveTo(WIDTH, 80);
        ctx.lineTo(0, HEIGHT - 80);
        ctx.moveTo(WIDTH, HEIGHT - 80);
        ctx.lineTo(0, 80);
        ctx.stroke();
        ctx.globalAlpha = 0.18 + alpha * 0.16;
        ctx.beginPath();
        ctx.moveTo(WIDTH, 80);
        ctx.lineTo(0, HEIGHT - 80);
        ctx.lineTo(0, HEIGHT - 40);
        ctx.lineTo(WIDTH, 120);
        ctx.closePath();
        ctx.fill();
      } else {
        var arc = ((item.arcDegrees || 64) * Math.PI) / 180;
        var originX = item.x || WIDTH - 120;
        var originY = item.y || HEIGHT / 2;
        var reach = WIDTH + 120;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX - reach, originY - Math.tan(arc / 2) * reach);
        ctx.lineTo(originX - reach, originY + Math.tan(arc / 2) * reach);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.55 + alpha * 0.25;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX - reach, originY - Math.tan(arc / 2) * reach);
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX - reach, originY + Math.tan(arc / 2) * reach);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawStoryMessage() {
    if (!state || !state.storyMessage || performance.now() > state.storyMessageUntil) return;
    var text = state.storyMessage.text || state.storyMessage.message || "";
    if (!text) return;
    ctx.save();
    ctx.fillStyle = "rgba(4, 14, 27, 0.72)";
    ctx.fillRect(WIDTH * 0.24, 18, WIDTH * 0.52, 34);
    ctx.strokeStyle = "rgba(66, 214, 181, 0.42)";
    ctx.strokeRect(WIDTH * 0.24, 18, WIDTH * 0.52, 34);
    ctx.fillStyle = "#f4f7fb";
    ctx.font = "bold 15px Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.length > 34 ? text.slice(0, 33) + "..." : text, WIDTH / 2, 35);
    ctx.restore();
  }

  function drawNotices() {
    var notices = state && state.notices ? state.notices : [];
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 18px Microsoft YaHei, Arial";
    for (var i = 0; i < notices.length; i += 1) {
      var notice = notices[i];
      ctx.globalAlpha = Math.min(1, notice.life);
      ctx.fillStyle = notice.color || "#ffffff";
      ctx.fillText(notice.text, notice.x, notice.y);
    }
    ctx.restore();
  }

  function drawHpBar(target, x, y, width, height) {
    var ratio = clamp(target.hp / Math.max(1, target.maxHp), 0, 1);
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = ratio > 0.35 ? "#42d6b5" : "#ff6b6b";
    ctx.fillRect(x, y, width * ratio, height);
  }

  function drawRotatedImage(image, centerX, centerY, width, height, angle) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.drawImage(image, -height / 2, -width / 2, height, width);
    ctx.restore();
  }

  function getImage(src) {
    if (!src) return new Image();
    if (!imageCache[src]) {
      imageCache[src] = new Image();
      imageCache[src].src = src.indexOf("data:") === 0 ? src : encodeURI(src);
    }
    return imageCache[src];
  }

  function setImageSource(image, source) {
    if (!image || !source) return;
    image.src = source.indexOf("data:") === 0 ? source : encodeURI(source);
  }

  function applyLobbyPose(image, pose, role) {
    if (!image || !role) return;
    for (var i = 0; i < LOBBY_POSE_FIELDS.length; i++) {
      image.style.removeProperty("--lobby-" + role + "-" + toKebabCase(LOBBY_POSE_FIELDS[i]));
    }

    var defaults = assetsConfig.DEFAULT_LOBBY_POSES && assetsConfig.DEFAULT_LOBBY_POSES[role];
    var nextPose = pose || defaults || {};
    for (var j = 0; j < LOBBY_POSE_FIELDS.length; j++) {
      var field = LOBBY_POSE_FIELDS[j];
      if (nextPose[field] == null) continue;
      image.style.setProperty("--lobby-" + role + "-" + toKebabCase(field), String(nextPose[field]));
    }
  }

  function applyShipShadowPose(shadow, pose) {
    if (!shadow) return;
    for (var i = 0; i < LOBBY_SHIP_SHADOW_FIELDS.length; i++) {
      shadow.style.removeProperty("--lobby-ship-shadow-" + LOBBY_SHIP_SHADOW_FIELDS[i]);
    }

    var defaults = (assetsConfig.DEFAULT_LOBBY_POSES && assetsConfig.DEFAULT_LOBBY_POSES.ship) || {};
    var nextPose = pose || defaults;
    var shadowPose = {
      left: nextPose.shadowLeft || defaults.shadowLeft,
      top: nextPose.shadowTop || defaults.shadowTop,
      width: nextPose.shadowWidth || defaults.shadowWidth,
      height: nextPose.shadowHeight || defaults.shadowHeight,
      rotate: nextPose.shadowRotate || defaults.shadowRotate,
      opacity: nextPose.shadowOpacity || defaults.shadowOpacity
    };

    for (var j = 0; j < LOBBY_SHIP_SHADOW_FIELDS.length; j++) {
      var field = LOBBY_SHIP_SHADOW_FIELDS[j];
      if (shadowPose[field] == null) continue;
      shadow.style.setProperty("--lobby-ship-shadow-" + field, String(shadowPose[field]));
    }
  }

  function syncLobbyComposition(pilotPose) {
    if (!dom.lobbyScreen || !dom.battleEntryButton || !dom.lobbyPilotLayer) return;
    var screenRect = dom.lobbyScreen.getBoundingClientRect();
    var buttonRect = dom.battleEntryButton.getBoundingClientRect();
    if (!screenRect.width || !buttonRect.width) return;

    var defaults = (assetsConfig.DEFAULT_LOBBY_POSES && assetsConfig.DEFAULT_LOBBY_POSES.pilot) || {};
    var pose = pilotPose || defaults;
    var buttonCenterXPct = ((buttonRect.left + buttonRect.width / 2 - screenRect.left) / screenRect.width) * 100;
    var buttonWidthPct = (buttonRect.width / screenRect.width) * 100;
    var buttonTopPct = ((buttonRect.top - screenRect.top) / screenRect.height) * 100;
    var anchorOffsetX = clamp(parsePercentNumber(pose.anchorOffsetX, defaults.anchorOffsetX || 0), -2, 2);
    var widthRatio = clamp(parseFloatNumber(pose.buttonWidthRatio, defaults.buttonWidthRatio || 0.88), 0.68, 0.9);
    var overlapRatio = clamp(parseFloatNumber(pose.buttonOverlapRatio, defaults.buttonOverlapRatio || 0.2), 0.15, 0.25);
    var buttonOverlapPx = clamp(buttonRect.height * overlapRatio, 16, 26);
    var pilotLeft = buttonCenterXPct + buttonWidthPct * (anchorOffsetX / 100);
    var pilotWidth = buttonWidthPct * widthRatio;
    var pilotBottomPct = 100 - (((buttonRect.top + buttonOverlapPx) - screenRect.top) / screenRect.height * 100);

    dom.lobbyScreen.style.setProperty("--lobby-button-center-x", formatCssPercent(buttonCenterXPct));
    dom.lobbyScreen.style.setProperty("--lobby-button-width", formatCssPercent(buttonWidthPct));
    dom.lobbyScreen.style.setProperty("--lobby-button-top", formatCssPercent(buttonTopPct));
    dom.lobbyPilotLayer.style.setProperty("--lobby-pilot-left", formatCssPercent(pilotLeft));
    dom.lobbyPilotLayer.style.setProperty("--lobby-pilot-width", formatCssPercent(pilotWidth));
    dom.lobbyPilotLayer.style.setProperty("--lobby-pilot-bottom", formatCssPercent(pilotBottomPct));
  }

  function requestLobbyCompositionSync() {
    if (lobbyCompositionFrame) root.cancelAnimationFrame(lobbyCompositionFrame);
    lobbyCompositionFrame = root.requestAnimationFrame(function sync() {
      lobbyCompositionFrame = 0;
      syncLobbyComposition(currentLobbyPilotPose);
    });
  }

  function parseFloatNumber(value, fallback) {
    var next = typeof value === "number" ? value : parseFloat(String(value || ""));
    return isFinite(next) ? next : fallback;
  }

  function parsePercentNumber(value, fallback) {
    var next = typeof value === "number" ? value : parseFloat(String(value || "").replace("%", ""));
    return isFinite(next) ? next : fallback;
  }

  function formatCssPercent(value) {
    return (Math.round(value * 1000) / 1000) + "%";
  }

  function toKebabCase(value) {
    return String(value).replace(/[A-Z]/g, function replaceUpper(letter) {
      return "-" + letter.toLowerCase();
    });
  }

  function getPilotAsset(id) {
    var pilotId = id || (profile.scene && profile.scene.pilotId) || assetsConfig.DEFAULT_PILOT_ID;
    return (assetsConfig.PILOT_ASSETS || []).find(function find(asset) { return asset.id === pilotId; }) ||
      (assetsConfig.PILOT_ASSETS || [])[0];
  }

  function getShipAsset(id) {
    var shipId = id || (profile.scene && profile.scene.shipId) || assetsConfig.DEFAULT_SHIP_ID;
    return (assetsConfig.SHIP_ASSETS || []).find(function find(asset) { return asset.id === shipId; }) ||
      (assetsConfig.SHIP_ASSETS || [])[0];
  }

  function getBackgroundAsset(id) {
    var backgroundId = id || (profile.scene && profile.scene.backgroundId) || assetsConfig.DEFAULT_BACKGROUND_ID;
    return (assetsConfig.BACKGROUND_ASSETS || []).find(function find(asset) { return asset.id === backgroundId; }) ||
      (assetsConfig.BACKGROUND_ASSETS || [])[0];
  }

  function getPageForLevel(levelId, pageSize) {
    var level = getLevelById(levelId);
    var chapterLevels = levels.filter(function filterLevel(item) {
      return item.chapterIndex === level.chapterIndex;
    });
    var index = chapterLevels.findIndex(function findLevel(item) {
      return item.id === level.id;
    });
    return Math.max(0, Math.floor(Math.max(0, index) / Math.max(1, pageSize || 3)));
  }

  function getMaxPageForChapter(chapterIndex, pageSize) {
    var count = levels.filter(function filterLevel(item) {
      return item.chapterIndex === chapterIndex;
    }).length;
    return Math.max(0, Math.ceil(count / Math.max(1, pageSize || 3)) - 1);
  }

  function getLevelById(levelId) {
    return levels.find(function find(level) { return level.id === levelId; }) || levels[0] || { id: 1, code: "1-1", chapterIndex: 0 };
  }

  function getGold() {
    return shared.profile.getGold ? shared.profile.getGold(profile) : Math.max(0, Number(profile.resources && profile.resources.gold) || 0);
  }

  function setGold(value) {
    if (shared.profile.setGold) shared.profile.setGold(profile, value);
    else {
      profile.resources = profile.resources || {};
      profile.resources.gold = Math.max(0, Math.floor(value || 0));
      profile.coins = profile.resources.gold;
    }
  }

  function addGold(value) {
    setGold(getGold() + Math.max(0, Math.floor(value || 0)));
  }

  function applyBattleExperience(targetProfile, value) {
    var amount = Math.max(0, Math.floor(value || 0));
    targetProfile.player = targetProfile.player || {};
    if (shared.battleRules && shared.battleRules.applyExperience) {
      return shared.battleRules.applyExperience(targetProfile.player, amount);
    }
    var before = createLevelProgressSnapshot(targetProfile.player);
    targetProfile.player.totalExp = Math.max(0, Math.floor(targetProfile.player.totalExp || 0) + amount);
    return { gained: amount, leveled: 0, before: before, after: createLevelProgressSnapshot(targetProfile.player) };
  }

  function createLevelProgressSnapshot(player) {
    if (shared.battleRules && shared.battleRules.createLevelProgressSnapshot) {
      return shared.battleRules.createLevelProgressSnapshot(player);
    }
    player = player || {};
    var level = Math.max(1, Math.floor(Number(player.level) || 1));
    var expMax = Math.max(1, Math.floor(Number(player.expMax) || 1));
    var exp = Math.max(0, Math.min(expMax, Math.floor(Number(player.exp) || 0)));
    return {
      level: level,
      exp: exp,
      expMax: expMax,
      totalExp: Math.max(0, Math.floor(Number(player.totalExp) || 0)),
      percent: Math.round((exp / expMax) * 100),
      isMaxLevel: false
    };
  }

  function getHonorText(player) {
    player = player || {};
    if (player.honorLevel == null && player.badge) return String(player.badge);
    if (shared.profile && shared.profile.honorLevelToText) {
      return shared.profile.honorLevelToText(player.honorLevel);
    }
    if (shared.battleRules && shared.battleRules.honorLevelToText) {
      return shared.battleRules.honorLevelToText(player.honorLevel);
    }
    return String(player.badge || "I");
  }

  function spendEnergy(amount) {
    if (demoConfig.enabled) return true;
    if (shared.profileRuntime && shared.profileRuntime.spendEnergy) {
      var ok = shared.profileRuntime.spendEnergy(profile, amount);
      if (ok) saveProfile();
      renderLobby();
      return ok;
    }
    if (shared.profile.spendEnergy && shared.profile.spendEnergy(profile, amount)) {
      saveProfile();
      renderLobby();
      return true;
    }
    return false;
  }

  function renderVictoryIntro(result) {
    result = result || {};
    lastBattleResult = result;
    var icons = assetsConfig.SETTLEMENT_ICON_ASSETS || {};
    var pilot = getPilotAsset();
    var rating = result.rating || {};
    setSettlementAssetVars(icons);
    dom.shopScreen.classList.remove("settlement-chest-mode", "settlement-opened-mode", "settlement-fail-mode");
    dom.shopScreen.classList.add("settlement-victory-intro-mode", "settlement-ceremony-mode", "settlement-win-mode");
    dom.shopMessageEl.textContent = "作战胜利";
    dom.shopCoinsEl.textContent = "胜利演出";
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "settlement-victory-intro-view";
    dom.upgradeList.innerHTML =
      '<section class="victory-intro-stage">' +
        '<img class="victory-intro-aura" src="' + escapeAttr(icons.victoryAura || "") + '" alt="">' +
        '<div class="victory-intro-emblem">' + renderSettlementHonorStars(rating.honorTier || rating.stars || 1, icons[rating.honorIcon] || "") + '</div>' +
        renderSettlementPilotHeader(pilot, "作战胜利", "航线已压制，战利品即将回收。") +
        '<div class="victory-intro-title">' +
          '<span>MISSION CLEAR</span>' +
          '<strong>航线压制完成</strong>' +
          renderSettlementRatingStats(rating) +
        '</div>' +
        '<button type="button" class="victory-intro-button" data-open-victory-chest="1">领取奖励</button>' +
      '</section>';
    dom.nextLevelButton.textContent = "领取奖励";
    dom.replayButton.textContent = "再战";
    dom.replayButton.style.display = "none";
    dom.backToChapterButton.textContent = "返回关卡";
  }

  function renderSettlementChest(result) {
    result = result || {};
    if (!result.isWin) {
      renderSettlement(result);
      return;
    }
    lastBattleResult = result;
    var icons = assetsConfig.SETTLEMENT_ICON_ASSETS || {};
    setSettlementAssetVars(icons);
    dom.shopScreen.classList.remove("settlement-victory-intro-mode", "settlement-fail-mode", "settlement-opened-mode");
    dom.shopScreen.classList.add("settlement-chest-mode", "settlement-ceremony-mode", "settlement-win-mode");
    dom.shopMessageEl.textContent = "胜利奖励宝箱";
    dom.shopCoinsEl.textContent = "点击开启";
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "settlement-chest-view";
    dom.upgradeList.innerHTML =
      '<section class="reward-chest-stage victory-only">' +
        '<div class="reward-chest-kicker"><span>REWARD CACHE</span><strong>战利品回收</strong></div>' +
        '<button type="button" class="reward-chest-button" data-open-settlement="1">' +
          '<img src="' + escapeAttr(icons.chestClosed || "") + '" alt="奖励宝箱">' +
          '<span>点击开启</span>' +
        '</button>' +
        '<p>开启后进入胜利结算，展示本关评级、金币、经验与扩展奖励位。</p>' +
      '</section>';
    dom.nextLevelButton.textContent = "开启宝箱";
    dom.replayButton.textContent = "再战";
    dom.replayButton.style.display = "none";
    dom.backToChapterButton.textContent = "返回关卡";
  }

  function renderSettlement(result) {
    result = result || {};
    lastBattleResult = result;
    var breakdown = result.goldBreakdown || {};
    var icons = assetsConfig.SETTLEMENT_ICON_ASSETS || {};
    var pilot = getPilotAsset();
    setSettlementAssetVars(icons);
    var title = result.isWin ? "胜利战报" : "作战失败";
    var rating = result.rating || {};
    var honorTier = Math.max(0, Math.floor(Number(rating.honorTier) || 0));
    var honorIcon = icons[rating.honorIcon] || icons.starBadge || "";
    var honorStars = renderSettlementHonorStars(honorTier, honorIcon);
    dom.shopScreen.classList.remove("settlement-victory-intro-mode", "settlement-chest-mode");
    dom.shopScreen.classList.add("settlement-ceremony-mode", "settlement-opened-mode", result.isWin ? "settlement-win-mode" : "settlement-fail-mode");
    dom.shopMessageEl.textContent = title + "：金币 +" + Math.max(0, Math.floor(result.coinsEarned || 0)) + "，经验 +" + Math.max(0, Math.floor(result.expEarned || 0)) + "。";
    dom.shopCoinsEl.textContent = result.isWin ? "胜利结算" : "失败回收";
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "settlement-result-view";

    var levelProgress = result.levelProgress || {};
    var cards = [
      [icons.gold || "", "金币", "+" + Math.max(0, Math.floor(result.coinsEarned || 0)), "击落 +" + (breakdown.killGold || 0) + " / 通关 +" + (breakdown.clearBonus || 0), ""],
      [icons.exp || "", "经验", "+" + Math.max(0, Math.floor(result.expEarned || 0)), formatLevelProgress(levelProgress), " level-progress"],
      [icons.emptySlot || "", "奖励栏位", "待解析", "预留道具 / 碎片", " empty"],
      [icons.emptySlot || "", "奖励栏位", "待解析", "预留装备 / 模组", " empty"]
    ];

    var body = document.createElement("section");
    body.className = "settlement-result-shell " + (result.isWin ? "victory" : "defeat") + " honor-tier-" + honorTier;
    body.innerHTML =
      '<img class="settlement-aura" src="' + escapeAttr(result.isWin ? (icons.victoryAura || "") : (icons.defeatAura || "")) + '" alt="">' +
      (result.isWin ? '<img class="settlement-open-chest" src="' + escapeAttr(icons.chestOpen || "") + '" alt="">' : "") +
      renderSettlementPilotHeader(pilot, title, result.isWin ? "胜利数据已写入航线记录。" : "战斗失败，已回收击落奖励与基础经验。");
    var rewardPanel = document.createElement("section");
    rewardPanel.className = "settlement-reward-panel";
    var headline = document.createElement("div");
    headline.className = "settlement-honor-headline";
    headline.innerHTML =
      '<img class="honor-frame" src="' + escapeAttr(icons.honorFrame || "") + '" alt="">' +
      '<div class="settlement-honor-visual">' +
        honorStars +
        '<strong class="settlement-honor-caption">作战评级</strong>' +
      '</div>' +
      renderSettlementRatingStats(rating);
    rewardPanel.appendChild(headline);

    var grid = document.createElement("section");
    grid.className = "settlement-grid settlement-reward-grid";
    cards.forEach(function renderCard(item) {
      var card = document.createElement("article");
      card.className = "settlement-card settlement-reward-card" + (item[4] || "");
      card.style.backgroundImage = "url('" + escapeAttr((item[4] || "").indexOf("empty") >= 0 ? (icons.emptySlot || "") : (icons.rewardSlot || "")) + "')";
      card.innerHTML =
        (item[0] ? '<img class="settlement-card-icon" src="' + escapeAttr(item[0]) + '" alt="">' : "") +
        "<span>" + escapeHtml(item[1]) + "</span><strong>" + escapeHtml(item[2]) + "</strong><em>" + escapeHtml(item[3]) + "</em>" +
        ((item[4] || "").indexOf("level-progress") >= 0 ? renderSettlementLevelBar(levelProgress) : "");
      grid.appendChild(card);
    });
    rewardPanel.appendChild(grid);
    body.appendChild(rewardPanel);
    dom.upgradeList.appendChild(body);

    dom.nextLevelButton.textContent = result.isWin ? "下一关" : "再战";
    dom.replayButton.textContent = "再战";
    dom.replayButton.style.display = "";
    dom.backToChapterButton.textContent = "返回关卡";
  }

  function setSettlementAssetVars(icons) {
    icons = icons || {};
    if (!dom.shopScreen || !dom.shopScreen.style) return;
    dom.shopScreen.style.setProperty("--settlement-primary-button", "url('" + (icons.primaryButton || "") + "')");
    dom.shopScreen.style.setProperty("--settlement-honor-divider", "url('" + (icons.honorDivider || "") + "')");
    dom.shopScreen.style.setProperty("--settlement-reward-slot", "url('" + (icons.rewardSlot || "") + "')");
  }

  function renderSettlementHonorStars(tier, crownIcon) {
    tier = Math.max(0, Math.min(5, Math.floor(Number(tier) || 0)));
    var filledStars = Math.min(3, tier);
    var html = '<div class="settlement-honor-badge"><div class="settlement-star-row">';
    for (var i = 1; i <= 3; i += 1) {
      html += '<span class="settlement-star' + (i <= filledStars ? " filled" : "") + '"></span>';
    }
    html += '</div>';
    if (tier >= 4 && crownIcon) {
      html += '<img class="settlement-crown-mark tier-' + tier + '" src="' + escapeAttr(crownIcon) + '" alt="">';
    }
    html += '</div>';
    return html;
  }

  function renderSettlementRatingStats(rating) {
    rating = rating || {};
    var killedEnemies = Math.max(0, Math.floor(Number(rating.killedEnemies) || 0));
    var damageTaken = Math.max(0, Math.floor(Number(rating.damageTaken) || 0));
    var bossTime = Number(rating.bossClearTime);
    return '<div class="settlement-rating-stats">' +
      '<span><b>击落敌机</b><strong>' + killedEnemies + '架</strong></span>' +
      '<span><b>受击</b><strong>' + damageTaken + '</strong></span>' +
      '<span><b>BOSS时间</b><strong>' + (bossTime >= 999 || !isFinite(bossTime) ? "--" : Math.ceil(bossTime) + "s") + '</strong></span>' +
    '</div>';
  }

  function renderSettlementPilotHeader(pilot, title, message) {
    pilot = pilot || {};
    return '<section class="settlement-pilot-report">' +
      '<figure class="settlement-pilot-art">' +
        '<img src="' + escapeAttr(pilot.src || assetsConfig.DEFAULT_AVATAR || "") + '" alt="' + escapeAttr(pilot.name || "战姬") + '">' +
      '</figure>' +
      '<div class="settlement-pilot-copy">' +
        '<span>' + escapeHtml((pilot.rank || "A") + " RANK / " + (pilot.codeName || "BATTLE REPORT")) + '</span>' +
        '<h2>' + escapeHtml(pilot.name || "出战战姬") + '</h2>' +
        '<strong>' + escapeHtml(title || "战斗结算") + '</strong>' +
        '<p>' + escapeHtml(message || "") + '</p>' +
      '</div>' +
    '</section>';
  }

  function renderVictoryIntro(result) {
    result = result || {};
    lastBattleResult = result;
    var icons = assetsConfig.SETTLEMENT_ICON_ASSETS || {};
    var pilot = getPilotAsset();
    var rating = result.rating || {};
    setSettlementAssetVars(icons);
    dom.shopScreen.classList.remove("settlement-chest-mode", "settlement-opened-mode", "settlement-fail-mode");
    dom.shopScreen.classList.add("settlement-victory-intro-mode", "settlement-ceremony-mode", "settlement-win-mode", "settlement-focused-mode");
    dom.shopMessageEl.textContent = "作战胜利";
    dom.shopCoinsEl.textContent = "战报确认";
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "settlement-victory-intro-view battle-report-intro-view";
    dom.upgradeList.innerHTML =
      '<section class="battle-report-intro">' +
        '<div class="battle-report-glow" aria-hidden="true"></div>' +
        renderSettlementPilotHeader(pilot, "作战胜利", "航线已压制，奖励舱正在回收。") +
        '<section class="battle-report-hero">' +
          '<div class="battle-report-rating">' + renderSettlementHonorStars(rating.honorTier || rating.stars || 1, icons[rating.honorIcon] || "") + '</div>' +
          '<div class="battle-report-copy">' +
            '<span>MISSION CLEAR</span>' +
            '<strong>航线压制完成</strong>' +
          '</div>' +
        '</section>' +
        renderSettlementRatingStats(rating) +
        '<button type="button" class="battle-report-primary" data-open-victory-chest="1">领取奖励</button>' +
      '</section>';
    dom.nextLevelButton.textContent = "领取奖励";
    dom.replayButton.style.display = "none";
    dom.backToChapterButton.textContent = "返回关卡";
  }

  function renderSettlementChest(result) {
    result = result || {};
    if (!result.isWin) {
      renderSettlement(result);
      return;
    }
    lastBattleResult = result;
    var icons = assetsConfig.SETTLEMENT_ICON_ASSETS || {};
    setSettlementAssetVars(icons);
    dom.shopScreen.classList.remove("settlement-victory-intro-mode", "settlement-fail-mode", "settlement-opened-mode");
    dom.shopScreen.classList.add("settlement-chest-mode", "settlement-ceremony-mode", "settlement-win-mode", "settlement-focused-mode");
    dom.shopMessageEl.textContent = "胜利奖励舱";
    dom.shopCoinsEl.textContent = "等待开启";
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "settlement-chest-view battle-report-chest-view";
    dom.upgradeList.innerHTML =
      '<section class="battle-report-chest">' +
        '<div class="battle-report-glow" aria-hidden="true"></div>' +
        '<div class="battle-report-chest-copy">' +
          '<span>REWARD CACHE</span>' +
          '<strong>战利品回收完成</strong>' +
          '<em>开启后查看本关评级、金币、经验与奖励位。</em>' +
        '</div>' +
        '<button type="button" class="battle-report-chest-button" data-open-settlement="1">' +
          '<img src="' + escapeAttr(icons.chestClosed || "") + '" alt="奖励宝箱">' +
          '<span>开启奖励舱</span>' +
        '</button>' +
      '</section>';
    dom.nextLevelButton.textContent = "开启奖励舱";
    dom.replayButton.style.display = "none";
    dom.backToChapterButton.textContent = "返回关卡";
  }

  function renderSettlement(result) {
    result = result || {};
    lastBattleResult = result;
    var breakdown = result.goldBreakdown || {};
    var icons = assetsConfig.SETTLEMENT_ICON_ASSETS || {};
    var pilot = getPilotAsset();
    var rating = result.rating || {};
    var honorTier = Math.max(0, Math.floor(Number(rating.honorTier) || Number(rating.stars) || 0));
    var honorIcon = icons[rating.honorIcon] || "";
    var title = result.isWin ? "胜利战报" : "作战失败";
    var levelProgress = result.levelProgress || {};
    setSettlementAssetVars(icons);
    dom.shopScreen.classList.remove("settlement-victory-intro-mode", "settlement-chest-mode", "settlement-focused-mode");
    dom.shopScreen.classList.add("settlement-ceremony-mode", "settlement-opened-mode", result.isWin ? "settlement-win-mode" : "settlement-fail-mode");
    dom.shopMessageEl.textContent = title + "：金币 +" + Math.max(0, Math.floor(result.coinsEarned || 0)) + "，经验 +" + Math.max(0, Math.floor(result.expEarned || 0)) + "。";
    dom.shopCoinsEl.textContent = result.isWin ? "最终结算" : "失败结算";
    dom.upgradeList.innerHTML = "";
    dom.upgradeList.className = "settlement-result-view battle-report-result-view";

    var rewardCards = [
      { icon: icons.gold || "", label: "金币", value: "+" + Math.max(0, Math.floor(result.coinsEarned || 0)), detail: "击落 +" + (breakdown.killGold || 0) + " / 通关 +" + (breakdown.clearBonus || 0), className: "" },
      { icon: icons.exp || "", label: "经验", value: "+" + Math.max(0, Math.floor(result.expEarned || 0)), detail: formatLevelProgress(levelProgress), className: " level-progress" },
      { icon: icons.emptySlot || "", label: "奖励栏位", value: "待解析", detail: "预留道具 / 碎片", className: " empty" },
      { icon: icons.emptySlot || "", label: "奖励栏位", value: "待解析", detail: "预留装备 / 模组", className: " empty" }
    ];

    var body = document.createElement("section");
    body.className = "battle-report-result " + (result.isWin ? "victory" : "defeat") + " honor-tier-" + honorTier;
    body.innerHTML =
      '<div class="battle-report-glow" aria-hidden="true"></div>' +
      '<section class="battle-report-main">' +
        renderSettlementPilotHeader(pilot, title, result.isWin ? "胜利数据已写入航线记录。" : "本次未通关，宝箱不会出现。") +
        '<div class="battle-report-grade">' +
          renderSettlementHonorStars(honorTier, honorIcon) +
        '</div>' +
      '</section>' +
      renderSettlementRatingStats(rating);

    var grid = document.createElement("section");
    grid.className = "settlement-grid battle-report-rewards";
    rewardCards.forEach(function renderCard(item) {
      var card = document.createElement("article");
      card.className = "battle-report-reward" + (item.className || "");
      card.innerHTML =
        (item.icon ? '<img src="' + escapeAttr(item.icon) + '" alt="">' : "") +
        '<span>' + escapeHtml(item.label) + '</span>' +
        '<strong>' + escapeHtml(item.value) + '</strong>' +
        '<em>' + escapeHtml(item.detail) + '</em>' +
        ((item.className || "").indexOf("level-progress") >= 0 ? renderSettlementLevelBar(levelProgress) : "");
      grid.appendChild(card);
    });
    body.appendChild(grid);

    var actionBar = document.createElement("section");
    actionBar.className = "battle-report-actions";
    function appendReportAction(action, label, primary) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "battle-report-action" + (primary ? " primary" : "");
      button.dataset.settlementAction = action;
      button.textContent = label;
      actionBar.appendChild(button);
    }
    appendReportAction(result.isWin ? "next" : "replay", result.isWin ? "下一关" : "再战", true);
    if (result.isWin) appendReportAction("replay", "再战", false);
    appendReportAction("chapter", "返回关卡", false);
    body.appendChild(actionBar);
    dom.upgradeList.appendChild(body);

    dom.nextLevelButton.textContent = result.isWin ? "下一关" : "再战";
    dom.replayButton.textContent = "再战";
    dom.replayButton.style.display = "";
    dom.backToChapterButton.textContent = "返回关卡";
  }

  function renderSettlementHonorStars(tier, crownIcon) {
    tier = Math.max(0, Math.min(5, Math.floor(Number(tier) || 0)));
    var filledStars = Math.min(3, tier);
    var html = '<div class="settlement-honor-badge battle-report-stars"><div class="settlement-star-row">';
    for (var i = 1; i <= 3; i += 1) {
      html += '<span class="settlement-star' + (i <= filledStars ? " filled" : "") + '"></span>';
    }
    html += '</div>';
    if (tier >= 4 && crownIcon) html += '<img class="settlement-crown-mark tier-' + tier + '" src="' + escapeAttr(crownIcon) + '" alt="">';
    html += '</div>';
    return html;
  }

  function renderSettlementRatingStats(rating) {
    rating = rating || {};
    var killedEnemies = Math.max(0, Math.floor(Number(rating.killedEnemies) || 0));
    var damageTaken = Math.max(0, Math.floor(Number(rating.damageTaken) || 0));
    var bossTime = Number(rating.bossClearTime);
    return '<div class="settlement-rating-stats battle-report-stats">' +
      '<span><b>击落敌机</b><strong>' + killedEnemies + '架</strong></span>' +
      '<span><b>受击</b><strong>' + damageTaken + '</strong></span>' +
      '<span><b>BOSS时间</b><strong>' + (bossTime >= 999 || !isFinite(bossTime) ? "--" : Math.ceil(bossTime) + "s") + '</strong></span>' +
    '</div>';
  }

  function renderSettlementPilotHeader(pilot, title, message) {
    pilot = pilot || {};
    return '<section class="settlement-pilot-report battle-report-pilot">' +
      '<figure class="settlement-pilot-art battle-report-pilot-art">' +
        '<img src="' + escapeAttr(pilot.src || assetsConfig.DEFAULT_AVATAR || "") + '" alt="' + escapeAttr(pilot.name || "战姬") + '">' +
      '</figure>' +
      '<div class="settlement-pilot-copy battle-report-pilot-copy">' +
        '<span>' + escapeHtml((pilot.rank || "A") + " RANK / " + (pilot.codeName || "BATTLE REPORT")) + '</span>' +
        '<h2>' + escapeHtml(pilot.name || "出战战姬") + '</h2>' +
        '<strong>' + escapeHtml(title || "战斗结算") + '</strong>' +
        '<p>' + escapeHtml(message || "") + '</p>' +
      '</div>' +
    '</section>';
  }

  function formatLevelProgress(levelProgress) {
    var before = levelProgress && levelProgress.before ? levelProgress.before : null;
    var after = levelProgress && levelProgress.after ? levelProgress.after : null;
    if (!after) return "指挥官经验";
    if (after.isMaxLevel) return before && before.level !== after.level ? "Lv." + before.level + " -> Lv." + after.level + " / 已满级" : "已满级";
    if (before && before.level !== after.level) return "等级提升 Lv." + before.level + " -> Lv." + after.level;
    return "距离 Lv." + (after.level + 1) + " 还差 " + Math.max(0, after.expMax - after.exp) + " 经验";
  }

  function renderSettlementLevelBar(levelProgress) {
    var after = levelProgress && levelProgress.after ? levelProgress.after : null;
    if (!after) return "";
    return '<div class="settlement-level-track"><span style="width: ' + Math.max(0, Math.min(100, after.percent || 0)) + '%;"></span></div>';
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function renderFighterUpgradePanel() {
    var loadout = shared.combatStats && shared.combatStats.generateBattleLoadout
      ? shared.combatStats.generateBattleLoadout(profile)
      : null;
    var pilot = loadout && loadout.pilot ? loadout.pilot : (getPilotAsset() || {});
    var ship = loadout && loadout.ship ? loadout.ship : (getShipAsset() || {});
    var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
    var maxLevel = levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60;
    var levelCap = Math.min(commanderLevel, maxLevel);
    var breakdown = buildFighterLoadoutBreakdown(loadout);
    var combatPower = calculateFighterPower({
      attack: breakdown.attack.total,
      maxHp: breakdown.hp.total,
      armorPenetration: breakdown.armorPenetration.total
    });

    dom.featurePanelKicker.textContent = "UPGRADE";
    dom.featurePanelTitle.textContent = "战机升级";
    dom.featurePanelBody.textContent = "强化攻击、破甲和生命，升级结果会写入存档并进入下一次出战快照。";
    setFeaturePanelMode("fighter-upgrade-panel");
    dom.featurePanelSlots.className = "fighter-upgrade-ui";
    dom.featurePanelSlots.innerHTML =
      '<div class="fighter-upgrade-toolbar">' +
        '<button type="button" class="fighter-upgrade-back" data-feature-back="lobby"><span aria-hidden="true">‹</span>返回</button>' +
      '</div>' +
      '<section class="fighter-upgrade-showcase">' +
        '<div class="fighter-loadout-score">' +
          '<span>综合战力评分</span>' +
          '<strong>' + formatResource(combatPower) + '</strong>' +
          '<em>当前战姬 + 战机 + 已生效养成</em>' +
        '</div>' +
        '<div class="fighter-loadout-combo">' +
          '<div class="fighter-loadout-unit">' +
            '<span class="asset-rank rank-' + escapeAttr(pilot && pilot.rank || "A") + '">' + escapeHtml(pilot && pilot.rank || "A") + '</span>' +
            '<div><em>战姬</em><strong>' + escapeHtml(pilot && pilot.name || "出战战姬") + '</strong></div>' +
          '</div>' +
          '<div class="fighter-loadout-unit">' +
            '<span class="asset-rank rank-' + escapeAttr(ship && ship.rank || "A") + '">' + escapeHtml(ship && ship.rank || "A") + '</span>' +
            '<div><em>战机</em><strong>' + escapeHtml(ship && ship.name || "出战战机") + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="fighter-loadout-stats">' +
          renderFighterLoadoutStats(breakdown) +
        '</div>' +
        '<div class="fighter-initial-skills">' +
          renderInitialSkillSummary(loadout) +
        '</div>' +
      '</section>' +
      '<section class="fighter-upgrade-rows">' +
        '<div class="fighter-upgrade-section-head">' +
          '<div><span>强化项目</span><strong>选择优先提升项</strong></div>' +
          '<em>收益与消耗按当前等级实时计算</em>' +
        '</div>' +
        buildFighterUpgradeRows(loadout, levelCap, maxLevel) +
      '</section>';
    openFeaturePanelShell("fighter-upgrade-panel");
  }

  function renderInitialSkillSummary(loadout) {
    var initial = loadout && loadout.initialWeapons ? loadout.initialWeapons : {};
    var powerups = levelsConfig.POWERUPS || {};
    var fallbackNames = { spread: "散射", laser: "激光", missile: "导弹" };
    var html = '<div class="fighter-initial-skills-head"><span>开局初始技能</span><em>只读展示，不参与战机强化</em></div>';
    html += '<div class="fighter-initial-skill-list">';
    ["spread", "laser", "missile"].forEach(function renderSkill(key) {
      var level = Math.max(0, Math.floor(Number(initial[key]) || 0));
      var config = powerups[key] || {};
      var name = config.name || fallbackNames[key] || key;
      var mark = config.mark || name.slice(0, 1);
      html += '<div class="fighter-initial-skill">' +
        '<span>' + escapeHtml(mark) + '</span>' +
        '<strong>' + escapeHtml(name) + '</strong>' +
        '<em>' + (level > 0 ? "Lv." + level : "未解锁") + '</em>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildFighterLoadoutBreakdown(loadout) {
    loadout = loadout || {};
    var pilot = loadout.pilot || {};
    var ship = loadout.ship || {};
    var fighter = loadout.fighterUpgrades || {};
    var attackLevel = Math.max(1, Math.floor(Number(fighter.attack) || getFighterStatLevel("attack")));
    var hpLevel = Math.max(1, Math.floor(Number(fighter.hp) || getFighterStatLevel("hp")));
    var penLevel = Math.max(1, Math.floor(Number(fighter.armorPenetration) || getFighterStatLevel("armorPenetration")));
    var pilotAttack = Math.max(0, Math.round(Number(pilot.damage) || 0));
    var shipAttack = Math.max(0, Math.round(Number(ship.damage) || 0));
    var upgradeAttack = Math.max(0, Math.round(getFighterAttackBonus(attackLevel)));
    var baseHp = 100;
    var pilotHp = Math.max(0, Math.round(Number(pilot.hp) || 0));
    var shipHp = Math.max(0, Math.round(Number(ship.hp) || 0));
    var upgradeHp = Math.max(0, Math.round(getFighterHpBonus(hpLevel)));
    var pilotPen = Math.max(0, Number(pilot.armorPenetration) || 0);
    var shipPen = Math.max(0, Number(ship.armorPenetration) || 0);
    var upgradePen = Math.max(0, Number(getFighterArmorPenetrationBonus(penLevel)) || 0);
    return {
      attack: { key: "attack", label: "攻击", total: pilotAttack + shipAttack + upgradeAttack, parts: [
        { label: "战姬", value: pilotAttack, type: "number" },
        { label: "战机", value: shipAttack, type: "number" },
        { label: "强化", value: upgradeAttack, type: "number" }
      ] },
      hp: { key: "hp", label: "生命", total: baseHp + pilotHp + shipHp + upgradeHp, parts: [
        { label: "基础", value: baseHp, type: "number" },
        { label: "战姬", value: pilotHp, type: "number" },
        { label: "战机", value: shipHp, type: "number" },
        { label: "强化", value: upgradeHp, type: "number" }
      ] },
      armorPenetration: { key: "armorPenetration", label: "破甲", total: pilotPen + shipPen + upgradePen, parts: [
        { label: "战姬", value: pilotPen, type: "percent" },
        { label: "战机", value: shipPen, type: "percent" },
        { label: "强化", value: upgradePen, type: "percent" }
      ] }
    };
  }

  function renderFighterLoadoutStats(breakdown) {
    var rows = [breakdown.attack, breakdown.hp, breakdown.armorPenetration];
    return rows.map(function renderStat(item) {
      return '<div class="fighter-loadout-stat">' +
        '<span>' + item.label + '</span>' +
        '<strong>' + formatFighterBreakdownTotal(item) + '</strong>' +
        '<em>' + renderFighterBreakdownParts(item.parts) + '</em>' +
      '</div>';
    }).join("");
  }

  function formatFighterBreakdownTotal(item) {
    if (!item) return "0";
    if (item.key === "armorPenetration") return formatPercent(item.total) + "%";
    return formatResource(Math.round(Number(item.total) || 0));
  }

  function renderFighterBreakdownParts(parts) {
    return (parts || []).map(function renderPart(part) {
      if (part.type === "percent") return part.label + " " + formatPercent(part.value) + "%";
      return part.label + " " + formatResource(Math.round(Number(part.value) || 0));
    }).join(" + ");
  }

  function buildFighterUpgradeRows(loadout, levelCap, maxLevel) {
    return [
      { key: "attack", icon: "◎", title: "攻击", level: getFighterStatLevel("attack") },
      { key: "armorPenetration", icon: "◇", title: "破甲", level: getFighterStatLevel("armorPenetration") },
      { key: "hp", icon: "♡", title: "生命", level: getFighterStatLevel("hp") }
    ].map(function renderRow(item) {
      var check = shared.battleRules && shared.battleRules.getFighterUpgradeResult
        ? shared.battleRules.getFighterUpgradeResult(profile, item.key)
        : getFallbackFighterUpgradeResult(item.key);
      var targetLevel = item.level + 1;
      var currentText = formatFighterStatValue(item.key, item.level);
      var nextText = targetLevel <= maxLevel
        ? formatFighterStatValue(item.key, targetLevel)
        : currentText;
      var deltaText = targetLevel <= maxLevel
        ? formatFighterStatDelta(item.key, item.level, targetLevel)
        : "0";
      var status = getFighterUpgradeStatus(item.level, levelCap, maxLevel, check);
      var costText = check && check.cost ? formatResource(check.cost) + " 金币" : "-";
      return '<article class="fighter-upgrade-row ' + (status.disabled ? "disabled" : "ready") + '">' +
        '<div class="fighter-upgrade-icon" aria-hidden="true">' + item.icon + '</div>' +
        '<div class="fighter-upgrade-stat-name"><strong>' + item.title + '</strong><span>Lv.' + item.level + '/' + levelCap + '</span></div>' +
        '<div class="fighter-upgrade-values"><span>当前加成</span><strong>+' + currentText + '</strong></div>' +
        '<div class="fighter-upgrade-values next"><span>下一加成</span><strong>+' + nextText + '</strong></div>' +
        '<div class="fighter-upgrade-values delta"><span>本次提升</span><strong>+' + deltaText + '</strong></div>' +
        '<div class="fighter-upgrade-cost"><span>升级消耗</span><strong>' + costText + '</strong></div>' +
        '<button type="button" data-fighter-upgrade="' + item.key + '"' + (status.disabled ? " disabled" : "") + '>' + status.label + '</button>' +
      '</article>';
    }).join("");
  }

  function upgradeFighterStat(statType) {
    var check = shared.battleRules && shared.battleRules.getFighterUpgradeResult
      ? shared.battleRules.getFighterUpgradeResult(profile, statType)
      : getFallbackFighterUpgradeResult(statType);
    if (!check || !check.canUpgrade) return;
    profile.fighterUpgrades = profile.fighterUpgrades || {};
    setGold(getGold() - check.cost);
    profile.fighterUpgrades[statType] = check.targetLevel;
    saveProfile();
    renderLobby();
    renderChapterSelect();
    updateHud();
    renderFighterUpgradePanel();
  }

  function getFighterStatLevel(statType) {
    profile.fighterUpgrades = profile.fighterUpgrades || {};
    return Math.max(1, Math.floor(Number(profile.fighterUpgrades[statType]) || 1));
  }

  function getFallbackFighterUpgradeResult(statType) {
    var targetLevel = getFighterStatLevel(statType) + 1;
    var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
    var maxLevel = levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60;
    var cost = levelsConfig.getFighterUpgradeCost ? levelsConfig.getFighterUpgradeCost(statType, targetLevel) : null;
    if (targetLevel > maxLevel || cost == null) return { canUpgrade: false, reason: "MAX_LEVEL", targetLevel: targetLevel };
    if (targetLevel > commanderLevel) return { canUpgrade: false, reason: "COMMANDER_LEVEL_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
    if (getGold() < cost) return { canUpgrade: false, reason: "GOLD_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
    return { canUpgrade: true, targetLevel: targetLevel, cost: cost };
  }

  function getFighterUpgradeStatus(level, levelCap, maxLevel, check) {
    if (level >= maxLevel || (check && check.reason === "MAX_LEVEL")) return { disabled: true, label: "已满级" };
    if (level >= levelCap || (check && check.reason === "COMMANDER_LEVEL_NOT_ENOUGH")) return { disabled: true, label: "等级不足" };
    if (check && check.reason === "GOLD_NOT_ENOUGH") return { disabled: true, label: "金币不足" };
    if (check && check.canUpgrade) return { disabled: false, label: "升级" };
    return { disabled: true, label: "不可升级" };
  }

  function formatFighterStatValue(statType, level) {
    if (statType === "attack") return String(Math.round(getFighterAttackBonus(level)));
    if (statType === "armorPenetration") return formatPercent(getFighterArmorPenetrationBonus(level)) + "%";
    return String(Math.round(getFighterHpBonus(level)));
  }

  function formatFighterStatDelta(statType, currentLevel, targetLevel) {
    var current = getFighterStatNumericValue(statType, currentLevel);
    var next = getFighterStatNumericValue(statType, targetLevel);
    var delta = Math.max(0, next - current);
    if (statType === "armorPenetration") return formatPercent(delta) + "%";
    return formatResource(Math.round(delta));
  }

  function getFighterStatNumericValue(statType, level) {
    if (statType === "attack") return getFighterAttackBonus(level);
    if (statType === "armorPenetration") return getFighterArmorPenetrationBonus(level);
    return getFighterHpBonus(level);
  }

  function getFighterAttackBonus(level) {
    var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
    var perLevel = Number(gain.attackPerLevel) || 1;
    return Math.max(0, level - 1) * perLevel;
  }

  function getFighterArmorPenetrationBonus(level) {
    var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
    var perLevel = Number(gain.armorPenetrationPerLevel) || 0.001;
    return Math.max(1, level) * perLevel;
  }

  function getFighterHpBonus(level) {
    var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
    var perLevel = Number(gain.hpPerLevel) || 10;
    return Math.max(0, level - 1) * perLevel;
  }

  function formatPercent(value) {
    var percent = Math.round((Number(value) || 0) * 1000) / 10;
    return percent % 1 === 0 ? String(percent) : percent.toFixed(1);
  }

  function calculateFighterPower(stats) {
    stats = stats || {};
    return Math.round(
      Math.max(0, Number(stats.attack) || 0) * 10 +
      Math.max(0, Number(stats.maxHp) || 100) * 2 +
      Math.max(0, Number(stats.armorPenetration) || 0) * 100 * 18
    );
  }

  function renderPilotGalleryPanel() {
    dom.featurePanelKicker.textContent = "PILOT DOSSIER";
    dom.featurePanelTitle.textContent = "战姬档案";
    dom.featurePanelBody.textContent = "查看战姬档案与核心战斗属性，选择当前出战成员。";
    setFeaturePanelMode("pilot-dossier-panel");
    reRenderPilotGallery();
    openFeaturePanelShell("pilot-dossier-panel");
  }

  function reRenderPilotGallery() {
    dom.featurePanelSlots.innerHTML = "";
    dom.featurePanelSlots.className = "";
    if (shared.pilotGalleryView && shared.pilotGalleryView.renderPilotGallery) {
      shared.profile.recoverEnergy(profile);
      shared.pilotGalleryView.renderPilotGallery(dom.featurePanelSlots, profile, {
        onSelectPilot: function onSelectPilot(pilotId) {
          profile.scene = profile.scene || {};
          profile.owned = profile.owned || {};
          profile.owned.pilots = Array.isArray(profile.owned.pilots) ? profile.owned.pilots : [];
          if (profile.owned.pilots.indexOf(pilotId) < 0) {
            profile.owned.pilots.push(pilotId);
          }
          profile.scene.pilotId = pilotId;
          saveProfile();
          renderLobby();
          renderChapterSelect();
          updateHud();
          reRenderPilotGallery();
        },
        onBuyPilot: function onBuyPilot(pilotId, price) {
          profile.resources.diamonds = Math.max(0, (profile.resources.diamonds || 0) - price);
          profile.owned.pilots = profile.owned.pilots || [];
          if (profile.owned.pilots.indexOf(pilotId) < 0) {
            profile.owned.pilots.push(pilotId);
          }
          saveProfile();
          renderLobby();
          renderChapterSelect();
          updateHud();
          reRenderPilotGallery();
        }
      });
    }
  }

  function renderShipGalleryPanel() {
    dom.featurePanelKicker.textContent = "FIGHTER HANGAR";
    dom.featurePanelTitle.textContent = "战机机库";
    dom.featurePanelBody.textContent = "查看战机档案与核心战斗属性，选择当前出战机体。";
    setFeaturePanelMode("ship-hangar-panel");
    reRenderShipGallery();
    openFeaturePanelShell("ship-hangar-panel");
  }

  function reRenderShipGallery() {
    dom.featurePanelSlots.innerHTML = "";
    dom.featurePanelSlots.className = "";
    if (shared.shipGalleryView && shared.shipGalleryView.renderShipGallery) {
      shared.profile.recoverEnergy(profile);
      shared.shipGalleryView.renderShipGallery(dom.featurePanelSlots, profile, {
        onSelectShip: function onSelectShip(shipId) {
          profile.scene = profile.scene || {};
          profile.owned = profile.owned || {};
          profile.owned.ships = Array.isArray(profile.owned.ships) ? profile.owned.ships : [];
          if (profile.owned.ships.indexOf(shipId) < 0) {
            profile.owned.ships.push(shipId);
          }
          profile.scene.shipId = shipId;
          saveProfile();
          renderLobby();
          renderChapterSelect();
          updateHud();
          reRenderShipGallery();
        }
      });
    }
  }

  function renderProfilePanel() {
    shared.profile.recoverEnergy(profile);
    var player = profile.player || {};
    var progress = createLevelProgressSnapshot(player);
    var resources = profile.resources || {};
    var pilot = getPilotAsset() || {};
    var ship = getShipAsset() || {};
    var power = calculateProfilePower();
    var remaining = progress.isMaxLevel ? 0 : Math.max(0, progress.expMax - progress.exp);

    setFeaturePanelMode("profile-dossier-panel");
    dom.featurePanelKicker.textContent = "PLAYER PROFILE";
    dom.featurePanelTitle.textContent = "玩家资料";
    dom.featurePanelBody.textContent = "指挥官身份、成长进度与战斗记录";
    dom.featurePanelSlots.className = "profile-dossier";
    dom.featurePanelSlots.innerHTML =
      '<section class="profile-summary">' +
        '<div class="profile-avatar-column">' +
          '<img class="profile-avatar-large" src="' + escapeAttr(player.avatar || assetsConfig.DEFAULT_AVATAR || "") + '" alt="玩家头像">' +
          '<button type="button" class="profile-small-button" data-profile-action="upload-avatar">上传头像</button>' +
          '<button type="button" class="profile-small-button secondary" data-profile-action="reset-avatar">恢复默认</button>' +
        '</div>' +
        '<div class="profile-identity">' +
          '<label class="profile-name-label" for="profileNameInput">玩家姓名</label>' +
          '<input id="profileNameInput" class="profile-name-input" maxlength="12" value="' + escapeAttr(player.name || "王牌飞行员") + '">' +
          '<div class="profile-rank-row">' +
            '<span class="profile-level-chip">Lv.' + progress.level + '</span>' +
            '<span class="profile-honor-chip">荣誉 ' + escapeHtml(getHonorText(player)) + '</span>' +
          '</div>' +
          '<div class="profile-exp-block">' +
            '<div class="profile-exp-copy"><span>经验</span><strong>' + escapeHtml(progress.isMaxLevel ? "MAX" : progress.exp + "/" + progress.expMax) + '</strong></div>' +
            '<div class="profile-exp-track"><span style="width: ' + progress.percent + '%;"></span></div>' +
            '<em>' + escapeHtml(progress.isMaxLevel ? "已达到当前最高等级" : "距离 Lv." + (progress.level + 1) + " 还差 " + remaining + " 经验") + '</em>' +
          '</div>' +
        '</div>' +
        '<div class="profile-metric-grid">' +
          renderProfileMetric("总经验", formatResource(progress.totalExp)) +
          renderProfileMetric("体力上限", formatResource(resources.maxEnergy || 0)) +
          renderProfileMetric("综合战力", formatResource(power)) +
        '</div>' +
      '</section>' +
      '<nav class="profile-tabs" aria-label="玩家资料分页">' +
        renderProfileTab("info", "资料") +
        renderProfileTab("growth", "成长") +
        renderProfileTab("record", "战绩") +
      '</nav>' +
      '<section class="profile-tab-body">' + renderProfileTabBody(profilePanelTab, progress, pilot, ship, power) + '</section>' +
      '<footer class="profile-actions">' +
        '<button type="button" data-profile-action="save-name">保存</button>' +
        '<button type="button" class="profile-small-button secondary" data-profile-action="close">关闭</button>' +
      '</footer>';
    openFeaturePanelShell("profile-dossier-panel");
  }

  function renderProfileMetric(label, value) {
    return '<div class="profile-metric"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></div>';
  }

  function renderProfileTab(id, label) {
    return '<button type="button" class="' + (profilePanelTab === id ? "active" : "") + '" data-profile-tab="' + id + '">' + escapeHtml(label) + '</button>';
  }

  function renderProfileTabBody(tab, progress, pilot, ship, power) {
    if (tab === "growth") return renderProfileGrowth(progress, power);
    if (tab === "record") return renderProfileRecord();
    return renderProfileInfo(progress, pilot, ship);
  }

  function renderProfileInfo(progress, pilot, ship) {
    var resources = profile.resources || {};
    return '<div class="profile-detail-grid">' +
      renderProfileDetail("头像来源", "本地存档头像") +
      renderProfileDetail("荣誉等级", getHonorText(profile.player || {})) +
      renderProfileDetail("当前战姬", (pilot && pilot.name) || "未配置") +
      renderProfileDetail("当前战机", (ship && ship.name) || "未配置") +
      renderProfileDetail("金币", formatResource(resources.gold != null ? resources.gold : profile.coins || 0)) +
      renderProfileDetail("钻石", formatResource(resources.diamonds || 0)) +
      renderProfileDetail("体力", formatResource(resources.energy || 0) + "/" + formatResource(resources.maxEnergy || 0)) +
      renderProfileDetail("等级进度", progress.isMaxLevel ? "MAX" : progress.exp + "/" + progress.expMax) +
    '</div>';
  }

  function renderProfileGrowth(progress, power) {
    var fighter = profile.fighterUpgrades || {};
    return '<div class="profile-growth">' +
      '<div class="profile-growth-hero">' +
        '<span>等级成长</span>' +
        '<strong>Lv.' + progress.level + '</strong>' +
        '<div class="profile-exp-track large"><span style="width: ' + progress.percent + '%;"></span></div>' +
        '<em>' + escapeHtml(progress.isMaxLevel ? "已达到当前最高等级" : "升级后会提升体力上限，并开放更高战机强化等级") + '</em>' +
      '</div>' +
      '<div class="profile-detail-grid compact">' +
        renderProfileDetail("强化等级上限", "Lv." + Math.min(progress.level, levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60)) +
        renderProfileDetail("攻击强化", "Lv." + Math.max(1, Math.floor(Number(fighter.attack) || 1))) +
        renderProfileDetail("生命强化", "Lv." + Math.max(1, Math.floor(Number(fighter.hp) || 1))) +
        renderProfileDetail("破甲强化", "Lv." + Math.max(1, Math.floor(Number(fighter.armorPenetration) || 1))) +
        renderProfileDetail("综合战力", formatResource(power)) +
        renderProfileDetail("下一等级经验", progress.isMaxLevel ? "MAX" : String(Math.max(0, progress.expMax - progress.exp))) +
      '</div>' +
    '</div>';
  }

  function renderProfileRecord() {
    var profileProgress = profile.progress || {};
    var completed = Array.isArray(profile.completed) ? profile.completed : [];
    var stageHonors = profileProgress.stageHonors || {};
    var bestHonor = Object.keys(stageHonors).reduce(function maxHonor(max, key) {
      return Math.max(max, Math.floor(Number(stageHonors[key]) || 0));
    }, 0);
    var highestChapter = completed.reduce(function maxChapter(max, levelId) {
      var level = getLevelById(levelId);
      return Math.max(max, Math.floor(Number(level && level.chapterIndex) || 0));
    }, 0);
    return '<div class="profile-detail-grid">' +
      renderProfileDetail("已通关关卡", String(completed.length)) +
      renderProfileDetail("最高章节", highestChapter > 0 ? "第 " + highestChapter + " 章" : "序章") +
      renderProfileDetail("最高荣誉", bestHonor ? "Tier " + bestHonor : "未记录") +
      renderProfileDetail("完美通关", String(Math.max(0, Math.floor(Number(profileProgress.perfectClearCount) || 0)))) +
      renderProfileDetail("无伤 Boss", String(Math.max(0, Math.floor(Number(profileProgress.noDamageBossClearCount) || 0)))) +
      renderProfileDetail("总出击", String(Math.max(completed.length, Math.floor(Number(profileProgress.clearCount) || 0)))) +
    '</div>';
  }

  function renderProfileDetail(label, value) {
    return '<article class="profile-detail"><span>' + escapeHtml(label) + '</span><strong>' + escapeHtml(value) + '</strong></article>';
  }

  function calculateProfilePower() {
    var loadout = shared.combatStats && shared.combatStats.generateBattleLoadout
      ? shared.combatStats.generateBattleLoadout(profile)
      : null;
    var stats = loadout ? loadout.finalStats || {} : {};
    return Math.max(0, Math.round((stats.attack || 0) * 10 + (stats.maxHp || 0) * 2 + ((stats.armorPenetration || 0) * 100) * 18));
  }

  function setupLobbyChatTicker() {
    if (!dom.worldChatButton) return;
    var messages = shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.CHAT_PREVIEW_MESSAGES || [
      "[世界] 王牌飞行员：欢迎加入飞行战队！"
    ];
    var index = 0;
    dom.worldChatButton.textContent = messages[index];
    if (messages.length < 2) return;
    root.setInterval(function rotateLobbyChat() {
      index = (index + 1) % messages.length;
      dom.worldChatButton.textContent = messages[index];
    }, 4200);
  }

  function openFeaturePanel(key) {
    if (key === "profile") {
      renderProfilePanel();
      return;
    }
    if (key === "pilotGallery" && shared.pilotGalleryView) {
      renderPilotGalleryPanel();
      return;
    }
    if (key === "shipGallery" && shared.shipGalleryView) {
      renderShipGalleryPanel();
      return;
    }
    if (key === "upgrade") {
      renderFighterUpgradePanel();
      return;
    }
    if (key === "enemyCodex") {
      renderEnemyCodexPanel();
      return;
    }
    if (shared.starWingsGachaView && shared.starWingsGachaView.renderPanel) {
      if (shared.starWingsGachaView.renderPanel(key, dom, {
        profile: profile,
        assets: assetsConfig.UI_A_HUD_ASSETS || {}
      })) {
        openFeaturePanelShell(key === "starWingsGacha" ? "star-wings-gacha-panel" : "contact-panel");
        return;
      }
    }
    if (shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.renderPanel) {
      if (shared.mainFeaturePanelsView.renderPanel(key, dom, {
        profile: profile,
        levels: levels,
        combatPower: calculateProfilePower(),
        audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
      })) {
        openFeaturePanelShell("main-feature-panel");
        return;
      }
    }
    setFeaturePanelMode("");
    var panel = featurePanels[key] || ["SYSTEM", "功能界面", "该入口为本地预览或展示态。"];
    dom.featurePanelKicker.textContent = panel[0];
    dom.featurePanelTitle.textContent = panel[1];
    dom.featurePanelBody.textContent = panel[2];
    dom.featurePanelSlots.innerHTML = "";
    dom.featurePanelSlots.className = "feature-slots";
    ["素材", "规则", "奖励"].forEach(function slot(label) {
      var item = document.createElement("div");
      item.className = "feature-slot";
      item.textContent = label;
      dom.featurePanelSlots.appendChild(item);
    });
    openFeaturePanelShell("");
  }

  function renderEnemyCodexPanel() {
    var enemies = assetsConfig.ENEMY_CODEX || [];
    var bullets = assetsConfig.ENEMY_BULLET_CODEX || {};
    dom.featurePanelKicker.textContent = "COMBAT CODEX";
    dom.featurePanelTitle.textContent = "敌机与敌弹图鉴";
    dom.featurePanelBody.textContent = "查看当前战斗会出现的敌机、进攻方式和对应敌弹。";
    dom.featurePanelSlots.className = "enemy-codex-grid";
    var html = '<section class="enemy-codex-section"><h3>敌机</h3><div class="enemy-codex-list">';
    for (var i = 0; i < enemies.length; i++) {
      var enemy = enemies[i];
      html += '<article class="enemy-codex-card">' +
        '<img src="' + escapeAttr(enemy.src || "") + '" alt="">' +
        '<div><strong>' + escapeHtml(enemy.name || enemy.id) + '</strong>' +
        '<span>首次出现：' + formatCodexChapter(enemy.firstChapter) + '</span>' +
        '<p>' + escapeHtml(enemy.attack || "") + '</p>' +
        '<em>' + escapeHtml(enemy.danger || "") + '</em></div>' +
      '</article>';
    }
    html += '</div></section><section class="enemy-codex-section"><h3>敌弹</h3><div class="enemy-bullet-codex">';
    Object.keys(bullets).forEach(function renderBullet(key) {
      var bullet = bullets[key];
      html += '<article class="enemy-bullet-card">' +
        '<img src="' + escapeAttr(bullet.src || "") + '" alt="">' +
        '<strong>' + escapeHtml(bullet.name || bullet.id) + '</strong>' +
        '<span>' + formatCodexChapter(bullet.firstChapter) + '</span>' +
        '<p>' + escapeHtml(bullet.danger || "") + '</p>' +
      '</article>';
    });
    html += '</div></section>';
    dom.featurePanelSlots.innerHTML = html;
    openFeaturePanelShell("");
  }

  function formatCodexChapter(value) {
    var chapter = Math.max(0, Math.floor(Number(value) || 0));
    return chapter <= 0 ? "序章" : "第 " + chapter + " 章";
  }

  function handleAvatarUpload(event) {
    var file = event.target.files && event.target.files[0];
    if (!file || !file.type || file.type.indexOf("image/") !== 0) return;
    var reader = new FileReader();
    reader.addEventListener("load", function loaded() {
      resizeAvatarDataUrl(String(reader.result || ""), function resized(dataUrl) {
        profile.player = profile.player || {};
        profile.player.avatar = dataUrl || assetsConfig.DEFAULT_AVATAR;
        saveProfile();
        renderLobby();
        renderProfilePanel();
      });
    });
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function resizeAvatarDataUrl(source, done) {
    if (!source) {
      done("");
      return;
    }
    var image = new Image();
    image.addEventListener("load", function onLoad() {
      var size = 512;
      var canvasEl = document.createElement("canvas");
      var context = canvasEl.getContext("2d");
      var side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
      var sx = Math.max(0, ((image.naturalWidth || image.width) - side) / 2);
      var sy = Math.max(0, ((image.naturalHeight || image.height) - side) / 2);
      canvasEl.width = size;
      canvasEl.height = size;
      context.drawImage(image, sx, sy, side, side, 0, 0, size, size);
      done(canvasEl.toDataURL("image/jpeg", 0.86));
    });
    image.addEventListener("error", function onError() {
      done(source);
    });
    image.src = source;
  }

  function handleProfilePanelClick(event) {
    var tab = event.target && event.target.closest ? event.target.closest("[data-profile-tab]") : null;
    if (tab) {
      profilePanelTab = tab.dataset.profileTab || "info";
      renderProfilePanel();
      return;
    }
    var action = event.target && event.target.closest ? event.target.closest("[data-profile-action]") : null;
    if (!action) return;
    var type = action.dataset.profileAction;
    if (type === "upload-avatar" && dom.avatarUpload) {
      dom.avatarUpload.click();
    }
    if (type === "reset-avatar") {
      profile.player = profile.player || {};
      profile.player.avatar = assetsConfig.DEFAULT_AVATAR || "";
      saveProfile();
      renderLobby();
      renderProfilePanel();
    }
    if (type === "save-name") {
      var input = document.querySelector("#profileNameInput");
      var nextName = String(input && input.value ? input.value : "").trim().slice(0, 12);
      profile.player = profile.player || {};
      profile.player.name = nextName || "王牌飞行员";
      saveProfile();
      renderLobby();
      renderProfilePanel();
    }
    if (type === "close") {
      closeFeaturePanel();
    }
  }

  function setFeaturePanelMode(modeClass) {
    if (!dom.featurePanel) return;
    for (var i = 0; i < FEATURE_PANEL_MODE_CLASSES.length; i++) {
      dom.featurePanel.classList.remove(FEATURE_PANEL_MODE_CLASSES[i]);
    }
    if (modeClass) dom.featurePanel.classList.add(modeClass);
  }

  function openFeaturePanelShell(modeClass) {
    setFeaturePanelMode(modeClass);
    if (dom.lobbyScreen) dom.lobbyScreen.classList.add("panel-open");
    if (dom.featurePanel) dom.featurePanel.classList.remove("hidden");
  }

  function closeFeaturePanel() {
    if (dom.featurePanel) dom.featurePanel.classList.add("hidden");
    if (dom.lobbyScreen) dom.lobbyScreen.classList.remove("panel-open");
  }

  function bindEvents() {
    root.addEventListener("pointerdown", unlockAudio, { once: true });
    root.addEventListener("click", unlockAudio, { once: true });
    root.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    root.addEventListener("keydown", unlockAudio, { once: true });
    document.addEventListener("click", function onAnyUiClick(event) {
      if (event.target && event.target.closest && event.target.closest("button")) playSfx("button");
    });
    dom.startButton.addEventListener("click", function onStart() {
      if (state.mode === "paused") resumeGame();
      else startSelectedLevel();
    });
    dom.battleEntryButton.addEventListener("click", openBattleSelect);
    if (dom.pauseButton) {
      dom.pauseButton.addEventListener("click", function onPause() {
        if (state.mode === "paused") resumeGame();
        else pauseGame();
      });
    }
    if (dom.activeSkillButton) {
      dom.activeSkillButton.addEventListener("click", function onActiveSkillClick() {
        tryCastActiveSkill();
      });
    }
    if (dom.shopButton) {
      dom.shopButton.addEventListener("click", function onShop() {
        if (battleContext) cancelAnimationFrame(battleContext.animationId);
        state.mode = "shop";
        renderShop();
        showShop();
      });
    }
    dom.replayButton.addEventListener("click", startSelectedLevel);
    dom.backToChapterButton.addEventListener("click", openBattleSelect);
    dom.nextLevelButton.addEventListener("click", function onNext() {
      if (lastBattleResult && !lastBattleResult.isWin) {
        startSelectedLevel();
        return;
      }
      selectedLevel = clamp(selectedLevel + 1, 1, levels.length);
      openBattleSelect();
    });
    dom.upgradeList.addEventListener("click", function onSettlementChest(event) {
      var reportAction = event.target && event.target.closest ? event.target.closest("[data-settlement-action]") : null;
      if (reportAction) {
        var action = reportAction.dataset ? reportAction.dataset.settlementAction : "";
        if (action === "next") dom.nextLevelButton.click();
        if (action === "replay") dom.replayButton.click();
        if (action === "chapter") dom.backToChapterButton.click();
        return;
      }
      var victoryChest = event.target && event.target.closest ? event.target.closest("[data-open-victory-chest]") : null;
      if (victoryChest && lastBattleResult) {
        renderSettlementChest(lastBattleResult);
        return;
      }
      var target = event.target && event.target.closest ? event.target.closest("[data-open-settlement]") : null;
      if (target && lastBattleResult) {
        playSfx("chest");
        renderSettlement(lastBattleResult);
      }
    });
    dom.chapterSelect.addEventListener("click", function onPauseAction(event) {
      var action = event.target && event.target.dataset ? event.target.dataset.pauseAction : "";
      if (!action) return;
      if (action === "resume") resumeGame();
      if (action === "chapter") abortBattle("chapter");
      if (action === "lobby") abortBattle("lobby");
    });
    dom.closeFeaturePanel.addEventListener("click", function close() {
      closeFeaturePanel();
    });
    dom.featurePanel.addEventListener("click", function onFighterUpgradeClick(event) {
      if (handleSettingPanelClick(event)) return;
      if (shared.starWingsGachaView && shared.starWingsGachaView.handleEvent && shared.starWingsGachaView.handleEvent(event, dom)) {
        playSfx("button");
        return;
      }
      var back = event.target && event.target.closest ? event.target.closest("[data-feature-back]") : null;
      if (back) {
        closeFeaturePanel();
        return;
      }
      var target = event.target && event.target.closest ? event.target.closest("[data-fighter-upgrade]") : null;
      if (!target || target.disabled) return;
      upgradeFighterStat(target.dataset.fighterUpgrade);
    });
    dom.featurePanel.addEventListener("click", function closeBackdrop(event) {
      handleProfilePanelClick(event);
      if (event.target === dom.featurePanel) closeFeaturePanel();
    });
    dom.featurePanel.addEventListener("input", handleSettingPanelInput);
    dom.featurePanel.addEventListener("change", handleSettingPanelInput);
    if (dom.avatarUpload) dom.avatarUpload.addEventListener("change", handleAvatarUpload);
    if (dom.lobbyPilotLayer) {
      dom.lobbyPilotLayer.addEventListener("click", function greet() {
        dom.lobbyGreeting.textContent = (getPilotAsset().name || "战姬") + "：指挥官，欢迎回来。";
        dom.lobbyGreeting.classList.remove("hidden");
        setTimeout(function hideGreeting() { dom.lobbyGreeting.classList.add("hidden"); }, 1600);
      });
    }

    Array.prototype.forEach.call(document.querySelectorAll(".lobby-action"), function bind(button) {
      button.addEventListener("click", function openPanel() {
        openFeaturePanel(button.dataset.panel);
      });
    });

    root.addEventListener("keydown", function onKeyDown(event) {
      var gameKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space"].indexOf(event.code) >= 0;
      if (gameKey) event.preventDefault();
      keys.add(event.code);
      if (event.code === "Space" && event.repeat) return;
      if (event.code === "Space" && state.mode === "fight" && shared.weaponSystem) {
        if (!tryCastActiveSkill()) shared.weaponSystem.shoot(state, currentLoadout, state.bullets);
      }
      if (event.code === "KeyP") {
        if (state.mode === "paused") resumeGame();
        else pauseGame();
      }
    });

    root.addEventListener("keyup", function onKeyUp(event) {
      keys.delete(event.code);
    });
    root.addEventListener("resize", requestLobbyCompositionSync);

    canvas.addEventListener("pointerdown", function onPointerDown(event) {
      pointer.active = true;
      updatePointer(event);
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", function onPointerMove(event) {
      if (pointer.active) updatePointer(event);
    });
    canvas.addEventListener("pointerup", function onPointerUp(event) {
      pointer.active = false;
      canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointercancel", function onPointerCancel() {
      pointer.active = false;
    });
  }

  function tryCastActiveSkill() {
    if (!state || state.mode !== "fight" || !shared.weaponSystem || !shared.weaponSystem.tryCastActiveSkill) return false;
    var casted = shared.weaponSystem.tryCastActiveSkill(state, currentLoadout);
    if (casted) {
      playSfx("skill");
      updateHud();
      drawScene();
    }
    return casted;
  }

  function unlockAudio() {
    if (!audioSystem || !audioSystem.unlock) return;
    audioSystem.unlock();
    if (state && state.mode === "fight") audioSystem.playBgm("battle");
    else audioSystem.playBgm("lobby");
  }

  function playSfx(id) {
    if (audioSystem && audioSystem.playSfx) audioSystem.playSfx(id);
  }

  function refreshSettingPanel() {
    if (!dom.featurePanel || dom.featurePanel.classList.contains("hidden")) return;
    if (!dom.featurePanelTitle || dom.featurePanelTitle.textContent !== "设置") return;
    if (!shared.mainFeaturePanelsView || !shared.mainFeaturePanelsView.renderPanel) return;
    shared.mainFeaturePanelsView.renderPanel("setting", dom, {
      profile: profile,
      levels: levels,
      combatPower: calculateProfilePower(),
      audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
    });
  }

  function handleSettingPanelClick(event) {
    if (!audioSystem) return false;
    var toggle = event.target && event.target.closest ? event.target.closest("[data-audio-toggle]") : null;
    if (toggle) {
      unlockAudio();
      if (toggle.dataset.audioToggle === "music" && audioSystem.setMusicMuted) {
        var musicMuted = audioSystem.getSettings && audioSystem.getSettings().musicMuted;
        audioSystem.setMusicMuted(!musicMuted);
      }
      if (toggle.dataset.audioToggle === "sfx" && audioSystem.setSfxMuted) {
        var sfxMuted = audioSystem.getSettings && audioSystem.getSettings().sfxMuted;
        audioSystem.setSfxMuted(!sfxMuted);
      }
      refreshSettingPanel();
      return true;
    }
    var action = event.target && event.target.closest ? event.target.closest("[data-setting-action]") : null;
    if (action && action.dataset.settingAction === "restart-bgm" && audioSystem.restartBgm) {
      unlockAudio();
      audioSystem.restartBgm();
      refreshSettingPanel();
      return true;
    }
    return false;
  }

  function handleSettingPanelInput(event) {
    if (!audioSystem) return;
    var input = event.target && event.target.closest ? event.target.closest("[data-audio-volume]") : null;
    if (!input) return;
    var value = Math.max(0, Math.min(1, Number(input.value || 0) / 100));
    unlockAudio();
    if (input.dataset.audioVolume === "music" && audioSystem.setMusicVolume) {
      audioSystem.setMusicVolume(value);
    }
    if (input.dataset.audioVolume === "sfx" && audioSystem.setSfxVolume) {
      audioSystem.setSfxVolume(value);
    }
    var row = input.closest(".settings-control-row");
    if (row) {
      var text = row.querySelector("p");
      if (text) text.textContent = "当前 " + Math.round(value * 100) + "%，拖动后即时生效。";
    }
  }

  function updatePointer(event) {
    var rect = canvas.getBoundingClientRect();
    pointer.x = clamp(((event.clientX - rect.left) / rect.width) * WIDTH, BATTLE_SAFE_LEFT, WIDTH - 38);
    pointer.y = clamp(((event.clientY - rect.top) / rect.height) * HEIGHT, 42, HEIGHT - 42);
  }

  function createStars() {
    var stars = [];
    for (var i = 0; i < 110; i += 1) {
      stars.push({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        size: Math.random() * 1.8 + 0.5,
        speed: Math.random() * 120 + 70
      });
    }
    return stars;
  }

  function formatResource(value) {
    var number = Number(value) || 0;
    if (number >= 1000000) return (number / 1000000).toFixed(1) + "M";
    if (number >= 10000) return (number / 1000).toFixed(1) + "K";
    return String(Math.floor(number));
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, Number(value) || min));
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
