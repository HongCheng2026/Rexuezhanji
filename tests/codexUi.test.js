"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const view = fs.readFileSync(path.join(root, "src/h5/UI/Codex/codexView.js"), "utf8");
const css = fs.readFileSync(path.join(root, "src/h5/UI/Codex/codexView.css"), "utf8");
const controller = fs.readFileSync(path.join(root, "src/h5/UI/FeaturePanels/featurePanelController.js"), "utf8");
const codexController = fs.readFileSync(path.join(root, "src/h5/UI/Codex/codexController.js"), "utf8");
const room = fs.readFileSync(path.join(root, "src/h5/UI/Codex/codexRoom.js"), "utf8");
const runtime = fs.readFileSync(path.join(root, "src/h5/Game/Core/applicationRuntime.js"), "utf8");
const assets = fs.readFileSync(path.join(root, "src/h5/Presentation/Assets/assets.js"), "utf8");
const balance = fs.readFileSync(path.join(root, "src/h5/Gameplay/Collection/codexBalance.js"), "utf8");
const system = fs.readFileSync(path.join(root, "src/h5/Gameplay/Collection/codexSystem.js"), "utf8");

test("图鉴使用机库同尺度的独立档案舱外壳", () => {
  assert.match(codexController, /openShell\("codex-panel"\)/);
  assert.doesNotMatch(controller, /enemyCodex|codexView/);
  assert.match(room, /context\.codex/);
  assert.match(runtime, /"codex-panel"/);
  assert.match(css, /\.feature-panel\.codex-panel \.feature-panel-box\s*\{[^}]*max-width:\s*1180px;/s);
  assert.match(css, /\.feature-panel\.codex-panel \.feature-panel-box::before\s*\{[^}]*var\(--rx-hangar-bg\)/s);
  assert.match(css, /\.feature-panel\.codex-panel \.feature-panel-box > \.panel-close\s*\{[^}]*position:\s*absolute;/s);
});

test("图鉴保持左侧分类并以索引加详情三栏同屏展示", () => {
  for (const label of ["战姬", "战机", "首领", "敌机", "羁绊"]) {
    assert.match(view, new RegExp(`label: "${label}"`));
  }
  assert.match(view, /className = "codex-index-pane"/);
  assert.match(view, /className = "codex-detail"/);
  assert.match(css, /\.codex-module\s*\{[^}]*grid-template-columns:\s*132px minmax\(0, 1fr\);/s);
  assert.match(css, /\.codex-content\s*\{[^}]*grid-template-columns:\s*minmax\(250px, \.78fr\) minmax\(0, 1\.62fr\);/s);
});

test("未解锁条目仍可查看完整战术资料", () => {
  assert.doesNotMatch(view, /codex-detail-locked/);
  assert.match(view, /class="codex-reward-state">待解锁/);
  assert.match(view, /完整战术资料可预览/);
  assert.match(view, /战术说明可预览/);
  assert.match(view, /弹道资料可预览/);
  assert.match(view, /aria-live/);
  assert.match(view, /aria-pressed/);
});

test("战姬与战机详情调用链显式传入玩家档案和图鉴控制器回调", () => {
  assert.match(view, /renderUnitDetail\(item, detail, "pilot", unlocked, profile, opts\)/);
  assert.match(view, /renderUnitDetail\(item, detail, "ship", unlocked, profile, opts\)/);
  assert.match(view, /function renderUnitDetail\(item, detail, type, unlocked, profile, opts\)/);
});

test("五类普通图鉴使用头像加名称的单列目录", () => {
  assert.match(view, /className = "codex-card-copy"/);
  assert.match(css, /\.codex-grid\s*\{[^}]*grid-template-columns:\s*1fr;/s);
  assert.match(css, /\.codex-card\s*\{[^}]*grid-template-columns:\s*50px minmax\(0, 1fr\);/s);
  assert.match(css, /\.codex-card-art\s*\{[^}]*height:\s*48px;[^}]*width:\s*48px;/s);
});

test("战姬只显示攻击和破甲，战机额外显示生命，并将介绍移入档案区", () => {
  assert.doesNotMatch(view, /一目了然|图鉴全局加成|已由指挥官点亮|原生/);
  assert.doesNotMatch(assets, /拥有极高伤害、生命与破甲增幅/);
  assert.match(view, /codeName: s\.codeName, damage: s\.damage, hp: s\.hp/);
  assert.match(view, /var hpVal = type === "ship"/);
  assert.match(view, /if \(type === "ship"\) html \+= statRowTile\("出战生命", hpVal, hpVal \/ 5\);/);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-stats-ship\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/s);
  assert.match(view, /PERSONAL RECORD/);
  assert.match(view, /FIGHTER RECORD/);
  assert.match(view, /codex-unit-lore/);
  assert.match(view, /story: p\.story/);
});

