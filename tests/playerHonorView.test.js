"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const mockHonorAssets = Array.from({ length: 10 }, (_, index) => "assets/runtime/Shared/honor/honor-tier-" + String(index + 1).padStart(2, "0") + ".png");

function loadFresh() {
  const modulePath = require.resolve("../src/h5/UI/Honor/playerHonorView.js");
  delete require.cache[modulePath];
  return require(modulePath);
}

function createHonorScope() {
  return { assets: { HONOR_BADGE_ASSETS: mockHonorAssets } };
}

test("玩家荣誉位于独立 UI 模块并在大厅控制器前加载", () => {
  const loader = read("src/h5/Shell/shared-loader.js");
  const html = read("src/h5/Shell/game-frame.html");
  const lobby = read("src/h5/UI/Lobby/lobbyController.js");
  assert.ok(loader.indexOf("UI/Honor/playerHonorView.js") < loader.indexOf("UI/Lobby/lobbyController.js"));
  assert.match(loader, /"playerHonorView"/);
  assert.match(html, /UI\/Honor\/playerHonorView\.css/);
  assert.match(html, /id="pilotHonor"/);
  assert.match(lobby, /playerHonorView\.render\(dom\.pilotHonor, player\)/);
});

test("荣誉模块提供 10 个唯一称号和图片素材键", () => {
  const previous = global.RXGame;
  global.RXGame = createHonorScope();
  const view = loadFresh();
  assert.equal(view.HONOR_TIERS.length, 10);
  assert.equal(new Set(view.HONOR_TIERS.map((item) => item.title)).size, 10);
  assert.equal(new Set(view.HONOR_TIERS.map((item) => item.assetKey)).size, 10);
  assert.deepEqual(view.HONOR_TIERS.map((item) => item.numeral), ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"]);
  assert.equal(view.HONOR_TIERS[0].title, "新翼学员");
  assert.equal(view.HONOR_TIERS[9].title, "不朽传奇");
  global.RXGame = previous;
});

test("旧罗马徽章可迁移，并按当前佩戴荣誉在原位置渲染图片", () => {
  const previous = global.RXGame;
  global.RXGame = createHonorScope();
  const view = loadFresh();
  assert.equal(view.getHonorDefinition(null, "VII").level, 7);

  const attributes = {};
  const container = {
    className: "pilot-honor",
    innerHTML: "",
    setAttribute(name, value) { attributes[name] = value; }
  };
  const result = view.render(container, { honorLevel: 8, equippedHonorLevel: 3, badge: "VIII" });
  assert.equal(result.title, "巡航先锋");
  assert.match(container.className, /player-honor--tier-3/);
  assert.equal(attributes["data-honor-level"], "3");
  assert.equal(attributes["data-honor-title"], "巡航先锋");
  assert.match(container.innerHTML, /honor-tier-03\.png/);
  assert.match(container.innerHTML, /<img class="player-honor-art/);
  assert.match(container.innerHTML, />III</);
  assert.match(container.innerHTML, />HONOR</);
  assert.doesNotMatch(container.innerHTML, /星域统领/);
  assert.doesNotMatch(container.innerHTML, /<(?:svg|path|circle|rect)\b/);
  global.RXGame = previous;
});

test("玩家只能佩戴已经获得的荣誉，旧存档默认佩戴最高等级", () => {
  const previous = global.RXGame;
  global.RXGame = createHonorScope();
  const view = loadFresh();
  const player = { honorLevel: 6, badge: "VI" };
  assert.equal(view.getEquippedHonorLevel(player), 6);
  assert.equal(view.equipHonor(player, 3).title, "巡航先锋");
  assert.equal(player.equippedHonorLevel, 3);
  assert.equal(view.getEquippedHonorDefinition(player).level, 3);
  assert.equal(view.equipHonor(player, 7), null);
  assert.equal(player.equippedHonorLevel, 3);
  global.RXGame = previous;
});

test("战绩页荣誉图鉴完整展示十级图片 UI、佩戴状态和锁定状态", () => {
  const previous = global.RXGame;
  global.RXGame = createHonorScope();
  const view = loadFresh();
  const html = view.renderCatalog({ honorLevel: 6, equippedHonorLevel: 3, badge: "VI" });
  assert.equal((html.match(/class="player-honor-card /g) || []).length, 10);
  assert.equal((html.match(/aria-pressed="true"/g) || []).length, 1);
  assert.equal((html.match(/ disabled/g) || []).length, 4);
  assert.equal((html.match(/data-profile-action="equip-honor"/g) || []).length, 10);
  assert.match(html, /player-honor-card--tier-1/);
  assert.match(html, /player-honor-card--tier-10/);
  for (const tier of view.HONOR_TIERS) {
    assert.match(html, new RegExp(tier.title));
    assert.match(html, new RegExp(tier.callSign));
    assert.match(html, new RegExp("player-honor-art--tier-" + tier.level));
    assert.match(html, new RegExp("honor-tier-" + String(tier.level).padStart(2, "0") + "\\.png"));
  }
  assert.match(html, /H-III/);
  assert.match(html, /当前佩戴/);
  assert.match(html, /点击佩戴/);
  assert.match(html, /佩戴中/);
  assert.match(html, /HONOR ASCENSION PROTOCOL/);
  assert.doesNotMatch(html, /<(?:svg|path|circle|rect)\b/);
  global.RXGame = previous;
});

test("荣誉图片注册到统一运行时素材入口", () => {
  const assets = read("src/h5/Presentation/Assets/assets.js");
  assert.match(assets, /"ui\/honor": "Shared\/honor\/"/);
  assert.match(assets, /const HONOR_BADGE_ASSETS/);
  assert.match(assets, /honor-tier-/);
  assert.match(assets, /HONOR_BADGE_ASSETS,/);
  for (let index = 1; index <= 10; index += 1) {
    const file = path.join(root, "assets/runtime/Shared/honor/honor-tier-" + String(index).padStart(2, "0") + ".png");
    assert.equal(fs.existsSync(file), true, file + " should exist");
  }
});

test("玩家资料战绩分页接入荣誉图鉴", () => {
  const controller = read("src/h5/Gameplay/Player/profileController.js");
  assert.match(controller, /playerHonorView\.renderCatalog\(profile\.player \|\| \{\}\)/);
  assert.match(controller, /player-profile-record-stats/);
  assert.match(controller, /type === "equip-honor"/);
  assert.match(controller, /playerHonorView\.equipHonor/);
  assert.match(controller, /persistProfileMetadata\(\)/);
  assert.match(controller, /renderLobby\(\)/);
});

test("佩戴等级随存档规范化并由云端校验不可越级", () => {
  const previous = global.RXGame;
  global.RXGame = {};
  const profilePath = require.resolve("../src/h5/Gameplay/Player/profile.js");
  delete require.cache[profilePath];
  const profile = require(profilePath);
  const legacy = profile.normalizeProfile({ saveVersion: 8, player: { honorLevel: 8, badge: "VIII" } });
  const selected = profile.normalizeProfile({ saveVersion: 8, player: { honorLevel: 8, equippedHonorLevel: 3, badge: "VIII" } });
  const clamped = profile.normalizeProfile({ saveVersion: 8, player: { honorLevel: 8, equippedHonorLevel: 10, badge: "VIII" } });
  assert.equal(legacy.player.equippedHonorLevel, 8);
  assert.equal(selected.player.equippedHonorLevel, 3);
  assert.equal(clamped.player.equippedHonorLevel, 8);
  for (const file of ["src/backend/functions/game-api/index.ts", "supabase/functions/game-api/index.ts"]) {
    const backend = read(file);
    assert.match(backend, /equippedHonorLevel/);
    assert.match(backend, /不能佩戴尚未获得的荣誉勋章/);
  }
  global.RXGame = previous;
});

test("荣誉样式保持页面级作用域且不再包含 CSS/SVG 徽章绘制规则", () => {
  const css = read("src/h5/UI/Honor/playerHonorView.css");
  const view = read("src/h5/UI/Honor/playerHonorView.js");
  assert.match(css, /\.lobby-screen \.player-honor/);
  assert.match(css, /\.feature-panel\.profile-dossier-panel \.player-honor-catalog/);
  assert.match(css, /\.player-honor-art/);
  assert.match(css, /linear-gradient\(45deg, transparent 45%/);
  assert.match(css, /right top \/ 15px 15px no-repeat/);
  assert.doesNotMatch(css, /(^|\n)\s*\.(?:player-honor|player-honor-icon|player-honor-title)\b/);
  assert.doesNotMatch(css, /player-honor-(?:frame|glyph|energy-halo|orbit|mark)/);
  assert.doesNotMatch(view, /<(?:svg|path|circle|rect)\b/);
});
