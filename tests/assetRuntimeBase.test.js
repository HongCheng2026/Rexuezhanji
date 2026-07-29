"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const assetsFile = path.join(root, "src", "h5", "Presentation", "Assets", "assets.js");
const assetsSource = fs.readFileSync(assetsFile, "utf8");

function loadAssetsAt(href) {
  const url = new URL(href);
  const context = vm.createContext({
    URL,
    location: { href: url.href, pathname: url.pathname },
    module: { exports: {} },
    exports: {}
  });
  context.globalThis = context;
  vm.runInContext(assetsSource, context, { filename: assetsFile });
  return context.module.exports;
}

test("Netlify pretty shell URL resolves runtime assets from the deployment root", () => {
  const assets = loadAssetsAt("https://rexuezhanji.top/shell/game-frame");
  assert.equal(
    assets.FEATURE_PANEL_ASSETS.contactQr,
    "https://rexuezhanji.top/assets/runtime/social/contact/qq-qr.jpg?rev=20260729a"
  );
  assert.equal(
    assets.PILOT_ASSETS[0].src,
    "https://rexuezhanji.top/assets/runtime/pilot/pilot-ss-heiyue.png?rev=20260729a"
  );
});

test("source H5 shell keeps resolving runtime assets from the workspace root", () => {
  const assets = loadAssetsAt("http://127.0.0.1:4173/src/h5/Shell/game-frame.html");
  assert.equal(
    assets.FEATURE_PANEL_ASSETS.contactQr,
    "http://127.0.0.1:4173/assets/runtime/social/contact/qq-qr.jpg?rev=20260729a"
  );
});
