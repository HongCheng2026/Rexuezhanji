"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const worldTime = require("../src/h5/World/Time/worldTimeSystem.js");

function read(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

test("world time anchors server UTC to monotonic elapsed time", () => {
  let wall = Date.UTC(2026, 7, 9, 0, 0, 0);
  let monotonic = 100;
  const clock = worldTime.create({
    wallNow: () => wall,
    monotonicNow: () => monotonic
  });

  assert.equal(clock.sync({ unixMs: Date.UTC(2026, 7, 9, 4, 5, 6) }, { source: "server" }), true);
  assert.equal(clock.getSnapshot().dateText, "2026.08.09");
  assert.equal(clock.getSnapshot().timeText, "12:05:06");
  assert.equal(clock.getSource(), "server");
  assert.equal(clock.isSynchronized(), true);

  monotonic += 2500;
  wall += 86400000;
  assert.equal(clock.now(), Date.UTC(2026, 7, 9, 4, 5, 8, 500));
  assert.equal(clock.getSnapshot().timeText, "12:05:08");
});

test("Shanghai date and ISO week keys cross UTC boundaries correctly", () => {
  let monotonic = 0;
  const clock = worldTime.create({
    wallNow: () => Date.UTC(2026, 7, 9, 15, 59, 59),
    monotonicNow: () => monotonic
  });

  assert.equal(clock.dateKey(), "2026-08-09");
  monotonic += 1000;
  assert.equal(clock.dateKey(), "2026-08-10");
  assert.equal(clock.weekKey(new Date("2021-01-01T12:00:00.000Z")), "2020-W53");
});

test("daily reset countdown uses Shanghai world time", () => {
  const base = Date.UTC(2026, 7, 8, 20, 30, 0); // 2026-08-09 04:30 UTC+8
  const clock = worldTime.create({ wallNow: () => base, monotonicNow: () => 0 });
  assert.equal(clock.nextDailyResetAt(5), Date.UTC(2026, 7, 8, 21, 0, 0));
  assert.equal(clock.millisecondsUntilDailyReset(5), 30 * 60 * 1000);
  assert.equal(clock.sync("not-a-time"), false);
});

test("loader, gateway and lobby expose one shared world clock", () => {
  const loader = read("src/h5/Shell/shared-loader.js");
  const worldIndex = loader.indexOf("World/Time/worldTimeSystem.js");
  assert.ok(worldIndex >= 0);
  assert.ok(worldIndex < loader.indexOf("World/Mission/taskSystem.js"));

  const shell = read("src/h5/Shell/game-frame.html");
  const css = read("src/h5/UI/Lobby/lobby.css");
  const lobbyController = read("src/h5/UI/Lobby/lobbyController.js");
  const runtime = read("src/h5/Game/Core/applicationRuntime.js");
  const cloudSave = read("src/h5/Data/SaveData/cloud-save.js");
  const localGateway = read("src/h5/Game/Gateway/localGateway.js");
  const backend = read("supabase/functions/game-api/index.ts");
  assert.match(shell, /id="worldClockTime"/);
  assert.match(shell, />--:--<\/time>/);
  assert.doesNotMatch(shell, /id="worldClockDate"/);
  const worldTimePanelCss = css.match(/\.lobby-screen \.world-time-panel\s*\{[^}]*\}/s);
  const quickNavCss = css.match(/\.lobby-screen \.quick-nav\s*\{[^}]*\}/s);
  assert.ok(worldTimePanelCss);
  assert.ok(quickNavCss);
  assert.doesNotMatch(worldTimePanelCss[0], /(?:^|\n)\s*border(?:-[a-z]+)?\s*:/);
  assert.match(css, /\.world-time-panel::before\s*\{[^}]*linear-gradient\(112deg/s);
  assert.match(css, /\.quick-nav > \.hud-skin-wide\s*\{[^}]*inset:\s*0 -86px 0 0/s);
  const panelLeft = Number(worldTimePanelCss[0].match(/left:\s*(\d+)px/)[1]);
  const quickNavLeft = Number(quickNavCss[0].match(/left:\s*(\d+)px/)[1]);
  const quickNavWidth = Number(quickNavCss[0].match(/width:\s*(\d+)px/)[1]);
  assert.equal(panelLeft, quickNavLeft + quickNavWidth);
  assert.match(quickNavCss[0], /top:\s*8px/);
  assert.match(lobbyController, /snapshot\.timeText\.slice\(0,\s*5\)/);
  assert.match(lobbyController, /setAttribute\("title",\s*dateTooltip\)/);
  assert.match(lobbyController, /setAttribute\("data-date",\s*dateTooltip\)/);
  assert.match(css, /\.world-time-panel:hover::after/);
  assert.match(runtime, /worldTimeSystem\.sync\(result\.worldTime/);
  assert.match(cloudSave, /worldTimeSystem\.sync\(result\.worldTime/);
  assert.match(localGateway, /worldTime:\s*\{\s*unixMs:\s*Date\.now\(\)/);
  assert.match(backend, /worldTime:\s*\{\s*unixMs:\s*Date\.now\(\)/);
});