test("单位详情严格分为上半作战区与下半档案区，并共享同一底色", () => {
  assert.match(view, /class="codex-unit-upper"[\s\S]*class="codex-unit-lore"/);
  assert.match(css, /\.codex-detail-unit\s*\{[^}]*linear-gradient\(145deg, #071a2b, #030c16 72%\);[^}]*grid-template-rows:/s);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-detail-unit\s*\{[^}]*linear-gradient\(145deg, #071a2b, #030c16 72%\);/s);
  assert.match(css, /\.codex-unit-upper\s*\{[^}]*grid-template-columns:\s*auto minmax\(0, 1fr\);/s);
  // 图像卡使用机库背景（替代原先的纯黑渐变），且剪影与图像都受图卡边界裁切
  assert.match(css, /\.codex-image-card\s*\{[^}]*var\(--rx-hangar-bg/s);
  assert.match(css, /\.codex-image-card\s*\{[^}]*overflow:\s*hidden/s);
  assert.match(css, /\.codex-image-card-pilot\s*\{[^}]*aspect-ratio:\s*9 \/ 16/s);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-image-card-ship\s*\{[^}]*aspect-ratio:\s*9 \/ 16/s);
});

test("获得后加成与羁绊左右合并，并由图鉴控制器手动激活", () => {
  assert.match(view, /class="codex-unit-synergy"/);
  assert.match(view, /data-codex-activate-unit/);
  assert.match(view, /opts\.onActivate\("unit", item\._id\)/);
  assert.doesNotMatch(view, /profile\.codex|persistProfileMetadata/);
  assert.match(codexController, /system\.activateEntry\(profile, kind, id\)/);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-unit-synergy\s*\{[^}]*grid-template-columns:/s);
});

test("图鉴索引固定展示整体激活属性汇总并反馈云端保存结果", () => {
  assert.match(view, /className = "codex-bonus-summary"/);
  assert.match(view, /图鉴总加成/);
  assert.match(view, /scope\.codexSystem\.getActivationSummary\(profile\)/);
  assert.match(view, /formatBonusPercent\(bonus\.armorPenetrationFlat\)/);
  assert.match(view, /formatBonusPercent\(bonus\.coinBonusMultiplier\)/);
  assert.match(codexController, /激活未保存，已按云端状态恢复，请重试/);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-bonus-summary\s*\{/);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-bonus-summary-grid\s*\{/);
});

test("羁绊详情以上半图像信息区和下半协同档案区展示", () => {
  assert.match(view, /class="codex-bond-portraits"/);
  assert.match(view, /class="codex-bond-portrait/);
  assert.match(view, /class="codex-bond-upper"[\s\S]*class="codex-bond-lower"[\s\S]*class="codex-bond-record"/);
  assert.doesNotMatch(view, /figcaption|LINKED UNIT VISUAL|FORMATION RECORD/);
  assert.doesNotMatch(view, /已点亮，加成已计入图鉴全局战力|codex-bond-action/);
  assert.match(css, /\.codex-detail-bond\s*\{[^}]*grid-template-rows:/s);
  assert.match(css, /\.codex-bond-lower\s*\{[^}]*grid-template-rows:/s);
  assert.match(css, /\.codex-bond-portraits\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);/s);
});

test("战姬与战机详情使用连续档案版式且只保留小传或战机档案", () => {
  assert.doesNotMatch(view, /战术定位|核心武装/);
  assert.match(view, /"人物小传" : "战机档案"/);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-unit-reward,[\s\S]*?\.feature-panel\.codex-panel \.codex-unit-bonds\s*\{[^}]*background:\s*transparent;[^}]*border:\s*0;/s);
  // 小传与上半作战区共享父容器底色，不再单独叠加渐变
  assert.match(css, /\.codex-unit-lore\s*\{[^}]*background:\s*transparent/s);
});

test("详情页使用明确的标题数值正文三级字号与海军蓝层次", () => {
  assert.match(css, /\.codex-detail-body h3,[\s\S]*?\.codex-bond-head h3\s*\{[^}]*font-size:\s*28px;/s);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-stat strong\s*\{[^}]*font-size:\s*22px;/s);
  assert.match(css, /\.codex-lore-story\s*\{[^}]*font-size:\s*13px;/s);
  assert.match(css, /\.codex-detail-bond \.codex-bond-head h3\s*\{[^}]*font-size:\s*27px;/s);
  assert.match(css, /\.codex-bond-record \.codex-bond-desc\s*\{[^}]*font-size:\s*13px;/s);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-unit-command\s*\{[^}]*linear-gradient\(135deg,[^}]*padding:\s*12px 18px;/s);
  assert.match(css, /\.codex-bond-lower\s*\{[^}]*linear-gradient\(110deg, #0a2438, #061522 72%\);/s);
});

