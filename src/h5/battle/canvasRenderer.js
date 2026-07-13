(function registerCanvasRenderer(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var ctx = options.ctx;
    var WIDTH = options.width || 1280;
    var HEIGHT = options.height || 720;
    var assetsConfig = options.assetsConfig || {};
    var levelsConfig = options.levelsConfig || {};
    var getShipAsset = options.getShipAsset || function emptyShipAsset() { return ""; };
    var clamp = options.clamp || function clampValue(value, min, max) {
      return Math.max(min, Math.min(max, value));
    };
    var state = null;
    var imageCache = {};
    var backgroundGradient = null;

    if (!ctx) throw new Error("Canvas renderer requires a 2D context.");

  function drawScene(nextState) {
    state = nextState;
    if (state && state.level && assetsConfig.getBossVisual) {
      var bossVisual = assetsConfig.getBossVisual(state.level.chapterIndex, state.level.stageInChapter);
      if (bossVisual && bossVisual.src) getImage(bossVisual.src);
    }
    ctx.save();
    if (state && state.shake > 0) {
      ctx.translate((Math.random() - 0.5) * state.shake * 20, (Math.random() - 0.5) * state.shake * 20);
    }
    drawBackground();
    drawStars();
    drawPlayerBullets();
    drawEnemies();
    drawBoss();
    drawParticles();
    drawShockwaves();
    drawSkillEffects();
    drawPowerups();
    drawEnemyBullets();
    drawPlayer();
    drawEnemyTelegraphs();
    drawBossTelegraphs();
    drawBossIntro();
    drawBossWarning();
    drawStoryMessage();
    drawNotices();
    ctx.restore();
  }

  function drawBackground() {
    if (!backgroundGradient) {
      backgroundGradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
      backgroundGradient.addColorStop(0, "#07111f");
      backgroundGradient.addColorStop(0.55, "#0d1d2c");
      backgroundGradient.addColorStop(1, "#17101e");
    }
    ctx.fillStyle = backgroundGradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }

  function drawStars() {
    var stars = state && state.stars ? state.stars : [];
    ctx.fillStyle = "#d7fff5";
    for (var i = 0; i < stars.length; i += 1) {
      var star = stars[i];
      ctx.globalAlpha = 0.18 + Math.min(0.46, star.size / 2.8);
      ctx.fillRect(star.x - star.size / 2, star.y - star.size / 2, star.size, star.size);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    var player = state && state.player;
    if (!player) return;
    ctx.save();
    ctx.globalAlpha = player.invincible > 0 && Math.floor(performance.now() / 90) % 2 ? 0.55 : 1;
    var ship = getShipAsset();
    var battleSrc = ship && ship.battleSrc;
    var image = getImage(battleSrc || assetsConfig.ASSET_PATHS.player);
    if (battleSrc && (!image.complete || !image.naturalWidth)) {
      image = getImage(assetsConfig.ASSET_PATHS.player);
      battleSrc = null;
    }
    if (image.complete && image.naturalWidth) {
      var scale = battleSrc ? Math.max(0.5, Math.min(1.4, Number(ship.battleScale) || 1)) : 1;
      var drawWidth = battleSrc ? (Number(ship.battleWidth) || 110) : 78;
      var drawHeight = battleSrc ? (Number(ship.battleHeight) || 86) : 60;
      drawRotatedImage(image, player.x, player.y, drawWidth * scale, drawHeight * scale, Math.PI / 2);
    } else {
      ctx.fillStyle = "#42d6b5";
      ctx.beginPath();
      ctx.moveTo(player.x + 34, player.y);
      ctx.lineTo(player.x - 24, player.y - 22);
      ctx.lineTo(player.x - 12, player.y);
      ctx.lineTo(player.x - 24, player.y + 22);
      ctx.closePath();
      ctx.fill();
    }
    if (player.shield > 0) {
      ctx.strokeStyle = "rgba(155, 255, 203, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius + 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawEnemies() {
    var enemies = state && state.enemies ? state.enemies : [];
    for (var i = 0; i < enemies.length; i += 1) {
      var enemy = enemies[i];
      var image = getImage(enemy.image);
      if (image.complete && image.naturalWidth) {
        var spriteW = enemy.radius * (enemy.heavy ? 2.18 : 2.04);
        var spriteH = enemy.radius * (enemy.heavy ? 2.92 : 2.72);
        drawRotatedImage(image, enemy.x, enemy.y, spriteW, spriteH, -Math.PI / 2);
      } else {
        ctx.fillStyle = enemy.heavy ? "#ff8a5c" : "#ffcf5a";
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, enemy.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      drawHpBar(enemy, enemy.x - enemy.radius, enemy.y - enemy.radius - 10, enemy.radius * 2, 5);
    }
  }

  function drawBoss() {
    var boss = state && state.boss;
    if (!boss) return;
    drawBossThemeAura(boss);
    var visual = boss.visual || {};
    var image = getImage(visual.src || assetsConfig.ASSET_PATHS.boss);
    if (image.complete && image.naturalWidth) {
      if (visual.src) {
        drawCenteredImage(image, boss.x + (visual.offsetX || 0), boss.y + (visual.offsetY || 0), visual.drawWidth || 168, visual.drawHeight || 156, visual.drawAngle || 0);
      } else {
        drawRotatedImage(image, boss.x - 12, boss.y, 168, 156, -Math.PI / 2);
      }
    } else {
      ctx.fillStyle = "#ff5d73";
      ctx.beginPath();
      ctx.arc(boss.x, boss.y, boss.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    drawHpBar(boss, WIDTH * 0.28, 36, WIDTH * 0.44, 10);
  }

  function drawBossThemeAura(boss) {
    var color = getBossThemeColor(boss.theme);
    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.shadowColor = color;
    ctx.shadowBlur = 26;
    ctx.strokeStyle = color;
    ctx.lineWidth = boss.theme === "armorCore" || boss.theme === "shield" ? 5 : 3;
    ctx.beginPath();
    ctx.arc(boss.x - 8, boss.y, boss.radius + 12, 0, Math.PI * 2);
    ctx.stroke();
    if (boss.theme === "rotating" || boss.theme === "mothership") {
      ctx.globalAlpha = 0.22;
      for (var i = 0; i < 6; i += 1) {
        var angle = (state.elapsed || 0) * 1.2 + i * Math.PI / 3;
        ctx.beginPath();
        ctx.moveTo(boss.x - 8, boss.y);
        ctx.lineTo(boss.x - 8 + Math.cos(angle) * (boss.radius + 32), boss.y + Math.sin(angle) * (boss.radius + 32));
        ctx.stroke();
      }
    }
    if (boss.armorMode === "shielded") {
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(boss.x - 8, boss.y, boss.radius + 18, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function getBossThemeColor(theme) {
    var colors = {
      tutorial: "#5ee7ff",
      fan: "#ffd166",
      shield: "#42f5c8",
      crossfire: "#ff8f5a",
      charge: "#ff4d4d",
      summon: "#ffb347",
      sniper: "#fff2a8",
      armorCore: "#70ffbd",
      rotating: "#ff6bff",
      mothership: "#ff5d73"
    };
    return colors[theme] || "#ff5d73";
  }

  function drawBullets() {
    drawPlayerBullets();
    drawEnemyBullets();
  }

  function drawPlayerBullets() {
    drawBulletList(state && state.bullets, false);
  }

  function drawEnemyBullets() {
    drawBulletList(state && state.enemyBullets, true);
  }

  function drawSkillEffects() {
    var effects = state && state.skillEffects ? state.skillEffects : [];
    if (!effects.length) return;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    for (var i = 0; i < effects.length; i += 1) {
      var effect = effects[i];
      var progress = 1 - Math.max(0, Math.min(1, effect.life / Math.max(0.01, effect.duration || 1)));
      var alpha = Math.max(0, Math.min(1, effect.life / Math.max(0.01, effect.duration || 1)));
      var color = effect.color || "#82f7ff";
      if (effect.type === "stellar-beam") {
        var beamHeight = (effect.height || 80) * (0.38 + Math.sin(progress * Math.PI) * 0.62);
        var grad = ctx.createLinearGradient(effect.x, effect.y - beamHeight / 2, effect.x, effect.y + beamHeight / 2);
        grad.addColorStop(0, "rgba(130, 247, 255, 0)");
        grad.addColorStop(0.36, "rgba(130, 247, 255, " + (0.22 * alpha).toFixed(3) + ")");
        grad.addColorStop(0.5, "rgba(244, 255, 255, " + (0.72 * alpha).toFixed(3) + ")");
        grad.addColorStop(0.64, "rgba(130, 247, 255, " + (0.22 * alpha).toFixed(3) + ")");
        grad.addColorStop(1, "rgba(130, 247, 255, 0)");
        ctx.fillStyle = grad;
        ctx.shadowColor = color;
        ctx.shadowBlur = 28 * alpha;
        ctx.fillRect(effect.x - 20, effect.y - beamHeight / 2, effect.width || 820, beamHeight);
        ctx.strokeStyle = "rgba(220, 255, 255, " + (0.9 * alpha).toFixed(3) + ")";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(effect.x - 6, effect.y);
        ctx.lineTo(effect.x + (effect.width || 820), effect.y);
        ctx.stroke();
      } else if (effect.type === "dark-core") {
        var radius = (effect.radius || 120) * (0.42 + progress * 0.58);
        var darkGrad = ctx.createRadialGradient(effect.x, effect.y, radius * 0.1, effect.x, effect.y, radius);
        darkGrad.addColorStop(0, "rgba(255, 255, 255, " + (0.74 * alpha).toFixed(3) + ")");
        darkGrad.addColorStop(0.24, "rgba(184, 108, 255, " + (0.5 * alpha).toFixed(3) + ")");
        darkGrad.addColorStop(0.62, "rgba(91, 43, 172, " + (0.26 * alpha).toFixed(3) + ")");
        darkGrad.addColorStop(1, "rgba(12, 4, 32, 0)");
        ctx.fillStyle = darkGrad;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "rgba(205, 166, 255, " + (0.72 * alpha).toFixed(3) + ")";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, radius * (1.04 - progress * 0.34), 0, Math.PI * 2);
        ctx.stroke();
      } else if (effect.type === "golden-lances") {
        ctx.strokeStyle = "rgba(255, 209, 102, " + (0.78 * alpha).toFixed(3) + ")";
        ctx.shadowColor = "#ffd166";
        ctx.shadowBlur = 18 * alpha;
        ctx.lineWidth = 3;
        var lanes = effect.lanes || [];
        for (var lane = 0; lane < lanes.length; lane += 1) {
          var y = effect.y + lanes[lane];
          ctx.beginPath();
          ctx.moveTo(effect.x, y);
          ctx.lineTo(effect.x + (effect.width || 760), y + (lane - lanes.length / 2) * 4);
          ctx.stroke();
          ctx.fillStyle = "rgba(255, 244, 184, " + (0.72 * alpha).toFixed(3) + ")";
          ctx.beginPath();
          ctx.moveTo(effect.x + 42 + progress * 180, y);
          ctx.lineTo(effect.x + 12 + progress * 180, y - 8);
          ctx.lineTo(effect.x + 12 + progress * 180, y + 8);
          ctx.closePath();
          ctx.fill();
        }
      }
    }
    ctx.restore();
  }

  function drawBulletList(list, enemy) {
    list = list || [];
    if (!enemy && list.length) {
      ctx.save();
      ctx.globalCompositeOperation = "lighter";
    }
    for (var i = 0; i < list.length; i += 1) {
      var bullet = list[i];
      if (enemy) drawEnemyBullet(bullet);
      else drawPlayerBullet(bullet);
    }
    if (!enemy && list.length) ctx.restore();
  }

  function drawPlayerBullet(bullet) {
    var visual = getPlayerBulletVisual(bullet);
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle || 0);
    drawBulletTrail(visual.trailColor || bullet.trailColor, visual.trailLength, visual.trailHeight);
    if (visual.shape === "beam") drawPlasmaBeam(visual);
    else if (visual.shape === "lance") drawLanceBullet(visual);
    else if (visual.shape === "bolt") drawBoltBullet(visual);
    else drawOrbBullet(visual);
    ctx.restore();
  }

  function drawEnemyBullet(bullet) {
    var visual = getEnemyBulletRenderProfile(bullet);
    var sprite = getEnemyBulletSprite(bullet);
    ctx.save();
    ctx.translate(bullet.x, bullet.y);
    ctx.rotate(bullet.angle || 0);
    if (sprite && sprite.complete && sprite.naturalWidth) {
      var spriteSize = visual.spriteSize || Math.max(16, (bullet.radius || 5) * 3.2);
      ctx.globalAlpha = visual.spriteAlpha;
      ctx.drawImage(sprite, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
      ctx.globalAlpha = 1;
    }
    if (visual.shape === "beam") {
      drawEnemyBeam(visual);
    } else if (visual.shape === "lance") {
      drawLanceBullet(visual);
    } else {
      drawEnemyCore(visual);
    }
    ctx.restore();
  }

  function getPlayerBulletVisual(bullet) {
    if (bullet && bullet._renderProfile) return bullet._renderProfile;
    var type = bullet.type || "normal";
    var base = {
      shape: bullet.shape || "orb",
      core: bullet.color || "#d7fff5",
      glow: bullet.color || "#d7fff5",
      inner: "rgba(255,255,255,0.9)",
      width: bullet.width || Math.max(10, (bullet.radius || 4) * 3),
      height: bullet.height || Math.max(5, (bullet.radius || 4) * 1.6),
      radius: bullet.radius || 4,
      trailColor: bullet.trailColor || "rgba(191,252,255,0.28)",
      trailLength: 20,
      trailHeight: 2,
      shadowBlur: 10
    };
    if (type === "spread") {
      base.shape = "bolt";
      base.core = "#ffd166";
      base.glow = "rgba(255, 197, 80, 0.78)";
      base.inner = "#fff6bd";
      base.width = Math.max(13, bullet.width || 14);
      base.height = Math.max(5, bullet.height || 6);
      base.trailColor = "rgba(255, 196, 82, 0.24)";
      base.trailLength = 18;
      base.shadowBlur = 8;
    } else if (type === "laser" || type === "stellarBeam") {
      base.shape = "beam";
      base.core = "#5ee7ff";
      base.glow = "rgba(76, 229, 255, 0.72)";
      base.inner = "#e8fbff";
      base.width = Math.max(32, bullet.width || 38);
      base.height = Math.max(4, bullet.height || 6);
      base.trailColor = "rgba(94, 231, 255, 0.2)";
      base.trailLength = Math.max(28, base.width * 0.7);
      base.shadowBlur = 10;
    } else if (type === "missile" || type === "goldenLance" || type === "cluster") {
      base.shape = "lance";
      base.core = type === "cluster" ? "#b889ff" : "#ffb347";
      base.glow = type === "cluster" ? "rgba(184, 137, 255, 0.62)" : "rgba(255, 178, 71, 0.68)";
      base.inner = type === "cluster" ? "#f0dcff" : "#fff0b8";
      base.width = Math.max(18, bullet.width || 22);
      base.height = Math.max(8, bullet.height || 10);
      base.trailColor = type === "cluster" ? "rgba(184, 137, 255, 0.22)" : "rgba(255, 172, 74, 0.22)";
      base.trailLength = 26;
      base.shadowBlur = 9;
    } else if (type === "nova" || type === "darkCore") {
      base.shape = "orb";
      base.core = type === "darkCore" ? "#b889ff" : "#82f7ff";
      base.glow = type === "darkCore" ? "rgba(184, 137, 255, 0.72)" : "rgba(130, 247, 255, 0.74)";
      base.radius = Math.max(8, bullet.radius || 9);
      base.trailLength = 24;
      base.shadowBlur = 16;
    }
    bullet._renderProfile = base;
    return base;
  }

  function getEnemyBulletRenderProfile(bullet) {
    if (bullet && bullet._renderProfile) return bullet._renderProfile;
    var source = (bullet && (bullet.bulletVisualId || bullet.patternSource)) || "single";
    var profile = {
      shape: bullet.shape === "beam" ? "beam" : "orb",
      core: bullet.color || "#ff6b45",
      glow: bullet.color || "#ff6b45",
      inner: "#fff3df",
      width: Math.max(12, bullet.width || (bullet.radius || 5) * 3),
      height: Math.max(5, bullet.height || (bullet.radius || 5) * 1.4),
      radius: Math.max(4.5, bullet.radius || 4.5),
      spriteAlpha: 0.72,
      spriteSize: Math.max(16, (bullet.radius || 5) * 3.2),
      shadowBlur: 10
    };
    if (source.indexOf("slow_wall") >= 0 || source.indexOf("wall") >= 0 || source.indexOf("shield") >= 0) {
      profile.shape = "beam";
      profile.core = "#ffb347";
      profile.glow = "rgba(255, 147, 70, 0.78)";
      profile.inner = "#fff0b8";
      profile.width = Math.max(18, bullet.width || 20);
      profile.height = Math.max(5, bullet.height || 6);
      profile.shadowBlur = 9;
    } else if (source.indexOf("sniper") >= 0) {
      profile.shape = "lance";
      profile.core = "#fff2a8";
      profile.glow = "rgba(255, 216, 112, 0.82)";
      profile.inner = "#ffffff";
      profile.width = Math.max(26, bullet.width || 28);
      profile.height = Math.max(5, bullet.height || 6);
      profile.shadowBlur = 14;
    } else if (source.indexOf("rotating") >= 0) {
      profile.shape = "lance";
      profile.core = "#ff6bff";
      profile.glow = "rgba(255, 100, 230, 0.68)";
      profile.inner = "#ffe4ff";
      profile.width = Math.max(18, bullet.width || 18);
      profile.height = Math.max(8, bullet.height || 10);
    } else if (source.indexOf("mothership") >= 0 || source.indexOf("delayed_burst") >= 0) {
      profile.core = "#ff5d73";
      profile.glow = "rgba(255, 73, 112, 0.78)";
      profile.inner = "#ffe1e7";
      profile.radius = Math.max(6, bullet.radius || 6);
      profile.shadowBlur = 14;
    } else if (source.indexOf("triple") >= 0 || source.indexOf("cross") >= 0 || source.indexOf("fan") >= 0) {
      profile.core = "#ff7c93";
      profile.glow = "rgba(255, 97, 126, 0.78)";
      profile.inner = "#ffe5eb";
      profile.radius = Math.max(4.8, bullet.radius || 4.8);
    }
    bullet._renderProfile = profile;
    return profile;
  }

  function drawBulletTrail(color, length, height) {
    if (!color || !length) return;
    ctx.fillStyle = color;
    ctx.fillRect(-length, -(height || 2) / 2, length, height || 2);
  }

  function drawPlasmaBeam(visual) {
    var w = visual.width;
    var h = visual.height;
    ctx.fillStyle = colorOrDefault(visual.glow, "rgba(94,231,255,0.42)");
    drawCapsule(-w * 0.25, -h * 0.72, w, h * 1.44, h);
    ctx.fillStyle = visual.core;
    drawCapsule(-w * 0.18, -h * 0.45, w * 0.9, h * 0.9, h * 0.45);
    ctx.fillStyle = visual.inner;
    drawCapsule(-w * 0.08, -1, w * 0.72, 2, 1);
  }

  function drawBoltBullet(visual) {
    var w = visual.width;
    var h = visual.height;
    ctx.fillStyle = colorOrDefault(visual.glow, "rgba(255,209,102,0.35)");
    ctx.beginPath();
    ctx.moveTo(w * 0.72, 0);
    ctx.lineTo(w * 0.04, -h * 0.74);
    ctx.lineTo(-w * 0.48, -h * 0.36);
    ctx.lineTo(-w * 0.28, 0);
    ctx.lineTo(-w * 0.48, h * 0.36);
    ctx.lineTo(w * 0.04, h * 0.74);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = visual.inner;
    drawCapsule(-w * 0.16, -1, w * 0.56, 2, 1);
  }

  function drawLanceBullet(visual) {
    var w = visual.width;
    var h = visual.height;
    ctx.fillStyle = colorOrDefault(visual.glow, "rgba(255,179,71,0.38)");
    ctx.beginPath();
    ctx.moveTo(w * 0.72, 0);
    ctx.lineTo(-w * 0.34, -h * 0.62);
    ctx.lineTo(-w * 0.12, 0);
    ctx.lineTo(-w * 0.34, h * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = visual.core;
    ctx.beginPath();
    ctx.moveTo(w * 0.48, 0);
    ctx.lineTo(-w * 0.18, -h * 0.34);
    ctx.lineTo(-w * 0.04, 0);
    ctx.lineTo(-w * 0.18, h * 0.34);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = visual.inner;
    drawCapsule(-w * 0.1, -1, w * 0.34, 2, 1);
  }

  function drawOrbBullet(visual) {
    var radius = visual.radius;
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = visual.glow || visual.core;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 1.8, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.fillStyle = visual.core;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawEnemyBeam(visual) {
    ctx.fillStyle = colorOrDefault(visual.glow, "rgba(255,139,71,0.38)");
    drawCapsule(-visual.width * 0.48, -visual.height * 0.62, visual.width, visual.height * 1.24, visual.height);
    ctx.fillStyle = visual.core;
    drawCapsule(-visual.width * 0.42, -visual.height * 0.38, visual.width * 0.84, visual.height * 0.76, visual.height);
    ctx.fillStyle = visual.inner;
    drawCapsule(-visual.width * 0.22, -1, visual.width * 0.44, 2, 1);
  }

  function drawEnemyCore(visual) {
    drawOrbBullet(visual);
    ctx.strokeStyle = colorOrDefault(visual.glow, "rgba(255,107,69,0.62)");
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, visual.radius * 1.45, 0, Math.PI * 2);
    ctx.stroke();
  }

  function drawCapsule(x, y, width, height, radius) {
    radius = Math.max(0, Math.min(radius || 0, Math.abs(height) / 2, Math.abs(width) / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
  }

  function colorOrDefault(value, fallback) {
    return value || fallback;
  }

  function getEnemyBulletSprite(bullet) {
    var codex = assetsConfig.ENEMY_BULLET_CODEX || {};
    var visual = bullet && bullet.bulletVisualId ? codex[bullet.bulletVisualId] : null;
    if (!visual && bullet && bullet.patternSource) {
      var source = bullet.patternSource;
      if (source.indexOf("bomb_mine") >= 0) visual = codex.bomb_mine;
      else if (source.indexOf("mothership") >= 0) visual = codex.mothership_core;
      else if (source.indexOf("rotating") >= 0) visual = codex.rotating;
      else if (source.indexOf("delayed_burst") >= 0) visual = codex.delayed_burst;
      else if (source.indexOf("sniper") >= 0) visual = codex.sniper_warning;
      else if (source.indexOf("slow_wall") >= 0 || source.indexOf("escort") >= 0 || source.indexOf("shield") >= 0) visual = codex.slow_wall;
      else if (source.indexOf("triple") >= 0 || source.indexOf("cross") >= 0 || source.indexOf("fan") >= 0 || source.indexOf("elite") >= 0) visual = codex.triple;
      else visual = codex.single;
    }
    return visual && visual.src ? getImage(visual.src) : null;
  }

  function drawPowerups() {
    var powerups = state && state.powerups ? state.powerups : [];
    var config = levelsConfig.POWERUPS || {};
    for (var i = 0; i < powerups.length; i += 1) {
      var item = powerups[i];
      var color = (config[item.type] && config[item.type].color) || "#ffffff";
      var label = (config[item.type] && config[item.type].name) || item.type;
      var pulse = 1 + Math.sin((state.elapsed || 0) * 8 + i) * 0.08;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 18;
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius * 1.65 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(item.x, item.y, item.radius * 1.08, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#06111c";
      ctx.font = "bold 14px Arial";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(label.charAt(0), item.x, item.y);
      ctx.shadowBlur = 0;
      ctx.fillStyle = "rgba(3, 10, 18, 0.78)";
      ctx.fillRect(item.x - 30, item.y + 24, 60, 18);
      ctx.fillStyle = "#f4f7fb";
      ctx.font = "bold 11px Microsoft YaHei, Arial";
      ctx.fillText(label, item.x, item.y + 33);
      ctx.restore();
    }
  }

  function drawParticles() {
    var particles = state && state.particles ? state.particles : [];
    for (var i = 0; i < particles.length; i += 1) {
      var particle = particles[i];
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2));
      ctx.fillStyle = particle.color || "#ffffff";
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawShockwaves() {
    var waves = state && state.shockwaves ? state.shockwaves : [];
    for (var i = 0; i < waves.length; i += 1) {
      var wave = waves[i];
      ctx.globalAlpha = Math.max(0, wave.life / Math.max(0.01, wave.maxLife || wave.life));
      ctx.strokeStyle = wave.color || "#ffffff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(wave.x, wave.y, wave.radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function drawBossWarning() {
    if (!state || state.bossWarning <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.min(1, state.bossWarning);
    ctx.fillStyle = "#ff5d73";
    ctx.font = "bold 34px Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.fillText("BOSS 来袭", WIDTH / 2, 82);
    ctx.restore();
  }

  function drawEnemyTelegraphs() {
    var telegraphs = state && state.enemyTelegraphs ? state.enemyTelegraphs : [];
    if (!telegraphs.length) return;
    ctx.save();
    for (var i = 0; i < telegraphs.length; i += 1) {
      var item = telegraphs[i];
      var alpha = Math.max(0, Math.min(1, item.life / Math.max(0.1, item.duration || 1)));
      ctx.globalAlpha = 0.18 + alpha * 0.45;
      ctx.strokeStyle = item.color || "#ffcf5a";
      ctx.fillStyle = item.color || "#ffcf5a";
      ctx.lineWidth = 2;
      if (item.type === "sniper") {
        var y = item.y || HEIGHT / 2;
        ctx.fillRect(0, y - 3, WIDTH, 6);
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(WIDTH, y);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawBossIntro() {
    var intro = state && state.bossIntro;
    if (!intro) return;
    var progress = Math.max(0, Math.min(1, intro.life / Math.max(0.1, intro.duration || 3)));
    ctx.save();
    ctx.globalAlpha = 0.34 + progress * 0.22;
    ctx.fillStyle = "#020611";
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 0.82;
    ctx.strokeStyle = "#ff5d73";
    ctx.lineWidth = 2;
    ctx.setLineDash([18, 10]);
    ctx.beginPath();
    ctx.moveTo(WIDTH - 220, 0);
    ctx.lineTo(WIDTH - 220, HEIGHT);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(255, 93, 115, 0.14)";
    ctx.fillRect(WIDTH - 230, 0, 22, HEIGHT);
    ctx.fillStyle = "#ffd166";
    ctx.font = "bold 15px Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.fillText("BOSS WARNING", WIDTH / 2, 78);
    ctx.fillStyle = "#f4f7fb";
    ctx.font = "bold 30px Microsoft YaHei, Arial";
    ctx.fillText(intro.title || "BOSS 接敌", WIDTH / 2, 116);
    ctx.strokeStyle = "rgba(255, 209, 102, 0.62)";
    ctx.strokeRect(WIDTH * 0.22, 88, WIDTH * 0.56, 48);
    ctx.restore();
  }

  function drawBossTelegraphs() {
    var telegraphs = state && state.bossTelegraphs ? state.bossTelegraphs : [];
    if (!telegraphs.length) return;
    ctx.save();
    for (var i = 0; i < telegraphs.length; i += 1) {
      var item = telegraphs[i];
      var alpha = Math.max(0, Math.min(1, item.life / Math.max(0.1, item.duration || 1)));
      ctx.globalAlpha = 0.18 + alpha * 0.22;
      ctx.fillStyle = item.color || "#ff6b8a";
      ctx.strokeStyle = item.color || "#ff6b8a";
      ctx.lineWidth = 2;
      if (item.type === "lanes") {
        var laneCount = Math.max(1, item.laneCount || 4);
        for (var lane = 0; lane < laneCount; lane += 1) {
          var y = 72 + lane * ((HEIGHT - 144) / Math.max(1, laneCount - 1));
          ctx.fillRect(0, y - 8, WIDTH, 16);
          ctx.globalAlpha = 0.5 + alpha * 0.25;
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(WIDTH, y);
          ctx.stroke();
          ctx.globalAlpha = 0.18 + alpha * 0.22;
        }
      } else if (item.type === "summon") {
        ctx.fillRect(WIDTH - 250, 58, 210, HEIGHT - 116);
        ctx.globalAlpha = 0.72;
        ctx.strokeRect(WIDTH - 250, 58, 210, HEIGHT - 116);
        ctx.setLineDash([12, 8]);
        ctx.beginPath();
        ctx.moveTo(WIDTH - 250, 58);
        ctx.lineTo(WIDTH - 40, HEIGHT - 58);
        ctx.moveTo(WIDTH - 40, 58);
        ctx.lineTo(WIDTH - 250, HEIGHT - 58);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.globalAlpha = 0.92;
        ctx.font = "bold 18px Microsoft YaHei, Arial";
        ctx.textAlign = "center";
        ctx.fillText("护卫投放区", WIDTH - 145, 86);
      } else if (item.type === "sniper") {
        var sy = item.targetY || HEIGHT / 2;
        ctx.fillRect(0, sy - 4, WIDTH, 8);
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.moveTo(0, sy);
        ctx.lineTo(WIDTH, sy);
        ctx.stroke();
      } else if (item.type === "charge") {
        var cy = item.targetY || HEIGHT / 2;
        ctx.fillRect(0, cy - 22, WIDTH, 44);
        ctx.globalAlpha = 0.8;
        ctx.strokeRect(0, cy - 22, WIDTH, 44);
      } else if (item.type === "cross") {
        ctx.beginPath();
        ctx.moveTo(WIDTH, 80);
        ctx.lineTo(0, HEIGHT - 80);
        ctx.moveTo(WIDTH, HEIGHT - 80);
        ctx.lineTo(0, 80);
        ctx.stroke();
        ctx.globalAlpha = 0.18 + alpha * 0.16;
        ctx.beginPath();
        ctx.moveTo(WIDTH, 80);
        ctx.lineTo(0, HEIGHT - 80);
        ctx.lineTo(0, HEIGHT - 40);
        ctx.lineTo(WIDTH, 120);
        ctx.closePath();
        ctx.fill();
      } else {
        var arc = ((item.arcDegrees || 64) * Math.PI) / 180;
        var originX = item.x || WIDTH - 120;
        var originY = item.y || HEIGHT / 2;
        var reach = WIDTH + 120;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX - reach, originY - Math.tan(arc / 2) * reach);
        ctx.lineTo(originX - reach, originY + Math.tan(arc / 2) * reach);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.55 + alpha * 0.25;
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX - reach, originY - Math.tan(arc / 2) * reach);
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX - reach, originY + Math.tan(arc / 2) * reach);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawStoryMessage() {
    if (!state || !state.storyMessage || performance.now() > state.storyMessageUntil) return;
    var text = state.storyMessage.text || state.storyMessage.message || "";
    if (!text) return;
    ctx.save();
    ctx.fillStyle = "rgba(4, 14, 27, 0.72)";
    ctx.fillRect(WIDTH * 0.24, 18, WIDTH * 0.52, 34);
    ctx.strokeStyle = "rgba(66, 214, 181, 0.42)";
    ctx.strokeRect(WIDTH * 0.24, 18, WIDTH * 0.52, 34);
    ctx.fillStyle = "#f4f7fb";
    ctx.font = "bold 15px Microsoft YaHei, Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text.length > 34 ? text.slice(0, 33) + "..." : text, WIDTH / 2, 35);
    ctx.restore();
  }

  function drawNotices() {
    var notices = state && state.notices ? state.notices : [];
    ctx.save();
    ctx.textAlign = "center";
    ctx.font = "bold 18px Microsoft YaHei, Arial";
    for (var i = 0; i < notices.length; i += 1) {
      var notice = notices[i];
      ctx.globalAlpha = Math.min(1, notice.life);
      ctx.fillStyle = notice.color || "#ffffff";
      ctx.fillText(notice.text, notice.x, notice.y);
    }
    ctx.restore();
  }

  function drawHpBar(target, x, y, width, height) {
    var ratio = clamp(target.hp / Math.max(1, target.maxHp), 0, 1);
    ctx.fillStyle = "rgba(0, 0, 0, 0.55)";
    ctx.fillRect(x, y, width, height);
    ctx.fillStyle = ratio > 0.35 ? "#42d6b5" : "#ff6b6b";
    ctx.fillRect(x, y, width * ratio, height);
  }

  function drawRotatedImage(image, centerX, centerY, width, height, angle) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle);
    ctx.drawImage(image, -height / 2, -width / 2, height, width);
    ctx.restore();
  }

  function drawCenteredImage(image, centerX, centerY, width, height, angle) {
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(angle || 0);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);
    ctx.restore();
  }

  function getImage(src) {
    if (!src) return new Image();
    if (!imageCache[src]) {
      imageCache[src] = new Image();
      imageCache[src].src = src.indexOf("data:") === 0 ? src : encodeURI(src);
    }
    return imageCache[src];
  }


    return {
      drawScene: drawScene,
      getImage: getImage
    };
  }

  var api = { create: create };
  scope.canvasRenderer = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof window !== "undefined" ? window : globalThis);
