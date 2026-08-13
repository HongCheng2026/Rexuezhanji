"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("排行榜、任务和成就使用独立页面根类与统一模态类", () => {
  const controller = read("src/h5/UI/FeaturePanels/featurePanelController.js");
  const runtime = read("src/h5/Game/Core/applicationRuntime.js");

  assert.match(controller, /ranking:\s*" modal-feature-panel ranking-feature-panel"/);
  assert.match(controller, /task:\s*" modal-feature-panel task-feature-panel"/);
  assert.match(controller, /achievement:\s*" modal-feature-panel achievement-feature-panel"/);
  for (const className of [
    "modal-feature-panel",
    "ranking-feature-panel",
    "task-feature-panel",
    "achievement-feature-panel"
  ]) {
    assert.match(runtime, new RegExp(`"${className}"`));
  }
});

test("三个模态页面共享半透明外壳并移除顶部粗线", () => {
  const css = read("src/h5/UI/FeaturePanels/mainFeaturePanelsView.css");
  const html = read("src/h5/Shell/game-frame.html");

  assert.match(css, /\.feature-panel\.main-feature-panel\.feature-panel-standard\.modal-feature-panel\s*\{[^}]*rgba\(3, 13, 25, 0\.34\)/s);
  assert.doesNotMatch(css, /\.feature-panel\.main-feature-panel\.feature-panel-standard\.modal-feature-panel\s*\{[^}]*backdrop-filter:/s);
  assert.match(css, /\.feature-panel\.main-feature-panel\.feature-panel-standard\.modal-feature-panel \.feature-panel-box\s*\{[^}]*rgba\(7, 28, 48, 0\.74\)/s);
  assert.match(css, /\.feature-panel\.main-feature-panel\.feature-panel-standard\.modal-feature-panel \.feature-panel-box::after\s*\{[^}]*content:\s*none;/s);
  assert.match(html, /mainFeaturePanelsView\.css\?v=20260806-smoothness-v1/);
});

test("关闭模态页面时清除合成根类，避免影响后续战斗定位", () => {
  const controller = read("src/h5/UI/FeaturePanels/featurePanelController.js");

  assert.match(controller, /function closeFeaturePanel\(\)\s*\{[\s\S]*?activePanelKey = "";\s*setFeaturePanelMode\(""\);[\s\S]*?classList\.add\("hidden"\)/);
});
