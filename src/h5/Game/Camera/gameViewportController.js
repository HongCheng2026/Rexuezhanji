(function registerGameViewportController(root, factory) {
  "use strict";

  var api = factory(root);
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  if (root) {
    var scope = root.RXGame || (root.RXGame = {});
    scope.gameViewportController = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : window, function createModule(defaultRoot) {
  "use strict";

  var DESIGN_WIDTH = 1600;
  var DESIGN_HEIGHT = 900;

  function create(options) {
    options = options || {};
    var root = options.root || defaultRoot;
    var documentRef = options.document || (root && root.document);
    var viewport = options.viewport;
    var stage = options.stage;
    var designWidth = Number(options.designWidth) || DESIGN_WIDTH;
    var designHeight = Number(options.designHeight) || DESIGN_HEIGHT;
    var listeners = [];
    var running = false;
    var frameRequest = 0;
    var delayedFit = 0;
    var state = {
      width: designWidth,
      height: designHeight,
      scale: 1,
      orientation: "landscape",
      isFullscreen: false,
      canFullscreen: false
    };

    if (!root || !documentRef || !viewport || !stage) {
      throw new Error("GameViewport requires root, document, viewport and stage.");
    }

    function getFullscreenElement() {
      return documentRef.fullscreenElement || documentRef.webkitFullscreenElement || documentRef.mozFullScreenElement || documentRef.msFullscreenElement || null;
    }

    function getRequestMethod() {
      return viewport.requestFullscreen || viewport.webkitRequestFullscreen || viewport.mozRequestFullScreen || viewport.msRequestFullscreen || null;
    }

    function getExitMethod() {
      return documentRef.exitFullscreen || documentRef.webkitExitFullscreen || documentRef.webkitCancelFullScreen || documentRef.mozCancelFullScreen || documentRef.msExitFullscreen || null;
    }

    function supportsFullscreen() {
      var enabled = documentRef.fullscreenEnabled;
      if (enabled === false && !viewport.webkitRequestFullscreen && !viewport.mozRequestFullScreen && !viewport.msRequestFullscreen) return false;
      return typeof getRequestMethod() === "function" && typeof getExitMethod() === "function";
    }

    function readBounds() {
      var visual = root.visualViewport;
      var documentElement = documentRef.documentElement || {};
      return {
        width: Math.max(1, Number(visual && visual.width) || Number(root.innerWidth) || Number(documentElement.clientWidth) || designWidth),
        height: Math.max(1, Number(visual && visual.height) || Number(root.innerHeight) || Number(documentElement.clientHeight) || designHeight),
        left: Math.max(0, Number(visual && visual.offsetLeft) || 0),
        top: Math.max(0, Number(visual && visual.offsetTop) || 0)
      };
    }

    function readSafeInsets() {
      if (typeof root.getComputedStyle !== "function") return { top: 0, right: 0, bottom: 0, left: 0 };
      var computed = root.getComputedStyle(viewport);
      return {
        top: Math.max(0, parseFloat(computed.paddingTop) || 0),
        right: Math.max(0, parseFloat(computed.paddingRight) || 0),
        bottom: Math.max(0, parseFloat(computed.paddingBottom) || 0),
        left: Math.max(0, parseFloat(computed.paddingLeft) || 0)
      };
    }

    function snapshot() {
      return {
        width: state.width,
        height: state.height,
        scale: state.scale,
        orientation: state.orientation,
        isFullscreen: state.isFullscreen,
        canFullscreen: state.canFullscreen
      };
    }

    function notify() {
      var next = snapshot();
      listeners.slice().forEach(function notifyListener(listener) {
        listener(next);
      });
    }

    function fit() {
      var bounds = readBounds();
      viewport.style.width = bounds.width + "px";
      viewport.style.height = bounds.height + "px";
      viewport.style.left = bounds.left + "px";
      viewport.style.top = bounds.top + "px";

      var safe = readSafeInsets();
      var usableWidth = Math.max(1, bounds.width - safe.left - safe.right);
      var usableHeight = Math.max(1, bounds.height - safe.top - safe.bottom);
      var scale = Math.max(0.05, Math.min(usableWidth / designWidth, usableHeight / designHeight));
      state.width = bounds.width;
      state.height = bounds.height;
      state.scale = scale;
      state.orientation = bounds.width >= bounds.height ? "landscape" : "portrait";
      state.isFullscreen = Boolean(getFullscreenElement());
      state.canFullscreen = supportsFullscreen();

      viewport.style.setProperty("--game-scale", String(scale));
      viewport.style.setProperty("--game-center-x", safe.left + usableWidth / 2 + "px");
      viewport.style.setProperty("--game-center-y", safe.top + usableHeight / 2 + "px");
      stage.style.width = designWidth + "px";
      stage.style.height = designHeight + "px";
      stage.style.left = safe.left + usableWidth / 2 + "px";
      stage.style.top = safe.top + usableHeight / 2 + "px";
      stage.style.transform = "translate3d(-50%, -50%, 0) scale(" + scale + ")";
      viewport.classList.add("is-ready");
      viewport.classList.toggle("is-portrait", state.orientation === "portrait");
      viewport.classList.toggle("is-fullscreen", state.isFullscreen);
      notify();
      return snapshot();
    }

    function scheduleFit() {
      if (frameRequest) return;
      var requestFrame = root.requestAnimationFrame || function requestFallback(callback) { return root.setTimeout(callback, 16); };
      frameRequest = requestFrame.call(root, function runFit() {
        frameRequest = 0;
        fit();
      });
    }

    function scheduleDelayedFit() {
      scheduleFit();
      if (delayedFit) root.clearTimeout(delayedFit);
      delayedFit = root.setTimeout(scheduleFit, 140);
    }

    function toggleFullscreen() {
      if (getFullscreenElement()) {
        var exit = getExitMethod();
        if (!exit) return Promise.reject(new Error("FULLSCREEN_EXIT_UNAVAILABLE"));
        try {
          return Promise.resolve(exit.call(documentRef));
        } catch (error) {
          return Promise.reject(error);
        }
      }

      var request = getRequestMethod();
      if (!request) return Promise.reject(new Error("FULLSCREEN_UNAVAILABLE"));
      try {
        return Promise.resolve(request.call(viewport));
      } catch (error) {
        return Promise.reject(error);
      }
    }

    function start() {
      if (running) return api;
      running = true;
      root.addEventListener("resize", scheduleFit);
      root.addEventListener("orientationchange", scheduleDelayedFit);
      root.addEventListener("pageshow", scheduleDelayedFit);
      documentRef.addEventListener("fullscreenchange", scheduleDelayedFit);
      documentRef.addEventListener("webkitfullscreenchange", scheduleDelayedFit);
      documentRef.addEventListener("visibilitychange", scheduleDelayedFit);
      if (root.visualViewport) {
        root.visualViewport.addEventListener("resize", scheduleFit);
        root.visualViewport.addEventListener("scroll", scheduleFit);
      }
      fit();
      return api;
    }

    function stop() {
      if (!running) return;
      running = false;
      root.removeEventListener("resize", scheduleFit);
      root.removeEventListener("orientationchange", scheduleDelayedFit);
      root.removeEventListener("pageshow", scheduleDelayedFit);
      documentRef.removeEventListener("fullscreenchange", scheduleDelayedFit);
      documentRef.removeEventListener("webkitfullscreenchange", scheduleDelayedFit);
      documentRef.removeEventListener("visibilitychange", scheduleDelayedFit);
      if (root.visualViewport) {
        root.visualViewport.removeEventListener("resize", scheduleFit);
        root.visualViewport.removeEventListener("scroll", scheduleFit);
      }
      if (delayedFit) root.clearTimeout(delayedFit);
      delayedFit = 0;
    }

    function subscribe(listener) {
      if (typeof listener !== "function") return function noop() {};
      listeners.push(listener);
      listener(snapshot());
      return function unsubscribe() {
        var index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
      };
    }

    var api = {
      start: start,
      stop: stop,
      fit: fit,
      toggleFullscreen: toggleFullscreen,
      getState: snapshot,
      subscribe: subscribe
    };
    return api;
  }

  return {
    DESIGN_WIDTH: DESIGN_WIDTH,
    DESIGN_HEIGHT: DESIGN_HEIGHT,
    create: create
  };
});
