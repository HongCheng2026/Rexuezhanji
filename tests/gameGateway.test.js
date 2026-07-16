"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const gatewayModule = require("../src/h5/app/gameGateway.js");

function createAdapter(label, calls) {
  function record(method, value) {
    return function adapterMethod() {
      calls.push({ label, method, args: Array.from(arguments) });
      return value === undefined ? { label, method } : value;
    };
  }
  return {
    configured: () => true,
    bootstrap: record("bootstrap", { profile: { player: { name: label } } }),
    identity: record("identity"),
    startBattle: record("startBattle", { ticket: label + "-ticket" }),
    finishBattle: record("finishBattle"),
    abandonBattle: record("abandonBattle"),
    sweep: record("sweep"),
    upgrade: record("upgrade"),
    upgradeFighter: record("upgradeFighter"),
    buyPilot: record("buyPilot"),
    buyShip: record("buyShip"),
    saveFighterSkillLoadout: record("saveFighterSkillLoadout"),
    upgradeAutoWeapon: record("upgradeAutoWeapon"),
    redeem: record("redeem"),
    saveCosmetics: record("saveCosmetics")
  };
}

test("本地地址默认只调用本地实现", async () => {
  const calls = [];
  const gateway = gatewayModule.create({
    location: { hostname: "localhost", search: "" },
    local: createAdapter("local", calls),
    cloud: createAdapter("cloud", calls)
  });

  assert.equal(gateway.mode, "local");
  await gateway.bootstrap();
  await gateway.startBattle(7);
  assert.deepEqual(calls.map((item) => item.label), ["local", "local"]);
});

test("两个正式域名默认只调用云端实现", async () => {
  for (const hostname of gatewayModule.CLOUD_HOSTS) {
    const calls = [];
    const gateway = gatewayModule.create({
      location: { hostname, search: "" },
      local: createAdapter("local", calls),
      cloud: createAdapter("cloud", calls)
    });

    assert.equal(gateway.mode, "cloud");
    await gateway.bootstrap();
    await gateway.sweep(3);
    assert.deepEqual(calls.map((item) => item.label), ["cloud", "cloud"]);
  }
});

test("云端未配置时明确失败，不回退本地发奖励", async () => {
  const calls = [];
  const cloud = createAdapter("cloud", calls);
  cloud.configured = () => false;
  const gateway = gatewayModule.create({
    location: { hostname: "rexuezhanji.top", search: "" },
    local: createAdapter("local", calls),
    cloud
  });

  await assert.rejects(gateway.bootstrap(), (error) => error.code === "CLOUD_UNAVAILABLE");
  await assert.rejects(gateway.finishBattle("ticket", 1, {}, {}), (error) => error.code === "CLOUD_UNAVAILABLE");
  assert.deepEqual(calls, []);
});

test("云端业务报错原样抛出，不调用本地兜底", async () => {
  const calls = [];
  const cloud = createAdapter("cloud", calls);
  cloud.sweep = async () => {
    calls.push({ label: "cloud", method: "sweep", args: [9] });
    throw new Error("remote rejected");
  };
  const gateway = gatewayModule.create({
    mode: "cloud",
    location: { hostname: "localhost", search: "" },
    local: createAdapter("local", calls),
    cloud
  });

  await assert.rejects(gateway.sweep(9), /remote rejected/);
  assert.deepEqual(calls.map((item) => item.label), ["cloud"]);
});

test("结算、升级和外观接口完整透传参数", async () => {
  const calls = [];
  const gateway = gatewayModule.create({
    mode: "local",
    local: createAdapter("local", calls)
  });
  const rating = { stars: 3 };
  const details = { coinsEarned: 120 };
  const profile = { player: { name: "测试" } };
  const loadout = { activeSlots: [null, null, null, null], autoWeaponIds: [null, null, null] };

  await gateway.finishBattle("ticket-1", 5, rating, details);
  await gateway.sweep(5, 4);
  await gateway.upgrade("fire");
  await gateway.upgradeFighter("attack");
  await gateway.buyPilot("pilot-b-bailing");
  await gateway.buyShip("ship-b-01");
  await gateway.saveFighterSkillLoadout("ship-b-01", loadout);
  await gateway.upgradeAutoWeapon("weapon_module_04", "operation-1");
  await gateway.redeem("svip0903");
  await gateway.saveCosmetics(profile);

  assert.deepEqual(calls.map((item) => [item.method, item.args]), [
    ["finishBattle", ["ticket-1", 5, rating, details]],
    ["sweep", [5, 4]],
    ["upgrade", ["fire"]],
    ["upgradeFighter", ["attack"]],
    ["buyPilot", ["pilot-b-bailing"]],
    ["buyShip", ["ship-b-01"]],
    ["saveFighterSkillLoadout", ["ship-b-01", loadout]],
    ["upgradeAutoWeapon", ["weapon_module_04", "operation-1"]],
    ["redeem", ["svip0903"]],
    ["saveCosmetics", [profile]]
  ]);
});

test("storage 查询参数可显式切换开发模式", () => {
  assert.equal(gatewayModule.shouldUseCloud({ hostname: "localhost", search: "?storage=cloud" }), true);
  assert.equal(gatewayModule.shouldUseCloud({ hostname: "localhost", search: "?storage=local" }), false);
  assert.equal(gatewayModule.shouldUseCloud({ hostname: "rexuezhanji.top", search: "?storage=local" }), true);
  assert.equal(gatewayModule.shouldUseCloud({ hostname: "www.rexuezhanji.top", search: "", }, "local"), true);
});
