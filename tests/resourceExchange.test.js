const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const model = require("../src/h5/UI/Lobby/ResourceExchange/resourceExchangeModel.js");

test("1钻石固定兑换1000金币并同步兼容coins字段", () => {
  const profile = { coins: 400, resources: { diamonds: 5, gold: 400 } };
  const result = model.exchange(profile, 2);
  assert.equal(result.ok, true);
  assert.equal(result.goldGain, 2000);
  assert.equal(profile.resources.diamonds, 3);
  assert.equal(profile.resources.gold, 2400);
  assert.equal(profile.coins, 2400);
});

test("钻石不足时不修改存档资源", () => {
  const profile = { coins: 400, resources: { diamonds: 0, gold: 400 } };
  const before = JSON.stringify(profile);
  const result = model.exchange(profile, 1);
  assert.equal(result.ok, false);
  assert.equal(result.reason, "DIAMONDS_NOT_ENOUGH");
  assert.equal(JSON.stringify(profile), before);
});

test("主UI将体力归入玩家卡，并用独立钻石和金币功能区替换旧体力横条", () => {
  const html = fs.readFileSync(path.join(root, "src/h5/Shell/game-frame.html"), "utf8");
  const css = fs.readFileSync(path.join(root, "src/h5/UI/Lobby/lobby.css"), "utf8");
  const assets = fs.readFileSync(path.join(root, "src/h5/Presentation/Assets/assets.js"), "utf8");
  assert.match(html, /class="pilot-energy-row"[\s\S]*id="energyValue"/);
  assert.match(html, /class="resource-unit diamond-resource"/);
  assert.match(html, /id="openResourceExchange"/);
  assert.doesNotMatch(html, /resource-unit energy-resource/);
  assert.doesNotMatch(css, /\.energy-resource/);
  assert.match(assets, /gold-coin\.png/);
  assert.match(assets, /diamond-gem\.png/);
  assert.equal(fs.existsSync(path.join(root, "assets/runtime/Shared/lobby-icons/gold-coin.png")), true);
  assert.equal(fs.existsSync(path.join(root, "assets/runtime/Shared/lobby-icons/diamond-gem.png")), true);
  assert.equal(fs.existsSync(path.join(root, "assets/runtime/Shared/lobby-icons/resource-gold.png")), false);
});

test("兑换房间确认后保存当前档案并刷新大厅资源", () => {
  const source = fs.readFileSync(path.join(root, "src/h5/UI/Lobby/ResourceExchange/resourceExchangeRoom.js"), "utf8");
  let roomFactory;
  const profile = { coins: 200, resources: { diamonds: 2, gold: 200 } };
  const calls = { save: 0, render: 0, emit: 0 };
  const screen = { classList: { add() {}, remove() {} } };
  const context = {
    console,
    globalThis: null,
    RXGame: {
      roomRegistry: { defineRoom(name, factory) { assert.equal(name, "resourceExchange"); roomFactory = factory; } },
      resourceExchangeModel: model,
      resourceExchangeView: { create() { return { render() {}, clear() {} }; } },
      assets: { UI_A_HUD_ASSETS: {} }
    }
  };
  context.globalThis = context;
  vm.runInNewContext(source, context, { filename: "resourceExchangeRoom.js" });
  const room = roomFactory({
    dom: { resourceExchangeScreen: screen, resourceExchangeMount: {} },
    resourceExchange: {
      getProfile: () => profile,
      saveProfile: () => { calls.save += 1; },
      renderLobby: () => { calls.render += 1; },
      emitGoldChanged: () => { calls.emit += 1; }
    }
  });
  const result = room.actions["resourceExchange.confirm"]();
  assert.equal(result.ok, true);
  assert.equal(profile.resources.diamonds, 1);
  assert.equal(profile.resources.gold, 1200);
  assert.deepEqual(calls, { save: 1, render: 1, emit: 1 });
});
