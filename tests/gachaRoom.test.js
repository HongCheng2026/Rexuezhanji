const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const config = require("../src/h5/UI/Gacha/gachaConfig.js");
const model = require("../src/h5/UI/Gacha/gachaModel.js");
const source = fs.readFileSync(path.join(__dirname, "../src/h5/UI/Gacha/gachaRoom.js"), "utf8");

function createHarness(options = {}) {
  let factory;
  let stored = { target: options.target || "pilot", pity: options.pity || 0, totalDraws: 0, history: [] };
  let raw = JSON.stringify(stored);
  const profile = {
    resources: { gold: 0, energy: 0, maxEnergy: 100, diamonds: options.diamonds || 0, inventory: { starlink_ticket: options.tickets == null ? 1 : options.tickets } },
    owned: { pilots: [], ships: [] }
  };
  const screen = { classList: { add() {}, remove() {} } };
  const store = {
    load: () => JSON.parse(raw),
    save: (next) => { stored = JSON.parse(JSON.stringify(next)); raw = JSON.stringify(stored); return stored; },
    snapshot: () => raw,
    restore: (before) => { raw = before; }
  };
  const shared = {
    roomRegistry: { defineRoom(name, roomFactory) { assert.equal(name, "gacha"); factory = roomFactory; } },
    gachaConfig: config,
    gachaModel: model,
    gachaStateStore: { create: () => store },
    gachaView: { create: () => ({ render() {}, clear() {} }) },
    assets: {
      GACHA_UI_ASSETS: {},
      PILOT_ASSETS: [{ id: config.TARGETS.pilot.id, src: "pilot.png" }],
      SHIP_ASSETS: [{ id: config.TARGETS.ship.id, src: "ship.png" }]
    }
  };
  const context = { console, globalThis: null, RXGame: shared };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "gachaRoom.js" });
  let commits = 0;
  const gachaCapabilities = {
    getProfile: () => profile,
    isCloudMode: () => Boolean(options.cloud),
    commitProfile: (next) => {
      commits += 1;
      if (options.commitFails) throw new Error("disk full");
      Object.keys(profile).forEach((key) => delete profile[key]);
      Object.assign(profile, JSON.parse(JSON.stringify(next)));
    },
    rng: () => 0.99
  };
  if (options.cloudGateway) {
    const gateway = options.cloudGateway;
    gachaCapabilities.getGameGateway = () => gateway;
    gachaCapabilities.ensureGameGateway = () => Promise.resolve();
    gachaCapabilities.applyGatewayProfile = (next) => {
      Object.keys(profile).forEach((key) => delete profile[key]);
      Object.assign(profile, JSON.parse(JSON.stringify(next)));
    };
    gachaCapabilities.renderLobby = () => {};
  }
  const room = factory({
    dom: { gachaScreen: screen, gachaMount: {} },
    gacha: gachaCapabilities
  });
  return { room, profile, getRaw: () => raw, getCommits: () => commits };
}

test("抽卡房间拥有独立动作契约", () => {
  const harness = createHarness();
  assert.deepEqual(
    Object.keys(harness.room.actions).sort(),
    ["gacha.back", "gacha.cancelTopUp", "gacha.close", "gacha.confirmTopUp", "gacha.draw", "gacha.open", "gacha.redraw", "gacha.selectTarget", "gacha.skipReveal"].sort()
  );
});

test("云端模式无可用网关时拒绝抽取且不扣券", () => {
  const harness = createHarness({ cloud: true });
  const before = JSON.stringify(harness.profile);
  const result = harness.room.actions["gacha.draw"]({ count: 1 });
  assert.equal(result.reason, "GACHA_CLOUD_UNAVAILABLE");
  assert.equal(JSON.stringify(harness.profile), before);
  assert.equal(harness.getCommits(), 0);
});

test("云端模式经服务端抽取并落档，不依赖本地概率", () => {
  const cloudState = { target: "pilot", pity: 1, totalDraws: 1, history: [{ result: "standard", item: "gold_10000" }] };
  let drawArgs = null;
  const gateway = {
    gachaDraw: (target, count, buyMissing) => {
      drawArgs = { target: target, count: count, buyMissing: buyMissing };
      const cloudProfile = JSON.parse(JSON.stringify(harness.profile));
      cloudProfile.resources.diamonds = 1000;
      return Promise.resolve({
        ok: true,
        target: target,
        count: count,
        cost: 1,
        ticketCost: 1,
        missingTickets: 0,
        purchasedTickets: 0,
        diamondCost: 0,
        currency: "ticket",
        profile: cloudProfile,
        state: cloudState,
        results: [{ tier: "standard", label: "金币 ×10,000" }],
        summary: { legendaries: 0, elites: 0, standards: 1 }
      });
    }
  };
  const harness = createHarness({ cloud: true, cloudGateway: gateway });
  const result = harness.room.actions["gacha.draw"]({ count: 1 });
  assert.equal(typeof result.then, "function", "云端抽取应返回 Promise（跨 realm thenable）");
  return result.then(function verifyCloudApply(resolved) {
    assert.equal(resolved.ok, true);
    assert.equal(drawArgs.target, "pilot");
    assert.equal(drawArgs.count, 1);
    assert.equal(harness.getRaw(), JSON.stringify(cloudState), "gacha state 应来自服务端");
    const expectedProfile = JSON.parse(JSON.stringify(harness.profile));
    expectedProfile.resources.diamonds = 1000;
    assert.equal(JSON.stringify(harness.profile), JSON.stringify(expectedProfile), "profile 应由 applyGatewayProfile 落档");
    assert.equal(harness.getCommits(), 0, "云端模式不调用本地 commitProfile");
  });
});

test("玩家档提交失败时恢复保底快照", () => {
  const harness = createHarness({ commitFails: true, pity: 8 });
  const beforeRaw = harness.getRaw();
  const beforeProfile = JSON.stringify(harness.profile);
  const result = harness.room.actions["gacha.draw"]({ count: 1 });
  assert.equal(result.reason, "STORAGE_FAILED");
  assert.equal(harness.getRaw(), beforeRaw);
  assert.equal(JSON.stringify(harness.profile), beforeProfile);
});

test("券不足时房间先等待确认，确认后才补券与抽取", () => {
  const harness = createHarness({ diamonds: 1000, tickets: 4 });
  const pending = harness.room.actions["gacha.draw"]({ count: 10 });
  assert.equal(pending.reason, "TICKET_TOPUP_REQUIRED");
  assert.equal(harness.profile.resources.diamonds, 1000);
  assert.equal(harness.profile.resources.inventory.starlink_ticket, 4);
  assert.equal(harness.getCommits(), 0);
  const result = harness.room.actions["gacha.confirmTopUp"]();
  assert.equal(result.ok, true);
  assert.equal(harness.profile.resources.diamonds, 400);
  assert.equal(harness.profile.resources.inventory.starlink_ticket, 0);
  assert.equal(harness.getCommits(), 1);
});
