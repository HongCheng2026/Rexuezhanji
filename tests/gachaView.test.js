"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

delete global.RXGame;
const config = require("../src/h5/UI/Gacha/gachaConfig.js");
const view = require("../src/h5/UI/Gacha/gachaView.js");

test("抽卡顶部研究券与钻石使用 UI 图标，关闭符号由按钮居中布局", () => {
  const mount = { innerHTML: "" };
  view.create({
    mount,
    config,
    uiAssets: { resourceTicket: "ticket-ui.png", resourceDiamond: "diamond-ui.png", rewardIcons: {} }
  }).render({
    state: { target: "pilot", pity: 50, history: [] },
    tickets: 9,
    diamonds: 120,
    cloudMode: false,
    targets: {
      pilot: { name: "黑月", codeName: "蚀夜", src: "pilot.png", owned: true },
      ship: { name: "凌光", codeName: "零界", src: "ship.png", owned: false }
    },
    results: [],
    lastDrawCount: 1,
    pendingTopUp: null,
    message: "",
    isError: false
  });

  assert.match(mount.innerHTML, /src="ticket-ui\.png"/);
  assert.match(mount.innerHTML, /src="diamond-ui\.png"/);
  assert.match(mount.innerHTML, /星链研究券/);
  assert.match(mount.innerHTML, /data-gacha-action="close"/);
  assert.match(mount.innerHTML, /重复本体将存入背包/);

  const css = fs.readFileSync(path.resolve(__dirname, "../src/h5/UI/Gacha/gachaView.css"), "utf8");
  assert.match(css, /\.gacha-header\s*>\s*button[\s\S]*align-items:\s*center[\s\S]*justify-content:\s*center/);
});

test("结果卡使用无文字的等比例品质边框，不渲染 R、SR、SSR 品质行", () => {
  const mount = { innerHTML: "" };
  view.create({
    mount,
    config,
    uiAssets: {
      cardBlue: "frame-blue.png",
      cardPurple: "frame-purple.png",
      cardGold: "frame-gold.png",
      cardUltimate: "frame-rainbow.png",
      rewardIcons: { reward: "reward.png" }
    }
  }).render({
    state: { target: "pilot", pity: 50, history: [] },
    tickets: 9,
    diamonds: 120,
    cloudMode: false,
    targets: {
      pilot: { name: "黑月", codeName: "蚀夜", src: "pilot.png", owned: false },
      ship: { name: "凌光", codeName: "零界", src: "ship.png", owned: false }
    },
    results: ["standard", "elite", "legendary", "ultimate"].map((tier) => ({ tier, reward: { id: "reward", label: "奖励 ×1" } })),
    lastDrawCount: 10,
    pendingTopUp: null,
    message: "",
    isError: false
  });

  for (const frame of ["frame-blue.png", "frame-purple.png", "frame-gold.png", "frame-rainbow.png"]) {
    assert.match(mount.innerHTML, new RegExp(frame.replace(".", "\\.")));
  }
  const cards = mount.innerHTML.match(/<article class="gacha-result-card[\s\S]*?<\/article>/g) || [];
  assert.equal(cards.length, 4);
  cards.forEach((card) => assert.doesNotMatch(card, /<small>|>R<|>SR<|>SSR</));

  const css = fs.readFileSync(path.resolve(__dirname, "../src/h5/UI/Gacha/gachaView.css"), "utf8");
  assert.match(css, /aspect-ratio:\s*5\s*\/\s*4/);
  assert.match(css, /\.gacha-reward-frame[\s\S]*background-size:\s*contain/);
});
