"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(path.join(__dirname, "../src/h5/UI/FeaturePanels/signinRoom.js"), "utf8");

function createHarness(cloud) {
  let factory;
  let profile = { resources: { gold: 0, diamonds: 0, energy: 20, inventory: {} } };
  const calls = { ensure: 0, gateway: 0, apply: 0, save: 0, reward: 0, render: 0 };
  const shared = {
    roomRegistry: {
      defineRoom(name, nextFactory) {
        assert.equal(name, "signin");
        factory = nextFactory;
      }
    },
    featurePanelContent: {
      SIGNIN_CONTENT: [{ day: 1, rewards: [{ type: "gold", amount: 3000 }] }]
    },
    taskSystem: {
      applyRewards(nextProfile, rewards) {
        calls.reward += 1;
        nextProfile.resources.gold += rewards[0].amount;
      }
    }
  };
  const sandbox = { console, Intl, Date, Promise, RXGame: shared };
  sandbox.globalThis = sandbox;
  vm.runInNewContext(source, sandbox, { filename: "signinRoom.js" });
  const room = factory({
    shared,
    featurePanelController: { open() { calls.render += 1; return true; } },
    signin: {
      getProfile: () => profile,
      isCloudMode: () => cloud,
      async ensureGameGateway() { calls.ensure += 1; },
      getGameGateway: () => ({
        async claimSignIn() {
          calls.gateway += 1;
          return {
            ok: true,
            day: 1,
            profile: {
              resources: { gold: 3000, diamonds: 0, energy: 20, inventory: {} },
              signIn: { day: 1, lastClaimDate: "2026-07-29", totalClaims: 1 }
            }
          };
        }
      }),
      applyGatewayProfile(next) { calls.apply += 1; profile = next; },
      saveProfile() { calls.save += 1; },
      renderPanel() { calls.render += 1; return true; }
    }
  });
  return { room, calls, getProfile: () => profile };
}

test("cloud sign-in uses one gateway mutation and applies its returned profile", async () => {
  const harness = createHarness(true);
  const result = await harness.room.actions.claim();
  assert.equal(result.ok, true);
  assert.equal(harness.getProfile().resources.gold, 3000);
  assert.deepEqual(harness.calls, { ensure: 1, gateway: 1, apply: 1, save: 0, reward: 0, render: 2 });
});

test("local sign-in grants once and rejects a second claim on the same Shanghai day", () => {
  const harness = createHarness(false);
  const first = harness.room.actions.claim();
  const second = harness.room.actions.claim();
  assert.equal(first.ok, true);
  assert.equal(second.ok, false);
  assert.equal(second.reason, "SIGNIN_CLAIMED");
  assert.equal(harness.getProfile().resources.gold, 3000);
  assert.equal(harness.calls.reward, 1);
  assert.equal(harness.calls.save, 1);
});
