const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const profileController = require(path.join(root, "src/h5/app/profileController.js"));
const fighterUpgradeController = require(path.join(root, "src/h5/app/fighterUpgradeController.js"));
const gameEventRouter = require(path.join(root, "src/h5/app/gameEventRouter.js"));
const lobbyController = require(path.join(root, "src/h5/app/lobbyController.js"));
const featurePanelController = require(path.join(root, "src/h5/app/featurePanelController.js"));
const battleFlowController = require(path.join(root, "src/h5/app/battleFlowController.js"));

test("拆分后的控制器都提供统一工厂入口", () => {
  assert.equal(typeof profileController.create, "function");
  assert.equal(typeof fighterUpgradeController.create, "function");
  assert.equal(typeof gameEventRouter.create, "function");
  assert.equal(typeof lobbyController.create, "function");
  assert.equal(typeof featurePanelController.create, "function");
  assert.equal(typeof battleFlowController.create, "function");
});

test("gameApp 只调度拆分控制器，不再定义对应大块业务函数", () => {
  const source = fs.readFileSync(path.join(root, "src/h5/app/gameApp.js"), "utf8");
  assert.ok(source.split(/\r?\n/).length <= 900, "gameApp 应控制在 900 行以内");
  assert.doesNotMatch(source, /^  function renderProfilePanel\s*\(/m);
  assert.doesNotMatch(source, /^  function renderFighterUpgradePanel\s*\(/m);
  assert.doesNotMatch(source, /^  function bindEvents\s*\(/m);
  assert.doesNotMatch(source, /^  function openFeaturePanel\s*\(/m);
  assert.doesNotMatch(source, /^  function startSelectedLevel\s*\(/m);
  assert.match(source, /profileController\.render/);
  assert.match(source, /fighterUpgradeController\.render/);
  assert.match(source, /gameEventRouter\.bind\(\)/);
});

test("控制器在 gameApp 之前按依赖顺序加载", () => {
  const loader = fs.readFileSync(path.join(root, "src/h5/shared-loader.js"), "utf8");
  const appIndex = loader.indexOf('"app/gameApp.js"');
  for (const modulePath of [
    '"app/profileController.js"',
    '"app/fighterUpgradeController.js"',
    '"app/gameEventRouter.js"',
    '"app/lobbyController.js"',
    '"app/featurePanelController.js"',
    '"app/battleFlowController.js"'
  ]) {
    const moduleIndex = loader.indexOf(modulePath);
    assert.ok(moduleIndex >= 0, `${modulePath} 应注册到加载器`);
    assert.ok(moduleIndex < appIndex, `${modulePath} 应先于 gameApp 加载`);
  }
});

test("云端写操作继续共用同一把锁", () => {
  const app = fs.readFileSync(path.join(root, "src/h5/app/gameApp.js"), "utf8");
  assert.match(app, /var gatewayActionLock = \{ busy: false \}/);
  assert.equal((app.match(/gatewayActionLock: gatewayActionLock/g) || []).length, 3);

  for (const modulePath of [
    "src/h5/app/lobbyController.js",
    "src/h5/app/fighterUpgradeController.js",
    "src/h5/app/battleFlowController.js"
  ]) {
    const source = fs.readFileSync(path.join(root, modulePath), "utf8");
    assert.match(source, /options\.gatewayActionLock/);
    assert.doesNotMatch(source, /gatewayActionBusy/);
  }
});

test("剧情进度写入完成后才继续开战", () => {
  const source = fs.readFileSync(path.join(root, "src/h5/app/battleFlowController.js"), "utf8");
  assert.match(source, /storyPersistence = Promise\.resolve\(persistProfileMetadata\(\)\)/);
  assert.match(source, /storyPersistence\.then\(function continueAfterStoryPersistence/);
});
