"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("battle backing buffer adapts to low-spec devices and never exceeds 1.25x", () => {
  const source = read("src/h5/UI/HUD/battleUiView.js");
  assert.match(source, /deviceMemory/);
  assert.match(source, /hardwareConcurrency/);
  assert.match(source, /renderScale\s*=\s*lowSpecDevice\s*\?\s*1\s*:\s*1\.25/);
  assert.doesNotMatch(source, /renderScale\s*=\s*1\.5/);
});

test("high-density enemy orbs bypass transforms, shadows and sprite uploads", () => {
  const source = read("src/h5/Gameplay/Combat/canvasRenderer.js");
  assert.match(source, /highDensityMode && visual\.shape === "orb"[\s\S]*?drawFastEnemyOrb/);
  const fastPath = source.slice(source.indexOf("function drawFastEnemyOrb"), source.indexOf("function getPlayerBulletVisual"));
  assert.doesNotMatch(fastPath, /save\(|translate\(|rotate\(|shadowBlur|drawImage/);
});

test("wingman AI reuses target and ally arrays instead of allocating every frame", () => {
  const source = read("src/h5/Gameplay/Ability/activeSummonWingman.js");
  assert.match(source, /state\._wingmanTargets \|\| \(state\._wingmanTargets = \[\]\)/);
  assert.match(source, /allies\.length = write/);
  assert.doesNotMatch(source, /state\.allies = allies\.filter/);
});

test("starting combat stops lobby chat polling", () => {
  const source = read("src/h5/Game/Core/battleFlowController.js");
  assert.match(source, /beginAuthorizedBattle[\s\S]*?mainFeaturePanelsView\.stopChatPolling\(dom\)/);
});

test("settlement resolves the gateway after async initialization", () => {
  const source = read("src/h5/Game/Core/battleFlowController.js");
  assert.match(source, /ensureGameGateway\(\)\.then\(function settleThroughGateway\(\) \{\s*gw = options\.getGameGateway\(\)/);
});
