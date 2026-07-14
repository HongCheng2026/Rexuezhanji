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
const battleUiController = require(path.join(root, "src/h5/app/battleUiController.js"));
const battleFlowController = require(path.join(root, "src/h5/app/battleFlowController.js"));

test("拆分后的控制器都提供统一工厂入口", () => {
  assert.equal(typeof profileController.create, "function");
  assert.equal(typeof fighterUpgradeController.create, "function");
  assert.equal(typeof gameEventRouter.create, "function");
  assert.equal(typeof lobbyController.create, "function");
  assert.equal(typeof featurePanelController.create, "function");
  assert.equal(typeof battleUiController.create, "function");
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
    '"app/battleUiController.js"',
    '"app/battleFlowController.js"',
    '"battle/activeSkillPreferences.js"',
    '"battle/activeSkillSystem.js"',
    '"battle/activeSkills/skyLockBeam.js"',
    '"battle/activeSkills/obsidianGravityWell.js"',
    '"battle/activeSkills/goldJudgementBuff.js"'
  ]) {
    const moduleIndex = loader.indexOf(modulePath);
    assert.ok(moduleIndex >= 0, `${modulePath} 应注册到加载器`);
    assert.ok(moduleIndex < appIndex, `${modulePath} 应先于 gameApp 加载`);
  }
});

test("gameApp 只桥接战斗 UI，不再拼装 HUD 或技能规则", () => {
  const source = fs.readFileSync(path.join(root, "src/h5/app/gameApp.js"), "utf8");
  assert.match(source, /battleUiView\.mount/);
  assert.match(source, /battleUiController\.create/);
  assert.doesNotMatch(source, /function (?:updateSelectHud|setHudLabels)\s*\(/);
  assert.doesNotMatch(source, /battleHudView|activeSkillButton|tryCastActiveSkill/);
});

test("输入和暂停只走新命令接口", () => {
  const router = fs.readFileSync(path.join(root, "src/h5/app/gameEventRouter.js"), "utf8");
  const lobby = fs.readFileSync(path.join(root, "src/h5/app/lobbyController.js"), "utf8");
  assert.match(router, /Digit1:\s*0[\s\S]*Digit4:\s*3/);
  assert.match(router, /Numpad1:\s*0[\s\S]*Numpad4:\s*3/);
  assert.match(router, /event\.code === "Space"[\s\S]*tryUseDecisiveCommand\(\)/);
  assert.match(router, /action === "active-auto-toggle"[\s\S]*toggleActiveSlotAuto/);
  assert.doesNotMatch(router, /weaponSystem\.shoot|tryCastActiveSkill|data\.pauseAction/);
  assert.doesNotMatch(lobby, /chapterSelect\.innerHTML|showPauseOverlay|pause-actions/);
});

test("战斗 HUD 普通更新会被限制在 100ms 一次，强制更新不受影响", () => {
  let renders = 0;
  const controller = battleUiController.create({
    view: { render() { renders += 1; } },
    getState: () => ({ mode: "fight", player: { hp: 100, maxHp: 100, abilities: {} } }),
    getProfile: () => ({}),
    getLoadout: () => ({ abilities: {} }),
    renderInterval: 100
  });
  for (let i = 0; i < 20; i += 1) controller.render(false);
  assert.equal(renders, 1);
  controller.forceRender();
  assert.equal(renders, 2);
});

test("战斗 HUD 模型区分主动技能状态并显示三种实时武器等级", () => {
  const model = battleUiController.createModel({
    state: {
      mode: "fight",
      player: {
        hp: 100,
        maxHp: 100,
        weapons: { spread: 3, laser: 4, missile: 5 },
        abilities: {
          activeSlots: [{ id: "skill", autoEnabled: true, activeRemaining: 2.4, cooldownTimer: 8 }],
          decisiveCommand: { id: "decisive-command", charges: 1, maxCharges: 4, rechargeTimer: 0 }
        }
      }
    },
    loadout: {
      abilities: {
        activeSlots: [{ id: "skill", name: "测试技能", iconText: "测" }],
        decisiveCommand: { id: "decisive-command", name: "决胜指令", iconText: "令" }
      }
    }
  });
  assert.equal(model.activeSlots[0].status, "active");
  assert.equal(model.activeSlots[0].autoEnabled, true);
  assert.deepEqual(model.inBattleSkills.slice(0, 3).map((item) => item.level), [3, 4, 5]);
  assert.equal(model.inBattleSkills[3], null);
  assert.equal(model.decisiveCommand.maxCharges, 4);
});

test("暂停和恢复重复触发时只恢复一个战斗循环", () => {
  const previousCancel = global.cancelAnimationFrame;
  let cancelCount = 0;
  let resumeCount = 0;
  let hudCount = 0;
  const state = { mode: "fight" };
  const context = { animationId: 77, lastTime: 0 };
  global.cancelAnimationFrame = () => { cancelCount += 1; };
  try {
    const controller = lobbyController.create({
      shared: { battleRuntime: { resumeBattle() { resumeCount += 1; } } },
      dom: { battleScreen: { classList: { remove() {} } } },
      getProfile: () => ({}),
      getState: () => state,
      setState() {},
      getBattleContext: () => context,
      setBattleContext() {},
      getBattleSession: () => null,
      setBattleSession() {},
      getSelectedLevel: () => 1,
      setSelectedLevel() {},
      getSelectedChapter: () => 0,
      setSelectedChapter() {},
      updateHud() { hudCount += 1; },
      drawScene() {}
    });
    controller.pauseGame();
    controller.pauseGame();
    assert.equal(state.mode, "paused");
    assert.equal(cancelCount, 1);
    assert.equal(context.animationId, 0);
    controller.resumeGame();
    controller.resumeGame();
    assert.equal(state.mode, "fight");
    assert.equal(resumeCount, 1);
    assert.equal(hudCount, 2);
  } finally {
    global.cancelAnimationFrame = previousCancel;
  }
});

test("云端写操作继续共用同一把锁", () => {
  const app = fs.readFileSync(path.join(root, "src/h5/app/gameApp.js"), "utf8");
  assert.match(app, /var gatewayActionLock = \{ busy: false \}/);
  assert.equal((app.match(/gatewayActionLock: gatewayActionLock/g) || []).length, 4);

  for (const modulePath of [
    "src/h5/app/lobbyController.js",
    "src/h5/app/fighterUpgradeController.js",
    "src/h5/app/featurePanelController.js",
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

test("云端星级不会覆盖本地完整战斗统计", () => {
  const merged = battleFlowController.mergeSettlementRating({
    stars: 2,
    killedEnemies: 454,
    damageTaken: 3,
    bossClearTime: 27.4
  }, {
    stars: 3,
    label: "3星"
  });

  assert.deepEqual(merged, {
    stars: 3,
    killedEnemies: 454,
    damageTaken: 3,
    bossClearTime: 27.4,
    label: "3星"
  });
});
