(function runBattlePerformanceHarness(root) {
  "use strict";

  var resultEl = document.querySelector("#result");
  var canvas = document.querySelector("#battle");
  var params = new URLSearchParams(location.search);
  var mode = /^(smooth|auto|quality)$/.test(params.get("mode")) ? params.get("mode") : "auto";
  var bulletCount = Math.max(700, Math.min(1600, Math.floor(Number(params.get("bullets")) || 720)));
  var sampleTarget = Math.max(120, Math.min(900, Math.floor(Number(params.get("frames")) || 240)));
  var warmupFrames = 30;

  try {
    var quality = root.RXGame.visualQualitySystem.create({
      storage: { getItem: function () { return mode; }, setItem: function () {} },
      navigator: root.navigator
    });
    quality.setMode(mode);
    var profile = quality.getEffectiveProfile();
    var logicalWidth = 1280;
    var logicalHeight = 720;
    var scale = profile.renderScale;
    canvas.width = Math.round(logicalWidth * scale);
    canvas.height = Math.round(logicalHeight * scale);
    var ctx = canvas.getContext("2d", { alpha: false });
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    var renderer = root.RXGame.canvasRenderer.create({
      ctx: ctx,
      width: logicalWidth,
      height: logicalHeight,
      assetsConfig: { ASSET_PATHS: { player: "", boss: "" }, ENEMY_BULLET_CODEX: {} },
      levelsConfig: {},
      getShipAsset: function () { return {}; }
    });
    renderer.setQualityProfile(profile);

    var playerBulletCount = Math.min(40, bulletCount);
    var enemyBulletCount = bulletCount - playerBulletCount;
    var state = {
      mode: "fight",
      elapsed: 0,
      shake: 0,
      bossWarning: 0,
      stars: [],
      bullets: createBullets(playerBulletCount, false),
      enemyBullets: createBullets(enemyBulletCount, true),
      enemies: [],
      particles: [],
      shockwaves: [],
      skillEffects: [],
      powerups: [],
      allies: [],
      enemyTelegraphs: [],
      bossTelegraphs: [],
      notices: [],
      player: { x: 120, y: logicalHeight / 2, radius: 22, invincible: 0, shield: 0 }
    };
    var samples = [];
    var totalFrames = 0;
    var lastTime = 0;

    requestAnimationFrame(frame);

    function createBullets(count, enemy) {
      var list = [];
      for (var i = 0; i < count; i += 1) {
        list.push({
          x: 40 + (i * 47) % (logicalWidth - 80),
          y: 30 + (i * 31) % (logicalHeight - 60),
          radius: enemy ? 4.5 : 3.5,
          color: enemy ? "#ff6b5f" : "#73efff",
          shape: "orb",
          vx: enemy ? -22 - (i % 5) * 4 : 80,
          vy: ((i % 7) - 3) * 2
        });
      }
      return list;
    }

    function updateBullets(list, deltaSeconds) {
      for (var i = 0; i < list.length; i += 1) {
        var bullet = list[i];
        bullet.x += bullet.vx * deltaSeconds;
        bullet.y += bullet.vy * deltaSeconds;
        if (bullet.x < -8) bullet.x = logicalWidth + 8;
        if (bullet.x > logicalWidth + 8) bullet.x = -8;
        if (bullet.y < -8) bullet.y = logicalHeight + 8;
        if (bullet.y > logicalHeight + 8) bullet.y = -8;
      }
    }

    function frame(now) {
      var delta = lastTime ? now - lastTime : 16.67;
      lastTime = now;
      totalFrames += 1;
      state.elapsed += Math.min(delta / 1000, 0.033);
      updateBullets(state.bullets, delta / 1000);
      updateBullets(state.enemyBullets, delta / 1000);
      renderer.drawScene(state);
      if (totalFrames > warmupFrames && delta > 0 && delta <= 100) samples.push(delta);
      if (samples.length >= sampleTarget) {
        finish(profile, samples);
        return;
      }
      requestAnimationFrame(frame);
    }
  } catch (error) {
    resultEl.dataset.status = "error";
    resultEl.textContent = "测试启动失败：" + (error && error.message ? error.message : String(error));
    root.__RX_PERF_RESULT__ = { status: "error", message: resultEl.textContent };
  }

  function finish(profile, samples) {
    var sorted = samples.slice().sort(function (a, b) { return a - b; });
    var total = samples.reduce(function (sum, value) { return sum + value; }, 0);
    var average = total / samples.length;
    var p95 = sorted[Math.max(0, Math.ceil(sorted.length * 0.95) - 1)];
    var data = {
      status: "complete",
      mode: mode,
      effectiveMode: profile.effectiveMode,
      renderScale: profile.renderScale,
      bullets: bulletCount,
      frames: samples.length,
      fps: round(1000 / average),
      averageFrameMs: round(average),
      p95FrameMs: round(p95),
      maxFrameMs: round(sorted[sorted.length - 1])
    };
    Object.keys(data).forEach(function (key) { resultEl.dataset[key] = String(data[key]); });
    resultEl.textContent = data.mode + " / " + data.renderScale + "× / " + data.bullets + " 发：" + data.fps + " FPS，P95 " + data.p95FrameMs + "ms，最大 " + data.maxFrameMs + "ms";
    root.__RX_PERF_RESULT__ = data;
  }

  function round(value) {
    return Math.round((Number(value) || 0) * 10) / 10;
  }
})(window);
