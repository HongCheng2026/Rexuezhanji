"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

function loadFresh() {
  const modulePath = require.resolve("../src/h5/UI/Leaderboard/leaderboardView.js");
  delete require.cache[modulePath];
  return require(modulePath);
}

function localOptions() {
  return {
    profile: {
      player: { uid: 100000999, name: "测试指挥官" },
      endlessRecord: { bestKills: 9, bestSurvivalSeconds: 132 }
    },
    combatPower: 43210,
    getGameGateway: () => ({ isCloud: false })
  };
}

test("排行榜位于独立 UI 模块并在主面板前加载", () => {
  const loader = read("src/h5/Shell/shared-loader.js");
  const html = read("src/h5/Shell/game-frame.html");
  const social = read("src/h5/UI/FeaturePanels/socialFeaturePanelsView.js");
  assert.ok(loader.indexOf("UI/Leaderboard/leaderboardView.js") < loader.indexOf("UI/FeaturePanels/mainFeaturePanelsView.js"));
  assert.match(html, /UI\/Leaderboard\/leaderboardView\.css/);
  assert.doesNotMatch(social, /renderRankingPanel|data-ranking-board|\[“战力榜”,\s*“通关榜”/);
});

test("排行榜仅提供总战力和无尽挑战两个子模块", () => {
  const previous = global.RXGame;
  global.RXGame = {};
  const view = loadFresh();
  const html = view.renderPanel(localOptions());
  assert.match(html, />总战力</);
  assert.match(html, />无尽挑战</);
  assert.equal((html.match(/data-leaderboard-tab=/g) || []).length, 2);
  assert.doesNotMatch(html, /通关榜|荣誉榜/);
  assert.match(html, /43,210/);
  global.RXGame = previous;
});

test("无尽榜展示击破数与生存时间", () => {
  const previous = global.RXGame;
  global.RXGame = {};
  const view = loadFresh();
  const dom = { featurePanelSlots: { innerHTML: "", querySelector() { return null; } } };
  dom.featurePanelSlots.innerHTML = view.renderPanel(Object.assign(localOptions(), { dom }));
  const tab = { getAttribute: () => "endless" };
  const event = { target: { closest: (selector) => selector === "[data-leaderboard-tab]" ? tab : null } };
  assert.equal(view.handleEvent(event, dom, localOptions()), true);
  assert.equal(view.getActiveCategory(), "endless");
  assert.match(dom.featurePanelSlots.innerHTML, /击破 9 · 02:12/);
  assert.equal(view.formatDuration(3661), "1:01:01");
  global.RXGame = previous;
});

test("全服无尽榜只读取服务端校验后的记录", () => {
  for (const file of [
    "supabase/functions/game-api/services/social.ts",
    "src/backend/functions/game-api/services/social.ts"
  ]) {
    const source = read(file);
    assert.match(source, /category === "endless"/);
    assert.match(source, /from\("endless_records"\)[\s\S]*?order\("best_kills"[\s\S]*?order\("best_survival_seconds"/);
    assert.match(source, /\.limit\(100\)/);
    const submit = source.match(/async function leaderboardSubmit[\s\S]*?\n  }/);
    assert.ok(submit);
    assert.doesNotMatch(submit[0], /endless/);
  }
  const migration = read("src/backend/migrations/202608050001_leaderboards.sql");
  assert.match(migration, /endless_records\(best_kills desc, best_survival_seconds desc\)/);
});

test("排行榜样式由页面级根类隔离", () => {
  const css = read("src/h5/UI/Leaderboard/leaderboardView.css");
  assert.match(css, /\.feature-panel\.main-feature-panel \.leaderboard-module/);
  assert.doesNotMatch(css, /(^|\n)\s*\.(?:leaderboard-commandbar|leaderboard-row|leaderboard-tabs)\b/);
});
