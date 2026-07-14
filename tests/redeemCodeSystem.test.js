"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

delete global.RXGame;
require("../src/shared/balance.js");
require("../src/shared/levels.js");
require("../src/shared/assets.js");
const profileModule = require("../src/shared/profile.js");
const redeemCodeSystem = require("../src/shared/redeemCodeSystem.js");

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
