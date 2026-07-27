"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const viewportModule = require("../src/h5/Game/Camera/gameViewportController.js");

function createEventTarget() {
  const listeners = new Map();
  return {
    addEventListener(type, listener) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(listener);
    },
    removeEventListener(type, listener) {
      const items = listeners.get(type) || [];
      const index = items.indexOf(listener);
      if (index >= 0) items.splice(index, 1);
    },
    dispatch(type) {
      (listeners.get(type) || []).slice().forEach((listener) => listener());
    }
  };
}

function createHarness(width, height, fullscreen) {
  const rootEvents = createEventTarget();
  const visualEvents = createEventTarget();
  const documentEvents = createEventTarget();
  const styleValues = {};
  const classes = new Set();
  const root = Object.assign(rootEvents, {
    innerWidth: width,
    innerHeight: height,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    visualViewport: Object.assign(visualEvents, {
      width,
      height,
      offsetLeft: 0,
      offsetTop: 0
    })
  });
  const documentRef = Object.assign(documentEvents, {
    documentElement: { clientWidth: width, clientHeight: height },
    fullscreenEnabled: Boolean(fullscreen),
    fullscreenElement: null
  });
  const viewport = {
    style: {
      setProperty(name, value) { styleValues[name] = value; }
    },
    classList: {
      add(name) { classes.add(name); },
      toggle(name, force) {
        if (force) classes.add(name);
        else classes.delete(name);
      }
    }
  };
  if (fullscreen) {
    viewport.requestFullscreen = async function requestFullscreen() {
      documentRef.fullscreenElement = viewport;
      documentRef.dispatch("fullscreenchange");
    };
    documentRef.exitFullscreen = async function exitFullscreen() {
      documentRef.fullscreenElement = null;
      documentRef.dispatch("fullscreenchange");
    };
  }
  return { root, document: documentRef, documentRef, viewport, styleValues, classes };
}

test("横屏按照宽高较小的一边整体缩放", () => {
  const harness = createHarness(1920, 1080, false);
  const controller = viewportModule.create(harness);
  const state = controller.fit();

  assert.equal(state.orientation, "landscape");
  assert.equal(state.scale, 1.2);
  assert.equal(harness.styleValues["--game-scale"], "1.2");
  assert.equal(harness.classes.has("is-ready"), true);
  assert.equal(harness.viewport.style.width, "1920px");
  assert.equal(harness.viewport.style.height, "1080px");
});

test("竖屏保持横版比例并在上下留下空间", () => {
  const harness = createHarness(390, 844, false);
  const controller = viewportModule.create(harness);
  const state = controller.fit();

  assert.equal(state.orientation, "portrait");
  assert.equal(state.scale, 390 / 1600);
  assert.equal(Math.round(900 * state.scale), 219);
  assert.equal(harness.classes.has("is-portrait"), true);
});

test("浏览器工具栏改变可见高度后重新适配", () => {
  const harness = createHarness(844, 390, false);
  const controller = viewportModule.create(harness).start();
  harness.root.visualViewport.height = 340;
  harness.root.visualViewport.dispatch("resize");

  assert.equal(controller.getState().scale, 340 / 900);
  assert.equal(harness.viewport.style.height, "340px");
  controller.stop();
});

test("刘海和安全区域不会盖住游戏框", () => {
  const harness = createHarness(900, 600, false);
  harness.root.getComputedStyle = () => ({
    paddingTop: "0px",
    paddingRight: "100px",
    paddingBottom: "0px",
    paddingLeft: "100px"
  });
  const state = viewportModule.create(harness).fit();

  assert.equal(state.scale, 700 / 1600);
  assert.equal(harness.styleValues["--game-center-x"], "450px");
  assert.equal(harness.styleValues["--game-center-y"], "300px");
});

test("全屏按钮在浏览器支持时可以进入和退出", async () => {
  const harness = createHarness(1600, 900, true);
  const controller = viewportModule.create(harness).start();

  assert.equal(controller.getState().canFullscreen, true);
  await controller.toggleFullscreen();
  controller.fit();
  assert.equal(controller.getState().isFullscreen, true);

  await controller.toggleFullscreen();
  controller.fit();
  assert.equal(controller.getState().isFullscreen, false);
  controller.stop();
});

test("不支持全屏的浏览器明确拒绝但不影响缩放", async () => {
  const harness = createHarness(800, 600, false);
  const controller = viewportModule.create(harness);

  await assert.rejects(controller.toggleFullscreen(), /FULLSCREEN_UNAVAILABLE/);
  assert.equal(controller.fit().scale, 0.5);
});
