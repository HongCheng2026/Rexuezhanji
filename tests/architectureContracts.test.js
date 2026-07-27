"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const h5 = path.join(root, "src", "h5");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

test("read-only architecture checker passes", () => {
  const result = spawnSync(process.execPath, [path.join(root, "scripts", "check-architecture.mjs")], {
    cwd: root,
    encoding: "utf8"
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.match(result.stdout, /architecture-check OK/);
});

test("Gameplay has no direct audio, UI, or save dependency", () => {
  const files = walk(path.join(h5, "Gameplay")).filter((file) => file.endsWith(".js"));
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    assert.doesNotMatch(source, /scope\.audioSystem\b/, path.relative(root, file));
    assert.doesNotMatch(source, /scope\.(?:battleUiView|lobbyView|profileView)\b/, path.relative(root, file));
    assert.doesNotMatch(source, /(?:localStorage|profileRuntime\.(?:load|save)Profile)/, path.relative(root, file));
  }
});

test("DOM router only parses input and dispatches room actions", () => {
  const source = fs.readFileSync(path.join(h5, "Game", "SceneManager", "gameEventRouter.js"), "utf8");
  for (const forbidden of ["audioSystem", "mainFeaturePanelsView", "starWingsGachaView", "eventModeHubView", "socialFeaturePanelsView"]) {
    assert.equal(source.includes(forbidden), false, forbidden);
  }
  assert.doesNotMatch(source, /\.registerAction\(/);
});

test("all loaded room actions have one owner and optional removal is isolated", () => {
  const context = vm.createContext({ console: { error() {}, warn() {} }, setTimeout, clearTimeout });
  context.globalThis = context;
  context.window = context;
  context.RXGame = {};
  const registryFile = path.join(h5, "Game", "SceneManager", "roomRegistry.js");
  vm.runInContext(fs.readFileSync(registryFile, "utf8"), context, { filename: registryFile });
  const roomFiles = walk(h5).filter((file) => /Room\.js$/i.test(file) && file !== registryFile);
  for (const file of roomFiles) vm.runInContext(fs.readFileSync(file, "utf8"), context, { filename: file });

  const registry = context.RXGame.roomRegistry;
  const noop = () => {};
  const report = registry.mountAll({
    shared: {}, dom: {}, levels: [], getState: () => ({}), getProfile: () => ({}), calculateTotalPower: () => 0,
    tryUseDecisiveCommand: noop, tryCastActiveSlot: noop, toggleActiveSlotAuto: noop
  });
  assert.deepEqual(Array.from(report.failed), []);
  const actions = Array.from(registry.listActions());
  assert.ok(actions.length >= 30);
  assert.equal(new Set(actions).size, actions.length);
  for (const action of actions) assert.ok(registry.getActionOwner(action));
  assert.equal(registry.unmountRoom("shop"), true);
  assert.equal(registry.hasAction("shop.open"), false);
  assert.equal(registry.hasAction("battle.startSelectedLevel"), true);
});