test("战姬与战机信息区一次看全且不显示内部滑块", () => {
  assert.match(css, /\.feature-panel\.codex-panel \.codex-info-body\s*\{[^}]*grid-template-rows:\s*auto auto;[^}]*overflow:\s*visible;/s);
  assert.doesNotMatch(css, /\.codex-info-body::-(?:webkit-)?scrollbar/);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-unit-command \.codex-stat-bar\s*\{[^}]*display:\s*none;/s);
  assert.match(css, /\.feature-panel\.codex-panel \.codex-stat\s*\{[^}]*min-height:\s*52px;/s);
  assert.match(view, /class="codex-reward-state/);
  assert.doesNotMatch(view, /档案预览已开放；获得该单位后可手动点亮收藏属性|获得该单位后开放点亮|已点亮 · 加成已计入/);
});

test("单位与羁绊详情不用CSS装饰线制造层级", () => {
  assert.doesNotMatch(css, /\.codex-detail::(?:before|after)/);
  assert.doesNotMatch(css, /\.codex-detail-art::after/);
  assert.doesNotMatch(css, /\.codex-unit-lore::after/);
  assert.doesNotMatch(css, /\.codex-bond-visual::before/);
  assert.doesNotMatch(css, /\.codex-unit-synergy\s*\{[^}]*border(?:-(?:top|right|bottom|left))?\s*:/s);
  assert.doesNotMatch(css, /\.codex-unit-lore\s*\{[^}]*border(?:-(?:top|right|bottom|left))?\s*:/s);
  assert.doesNotMatch(css, /\.codex-bond-(?:upper|visual|portrait|lower|head|record)\s*\{[^}]*border(?:-(?:top|right|bottom|left))?\s*:/s);
  assert.match(css, /\.codex-detail-bond \.codex-bond-units h4,[\s\S]*?\.codex-detail-bond \.codex-bond-bonus h4\s*\{[^}]*border:\s*0;/s);
});

test("图鉴提供扩充后的十一套羁绊方案", () => {
  for (const id of [
    "bond_crimson_verdict",
    "bond_coldmoon_lance",
    "bond_bluebird_bastion",
    "bond_peach_shadow",
    "bond_starlight_escort"
  ]) {
    assert.match(balance, new RegExp(id));
  }
});

test("激活奖励按原生品质计算并让SS单位及其羁绊提供破甲", () => {
  assert.match(balance, /B:\s*Object\.freeze\(\{ attackFlat: 1 \}\)/);
  assert.match(balance, /A:\s*Object\.freeze\(\{ attackFlat: 2 \}\)/);
  assert.match(balance, /S:\s*Object\.freeze\(\{ attackFlat: 2 \}\)/);
  assert.match(balance, /SS:\s*Object\.freeze\(\{ attackFlat: 2, armorPenetrationFlat: 0\.02 \}\)/);
  assert.match(balance, /bond_ultimate_starlink[\s\S]*?armorPenetrationFlat: 0\.01/);
  assert.match(system, /String\(asset\.rank \|\| "B"\)\.toUpperCase\(\)/);
  assert.doesNotMatch(system, /pilotRanks|shipRanks/);
});

test("黄点只表示可激活，激活完成后不保留黄点", () => {
  assert.match(view, /activated \? " is-activated" : activatable \? " is-activatable"/);
  assert.match(css, /\.codex-card\.is-activatable::after\s*\{[^}]*background:\s*#ffd166;/s);
  assert.match(css, /\.codex-bond\.activatable::after\s*\{[^}]*background:\s*#ffd166;/s);
  assert.doesNotMatch(css, /\.codex-card\.is-activated::after/);
  assert.match(view, /激活属性/);
  assert.match(view, /已激活/);
  assert.doesNotMatch(view, /点亮属性|点亮羁绊|已点亮|可点亮/);
});

test("BOSS详情使用满高目标影像、未解锁剪影和纵向技能列表", () => {
  assert.match(view, /class="codex-boss-target/);
  assert.match(view, /' is-classified'/);
  assert.match(view, /<h4>技能 <em class="codex-skill-count">/);
  assert.doesNotMatch(view, /<h4>签名技能/);
  assert.match(css, /\.codex-detail-boss\s*\{[^}]*grid-template-rows:/s);
  assert.match(css, /\.codex-boss-skills-grid\s*\{[^}]*grid-template-columns:\s*1fr;/s);
});
