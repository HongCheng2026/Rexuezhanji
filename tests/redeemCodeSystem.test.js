"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

delete global.RXGame;
require("../src/h5/Data/Balance/balance.js");
require("../src/h5/World/Level/levels.js");
require("../src/h5/Presentation/Assets/assets.js");
const profileModule = require("../src/h5/Gameplay/Player/profile.js");
const redeemCodeSystem = require("../src/h5/Data/Config/redeemCodeSystem.js");

test("svip0903 不区分大小写并发放500万金币", () => {
  const profile = profileModule.createProfile();
  const result = redeemCodeSystem.redeemCode({ rawCode: "svip0903", profile });
  assert.equal(result.success, true);
  assert.equal(result.code, "SVIP0903");
  assert.equal(profileModule.getGold(result.profile), 5000000);
  assert.ok(result.profile.usedRedeemCodes.includes("SVIP0903"));
});

test("同一存档不能重复领取 svip0903", () => {
  const first = redeemCodeSystem.redeemCode({ rawCode: "svip0903", profile: profileModule.createProfile() });
  const second = redeemCodeSystem.redeemCode({ rawCode: "SVIP0903", profile: first.profile });
  assert.equal(second.success, false);
  assert.equal(second.status, redeemCodeSystem.REDEEM_CODE_STATUS.CODE_ALREADY_USED);
  assert.equal(profileModule.getGold(first.profile), 5000000);
});

test("Love0618 grants one million diamonds once per profile", () => {
  const profile = profileModule.createProfile();
  const first = redeemCodeSystem.redeemCode({ rawCode: "Love0618", profile });
  assert.equal(first.success, true);
  assert.equal(first.code, "LOVE0618");
  assert.equal(first.profile.resources.diamonds, 1000000);
  assert.ok(first.profile.usedRedeemCodes.includes("LOVE0618"));

  const second = redeemCodeSystem.redeemCode({ rawCode: "love0618", profile: first.profile });
  assert.equal(second.success, false);
  assert.equal(second.status, redeemCodeSystem.REDEEM_CODE_STATUS.CODE_ALREADY_USED);
});

test("Love0618 is mirrored by the cloud redeem service", () => {
  const source = fs.readFileSync(path.resolve(__dirname, "../src/backend/functions/game-api/index.ts"), "utf8");
  assert.match(source, /LOVE0618:\s*\{[^}]*rewards:\s*\[\{\s*type:\s*"diamonds",\s*amount:\s*1000000\s*\}\]/);
  assert.match(source, /reward\.type === "diamonds"[^\n]*profile\.resources\.diamonds/);
});

test("retired diamond code is absent", () => {
  const localSource = fs.readFileSync(path.resolve(__dirname, "../src/h5/Data/Config/redeemCodeSystem.js"), "utf8");
  const cloudSource = fs.readFileSync(path.resolve(__dirname, "../src/backend/functions/game-api/index.ts"), "utf8");
  const retiredCode = ["Love", "0903"].join("");
  assert.equal(new RegExp(retiredCode, "i").test(localSource), false);
  assert.equal(new RegExp(retiredCode, "i").test(cloudSource), false);
  const result = redeemCodeSystem.redeemCode({ rawCode: retiredCode, profile: profileModule.createProfile() });
  assert.equal(result.success, false);
  assert.equal(result.status, redeemCodeSystem.REDEEM_CODE_STATUS.CODE_NOT_FOUND);
});
