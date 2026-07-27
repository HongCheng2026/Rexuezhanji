"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
global.RXGame = {
  assets: {
    UI_A_HUD_ASSETS: { resourceGoldIcon: "assets/runtime/Shared/lobby-icons/gold-coin.png" },
    TACTICAL_DOCK_ASSETS: {
      dockBackground: "dock-background.png",
      panelFrame: "panel-frame.png", panelFrameSelected: "panel-frame-selected.png", matrixRadar: "matrix-radar.png",
      resourceTray: "resource-tray.png", scrollTrack: "scroll-track.png", closeButton: "close.png",
      attributeAttack: "attack.png", attributeArmor: "armor.png", attributeLife: "life.png", slotEmpty: "empty.png",
      activeWingman: "summon.png", activeDecoy: "decoy.png", activeChainLightning: "chain.png", activeBlackHole: "black-hole.png",
      passiveFrontSpread: "front-spread.png", passiveRailgun: "railgun.png", passiveShockwave: "shockwave.png", passiveChainLightning: "passive-chain.png",
      activeLockBeam: "lock-beam.png", activeGravityWell: "gravity-well.png", activeJudgement: "judgement.png", activePhaseShield: "phase-shield.png",
      weaponFixedLaser: "laser.png", weaponFixedSpread: "spread.png", weaponFixedMissile: "missile.png",
      weaponSidewing: "sidewing.png", weaponOrbital: "orbital.png", weaponSwarm: "swarm.png"
    }
  },
  profile: { getGold(profile) { return profile.resources.gold; } }
};

const tacticalConfig = require("../src/h5/Gameplay/Fighter/tacticalLoadoutConfig.js");
const skillGradeConfig = require("../src/h5/Data/Config/skillGradeConfig.js");
const autoSkillModule = require("../src/h5/UI/AutoSkill/autoSkillModule.js");
require("../src/h5/UI/Fighter/Upgrade/fighterUpgradeAssets.js");
const modelModule = require("../src/h5/UI/Fighter/Upgrade/fighterUpgradeModel.js");
const viewModule = require("../src/h5/UI/Fighter/Upgrade/fighterUpgradeView.js");

function createFixture(gold = 500000, autoWeaponLevels = { weapon_module_04: 0, weapon_module_05: 1, weapon_module_06: 1 }) {
  const profile = {
    player: { level: 5 }, resources: { gold }, fighterUpgrades: { attack: 1, armorPenetration: 1, hp: 1 },
    activeSkillGrades: { "active-summon-wingman": "D", "active-decoy": "D", "active-chain-lightning": "D", "active-black-hole": "D" },
    autoWeaponLevels: autoWeaponLevels
  };
  const ship = { id: "ship-a-06", name: "蓝隼01", rank: "A", src: "ship.png", damage: 130, hp: 55 };
  const pilot = { id: "pilot-b", name: "林知寒", rank: "B", damage: 45, hp: 20 };
  Object.assign(global.RXGame, {
    tacticalLoadoutConfig: tacticalConfig,
    skillGradeConfig,
    battleRules: { getFighterUpgradeResult(_profile, statType) { return { canUpgrade: true, reason: "", targetLevel: 2, cost: statType === "attack" ? 390 : 585 }; } },
    fighterUpgradeApi: {
      getUpgradeResult(_profile, statType) { return { canUpgrade: true, reason: "", targetLevel: 2, cost: statType === "attack" ? 390 : 585 }; },
      generateBattleLoadout() { return global.RXGame.combatStats.generateBattleLoadout(); }
    },
    shipSkills: {
      ACTIVE_SKILLS: {
        "active-summon-wingman": { id: "active-summon-wingman", name: "召唤僚机", description: "部署 AI 僚机。", cooldown: 25, duration: 0 },
        "active-decoy": { id: "active-decoy", name: "幻影装甲", description: "抵消敌方攻击。", cooldown: 20, duration: 1 },
        "active-chain-lightning": { id: "active-chain-lightning", name: "连锁闪电", description: "连锁攻击多个目标。", cooldown: 20, duration: 0 },
        "active-black-hole": { id: "active-black-hole", name: "黑洞", description: "吸附敌人。", cooldown: 20, duration: 2, minimumFighterRank: "SS" }
      },
      getActiveSkill(id) { return this.ACTIVE_SKILLS[id] || null; }
    },
    tacticalLoadoutSystem: {
      getLoadout() { return { activeSlots: [null, null, null, null], fixedWeaponOverrides: [null, null, null], autoWeaponIds: [null, null, null] }; },
      getUnlockedActiveSkillIds() { return new Set(Object.keys(global.RXGame.shipSkills.ACTIVE_SKILLS)); }
    },
    combatStats: {
      generateBattleLoadout() {
        return { pilot, ship, fighterUpgrades: profile.fighterUpgrades, autoWeapons: { fixed: tacticalConfig.FIXED_AUTO_WEAPONS.map((item) => ({ ...item, level: 3 })) } };
      }
    }
  });
  const levelsConfig = { FIGHTER_MAX_UPGRADE_LEVEL: 60, FIGHTER_UPGRADE_STAT_GAIN: {} };
  const model = modelModule.create({
    shared: global.RXGame, levelsConfig, getProfile: () => profile, getPilotAsset: () => pilot, getShipAsset: () => ship
  });
  const view = viewModule.create({ shared: global.RXGame, levelsConfig, getStatBonus: model.statBonus });
  return { model, view };
}

