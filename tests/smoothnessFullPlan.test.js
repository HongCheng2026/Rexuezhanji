"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadFresh(file) {
  const target = path.join(root, file);
  delete require.cache[require.resolve(target)];
  return require(target);
}

test("画质设置默认自动，三个档位输出约定倍率与性能预算", () => {
  const previous = global.RXGame;
  global.RXGame = {};
  const quality = loadFresh("src/h5/Presentation/Graphics/visualQualitySystem.js");
  const values = new Map();
  const storage = {
    getItem(key) { return values.get(key) || null; },
    setItem(key, value) { values.set(key, value); }
  };

  const normal = quality.create({ storage, navigator: { deviceMemory: 8, hardwareConcurrency: 8 } });
  assert.deepEqual(normal.getEffectiveProfile(), {
    mode: "auto", effectiveMode: "auto", deviceTier: "normal", renderScale: 1.25,
    glowBulletBudget: 140, highDensityBulletBudget: 320,
    hardBulletBudget: 700, hardFxStride: 3, particleStride: 1
  });

  const low = quality.create({ storage: { getItem() { return null; }, setItem() {} }, navigator: { deviceMemory: 4, hardwareConcurrency: 8 } });
  assert.equal(low.getEffectiveProfile().effectiveMode, "smooth");
  assert.equal(low.getEffectiveProfile().renderScale, 1);
  assert.equal(low.getEffectiveProfile().glowBulletBudget, 80);
  assert.equal(low.getEffectiveProfile().highDensityBulletBudget, 220);
  assert.equal(low.getEffectiveProfile().particleStride, 2);

  normal.setMode("quality");
  assert.equal(values.get(quality.STORAGE_KEY), "quality");
  assert.equal(normal.getEffectiveProfile().glowBulletBudget, 180);
  assert.equal(normal.getEffectiveProfile().highDensityBulletBudget, 400);
  assert.equal(normal.getEffectiveProfile().renderScale, 1.25);

  normal.setMode("smooth");
  assert.equal(normal.getEffectiveProfile().renderScale, 1);
  assert.equal(normal.getEffectiveProfile().hardBulletBudget, 700);
  assert.equal(normal.getEffectiveProfile().hardFxStride, 3);
  global.RXGame = previous;
});

test("帧节奏监测器忽略暂停间隔并记录高密度与700发保护", () => {
  const previous = global.RXGame;
  global.RXGame = {};
  const monitorApi = loadFresh("src/h5/Presentation/Graphics/framePacingMonitor.js");
  const monitor = monitorApi.create({ capacity: 120 });
  monitor.start({ mode: "smooth", effectiveMode: "smooth", renderScale: 1, highDensityBulletBudget: 220, hardBulletBudget: 700 });
  const state = { bullets: new Array(40), enemyBullets: new Array(680) };
  for (let i = 0; i <= 70; i += 1) monitor.record(i * 16, state);
  monitor.suspend();
  monitor.record(9000, state);
  monitor.record(9016, state);
  const snapshot = monitor.stop();
  assert.equal(snapshot.sampleReady, true);
  assert.equal(snapshot.fps, 62.5);
  assert.equal(snapshot.p95FrameMs, 16);
  assert.equal(snapshot.maxBullets, 720);
  assert.ok(snapshot.highDensityFrames >= 72);
  assert.ok(snapshot.hardProtectionFrames >= 72);
  assert.equal(snapshot.active, false);
  global.RXGame = previous;
});

test("渲染器接受运行时预算，700 发起统一使用硬保护", () => {
  const previous = global.RXGame;
  global.RXGame = {};
  const api = loadFresh("src/h5/Gameplay/Combat/canvasRenderer.js");
  const renderer = api.create({ ctx: {}, width: 960, height: 473, assetsConfig: {}, levelsConfig: {} });
  assert.deepEqual(renderer.setQualityProfile({
    glowBulletBudget: 80,
    highDensityBulletBudget: 220,
    hardBulletBudget: 700,
    hardFxStride: 3,
    particleStride: 2
  }), {
    glowBulletBudget: 80,
    highDensityBulletBudget: 220,
    hardBulletBudget: 700,
    hardFxStride: 3,
    particleStride: 2
  });
  assert.match(read("src/h5/Gameplay/Combat/canvasRenderer.js"), /totalBulletCount\s*>=\s*HARD_BULLET_BUDGET\s*\?\s*HARD_FX_STRIDE/);
  global.RXGame = previous;
});

