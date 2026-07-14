"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

delete global.RXGame;
require("../src/shared/balance.js");
require("../src/shared/levels.js");
require("../src/shared/sRankPriceConfig.js");
const assets = require("../src/shared/assets.js");
const profileModule = require("../src/shared/profile.js");
const economy = require("../src/shared/rosterEconomy.js");
const battleRules = require("../src/shared/battleRules.js");

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

test("本地购买扣除金币并加入拥有列表", () => {
  const profile = profileModule.createProfile();
  profileModule.setGold(profile, 50000);
  const result = economy.purchase(profile, "pilot", "pilot-b-bailing");
  assert.equal(result.cost, 30000);
  assert.equal(profileModule.getGold(profile), 20000);
  assert.ok(profile.owned.pilots.includes("pilot-b-bailing"));
  assert.throws(() => economy.purchase(profile, "pilot", "pilot-b-bailing"), (error) => error.code === "ROSTER_ITEM_OWNED");
});

test("金币不足时不会赠送战机", () => {
  const profile = profileModule.createProfile();
  profileModule.setGold(profile, 49999);
  assert.throws(() => economy.purchase(profile, "ship", "ship-b-03"), (error) => error.code === "GOLD_NOT_ENOUGH");
  assert.equal(profileModule.getGold(profile), 49999);
  assert.ok(!profile.owned.ships.includes("ship-b-03"));
});

test("通关只开放下一关，不会一次全部开放", () => {
  const profile = profileModule.createProfile();
  const firstLevel = global.RXGame.levels.levels[0];
  battleRules.completeLevel(profile, firstLevel, { stars: 3 });
  assert.equal(profile.unlockedLevel, 2);
  assert.deepEqual(profile.completed, [firstLevel.id]);
});
