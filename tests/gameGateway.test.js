"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const gatewayModule = require("../src/h5/Game/Gateway/gameGateway.js");

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
    syncProfile: record("syncProfile", { profile: { player: { name: label } } }),
    identity: record("identity"),
    getAccountState: record("getAccountState", { available: true, status: "guest", maskedIdentifier: "游客云档" }),
    sendEmailCode: record("sendEmailCode"),
    verifyEmailCode: record("verifyEmailCode", { profile: { player: { name: label } } }),
    sendPhoneCode: record("sendPhoneCode"),
    verifyPhoneCode: record("verifyPhoneCode", { profile: { player: { name: label } } }),
    startBattle: record("startBattle", { ticket: label + "-ticket" }),
    finishBattle: record("finishBattle"),
    abandonBattle: record("abandonBattle"),
    sweep: record("sweep"),
    upgrade: record("upgrade"),
    upgradeFighter: record("upgradeFighter"),
    buyPilot: record("buyPilot"),
    buyShip: record("buyShip"),
    promoteUnit: record("promoteUnit"),
    starUpPilot: record("starUpPilot"),
    starUpFighter: record("starUpFighter"),
    activateCodexEntry: record("activateCodexEntry"),
    saveFighterSkillLoadout: record("saveFighterSkillLoadout"),
    upgradeAutoWeapon: record("upgradeAutoWeapon"),
    buyShopItem: record("buyShopItem"),
    getPaymentCatalog: record("getPaymentCatalog"),
    createPaymentOrder: record("createPaymentOrder"),
    capturePaypalPayment: record("capturePaypalPayment"),
    getPaymentOrder: record("getPaymentOrder"),
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

test("队列型经济适配器在当前点击栈内同步执行本地投影", async () => {
  let projected = false;
  const local = createAdapter("local", []);
  local.upgradeFighter = () => {
    projected = true;
    return { profile: { fighterUpgrades: { attack: 2 } }, pending: true };
  };
  const gateway = gatewayModule.create({ mode: "local", local });

  const operation = gateway.upgradeFighter("attack");
  assert.equal(projected, true);
  assert.equal((await operation).pending, true);
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
  await gateway.syncProfile(30000);
  await gateway.sweep(5, 4);
  await gateway.upgrade("fire");
  await gateway.upgradeFighter("attack");
  await gateway.buyPilot("pilot-b-bailing");
  await gateway.buyShip("ship-b-01");
  await gateway.promoteUnit("pilot", "pilot-b-bailing", "pilot_rank_a_token");
  await gateway.starUpPilot("pilot-ss-heiyue");
  await gateway.starUpFighter("ship-ss-lingguang");
  await gateway.activateCodexEntry("unit", "pilot-b-bailing", "operation-codex");
  await gateway.saveFighterSkillLoadout("ship-b-01", loadout);
  await gateway.upgradeAutoWeapon("weapon_module_04", "operation-1");
  await gateway.buyShopItem("gold_small", 5);
  await gateway.redeem("svip0903");
  await gateway.saveCosmetics(profile);

  assert.deepEqual(calls.map((item) => [item.method, item.args]), [
    ["finishBattle", ["ticket-1", 5, rating, details]],
    ["syncProfile", [30000]],
    ["sweep", [5, 4]],
    ["upgrade", ["fire"]],
    ["upgradeFighter", ["attack"]],
    ["buyPilot", ["pilot-b-bailing"]],
    ["buyShip", ["ship-b-01"]],
    ["promoteUnit", ["pilot", "pilot-b-bailing", "pilot_rank_a_token"]],
    ["starUpPilot", ["pilot-ss-heiyue"]],
    ["starUpFighter", ["ship-ss-lingguang"]],
    ["activateCodexEntry", ["unit", "pilot-b-bailing", "operation-codex"]],
    ["saveFighterSkillLoadout", ["ship-b-01", loadout]],
    ["upgradeAutoWeapon", ["weapon_module_04", "operation-1"]],
    ["buyShopItem", ["gold_small", 5]],
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

test("云存档账号状态和邮箱、手机验证参数通过网关透传", async () => {
  const calls = [];
  const gateway = gatewayModule.create({
    mode: "cloud",
    location: { hostname: "localhost", search: "" },
    cloud: createAdapter("cloud", calls)
  });

  assert.deepEqual(gateway.getAccountState(), { available: true, status: "guest", maskedIdentifier: "游客云档" });
  await gateway.sendEmailCode("pilot@example.com", { createUser: false });
  await gateway.verifyEmailCode("pilot@example.com", "123456");
  await gateway.sendPhoneCode("+8613800138000", { createUser: true });
  await gateway.verifyPhoneCode("+8613800138000", "654321");
  assert.deepEqual(calls.slice(-5).map((item) => [item.method, item.args]), [
    ["getAccountState", []],
    ["sendEmailCode", ["pilot@example.com", { createUser: false }]],
    ["verifyEmailCode", ["pilot@example.com", "123456"]],
    ["sendPhoneCode", ["+8613800138000", { createUser: true }]],
    ["verifyPhoneCode", ["+8613800138000", "654321"]]
  ]);
});

test("本地网关不暴露可操作的云存档状态", () => {
  const gateway = gatewayModule.create({
    mode: "local",
    location: { hostname: "localhost", search: "" },
    local: createAdapter("local", [])
  });
  assert.deepEqual(gateway.getAccountState(), {
    available: false,
    status: "unavailable",
    provider: null,
    maskedIdentifier: "",
    reason: "local"
  });
});

test("充值目录、幂等下单、PayPal 捕获和查单参数完整透传", async () => {
  const calls = [];
  const gateway = gatewayModule.create({
    mode: "cloud",
    location: { hostname: "localhost", search: "" },
    cloud: createAdapter("cloud", calls)
  });

  await gateway.getPaymentCatalog("GLOBAL");
  await gateway.createPaymentOrder("diamond_60", "GLOBAL", "paypal", "11111111-1111-4111-8111-111111111111");
  await gateway.capturePaypalPayment("22222222-2222-4222-8222-222222222222", "PAYPAL-ORDER");
  await gateway.getPaymentOrder("22222222-2222-4222-8222-222222222222");

  assert.deepEqual(calls.slice(-4).map((item) => [item.method, item.args]), [
    ["getPaymentCatalog", ["GLOBAL"]],
    ["createPaymentOrder", ["diamond_60", "GLOBAL", "paypal", "11111111-1111-4111-8111-111111111111"]],
    ["capturePaypalPayment", ["22222222-2222-4222-8222-222222222222", "PAYPAL-ORDER"]],
    ["getPaymentOrder", ["22222222-2222-4222-8222-222222222222"]]
  ]);
});