function createClassList() {
  const values = new Set();
  return {
    add(...names) { names.forEach((name) => values.add(name)); },
    remove(...names) { names.forEach((name) => values.delete(name)); },
    contains(name) { return values.has(name); }
  };
}

function createNode() {
  return {
    className: "",
    classList: createClassList(),
    style: { display: "", setProperty() {} },
    dataset: {},
    disabled: false,
    textContent: "",
    innerHTML: "",
    children: [],
    appendChild(child) { this.children.push(child); return child; }
  };
}

function createSettlementHarness() {
  const previousDocument = global.document;
  global.document = { createElement: createNode };
  const previousGame = global.RXGame;
  global.RXGame = {};
  const api = loadFresh("src/h5/World/Result/settlementController.js");
  const dom = {
    shopScreen: createNode(), shopMessageEl: createNode(), shopCoinsEl: createNode(),
    upgradeList: createNode(), nextLevelButton: createNode(), replayButton: createNode(), backToChapterButton: createNode()
  };
  const controller = api.create({ dom, assetsConfig: {}, getPilotAsset() { return {}; } });
  return {
    controller,
    dom,
    restore() { global.document = previousDocument; global.RXGame = previousGame; }
  };
}

test("结算 pending/error 不显示本地预估奖励且锁定操作，ready 才显示权威值", () => {
  for (const state of ["pending", "error"]) {
    const harness = createSettlementHarness();
    harness.controller.renderSettlement({ isWin: false, syncState: state, coinsEarned: 999, expEarned: 888, rating: {} });
    const grid = harness.dom.upgradeList.children[0].children[0];
    const rewards = grid.children.map((node) => node.innerHTML).join(" ");
    const actions = harness.dom.upgradeList.children[0].children[1].children;
    assert.doesNotMatch(rewards, /\+999|\+888/);
    assert.ok(actions.every((button) => button.disabled));
    assert.equal(harness.dom.nextLevelButton.disabled, true);
    harness.restore();
  }

  const ready = createSettlementHarness();
  ready.controller.renderSettlement({ isWin: true, syncState: "ready", coinsEarned: 17, expEarned: 23, rating: {} });
  const grid = ready.dom.upgradeList.children[0].children[0];
  const rewards = grid.children.map((node) => node.innerHTML).join(" ");
  assert.match(rewards, /\+17/);
  assert.match(rewards, /\+23/);
  assert.equal(ready.dom.nextLevelButton.disabled, false);
  ready.restore();
});

test("胜利结算压缩为战报到最终奖励，重试会恢复 pending 并清除失败预估", () => {
  const controller = read("src/h5/World/Result/settlementController.js");
  const flow = read("src/h5/Game/Core/battleFlowController.js");
  assert.doesNotMatch(controller, /战利品回收完成/);
  assert.match(controller, /function renderSettlementChest[\s\S]*?renderSettlement\(result\)/);
  assert.match(flow, /settlement\.result\.syncState\s*=\s*"pending"/);
  assert.match(flow, /settlement\.result\.coinsEarned\s*=\s*0/);
  assert.match(flow, /settlement\.result\.expEarned\s*=\s*0/);
});

