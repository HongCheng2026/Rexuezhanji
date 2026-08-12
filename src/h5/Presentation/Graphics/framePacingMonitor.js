(function defineFramePacingMonitor(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var DEFAULT_CAPACITY = 360;
  var MIN_READY_FRAMES = 60;

  function create(options) {
    options = options || {};
    var capacity = Math.max(MIN_READY_FRAMES, Math.floor(Number(options.capacity) || DEFAULT_CAPACITY));
    var samples = [];
    var active = false;
    var lastTimestamp = 0;
    var profile = {};
    var maxBullets = 0;
    var highDensityFrames = 0;
    var hardProtectionFrames = 0;

    function start(nextProfile) {
      samples.length = 0;
      active = true;
      lastTimestamp = 0;
      profile = Object.assign({}, nextProfile || {});
      maxBullets = 0;
      highDensityFrames = 0;
      hardProtectionFrames = 0;
      return getSnapshot();
    }

    function suspend() {
      lastTimestamp = 0;
    }

    function stop() {
      active = false;
      lastTimestamp = 0;
      return getSnapshot();
    }

    function record(timestamp, state) {
      if (!active) return false;
      timestamp = Number(timestamp) || 0;
      var playerBullets = state && state.bullets ? state.bullets.length : 0;
      var enemyBullets = state && state.enemyBullets ? state.enemyBullets.length : 0;
      var totalBullets = Math.max(0, playerBullets + enemyBullets);
      maxBullets = Math.max(maxBullets, totalBullets);
      if (totalBullets >= (Number(profile.highDensityBulletBudget) || 320)) highDensityFrames += 1;
      if (totalBullets >= (Number(profile.hardBulletBudget) || 700)) hardProtectionFrames += 1;

      if (!lastTimestamp) {
        lastTimestamp = timestamp;
        return false;
      }
      var delta = timestamp - lastTimestamp;
      lastTimestamp = timestamp;
      // Background tabs, breakpoints and pause overlays are not rendering samples.
      if (!(delta > 0) || delta > 100) return false;
      samples.push(delta);
      if (samples.length > capacity) samples.shift();
      return true;
    }

    function percentile(values, ratio) {
      if (!values.length) return 0;
      var sorted = values.slice().sort(function (a, b) { return a - b; });
      var index = Math.max(0, Math.min(sorted.length - 1, Math.ceil(sorted.length * ratio) - 1));
      return sorted[index];
    }

    function round(value, digits) {
      var factor = Math.pow(10, digits || 0);
      return Math.round((Number(value) || 0) * factor) / factor;
    }

    function getSnapshot() {
      var total = samples.reduce(function (sum, value) { return sum + value; }, 0);
      var average = samples.length ? total / samples.length : 0;
      return {
        active: active,
        sampleReady: samples.length >= MIN_READY_FRAMES,
        frames: samples.length,
        fps: average > 0 ? round(1000 / average, 1) : 0,
        averageFrameMs: round(average, 1),
        p95FrameMs: round(percentile(samples, 0.95), 1),
        maxFrameMs: round(samples.length ? Math.max.apply(Math, samples) : 0, 1),
        maxBullets: maxBullets,
        highDensityFrames: highDensityFrames,
        hardProtectionFrames: hardProtectionFrames,
        mode: profile.mode || "auto",
        effectiveMode: profile.effectiveMode || profile.mode || "auto",
        renderScale: Number(profile.renderScale) || 1
      };
    }

    return {
      start: start,
      record: record,
      suspend: suspend,
      stop: stop,
      getSnapshot: getSnapshot
    };
  }

  var singleton = create();
  singleton.create = create;
  scope.framePacingMonitor = singleton;
  if (typeof module !== "undefined" && module.exports) module.exports = singleton;
})(typeof globalThis !== "undefined" ? globalThis : this);
