const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const shellHtml = fs.readFileSync(path.join(root, "src/h5/Shell/index.html"), "utf8");
const viewportCss = fs.readFileSync(path.join(root, "src/h5/Shell/viewport.css"), "utf8");
const viewportHost = fs.readFileSync(path.join(root, "src/h5/Game/Camera/viewportHost.js"), "utf8");

test("public shell keeps the 1600x900 centered iframe and fullscreen control", () => {
  assert.match(shellHtml, /id="gameViewport"/);
  assert.match(shellHtml, /id="gameFrame"/);
  assert.match(shellHtml, /data-src="game-frame\.html"/);
  assert.match(shellHtml, /id="fullscreenToggle"/);
  assert.match(shellHtml, /allowfullscreen/);

  assert.match(viewportCss, /\.game-frame\s*\{[^}]*height:\s*900px;/s);
  assert.match(viewportCss, /\.game-frame\s*\{[^}]*width:\s*1600px;/s);
  assert.match(viewportCss, /transform:\s*translate\(-50%,\s*-50%\)\s*scale\(var\(--game-scale\)\)/);
});

test("public shell preserves optional slots without forcing a test save", () => {
  assert.doesNotMatch(shellHtml, /codex-fighter-room/);
  assert.match(viewportHost, /root\.location\.search/);
  assert.doesNotMatch(viewportHost, /[?&]slot=/);
});