test("剧情关战斗结束先显示战报，战后剧情由最终奖励页单独触发", () => {
  const previousGame = global.RXGame;
  const previousRaf = global.cancelAnimationFrame;
  global.cancelAnimationFrame = () => {};
  let profile = { player: { uid: "settlement-test" }, storyProgress: {} };
  let storyOpenCount = 0;
  let introCount = 0;
  let refreshCount = 0;
  const state = { mode: "settling" };
  global.RXGame = {};
  const api = loadFresh("src/h5/Game/Core/battleFlowController.js");
  const flow = api.create({
    shared: {
      battleGeometry: { getField() { return { width: 960, height: 473, playerLeft: 80 }; } },
      campaignStoryFramework: {
        getNextUnseenStoryScene() { return { sceneId: "post-1", onceKey: "post-1" }; },
        getNextUnseenEpilogueScene() { return null; },
        markStorySceneSeen(nextProfile) { return nextProfile; }
      },
      campaignStoryPlayerView: { openStoryScene() { storyOpenCount += 1; } }
    },
    dom: {},
    lobbyController: { showShop() {} },
    settlementController: {
      renderVictoryIntro() { introCount += 1; }, renderSettlement() {}, refresh() { refreshCount += 1; }
    },
    getProfile() { return profile; }, setProfile(value) { profile = value; },
    getState() { return state; }, setState() {},
    getBattleContext() { return null; }, setBattleContext() {},
    getBattleSession() { return null; }, setBattleSession() {},
    getCurrentLoadout() { return null; }, setCurrentLoadout() {},
    getSelectedLevel() { return 1; }, getPendingSettlement() { return null; }, setPendingSettlement() {},
    getFinished() { return true; }, setFinished() {}, getGameGateway() { return { isCloud: false }; },
    ensureGameGateway() { return Promise.resolve(); }, applyGatewayProfile() {}, saveProfile() {},
    getLevelById() { return { id: 1 }; }, createMenuState() { return {}; }, createLevelProgressSnapshot() { return {}; },
    updateHud() {}, drawScene() {}, playSfx() {}
  });
  const result = { isWin: true, syncState: "ready", rating: {} };
  flow.presentSettlement(true, { id: 1, chapterIndex: 1, stageInChapter: 1 }, result);
  assert.equal(introCount, 1);
  assert.equal(storyOpenCount, 0);
  assert.equal(result.hasPostBattleStory, true);
  assert.equal(flow.playPostSettlementStory(), true);
  assert.equal(storyOpenCount, 1);
  assert.equal(refreshCount, 1);
  global.RXGame = previousGame;
  global.cancelAnimationFrame = previousRaf;
});

test("设置页音频、画面和性能三个分类均可切换", () => {
  const previous = global.RXGame;
  global.RXGame = {};
  loadFresh("src/h5/UI/FeaturePanels/mainFeaturePanelsView.js");
  const view = global.RXGame.mainFeaturePanelsView;
  const dom = {
    featurePanelKicker: createNode(), featurePanelTitle: createNode(), featurePanelBody: createNode(), featurePanelSlots: createNode()
  };
  const options = {
    audioSettings: {},
    visualSettings: { mode: "auto", effectiveMode: "auto", renderScale: 1.25, glowBulletBudget: 140, highDensityBulletBudget: 320, hardBulletBudget: 700, hardFxStride: 3, particleStride: 1 },
    framePacing: { sampleReady: true, frames: 120, fps: 58.8, p95FrameMs: 18.4, maxBullets: 720, hardProtectionFrames: 18 }
  };
  view.renderPanel("setting", dom, options);
  assert.match(dom.featurePanelSlots.innerHTML, /data-feature-tab-index="0" class="active">音频<\/button>/);
  assert.doesNotMatch(dom.featurePanelSlots.innerHTML, /data-feature-tab-index="[012]"[^>]*disabled/);
  function switchTab(index) {
    view.handleEvent({ target: { closest(selector) { return selector === "[data-feature-tab]" ? { dataset: { featurePanel: "setting", featureTabIndex: String(index) } } : null; } } }, dom, options);
  }
  switchTab(1);
  assert.match(dom.featurePanelSlots.innerHTML, /弹幕特效预算/);
  switchTab(2);
  assert.match(dom.featurePanelSlots.innerHTML, /58\.8 FPS/);
  assert.match(dom.featurePanelSlots.innerHTML, /P95 帧间隔/);
  global.RXGame = previous;
});

test("商店确认仍保留，成功改为 1.5 秒非模态提示且兑换接口完整导出", () => {
  const shop = loadFresh("src/h5/UI/Shop/ShopView.js");
  const source = read("src/h5/UI/Shop/ShopView.js");
  const room = read("src/h5/UI/Shop/ShopRoom.js");
  assert.equal(typeof shop.openExchangeDialog, "function");
  assert.equal(typeof shop.setExchangeDialogPending, "function");
  assert.equal(typeof shop.setExchangeDialogError, "function");
  assert.equal(typeof shop.showExchangeResult, "function");
  assert.match(room, /dataset\.shopConfirmed\s*===\s*"true"/);
  assert.match(source, /className\s*=\s*"shop-purchase-toast"/);
  assert.match(source, /},\s*1500\)/);
  assert.doesNotMatch(source.slice(source.indexOf("function showPurchaseResult"), source.indexOf("function showShopToast")), /data-shop-result-close|收下/);
});

