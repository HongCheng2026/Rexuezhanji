"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("diamond plus opens the dedicated recharge room while contact keeps its own route", () => {
  const html = read("src/h5/Shell/game-frame.html");
  const diamondResource = html.match(/<div class="resource-unit diamond-resource">[\s\S]*?<\/div>\s*<div class="top-command-crest"/);
  assert.ok(diamondResource);
  assert.match(diamondResource[0], /data-panel="recharge"/);
  assert.doesNotMatch(diamondResource[0], /data-panel="redeem"/);

  const room = read("src/h5/UI/FeaturePanels/featurePanelRoom.js");
  assert.match(room, /recharge:\s*"recharge\.open"/);
  assert.match(room, /contact:\s*"contact\.open"/);

  const loader = read("src/h5/Shell/shared-loader.js");
  assert.match(loader, /UI\/FeaturePanels\/contactView\.js/);
  assert.match(loader, /UI\/FeaturePanels\/contactRoom\.js/);
  assert.match(loader, /UI\/Payment\/rechargeRoom\.js/);
});

test("contact view renders only the QR contact content", () => {
  const previous = global.RXGame;
  global.RXGame = { assets: { FEATURE_PANEL_ASSETS: { contactQr: "assets/runtime/social/contact/qq-qr.jpg" } } };
  const modulePath = require.resolve("../src/h5/UI/FeaturePanels/contactView.js");
  delete require.cache[modulePath];
  const view = require(modulePath);
  const dom = {
    featurePanelKicker: { textContent: "" },
    featurePanelTitle: { textContent: "" },
    featurePanelBody: { textContent: "" },
    featurePanelSlots: { className: "", innerHTML: "" }
  };

  view.render(dom);
  assert.equal(dom.featurePanelTitle.textContent, "联系我们");
  assert.match(dom.featurePanelBody.textContent, /添加 QQ/);
  assert.doesNotMatch(dom.featurePanelBody.textContent, /微信/);
  assert.equal(dom.featurePanelSlots.className, "contact-panel-content");
  assert.match(dom.featurePanelSlots.innerHTML, /data-contact-qr/);
  assert.match(dom.featurePanelSlots.innerHTML, /qq-qr\.jpg/);
  assert.match(dom.featurePanelSlots.innerHTML, /QQ 二维码/);
  assert.doesNotMatch(dom.featurePanelSlots.innerHTML, /素材|规则|奖励/);
  assert.ok(fs.existsSync(path.join(root, "assets/runtime/social/contact/qq-qr.jpg")));
  assert.ok(fs.statSync(path.join(root, "assets/runtime/social/contact/qq-qr.jpg")).size > 100000);
  global.RXGame = previous;
});