test("战机强化以三个等尺寸左侧标签切换独立页面", () => {
  const { model, view } = createFixture();
  const baseHtml = view.render(model.snapshot());
  assert.equal((baseHtml.match(/data-dock-page=/g) || []).length, 3);
  assert.match(baseHtml, /data-dock-current-page="base"/);
  assert.match(baseHtml, /量子战术坞<\/strong><span>· 基础强化/);
  assert.match(baseHtml, /class="fu-page fu-page--base"/);
  assert.doesNotMatch(baseHtml, /fu-page--active|fu-page--auto/);
  assert.match(baseHtml, /<img class="fu-art"/);
  assert.doesNotMatch(baseHtml, /<svg\b/);

  model.selectPage("active");
  const activeHtml = view.render(model.snapshot());
  assert.match(activeHtml, /量子战术坞<\/strong><span>· 主动技能/);
  assert.match(activeHtml, /class="fu-page fu-page--active"/);
  assert.equal((activeHtml.match(/class="fu-skill-card/g) || []).length, 4, "主动技能库必须恰好四项");
  for (const name of ["召唤僚机", "幻影装甲", "连锁闪电", "黑洞"]) assert.match(activeHtml, new RegExp(name));

  model.selectPage("auto");
  const autoHtml = view.render(model.snapshot());
  assert.match(autoHtml, /量子战术坞<\/strong><span>· 自动技能/);
  assert.match(autoHtml, /class="fu-page fu-page--auto"/);
  assert.equal((autoHtml.match(/class="fu-auto-slot /g) || []).length, 6);
});

test("点击四个主动技能时显示当前参数、下一品级变化和实战规则", () => {
  const { model, view } = createFixture();
  model.selectPage("active");

  const cases = [
    ["active-summon-wingman", ["最大僚机", "单发伤害", "攻击扇角", "有效射程", "生命耗尽前永久存在"]],
    ["active-decoy", ["护甲持续", "吸收范围", "不扣生命，不计受击"]],
    ["active-chain-lightning", ["连锁目标", "每段伤害", "由近到远连续跳跃"]],
    ["active-black-hole", ["每秒伤害", "作用半径", "仅限 SS、SSS 战机", "战机正前方约 500px", "吞没范围内非首领敌弹"]]
  ];

  for (const [skillId, expectedTexts] of cases) {
    model.selectLibrarySkill(skillId);
    const html = view.render(model.snapshot());
    const detail = (html.match(/id="fu-detail-panel"[\s\S]*?<\/aside>/) || [""])[0];
    assert.match(detail, /当前 D/);
    assert.match(detail, /下一级 C/);
    assert.match(detail, /›/, `${skillId} 应展示下一品级变化`);
    for (const expected of expectedTexts) {
      assert.ok(detail.includes(expected), `${skillId} 详情缺少：${expected}`);
    }
  }
});

test("战机强化明确显示黑洞 SS 门槛并阻止低品级战机装备", () => {
  const { model, view } = createFixture();
  model.selectPage("active");
  model.selectLibrarySkill("active-black-hole");
  const html = view.render(model.snapshot());
  assert.match(html, /SS 战机解锁/);
  assert.match(html, /使用条件：仅限 SS 级以上战机/);
  assert.match(html, /data-dock-equip-active="active-black-hole" disabled/);
  assert.match(html, />SS 战机可用<\/button>/);
});

test("点击主动槽和自动槽时右侧详情跟随槽内技能，固定基础武器也可查看参数", () => {
  const { model, view } = createFixture(500000, {
    weapon_module_04: 3, weapon_module_05: 2, weapon_module_06: 1, "passive-front-spread": 2
  });
  global.RXGame.tacticalLoadoutSystem.getLoadout = function () {
    return {
      activeSlots: [{ skillId: "active-black-hole", autoEnabled: false }, null, null, null],
      fixedWeaponOverrides: [null, null, null],
      autoWeaponIds: ["weapon_module_04", "passive-front-spread", null]
    };
  };

  model.selectSlot("active", 0);
  assert.equal(model.snapshot().selectedActiveSkillId, "active-black-hole");
  assert.match(view.render(model.snapshot()), /<strong>黑洞<\/strong>/);

  model.selectSlot("auto", 0);
  assert.equal(model.snapshot().selectedAutoSkillId, "weapon_fixed_01");
  const fixedHtml = view.render(model.snapshot());
  assert.match(fixedHtml, /基础武器详情/);
  assert.match(fixedHtml, /单发伤害/);
  assert.match(fixedHtml, /同步光束/);
  assert.doesNotMatch(fixedHtml, /data-dock-slot-index="0" disabled/);

  model.selectSlot("auto", 3);
  assert.equal(model.snapshot().selectedAutoSkillId, "weapon_module_04");
  assert.match(view.render(model.snapshot()), /<strong>侧翼火幕<\/strong>/);

  model.selectSlot("auto", 4);
  assert.equal(model.snapshot().selectedAutoSkillId, "passive-front-spread");
  assert.match(view.render(model.snapshot()), /<strong>正面散射<\/strong>/);
});

test("自动技能六槽上下对称并使用 S、SS、SSS 的 1/2/3 替换标记", () => {
  const { model, view } = createFixture();
  model.selectPage("auto");
  const html = view.render(model.snapshot());
  assert.match(html, /<span class="fu-auto-badge">1<\/span>/);
  assert.match(html, /<span class="fu-auto-badge">2<\/span>/);
  assert.match(html, /<span class="fu-auto-badge">3<\/span>/);
  assert.match(html, /S 可替换 1/);
  assert.match(html, /SS 可替换 2/);
  assert.match(html, /SSS 可替换 3/);
  for (const index of [4, 5, 6]) assert.match(html, new RegExp('fu-auto-slot--' + index));
  assert.doesNotMatch(html, /替换规则|可替换首排技能/);
  assert.match(html, /data-dock-upgrade-passive="weapon_module_04"/);
  assert.match(html, /data-dock-select-skill="weapon_module_05"/);
  assert.doesNotMatch(html, /战术链路已就绪|所有配装按战机独立保存/);
});

test("自动技能库包含侧翼火幕与正面散射，已解锁技能可装备并显示参数", () => {
  // 回归防护：曾因 var 提升 / 清单缺项导致这两个技能“只剩图标、无法装备”。
  const { model, view } = createFixture(500000, {
    weapon_module_04: 3, weapon_module_05: 1, weapon_module_06: 1, "passive-front-spread": 2
  });
  model.selectPage("auto");
  model.selectSlot("auto", 3);
  const autoHtml = view.render(model.snapshot());
  const libMatch = autoHtml.match(/fu-auto-library-track">([\s\S]*?)<\/div>\s*<\/section>/);
  const libraryHtml = libMatch ? libMatch[1] : "";
  assert.ok(libraryHtml.includes("侧翼火幕"), "自动技能库必须包含 侧翼火幕");
  assert.ok(libraryHtml.includes("正面散射"), "自动技能库必须包含 正面散射");
  // 默认选中首个技能（侧翼火幕），右区应渲染参数行
  const detail = autoHtml.match(/id="fu-detail-panel"[\s\S]*?<\/aside>/);
  const detailHtml = detail ? detail[0] : "";
  assert.ok(/fu-detail-lines/.test(detailHtml) && /<b>/.test(detailHtml), "右区必须渲染自动技能参数行");
  assert.ok(/data-dock-equip-auto="weapon_module_04"/.test(detailHtml), "已解锁技能应有装备按钮");
  assert.doesNotMatch(detailHtml, /data-dock-equip-auto="weapon_module_04"\s+disabled/, "已解锁技能装备按钮不应禁用");
  // 选中 正面散射 后参数同样可见
  model.selectLibrarySkill("passive-front-spread");
  const frontHtml = view.render(model.snapshot());
  const frontDetail = (frontHtml.match(/id="fu-detail-panel"[\s\S]*?<\/aside>/) || [""])[0];
  assert.ok(/data-dock-equip-auto="passive-front-spread"/.test(frontDetail), "正面散射应有装备按钮");
  assert.doesNotMatch(frontDetail, /data-dock-equip-auto="passive-front-spread"\s+disabled/, "正面散射装备按钮不应禁用");
});

test("页面框架只使用位图装饰并让底部资源栏避开左侧标签", () => {
  const css = fs.readFileSync(path.join(root, "src/h5/UI/Fighter/Upgrade/fighterUpgradeView.css"), "utf8");
  assert.match(css, /--rx-td-nav-w:\s*132px/);
  assert.match(css, /grid-template-columns:\s*var\(--rx-td-nav-w\) minmax\(0, 1fr\)/);
  assert.match(css, /\.fu-nav\s*\{[^}]*grid-row:\s*1 \/ 4/s);
  assert.match(css, /\.fu-footer\s*\{[^}]*grid-column:\s*2/s);
  assert.match(css, /\.fu-nav-tabs\s*\{[^}]*grid-template-rows:\s*repeat\(3, 176px\)/s);
  assert.match(css, /\.fu-auto-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)[^}]*grid-template-rows:\s*repeat\(2, minmax\(0, 1fr\)\)/s);
  assert.match(css, /--rx-td-detail-w:\s*420px/);
  assert.match(css, /\.fu-page\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\) var\(--rx-td-detail-w\)/s);
  assert.match(css, /\.fu-matrix-ship\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.fu-matrix-ship img\s*\{[^}]*max-width:\s*84%[^}]*object-fit:\s*contain/s);
  assert.match(css, /--rx-td-panel-frame/);
  assert.match(css, /--rx-td-panel-frame-selected/);
  assert.match(css, /--rx-td-matrix-radar/);
  assert.equal((css.match(/^\.fu-dock\s*\{/gm) || []).length, 1);
  assert.doesNotMatch(css, /linear-gradient|radial-gradient|conic-gradient|data:image\/svg|<svg/);
  assert.doesNotMatch(css, /\.feature-panel|core-panel-frame|matrix-panel-frame|skill-panel-frame/);
});

test("战机强化旧控制器与旧面板文件保持移除", () => {
  assert.equal(fs.existsSync(path.join(root, "src/h5/Gameplay/Fighter/Upgrade")), false, "旧 UI 目录 Gameplay/Fighter/Upgrade 应已移除");
  for (const name of ["fighterUpgradeController.js", "fighterStatsPanel.js", "fighterSkillPanel.js"]) {
    assert.equal(fs.existsSync(path.join(root, "src/h5/Gameplay/Fighter", name)), false, name);
  }
  assert.equal(fs.existsSync(path.join(root, "src/h5/Presentation/Assets/tacticalDockArt.js")), false);
  for (const name of ["fighterUpgradeAssets.js", "fighterUpgradeModel.js", "fighterUpgradeView.js", "fighterUpgradeRoom.js", "fighterUpgradeView.css"]) {
    assert.equal(fs.existsSync(path.join(root, "src/h5/UI/Fighter/Upgrade", name)), true, "新位置应存在 " + name);
  }
  const html = fs.readFileSync(path.join(root, "src/h5/Shell/game-frame.html"), "utf8");
  assert.match(html, /id="fighterUpgradeScreen"/);
  assert.match(html, /id="fighterUpgradeMount"/);
  const room = fs.readFileSync(path.join(root, "src/h5/UI/Fighter/Upgrade/fighterUpgradeRoom.js"), "utf8");
  assert.doesNotMatch(room, /featurePanelController|featurePanelSlots|fighter-upgrade-panel/);
});

test("自动技能模块以移动语义装备，换槽不会留下重复技能", () => {
  const initial = {
    activeSlots: [null, null, null, null],
    fixedWeaponOverrides: ["passive-shockwave", null, null],
    autoWeaponIds: [null, null, null]
  };
  const moved = autoSkillModule.equip(initial, 4, "passive-shockwave");
  assert.deepEqual(moved.fixedWeaponOverrides, [null, null, null]);
  assert.deepEqual(moved.autoWeaponIds, [null, "passive-shockwave", null]);
  assert.equal(autoSkillModule.findEquippedSlot(moved, "passive-shockwave"), 4);
  const removed = autoSkillModule.unequip(moved, 4);
  assert.deepEqual(removed.autoWeaponIds, [null, null, null]);
});

test("自动技能局部切换替换整个详情面板并使用干净位图背景", () => {
  const viewSource = fs.readFileSync(path.join(root, "src/h5/UI/Fighter/Upgrade/fighterUpgradeView.js"), "utf8");
  const css = fs.readFileSync(path.join(root, "src/h5/UI/Fighter/Upgrade/fighterUpgradeView.css"), "utf8");
  assert.match(viewSource, /panel\.outerHTML\s*=/);
  assert.doesNotMatch(viewSource, /panel\.innerHTML\s*=/);
  assert.match(viewSource, /cssAsset\("dock-background",\s*assets\.dockBackground\)/);
  assert.match(css, /background-image:\s*var\(--rx-td-dock-background\)/);
});
