const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");

const root = path.resolve(__dirname, "..");

function loadFresh(relativePath) {
  const modulePath = path.join(root, relativePath);
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

function createDom() {
  return {
    featurePanelKicker: { textContent: "" },
    featurePanelTitle: {
      textContent: "",
      classList: { remove() {} }
    },
    featurePanelBody: { textContent: "" },
    featurePanelSlots: {
      className: "",
      innerHTML: "",
      querySelector() { return null; }
    }
  };
}

test("活动中心使用常驻左侧玩法栏，并切换已注册的真实玩法", () => {
  const previousGame = global.RXGame;
  global.RXGame = {};
  const hub = loadFresh("src/h5/UI/FeaturePanels/eventModeHubView.js");
  hub.registerMode({ id: "endless", label: "无尽模式", navSubtitle: "进行中", getFrame: () => "frame.webp", render: () => "ENDLESS" });
  hub.registerMode({ id: "trial", label: "试炼模式", navSubtitle: "开放中", getFrame: () => "trial.webp", render: () => "TRIAL" });
  const dom = createDom();

  assert.equal(hub.renderPanel(dom, { profile: {} }), true);
  assert.match(dom.featurePanelSlots.innerHTML, /data-feature-back/);
  assert.match(dom.featurePanelSlots.innerHTML, /活动中心/);
  assert.ok(
    dom.featurePanelSlots.innerHTML.indexOf("活动中心") <
      dom.featurePanelSlots.innerHTML.indexOf("data-feature-back"),
    "返回按钮应位于功能区标题之后，由右上角热区承载"
  );
  assert.match(dom.featurePanelSlots.innerHTML, /data-event-mode-option="endless"/);
  assert.match(dom.featurePanelSlots.innerHTML, /ENDLESS/);

  const option = { getAttribute: () => "trial" };
  const optionEvent = { target: { closest: (selector) => selector === "[data-event-mode-option]" ? option : null } };
  assert.equal(hub.handleEvent(optionEvent, dom, { profile: {} }), true);
  assert.equal(hub.getActiveModeId(), "trial");
  assert.match(dom.featurePanelSlots.innerHTML, /trial\.webp/);
  assert.match(dom.featurePanelSlots.innerHTML, /TRIAL/);
  global.RXGame = previousGame;
});

test("未注册活动以三个敬请期待占位，不伪造可开始的玩法", () => {
  const previousGame = global.RXGame;
  global.RXGame = {};
  const hub = loadFresh("src/h5/UI/FeaturePanels/eventModeHubView.js");
  hub.registerMode({ id: "endless", label: "无尽模式", render: () => "ENDLESS" });
  const dom = createDom();
  hub.renderPanel(dom, { profile: {} });
  assert.equal((dom.featurePanelSlots.innerHTML.match(/data-event-mode-placeholder=/g) || []).length, 3);
  assert.equal((dom.featurePanelSlots.innerHTML.match(/<strong>敬请期待<\/strong>/g) || []).length, 3);
  assert.equal(hub.getModes().length, 1);
  global.RXGame = previousGame;
});

test("无尽入口仅显示主视觉、战绩、简要规则和开始操作", () => {
  const previousGame = global.RXGame;
  global.RXGame = {};
  const hub = loadFresh("src/h5/UI/FeaturePanels/eventModeHubView.js");
  global.RXGame.assets = { FEATURE_PANEL_ASSETS: { endlessDarkTideEntryFrame: "assets/runtime/event/feature-panels/event-hub-dark-tide-frame-return-right.webp" } };
  loadFresh("src/h5/Presentation/Endless/endlessModeAssets.js");
  const endless = loadFresh("src/h5/Presentation/Endless/endlessModeEntryView.js");
  const html = endless.render({ endlessRecord: { bestKills: 6, bestSurvivalSeconds: 199 } }, {});
  assert.equal(hub.getModes().length, 1);
  assert.match(html, /个人最佳/);
  assert.match(html, /最近一局/);
  assert.match(html, /击破后 15 秒进入下一轮/);
  assert.match(html, /data-endless-start/);
  assert.doesNotMatch(html, /金币|钻石|endless-entry-resources|endless-entry-rules|BOSS_VISUALS|循环 BOSS/);
  global.RXGame = previousGame;
});
