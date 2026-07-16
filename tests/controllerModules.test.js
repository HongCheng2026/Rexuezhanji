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
const economyFeatureController = require(path.join(root, "src/h5/app/economyFeatureController.js"));
const endlessModeRoomController = require(path.join(root, "src/h5/endless/endlessModeRoomController.js"));
const battleInput = require(path.join(root, "src/h5/battle/battleInput.js"));

test("拆分后的控制器都提供统一工厂入口", () => {
  assert.equal(typeof profileController.create, "function");
  assert.equal(typeof fighterUpgradeController.create, "function");
  assert.equal(typeof gameEventRouter.create, "function");
  assert.equal(typeof lobbyController.create, "function");
  assert.equal(typeof featurePanelController.create, "function");
  assert.equal(typeof battleUiController.create, "function");
  assert.equal(typeof battleFlowController.create, "function");
  assert.equal(typeof economyFeatureController.create, "function");
  assert.equal(typeof endlessModeRoomController.create, "function");
});

test("gameApp 只调度拆分控制器，不再定义对应大块业务函数", () => {
  const source = fs.readFileSync(path.join(root, "src/h5/app/gameApp.js"), "utf8");
  assert.ok(source.split(/\r?\n/).length <= 950, "gameApp 应控制在 950 行以内");
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
    '"app/economyFeatureController.js"',
    '"app/battleUiController.js"',
    '"app/battleFlowController.js"',
    '"endless/endlessModeRoomController.js"',
    '"battle/battleInput.js"',
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

test("社交、活动中心和无尽面板从总视图拆成独立模块", () => {
  const loader = fs.readFileSync(path.join(root, "src/h5/shared-loader.js"), "utf8");
  const main = fs.readFileSync(path.join(root, "src/h5/ui/mainFeaturePanelsView.js"), "utf8");
  assert.match(loader, /ui\/socialFeaturePanelsView\.js/);
  assert.match(loader, /ui\/eventModeHubView\.js/);
  assert.match(loader, /endless\/endlessModeEntryView\.js/);
  assert.match(loader, /endless\/endlessModeSettlementView\.js/);
  assert.match(loader, /endless\/endlessModeRoomController\.js/);
  assert.doesNotMatch(fs.readFileSync(path.join(root, "src/h5/app/battleFlowController.js"), "utf8"), /startEndlessMode|finishEndlessRun/);
  assert.doesNotMatch(main, /function renderFriendPanel|function renderRankingPanel|function renderChatPanel|function renderEventPanel/);
  assert.match(main, /scope\.socialFeaturePanelsView/);
  assert.match(main, /scope\.eventModeHubView/);
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
  const endless = fs.readFileSync(path.join(root, "src/h5/endless/endlessModeRoomController.js"), "utf8");
  const lobby = fs.readFileSync(path.join(root, "src/h5/app/lobbyController.js"), "utf8");
  assert.match(router, /battleInput\.getActiveSlotIndex\(event\)/);
  assert.match(endless, /battleInput\.getActiveSlotIndex\(event\)/);
  assert.match(router, /eventCode === "Space"[\s\S]*tryUseDecisiveCommand\(\)/);
  assert.match(router, /action === "active-auto-toggle"[\s\S]*toggleActiveSlotAuto/);
  assert.doesNotMatch(router, /weaponSystem\.shoot|tryCastActiveSkill|data\.pauseAction/);
  assert.doesNotMatch(lobby, /chapterSelect\.innerHTML|showPauseOverlay|pause-actions/);
});

test("主动技能 1–4 同时兼容顶部数字键、小键盘和浏览器降级键值", () => {
  for (let index = 0; index < 4; index += 1) {
    const number = index + 1;
    assert.equal(battleInput.getActiveSlotIndex({ code: `Digit${number}` }), index);
    assert.equal(battleInput.getActiveSlotIndex({ code: `Numpad${number}` }), index);
    assert.equal(battleInput.getActiveSlotIndex({ key: String(number) }), index);
    assert.equal(battleInput.getActiveSlotIndex({ keyCode: 49 + index }), index);
    assert.equal(battleInput.getActiveSlotIndex({ keyCode: 97 + index }), index);
  }
  assert.equal(battleInput.getActiveSlotIndex({ code: "Digit5" }), -1);
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

test("战斗 HUD 模型区分主动技能状态并显示六个独立武器", () => {
  const model = battleUiController.createModel({
    state: {
      mode: "fight",
      player: {
        hp: 100,
        maxHp: 100,
        weapons: { spread: 3, laser: 4, missile: 5 },
        weaponSkills: {
          fixed: [
            { id: "weapon_fixed_01", name: "脉冲光束", weaponType: "laser", level: 4 },
            { id: "weapon_fixed_02", name: "星芒散射", weaponType: "spread", level: 3 },
            { id: "weapon_fixed_03", name: "猎杀追踪", weaponType: "missile", level: 5 }
          ],
          extensions: [
            { id: "weapon_module_04", name: "侧翼火幕", category: "sidewing", level: 3, nextFireAt: 12, waitingForTarget: false },
            null,
            { id: "weapon_module_06", name: "蜂群导弹舱", category: "missile", level: 2, nextFireAt: 0, waitingForTarget: true }
          ]
        },
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
  assert.deepEqual(model.weaponModules.slice(0, 3).map((item) => item.level), [4, 3, 5]);
  assert.equal(model.weaponModules[3].level, 3);
  assert.equal(model.weaponModules[3].status, "cooldown");
  assert.equal(model.weaponModules[4], null);
  assert.equal(model.weaponModules[5].status, "waiting-target");
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
  assert.equal((app.match(/gatewayActionLock: gatewayActionLock/g) || []).length, 5);

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

test("扫荡使用独立的次数选择和结算界面，未达三星会说明原因", () => {
  const chapterSource = fs.readFileSync(path.join(root, "src/h5/ui/chapterSelectView.js"), "utf8");
  const lobbySource = fs.readFileSync(path.join(root, "src/h5/app/lobbyController.js"), "utf8");
  const dialogSource = fs.readFileSync(path.join(root, "src/h5/ui/sweepDialogView.js"), "utf8");
  const dialogCss = fs.readFileSync(path.join(root, "src/h5/ui/sweepDialogView.css"), "utf8");
  assert.match(chapterSource, /aria-disabled/);
  assert.match(chapterSource, /callbacks\.onSweepUnavailable/);
  assert.match(chapterSource, /callbacks\.onOpenSweep/);
  assert.doesNotMatch(chapterSource, /sweepButton\.disabled\s*=\s*!canSweep/);
  assert.doesNotMatch(chapterSource, /showSweepFeedback/);
  assert.match(lobbySource, /需要三星通关/);
  assert.match(lobbySource, /openSweepSelection/);
  assert.match(dialogSource, /一键最大/);
  assert.match(dialogSource, /扫荡结算/);
  assert.match(dialogSource, /消耗体力/);
  assert.match(dialogSource, /获得金币/);
  assert.match(dialogSource, /获得经验/);
  assert.match(dialogCss, /\.campaign-sweep-modal/);
  assert.doesNotMatch(dialogCss, /42px 42px/);
  assert.match(dialogCss, /\.campaign-sweep-panel::before[\s\S]*inset:\s*2px/);
  assert.doesNotMatch(dialogCss, /!important/);
});
