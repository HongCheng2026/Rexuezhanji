const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const shellHtml = fs.readFileSync(path.join(root, "src/h5/Shell/index.html"), "utf8");
const compatibilityEntry = fs.readFileSync(path.join(root, "src/h5/index.html"), "utf8");
const gameFrameHtml = fs.readFileSync(path.join(root, "src/h5/Shell/game-frame.html"), "utf8");
const viewportCss = fs.readFileSync(path.join(root, "src/h5/Shell/viewport.css"), "utf8");
const viewportHost = fs.readFileSync(path.join(root, "src/h5/Game/Camera/viewportHost.js"), "utf8");

test("public shell keeps the 1600x900 centered iframe and fullscreen control", () => {
  assert.match(shellHtml, /id="gameViewport"/);
  assert.match(shellHtml, /id="gameStage"/);
  assert.match(shellHtml, /id="gameFrame"/);
  assert.match(shellHtml, /data-src="game-frame\.html"/);
  assert.match(shellHtml, /id="fullscreenToggle"/);
  assert.match(shellHtml, /allowfullscreen/);

  assert.match(viewportCss, /\.game-stage\s*\{[^}]*height:\s*900px;/s);
  assert.match(viewportCss, /\.game-stage\s*\{[^}]*width:\s*1600px;/s);
  assert.match(viewportCss, /transform:\s*translate3d\(-50%,\s*-50%,\s*0\)\s*scale\(var\(--game-scale\)\)/);
  assert.match(viewportCss, /\.game-frame\s*\{[^}]*height:\s*100%;/s);
  assert.match(viewportHost, /stage:\s*stage/);
  assert.match(viewportHost, /frame\.addEventListener\("load"/);
  assert.match(viewportHost, /controller\.fit\(\)/);
});

test("public shell preserves optional slots without forcing a test save", () => {
  assert.doesNotMatch(shellHtml, /codex-fighter-room/);
  assert.match(viewportHost, /root\.location\.search/);
  assert.doesNotMatch(viewportHost, /[?&]slot=/);
});

test("all source preview entries route through the responsive viewport shell", () => {
  assert.match(compatibilityEntry, /new URL\("Shell\/index\.html"/);
  assert.match(gameFrameHtml, /window\.self === window\.top/);
  assert.match(gameFrameHtml, /new URL\("index\.html"/);
  assert.match(gameFrameHtml, /window\.location\.replace\(shellUrl\.href\)/);
});

test("viewport shell stays isolated from gameplay and feature styling", () => {
  assert.doesNotMatch(shellHtml, /(?:UI|Gameplay|World)\//);
  assert.doesNotMatch(viewportCss, /\.lobby-|\.feature-panel|\.battle-/);
  assert.ok(shellHtml.indexOf("id=\"gameStage\"") < shellHtml.indexOf("id=\"gameFrame\""));
});
