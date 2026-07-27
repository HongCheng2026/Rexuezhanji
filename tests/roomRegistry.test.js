"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

global.RXGame = {};
const exportedRegistry = require("../src/h5/Game/SceneManager/roomRegistry.js");

function createRegistry() {
  return exportedRegistry.createRegistry();
}

function withoutConsole(method, run) {
  const original = console[method];
  console[method] = () => {};
  try { return run(); }
  finally { console[method] = original; }
}

test("room definitions are unique", () => {
  const registry = createRegistry();
  registry.defineRoom("alpha", () => ({ actions: {} }));
  assert.throws(() => registry.defineRoom("alpha", () => ({})), /duplicate room definition/);
});

test("mount and unmount own actions and dispose lifecycle", () => {
  const registry = createRegistry();
  let disposed = 0;
  registry.defineRoom("counter", (context) => ({
    actions: { add: (value) => context.base + value },
    dispose: () => { disposed += 1; }
  }));

  const mounted = registry.mountRoom("counter", { base: 4 });
  assert.ok(mounted);
  assert.equal(registry.dispatch("counter.add", 3), 7);
  assert.equal(registry.getActionOwner("counter.add"), "counter");
  assert.equal(registry.unmountRoom("counter"), true);
  assert.equal(registry.hasAction("counter.add"), false);
  assert.equal(disposed, 1);
});

test("action collision fails only the conflicting room", () => {
  const registry = createRegistry();
  registry.defineRoom("alpha", () => ({ actions: { "shared.run": () => "alpha" } }));
  registry.defineRoom("beta", () => ({ actions: { "shared.run": () => "beta" } }));
  assert.ok(registry.mountRoom("alpha", {}));
  const second = withoutConsole("error", () => registry.mountRoom("beta", {}));
  assert.equal(second, null);
  assert.equal(registry.dispatch("shared.run"), "alpha");
  assert.deepEqual(registry.listMountedRooms(), ["alpha"]);
});

test("factory, action, and dispose exceptions are isolated", () => {
  const registry = createRegistry();
  registry.defineRoom("brokenMount", () => { throw new Error("mount boom"); });
  registry.defineRoom("brokenAction", () => ({
    actions: { run: () => { throw new Error("action boom"); } },
    dispose: () => { throw new Error("dispose boom"); }
  }));
  registry.defineRoom("healthy", () => ({ actions: { run: () => "ok" } }));

  const report = withoutConsole("error", () => registry.mountAll({}));
  assert.deepEqual(report.failed, ["brokenMount"]);
  assert.equal(withoutConsole("error", () => registry.dispatch("brokenAction.run")), undefined);
  assert.equal(registry.dispatch("healthy.run"), "ok");
  assert.equal(withoutConsole("error", () => registry.unmountRoom("brokenAction")), true);
  assert.equal(registry.dispatch("healthy.run"), "ok");
});

test("missing and removed optional rooms do not stop remaining rooms", () => {
  const registry = createRegistry();
  const removeOptional = registry.defineRoom("optional", () => ({ actions: { open: () => true } }));
  registry.defineRoom("core", () => ({ actions: { boot: () => "running" } }));
  registry.mountAll({});
  assert.equal(registry.mountRoom("missing", {}), null);
  assert.equal(withoutConsole("warn", () => registry.dispatch("missing.open")), undefined);
  removeOptional();
  assert.equal(registry.hasRoom("optional"), false);
  assert.equal(registry.hasAction("optional.open"), false);
  assert.equal(registry.dispatch("core.boot"), "running");
});
