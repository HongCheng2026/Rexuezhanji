"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

delete global.RXGame;
require("../src/h5/Data/Balance/balance.js");
require("../src/h5/World/Level/levels.js");
require("../src/h5/Data/Balance/sRankPriceConfig.js");
const assets = require("../src/h5/Presentation/Assets/assets.js");
const profileModule = require("../src/h5/Gameplay/Player/profile.js");
const economy = require("../src/h5/Data/Balance/rosterEconomy.js");
const battleRules = require("../src/h5/Gameplay/Enemy/battleRules.js");

test("战姬和战机使用最终金币定价", () => {
  assert.deepEqual(economy.PILOT_RARITY_PRICE_GOLD, { B: 30000, A: 120000, S: 900000 });
  assert.deepEqual(economy.FIGHTER_RARITY_PRICE_GOLD, { B: 50000, A: 150000, S: 1300000 });
  assert.equal(economy.getPrice("pilot", "S"), 900000);
  assert.equal(economy.getPrice("ship", "S"), 1300000);
});

test("新玩家只拥有初始战姬战机，并从第一关开始", () => {
  const profile = profileModule.createProfile();
  assert.equal(assets.DEFAULT_PILOT_ID, "pilot-b-linzhihan");
  assert.equal(assets.DEFAULT_SHIP_ID, "ship-b-01");
  assert.deepEqual(profile.owned.pilots, [assets.DEFAULT_PILOT_ID]);
  assert.deepEqual(profile.owned.ships, [assets.DEFAULT_SHIP_ID]);
  assert.equal(assets.DEFAULT_PILOT_ID, "pilot-b-linzhihan");
  assert.equal(assets.DEFAULT_SHIP_ID, "ship-b-01");
  assert.equal(profile.unlockedLevel, 1);
  assert.deepEqual(profile.completed, []);
});

test("旧免费阵容只迁移一次，改为林知寒和蓝隼", () => {
  const profile = profileModule.normalizeProfile({
    starterRosterVersion: 1,
    owned: {
      pilots: ["pilot-s-lingyan"],
      ships: ["ship-a-06"]
    },
    scene: {
      pilotId: "pilot-s-lingyan",
      shipId: "ship-a-06"
    }
  });
  assert.deepEqual(profile.owned.pilots, ["pilot-b-linzhihan"]);
  assert.deepEqual(profile.owned.ships, ["ship-b-01"]);
  assert.equal(profile.scene.pilotId, "pilot-b-linzhihan");
  assert.equal(profile.scene.shipId, "ship-b-01");
  assert.equal(profile.starterRosterVersion, 2);
});

test("本地购买扣除金币、加入拥有列表并自动出战", () => {
  const profile = profileModule.createProfile();
  profileModule.setGold(profile, 50000);
  const result = economy.purchase(profile, "pilot", "pilot-b-bailing");
  assert.equal(result.cost, 30000);
  assert.equal(profileModule.getGold(profile), 20000);
  assert.ok(profile.owned.pilots.includes("pilot-b-bailing"));
  assert.equal(profile.scene.pilotId, "pilot-b-bailing");
  assert.throws(() => economy.purchase(profile, "pilot", "pilot-b-bailing"), (error) => error.code === "ROSTER_ITEM_OWNED");
});

test("金币不足时不会赠送战机", () => {
  const profile = profileModule.createProfile();
  profileModule.setGold(profile, 49999);
  assert.throws(() => economy.purchase(profile, "ship", "ship-b-03"), (error) => error.code === "GOLD_NOT_ENOUGH");
  assert.equal(profileModule.getGold(profile), 49999);
  assert.ok(!profile.owned.ships.includes("ship-b-03"));
});

test("旧黑月本体计数统一迁移到背包物品", () => {
  const profile = profileModule.normalizeProfile({
    starterRosterVersion: 2,
    owned: { pilots: ["pilot-ss-heiyue"] },
    pilotCopies: { "pilot-ss-heiyue": 2 },
    resources: { inventory: { pilot_ss_heiyue_copy: 1 } }
  });
  assert.equal(profile.resources.inventory.pilot_ss_heiyue_copy, 2);
  assert.equal(Object.hasOwn(profile, "pilotCopies"), false);
});

test("旧 SSS 武器模组无损迁移为 SSS 战机模组", () => {
  const profile = profileModule.normalizeProfile({
    resources: { inventory: { sss_weapon_module: 2, sss_fighter_module: 3, active_skill_module_sss: 4 } }
  });
  assert.equal(profile.resources.inventory.sss_fighter_module, 5);
  assert.equal(Object.hasOwn(profile.resources.inventory, "sss_weapon_module"), false);
  assert.equal(profile.resources.inventory.active_skill_module_sss, 4);
});

test("购买战机后默认切换为该战机出战", () => {
  const profile = profileModule.createProfile();
  profileModule.setGold(profile, 50000);
  economy.purchase(profile, "ship", "ship-b-03");
  assert.ok(profile.owned.ships.includes("ship-b-03"));
  assert.equal(profile.scene.shipId, "ship-b-03");
});

test("通关只开放下一关，不会一次全部开放", () => {
  const profile = profileModule.createProfile();
  const firstLevel = global.RXGame.levels.levels[0];
  battleRules.completeLevel(profile, firstLevel, { stars: 3 });
  assert.equal(profile.unlockedLevel, 2);
  assert.deepEqual(profile.completed, [firstLevel.id]);
});
