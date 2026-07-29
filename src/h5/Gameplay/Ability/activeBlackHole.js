(function registerActiveBlackHole(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var SKILL_ID = "active-black-hole";
  var BLACK_HOLE_TICK_SECONDS = 0.1;
  var BLACK_HOLE_FORWARD_OFFSET = 500;

  function gradeStats(context) {
    return scope.skillGradeConfig
      ? scope.skillGradeConfig.getSkillGradeStats(SKILL_ID, (context.skill && context.skill.grade) ? context.skill.grade : "D")
      : null;
  }

  function canCast() { return true; }

  function activate(context) {
    var gs = gradeStats(context);
    if (!gs) return false;
    var state = context.state;
    var field = state.field || { width: 1280, height: 720 };
    var dim = Math.max(Number(field.width) || 1280, Number(field.height) || 720);
    var radius = Math.max(40, (Number(gs.radiusRatio) || 0.15) * dim);
    var fieldWidth = Math.max(320, Number(field.width) || 1280);
    var fieldHeight = Math.max(240, Number(field.height) || 720);
    var x = Math.min(fieldWidth - 48, state.player.x + BLACK_HOLE_FORWARD_OFFSET);
    var y = Math.max(48, Math.min(fieldHeight - 48, state.player.y));
    var referenceDamage = scope.weaponSystem.getReferenceVolleyDamage(context.loadout, 8);
    var dps = Math.max(1, referenceDamage * (Number(gs.dpsMultiplier) || 0.5));
    var duration = Math.max(0.1, Number(gs.duration) || 2);
    var effect = {
      type: SKILL_ID,
      activeSkillId: SKILL_ID,
      visualId: SKILL_ID,
      presentationTier: "premium",
      x: x,
      y: y,
      radius: radius,
      life: duration,
      duration: duration,
      color: "#2a1a4a",
      dps: dps,
      suppressHitFx: true
    };
    state.skillEffects = state.skillEffects || [];
    state.skillEffects.push(effect);
    state.shake = Math.max(Number(state.shake) || 0, 0.42);
    state.blackHoleFields = state.blackHoleFields || [];
    var fieldObj = {
      x: x,
      y: y,
      radius: radius,
      dps: dps,
      effect: effect,
      damageTimer: 0,
      damageCarry: 0
    };
    state.blackHoleFields.push(fieldObj);
    context.runtime.data.field = fieldObj;
    return true;
  }

  function update(context, dt) {
    var f = context.runtime.data && context.runtime.data.field;
    if (!f) return;
    var state = context.state;
    var step = Math.max(0, Number(dt) || 0);
    f.effect.life = Math.max(0, Number(context.runtime.activeRemaining) || 0);
    f.damageTimer += step;
    if (f.damageTimer >= BLACK_HOLE_TICK_SECONDS) {
      var tickDuration = f.damageTimer;
      f.damageTimer %= BLACK_HOLE_TICK_SECONDS;
      var pendingDamage = Math.max(0, Number(f.damageCarry) || 0) + f.dps * tickDuration;
      var damage = Math.floor(pendingDamage);
      f.damageCarry = pendingDamage - damage;
      if (damage > 0 && scope.collisionSystem && scope.collisionSystem.damageArea) {
        var result = scope.collisionSystem.damageArea(state, f.effect, f.radius, damage, "black-hole");
        emitBlackHoleHitFx(state, f, result && result.hits);
      }
      devourBullets(state, f.x, f.y, f.radius);
    }
    pullEnemies(state, f.x, f.y, f.radius, 40 * step);
  }

  function emitBlackHoleHitFx(state, field, hitCount) {
    var hits = Math.max(0, Math.floor(Number(hitCount) || 0));
    if (!hits || !scope.fxSystem || typeof scope.fxSystem.burst !== "function") return;
    scope.fxSystem.burst(state, field.x, field.y, "#b86cff", Math.min(18, 4 + hits * 2));
  }

  function pullEnemies(state, x, y, radius, pull) {
    var enemies = Array.isArray(state.enemies) ? state.enemies : [];
    for (var i = 0; i < enemies.length; i += 1) {
      var enemy = enemies[i];
      if (!isValidTarget(enemy)) continue;
      var dx = x - enemy.x;
      var dy = y - enemy.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 1;
      if (distance > radius) continue;
      enemy.x += (dx / distance) * pull;
      enemy.y += (dy / distance) * pull;
    }
  }

  function devourBullets(state, x, y, radius) {
    var bullets = Array.isArray(state && state.enemyBullets) ? state.enemyBullets : [];
    if (!bullets.length) return;
    var canCancel = scope.collisionSystem && scope.collisionSystem.canCancelEnemyBullet;
    var r2 = radius * radius;
    var write = 0;
    var changed = false;
    for (var read = 0; read < bullets.length; read += 1) {
      var bullet = bullets[read];
      if (!bullet || bullet.dead) { changed = changed || Boolean(bullet && bullet.dead); continue; }
      if (canCancel && !canCancel(bullet)) { bullets[write++] = bullet; continue; }
      var dx = bullet.x - x;
      var dy = bullet.y - y;
      if (dx * dx + dy * dy <= r2) { bullet.dead = true; changed = true; }
      else { bullets[write++] = bullet; }
    }
    if (changed) bullets.length = write;
  }

  function deactivate(context) {
    var f = context.runtime.data && context.runtime.data.field;
    var state = context.state;
    if (state.blackHoleFields && f) {
      state.blackHoleFields = state.blackHoleFields.filter(function (x) { return x !== f; });
    }
    if (state.skillEffects && f && f.effect) {
      state.skillEffects = state.skillEffects.filter(function (e) { return e !== f.effect; });
    }
  }

  function drawEffect(ctx, effect, alpha, progress) {
    var r = (effect.radius || 60) * (0.92 + Math.sin(progress * Math.PI * 6) * 0.05);
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(0,0,8," + (0.72 * alpha).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.08, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = "rgba(120,48,210," + (0.34 * alpha).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.92, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(1,0,10," + (0.98 * alpha).toFixed(3) + ")";
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowColor = "#d88cff";
    ctx.shadowBlur = 34 * alpha;
    ctx.strokeStyle = "rgba(245,222,255," + (0.95 * alpha).toFixed(3) + ")";
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.4, 0, Math.PI * 2);
    ctx.stroke();
    for (var spoke = 0; spoke < 6; spoke += 1) {
      var spokeAngle = progress * Math.PI * 2 + spoke * Math.PI / 3;
      ctx.strokeStyle = "rgba(157,108,255," + (0.42 * alpha).toFixed(3) + ")";
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(spokeAngle) * r * 0.46, Math.sin(spokeAngle) * r * 0.46);
      ctx.lineTo(Math.cos(spokeAngle) * r * 1.02, Math.sin(spokeAngle) * r * 1.02);
      ctx.stroke();
    }
    for (var ring = 0; ring < 3; ring += 1) {
      var direction = ring % 2 ? -1 : 1;
      var phase = progress * Math.PI * 2 * direction + ring * Math.PI * 0.72;
      var ringRadius = r * (0.58 + ring * 0.15);
      ctx.strokeStyle = ring === 1
        ? "rgba(84,218,255," + (0.82 * alpha).toFixed(3) + ")"
        : "rgba(220,160,255," + ((0.76 - ring * 0.1) * alpha).toFixed(3) + ")";
      ctx.lineWidth = ring === 1 ? 4 : 5;
      ctx.beginPath();
      ctx.arc(0, 0, ringRadius, phase, phase + Math.PI * 1.48);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(228,202,255," + (0.9 * alpha).toFixed(3) + ")";
    for (var i = 0; i < 12; i += 1) {
      var angle = progress * Math.PI * 5 + i * Math.PI / 6;
      var orbit = r * (0.96 - ((progress + i * 0.083) % 1) * 0.52);
      ctx.beginPath();
      ctx.arc(Math.cos(angle) * orbit, Math.sin(angle) * orbit, i % 3 === 0 ? 2.4 : 1.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function isValidTarget(t) {
    return Boolean(t && !t.dead && t.canTakeDamage !== false && Number(t.hp) > 0);
  }

  scope.activeSkillSystem.registerActiveSkillHandler(SKILL_ID, {
    canCast: canCast,
    activate: activate,
    update: update,
    deactivate: deactivate,
    drawEffect: drawEffect
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
