const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const roomModule = require(path.join(root, "src/h5/endless/endlessModeRoomController.js"));

function makeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add(...names) { names.forEach((name) => values.add(name)); },
    remove(...names) { names.forEach((name) => values.delete(name)); },
    contains(name) { return values.has(name); }
  };
}

function makeNode(initialClasses = []) {
  return {
    classList: makeClassList(initialClasses),
    innerHTML: "",
    model: null,
    addEventListener() {}
  };
}

function createHarness({ failFirstSave = false } = {}) {
  const campaignState = { mode: "menu", selectedLevel: 17 };
  const campaignContext = { id: "campaign-context" };
  const campaignSession = { id: "campaign-session" };
  const campaignInput = { keys: new Set(["KeyA"]), pointer: { active: true } };
  const endlessScreen = makeNode(["hidden"]);
  const settlementRoot = makeNode(["hidden"]);
  const lobbyScreen = makeNode([]);
  const campaignScreen = makeNode(["hidden"]);
  const featurePanel = makeNode([]);
  let saveAttempts = 0;
  let openedActivity = 0;
  const gateway = {
    startEndless: async () => ({ ticket: "endless-ticket", record: { bestKills: 1, bestSurvivalSeconds: 10 } }),
    finishEndless: async () => {
      saveAttempts += 1;
      if (failFirstSave && saveAttempts === 1) throw new Error("网络中断");
      return { record: { bestKills: 2, bestSurvivalSeconds: 42 } };
    }
  };
  const endlessState = {
    mode: "fight",
    elapsed: 0,
    player: { hp: 100, maxHp: 100, lives: 1 },
    endless: null,
    killStats: { total: 0, boss: 0 },
    damageTaken: 0,
    damageTakenAmount: 0,
    hudDirty: false
  };
  const shared = {
    battleInput: {
      getCode(event) { return event && event.code || ""; },
      getActiveSlotIndex() { return -1; }
    },
    battleGeometry: { getField: () => ({ width: 1600, height: 720, playerLeft: 80, playerRight: 80, playerTop: 40, playerBottom: 40 }) },
    battleUiController: { create: () => ({ render() {} }) },
    endlessModeDirector: {
      start(state) { state.battleMode = "endless"; state.endless = { kills: 0, round: 1 }; },
      beforeUpdate() {},
      afterCollisions() {}
    },
    battleRuntime: {
      startLevelBattle(_level, _profile, _gateway, callbacks) {
        callbacks.onBattleStart(endlessState);
        return { state: endlessState, loadout: { id: "endless-loadout" }, callbacks, animationId: 0, lastTime: 0 };
      },
      loop() {},
      resumeBattle() {}
    },
    endlessModeSettlementView: {
      render(node, model) { node.model = { ...model }; node.classList.remove("hidden"); }
    }
  };
  const profile = { endlessRecord: { bestKills: 1, bestSurvivalSeconds: 10 } };
  const controller = roomModule.create({
    shared,
    dom: {
      endlessBattleScreen: endlessScreen,
      endlessBattleUiRoot: makeNode(),
      endlessSettlementRoot: settlementRoot,
      lobbyScreen,
      battleScreen: campaignScreen,
      featurePanel
    },
    uiHandle: { canvas: null, render() {} },
    renderer: { drawScene() {} },
    getProfile: () => profile,
    getGameGateway: () => gateway,
    ensureGameGateway: async () => gateway,
    saveProfile() {},
    clearCampaignInput() { campaignInput.keys.clear(); campaignInput.pointer.active = false; },
    openActivityPanel() { openedActivity += 1; }
  });
  return {
    controller,
    shared,
    profile,
    gateway,
    endlessState,
    settlementRoot,
    endlessScreen,
    lobbyScreen,
    campaignState,
    campaignContext,
    campaignSession,
    campaignInput,
    getSaveAttempts: () => saveAttempts,
    getOpenedActivity: () => openedActivity
  };
}

test("无尽房间拥有独立状态、会话、输入、渲染器和结算根节点", async () => {
  const previousRaf = global.requestAnimationFrame;
  const previousCancel = global.cancelAnimationFrame;
  global.requestAnimationFrame = () => 71;
  global.cancelAnimationFrame = () => {};
  try {
    const harness = createHarness();
    await harness.controller.start();
    const snapshot = harness.controller.getSnapshot();
    assert.equal(snapshot.state.battleMode, "endless");
    assert.notEqual(snapshot.state, harness.campaignState);
    assert.notEqual(snapshot.battleContext, harness.campaignContext);
    assert.notEqual(snapshot.battleSession, harness.campaignSession);
    assert.notEqual(snapshot.inputState, harness.campaignInput);
    assert.equal(snapshot.renderer != null, true);
    assert.equal(harness.campaignState.selectedLevel, 17);
    assert.equal(harness.endlessScreen.classList.contains("hidden"), false);
  } finally {
    global.requestAnimationFrame = previousRaf;
    global.cancelAnimationFrame = previousCancel;
  }
});

test("战败留在无尽房间并展示专用战报，再战或返回活动不进入关卡选择", async () => {
  const previousRaf = global.requestAnimationFrame;
  const previousCancel = global.cancelAnimationFrame;
  global.requestAnimationFrame = () => 72;
  global.cancelAnimationFrame = () => {};
  try {
    const harness = createHarness();
    await harness.controller.start();
    harness.endlessState.elapsed = 42.8;
    harness.endlessState.endless = { kills: 2, round: 3 };
    harness.endlessState.killStats = { total: 9, boss: 2 };
    harness.endlessState.damageTaken = 4;
    harness.endlessState.damageTakenAmount = 126;
    await harness.controller.finish("defeat", false);
    const snapshot = harness.controller.getSnapshot();
    assert.equal(snapshot.result.bossKills, 2);
    assert.equal(snapshot.result.enemyKills, 7);
    assert.equal(snapshot.result.survivalSeconds, 42);
    assert.equal(snapshot.result.damageTaken, 126);
    assert.equal(snapshot.result.roundReached, 3);
    assert.equal(snapshot.result.syncState, "success");
    assert.equal(harness.settlementRoot.classList.contains("hidden"), false);
    assert.equal(harness.endlessScreen.classList.contains("hidden"), false);
    assert.equal(harness.controller.returnToActivity(), true);
    assert.equal(harness.getOpenedActivity(), 1);
    assert.equal(harness.lobbyScreen.classList.contains("hidden"), false);
    assert.equal(harness.campaignState.selectedLevel, 17);
  } finally {
    global.requestAnimationFrame = previousRaf;
    global.cancelAnimationFrame = previousCancel;
  }
});

test("无尽纪录保存失败时保留战报且禁止离开，重试成功后恢复操作", async () => {
  const previousRaf = global.requestAnimationFrame;
  const previousCancel = global.cancelAnimationFrame;
  global.requestAnimationFrame = () => 73;
  global.cancelAnimationFrame = () => {};
  try {
    const harness = createHarness({ failFirstSave: true });
    await harness.controller.start();
    await harness.controller.finish("defeat", false);
    assert.equal(harness.controller.getSnapshot().result.syncState, "error");
    assert.equal(harness.controller.returnToActivity(), false);
    await harness.controller.finish("defeat", true);
    assert.equal(harness.controller.getSnapshot().result.syncState, "success");
    assert.equal(harness.getSaveAttempts(), 2);
    assert.equal(harness.controller.returnToActivity(), true);
  } finally {
    global.requestAnimationFrame = previousRaf;
    global.cancelAnimationFrame = previousCancel;
  }
});
