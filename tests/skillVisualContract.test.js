"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const themePath = path.join(root, "src", "h5", "Gameplay", "Combat", "skillVisualTheme.js");

global.RXGame = {};
const theme = require(themePath);

const automaticVisualIds = [
  "auto-sidewing", "auto-orbital", "auto-swarm", "auto-front-spread", "auto-railgun",
  "auto-shockwave", "auto-chain-lightning", "auto-sky-lock", "auto-gravity-well",
  "auto-judgement", "auto-phase-shield"
];

const activeSkillIds = [
  "active-summon-wingman", "active-decoy", "active-chain-lightning", "active-black-hole"
];

test("all out-of-battle upgraded automatic skills share an emerald class signature", () => {
  for (const id of automaticVisualIds) {
    const visual = theme.getAutoVisual(id);
    assert.ok(visual, id + " visual is missing");
    assert.equal(visual.tier, "automatic", id);
    assert.equal(visual.classColor, "#63ffb4", id);
    assert.ok(visual.shape, id + " must keep an individual silhouette language");
  }
});

test("manual active skills are explicitly marked as premium and keep distinct palettes", () => {
  const primaries = new Set();
  for (const id of activeSkillIds) {
    const visual = theme.getActiveVisual(id);
    assert.ok(visual, id + " visual is missing");
    assert.equal(visual.tier, "premium", id);
    primaries.add(visual.primary);
  }
  assert.equal(primaries.size, activeSkillIds.length);
});

test("renderer layers vector trails and staged effects without battle skill sprites", () => {
  const source = fs.readFileSync(path.join(root, "src", "h5", "Gameplay", "Combat", "canvasRenderer.js"), "utf8");
  assert.match(source, /drawSkillFocusBackdrop\(\)/);
  assert.match(source, /drawPremiumSkillUnderlay\(effect/);
  assert.match(source, /drawPremiumSkillOverlay\(effect/);
  assert.match(source, /drawAutomaticSkillSignature\(effect/);
  assert.match(source, /drawAutomaticBulletAccent\(visual\)/);
  assert.doesNotMatch(source, /drawSkillEffectSprite|getSkillRenderable|COMBAT_SKILL_VFX_ASSETS/);
});

test("premium battle effects stay on the lightweight vector render path", () => {
  const rendererSource = fs.readFileSync(path.join(root, "src", "h5", "Gameplay", "Combat", "canvasRenderer.js"), "utf8");
  const chainSource = fs.readFileSync(path.join(root, "src", "h5", "Gameplay", "Ability", "activeChainLightning.js"), "utf8");
  const blackHoleSource = fs.readFileSync(path.join(root, "src", "h5", "Gameplay", "Ability", "activeBlackHole.js"), "utf8");
  const summonSource = fs.readFileSync(path.join(root, "src", "h5", "Gameplay", "Ability", "activeSummonWingman.js"), "utf8");
  const collisionSource = fs.readFileSync(path.join(root, "src", "h5", "Gameplay", "Combat", "collisionSystem.js"), "utf8");

  assert.doesNotMatch(rendererSource, /loadedImage\.decode|createImageBitmap|getSkillRenderable|skillImageRecords/);
  assert.match(rendererSource, /function drawAllies\(/);
  assert.match(rendererSource, /function drawShieldImpact\(/);
  assert.match(rendererSource, /function drawAutomaticBulletAccent\(/);
  assert.match(chainSource, /chainIndex:\s*c/);
  assert.match(chainSource, /chainCount:\s*chain\.length/);
  assert.match(blackHoleSource, /BLACK_HOLE_TICK_SECONDS\s*=\s*0\.1/);
  assert.match(blackHoleSource, /suppressHitFx:\s*true/);
  assert.doesNotMatch(blackHoleSource, /createRadialGradient/);
  assert.match(collisionSource, /source && source\.suppressHitFx/);
  assert.match(summonSource, /var targets = getEnemies\(state\);[\s\S]*selectTargetForAlly\(targets, ally\)/);
  assert.match(summonSource, /function selectTargetForAlly\(targets, ally\)/);
});

test("battle renderer compatibility preload does not decode or upload skill textures", async () => {
  const previousImage = global.Image;
  const previousCreateImageBitmap = global.createImageBitmap;
  let decodeCount = 0;
  let bitmapCount = 0;

  class FakeImage {
    constructor() {
      this.complete = true;
      this.naturalWidth = 512;
      this.decoding = "";
    }
    decode() {
      decodeCount += 1;
      return Promise.resolve();
    }
    addEventListener() {}
  }

  try {
    global.Image = FakeImage;
    global.createImageBitmap = async function createBitmap(image) {
      bitmapCount += 1;
      return { width: image.naturalWidth, height: image.naturalWidth };
    };
    const rendererPath = path.join(root, "src", "h5", "Gameplay", "Combat", "canvasRenderer.js");
    delete require.cache[require.resolve(rendererPath)];
    const rendererApi = require(rendererPath);
    const renderer = rendererApi.create({
      ctx: {},
      assetsConfig: { COMBAT_SKILL_VFX_ASSETS: { activeDecoy: "decoy.png" } }
    });

    const prepared = await renderer.preloadSkillAssets();
    assert.deepEqual(prepared, []);
    assert.equal(decodeCount, 0);
    assert.equal(bitmapCount, 0);
  } finally {
    global.Image = previousImage;
    global.createImageBitmap = previousCreateImageBitmap;
  }
});

test("premium artwork remains available outside battle without being loaded by the battle renderer", () => {
  const assetDir = path.join(root, "assets", "runtime", "combat", "skill-vfx-v8");
  const expected = [
    "active-summon-wingman-vfx.png", "active-decoy-vfx.png", "active-chain-lightning-vfx.png",
    "active-black-hole-vfx.png", "wingman-sprite.png", "bullet-sidewing.png", "bullet-orbital.png",
    "bullet-swarm.png", "bullet-front-spread.png", "bullet-railgun.png", "bullet-shockwave.png"
  ];
  for (const file of expected) assert.equal(fs.existsSync(path.join(assetDir, file)), true, file);
});
