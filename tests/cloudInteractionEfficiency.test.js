"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const cloudSaveSource = fs.readFileSync(path.join(root, "src/h5/Data/SaveData/cloud-save.js"), "utf8");
const profileSessionSource = fs.readFileSync(path.join(root, "src/h5/Game/Storage/profileSession.js"), "utf8");

function createCloudHarness(options = {}) {
  const storage = new Map();
  const future = Math.floor(Date.now() / 1000) + 3600;
  storage.set("rexuezhanjiSupabaseSession", JSON.stringify(options.session || {
    access_token: "access",
    refresh_token: "refresh",
    expires_at: future,
    user: { id: "user-1" }
  }));
  const requests = [];
  const context = vm.createContext({
    AbortController,
    URL,
    console,
    crypto: { randomUUID: () => "operation-id" },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    RXSupabaseConfig: { url: "https://cloud.example", publishableKey: "public-key" },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    async fetch(url, request) {
      const body = request && request.body ? JSON.parse(request.body) : {};
      requests.push({ url: String(url), body });
      if (String(url).includes("/auth/v1/token")) {
        return {
          ok: true,
          async json() {
            return { access_token: "refreshed", refresh_token: "refresh-2", expires_at: future, user: { id: "user-1" } };
          }
        };
      }
      const action = new URL(String(url)).searchParams.get("action");
      const gold = action === "shop-buy" ? 500 : 1000;
      return {
        ok: true,
        async json() {
          return { profile: { resources: { gold } }, action, quantity: body.quantity || 1 };
        }
      };
    }
  });
  context.window = context;
  context.globalThis = context;
  vm.runInContext(cloudSaveSource, context, { filename: "cloud-save.js" });
  return { cloud: context.RXCloud, requests };
}

test("module profile synchronization is single-flight and reuses the latest mutation snapshot", async () => {
  const { cloud, requests } = createCloudHarness();
  const [first, second] = await Promise.all([cloud.syncProfile(30000), cloud.syncProfile(30000)]);
  assert.equal(first.profile.resources.gold, 1000);
  assert.equal(second.profile.resources.gold, 1000);
  assert.equal(requests.filter((entry) => entry.url.includes("action=bootstrap")).length, 1);

  const bought = await cloud.buyShopItem("gold_small", 5, "bulk-operation");
  assert.equal(bought.quantity, 5);
  assert.equal(requests.at(-1).body.quantity, 5);

  const afterMutation = await cloud.syncProfile(30000);
  assert.equal(afterMutation.profile.resources.gold, 500);
  assert.equal(requests.filter((entry) => entry.url.includes("action=bootstrap")).length, 1);
});

test("concurrent cloud calls share one expired-session refresh", async () => {
  const { cloud, requests } = createCloudHarness({
    session: {
      access_token: "expired",
      refresh_token: "refresh",
      expires_at: Math.floor(Date.now() / 1000) - 10,
      user: { id: "user-1" }
    }
  });
  await Promise.all([cloud.identity(), cloud.syncProfile(30000)]);
  assert.equal(requests.filter((entry) => entry.url.includes("/auth/v1/token")).length, 1);
});

test("identical gateway profiles are persisted locally only once", () => {
  let writes = 0;
  const context = vm.createContext({
    console,
    JSON,
    RXGame: {
      profile: { normalizeProfile(profile) { return profile; } },
      profileRuntime: {
        STORAGE_KEY: "profile",
        loadProfile() { return { resources: { gold: 100 } }; },
        saveProfile() { writes += 1; }
      }
    },
    localStorage: { getItem() { return null; }, setItem() { writes += 1; } }
  });
  context.globalThis = context;
  vm.runInContext(profileSessionSource, context, { filename: "profileSession.js" });
  const session = context.RXGame.profileSession.create({ shared: context.RXGame });
  const profile = { resources: { gold: 100 } };
  session.applyGatewayProfile(profile);
  session.saveProfile(profile);
  assert.equal(writes, 1);
  profile.resources.gold = 90;
  session.saveProfile(profile);
  assert.equal(writes, 2);
});

test("quantity purchases use one client request and one server transaction path", () => {
  const controller = fs.readFileSync(path.join(root, "src/h5/UI/FeaturePanels/economyFeatureController.js"), "utf8");
  const upgradeRoom = fs.readFileSync(path.join(root, "src/h5/UI/Fighter/Upgrade/fighterUpgradeRoom.js"), "utf8");
  const economyService = fs.readFileSync(path.join(root, "src/backend/functions/game-api/services/economy.ts"), "utf8");
  assert.match(controller, /gateway\[method\]\(value,\s*quantity\)/);
  assert.match(upgradeRoom, /callGateway\("buyShopItem",\s*\[itemId,\s*qty\]\)/);
  assert.match(economyService, /quantity\s*>\s*1/);
  assert.match(economyService, /totalPrice\s*=\s*item\.priceAmount\s*\*\s*quantity/);
});

test("shop and fighter upgrades render the local projection without a cloud waiting state", () => {
  const controller = fs.readFileSync(path.join(root, "src/h5/UI/FeaturePanels/economyFeatureController.js"), "utf8");
  const upgradeRoom = fs.readFileSync(path.join(root, "src/h5/UI/Fighter/Upgrade/fighterUpgradeRoom.js"), "utf8");
  assert.match(controller, /var gateway = options\.getGameGateway\(\);/);
  assert.doesNotMatch(controller, /button\.disabled\s*=\s*true/);
  assert.match(upgradeRoom, /operation = task\(\);[\s\S]{0,180}render\(\);/);
  assert.doesNotMatch(upgradeRoom, /model\.setPending\(/);
});

test("resource-sensitive rooms synchronize once on entry through the shared snapshot", () => {
  const upgradeRoom = fs.readFileSync(path.join(root, "src/h5/UI/Fighter/Upgrade/fighterUpgradeRoom.js"), "utf8");
  const pilotRoom = fs.readFileSync(path.join(root, "src/h5/UI/Pilot/pilotRoom.js"), "utf8");
  const fighterRoom = fs.readFileSync(path.join(root, "src/h5/UI/Fighter/fighterRoom.js"), "utf8");
  const panelController = fs.readFileSync(path.join(root, "src/h5/UI/FeaturePanels/featurePanelController.js"), "utf8");
  for (const source of [upgradeRoom, pilotRoom, fighterRoom, panelController]) {
    assert.match(source, /syncGatewayProfile\(30000\)/);
  }
  assert.match(panelController, /resourcePanels\s*=\s*\{[^}]*shop:\s*true[^}]*task:\s*true[^}]*achievement:\s*true/s);
});