test("抽卡按钮显示实际补券成本，跳过仅操作结果层动画", () => {
  const previous = global.RXGame;
  global.RXGame = {};
  const config = loadFresh("src/h5/UI/Gacha/gachaConfig.js");
  const view = loadFresh("src/h5/UI/Gacha/gachaView.js");
  const mount = { innerHTML: "" };
  view.create({ mount, config, uiAssets: { rewardIcons: {} } }).render({
    state: { target: "pilot", pity: 100, history: [] }, tickets: 0, diamonds: 2000,
    targets: { pilot: { name: "P", codeName: "P", src: "" }, ship: { name: "S", codeName: "S", src: "" } },
    results: [], lastDrawCount: 1, pendingTopUp: null, message: "", isError: false
  });
  assert.match(mount.innerHTML, /缺1券 · 可用120钻补足/);
  assert.match(mount.innerHTML, /缺9券 · 可用1,080钻补足/);
  const room = read("src/h5/UI/Gacha/gachaRoom.js");
  assert.match(room, /function skipReveal[\s\S]*?classList\.add\("is-skipped"\)/);
  assert.doesNotMatch(room.slice(room.indexOf("function skipReveal"), room.indexOf("function open")), /draw\(|commit|pity|history/);
  global.RXGame = previous;
});

test("首战提示按 UID 记忆，空槽说明和暂停操作说明长期存在", () => {
  const view = read("src/h5/UI/HUD/battleUiView.js");
  const pause = read("src/h5/UI/PauseMenu/battlePauseView.js");
  const flow = read("src/h5/Game/Core/battleFlowController.js");
  assert.match(view, /rx_battle_controls_seen_v1:/);
  assert.match(view, /setTimeout\(function autoHideControlHint[\s\S]*?3000\)/);
  assert.match(view, /空技能槽｜可在战机强化中配置/);
  assert.match(pause, /操作说明/);
  assert.match(flow, /clearCount[\s\S]*?showBattleControlHint/);
});

test("掉落物减弱、中央提示限三条且同类武器升级提示合并", () => {
  const renderer = read("src/h5/Gameplay/Combat/canvasRenderer.js");
  const drops = read("src/h5/Gameplay/Combat/dropSystem.js");
  const collision = read("src/h5/Gameplay/Combat/collisionSystem.js");
  assert.match(renderer, /centralSkip\s*=\s*Math\.max\(0,\s*centralTotal\s*-\s*3\)/);
  assert.match(renderer, /item\.radius\s*\*\s*1\.36/);
  assert.match(renderer, /highDensityMode\s*\?\s*3\s*:\s*10/);
  assert.match(drops, /weapon-upgrade:/);
  assert.match(drops, /state\.notices\[i\]\.text\s*=\s*text/);
  assert.match(collision, /weapon-upgrade:/);
});

test("窄视口全屏入口缩为 44px 图标按钮并保留可访问名称", () => {
  const css = read("src/h5/Shell/viewport.css");
  const html = read("src/h5/Shell/index.html");
  const lobbyCss = read("src/h5/UI/Lobby/lobby.css");
  assert.match(css, /@media \(max-width:\s*1360px\),\s*\(max-height:\s*760px\)/);
  assert.match(css, /\.viewport-fullscreen\s*\{[\s\S]*?min-width:\s*44px;[\s\S]*?width:\s*44px;/);
  assert.match(css, /#fullscreenLabel[\s\S]*?display:\s*none/);
  assert.match(css, /\.viewport-orientation-hint,[\s\S]*?left:\s*50vw;[\s\S]*?position:\s*fixed;/);
  assert.match(html, /id="fullscreenToggle"[^>]*aria-label=/);
  const quickNavRule = lobbyCss.match(/\.lobby-screen \.quick-nav\s*\{([^}]*)\}/);
  assert.ok(quickNavRule);
  assert.match(quickNavRule[1], /left:\s*1216px/);
  assert.match(quickNavRule[1], /width:\s*242px/);
  assert.match(lobbyCss, /\.quick-nav > \.hud-skin-wide\s*\{[^}]*position:\s*absolute/);
});

test("购买与强化成功提示按真实档案计算战力增幅，零变化不显示", () => {
  for (const file of [
    "src/h5/UI/Fighter/fighterRoom.js",
    "src/h5/UI/Pilot/pilotRoom.js",
    "src/h5/UI/Fighter/Upgrade/fighterUpgradeRoom.js"
  ]) {
    const source = read(file);
    assert.match(source, /var powerBefore = readTotalPower\(\)/);
    assert.match(source, /if \(!delta\) return ""/);
    assert.match(source, /战力 " \+ before\.toLocaleString/);
  }
});
