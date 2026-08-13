(function registerObsidianGravityWell(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var SKILL_ID = "obsidian-gravity-well";

  function canCast(context) {
    return Boolean(selectDensePoint(context.state));
  }

  function activate(context) {
    var point = selectDensePoint(context.state);
    if (!point) return false;
    var skill = context.skill;
    var visual = getVisual(context);
    var effect = {
      type: SKILL_ID,
      activeSkillId: SKILL_ID,
      x: point.x,
      y: point.y,
      radius: Math.max(1, Number(skill.radius) || 140),
      life: Math.max(0.1, Number(skill.duration) || 5),
      duration: Math.max(0.1, Number(skill.duration) || 5),
      color: visual.primary,
      secondaryColor: visual.secondary,
      visualId: context.source === "auto" ? "auto-gravity-well" : "",
      presentationTier: context.source === "auto" ? "automatic" : "standard"
    };
    context.state.skillEffects = context.state.skillEffects || [];
    context.state.skillEffects.push(effect);
    context.runtime.data.effect = effect;
    context.runtime.data.tickTimer = 0;
    return true;
  }

  function update(context, dt) {
    var state = context.state;
    var skill = context.skill;
    var data = context.runtime.data;
    var effect = data && data.effect;
    if (!effect) return;
    pullEnemies(state, effect.x, effect.y, Number(skill.pullRadius) || 180, Number(skill.pullStrength) || 120, dt);
    devourBullets(state, effect.x, effect.y, Number(effect.radius) || Number(skill.radius) || 140);
    data.tickTimer -= dt;
    var interval = Math.max(0.05, Number(skill.tickInterval) || 0.5);
    while (data.tickTimer <= 0 && context.runtime.activeRemaining > 0) {
      damageArea(context, effect);
      data.tickTimer += interval;
    }
  }

  function damageArea(context, effect) {
    if (!scope.collisionSystem || !scope.collisionSystem.damageArea) return;
    var skill = context.skill;
    var totalTicks = Math.max(1, Math.round((Number(skill.duration) || 5) / Math.max(0.05, Number(skill.tickInterval) || 0.5)));
    var snapshotTotal = Math.max(0, Number(skill.totalDamage) || 0);
    var referenceDamage = snapshotTotal > 0
      ? snapshotTotal
      : scope.weaponSystem.getReferenceVolleyDamage(context.loadout, Number(skill.referenceLevel) || 8) * (Number(skill.damageBudget) || 1);
    var damage = Math.round(referenceDamage / totalTicks);
    scope.collisionSystem.damageArea(context.state, effect, effect.radius, damage, context.loadout);
  }

  function pullEnemies(state, x, y, radius, strength, dt) {
    var enemies = Array.isArray(state && state.enemies) ? state.enemies : [];
    for (var i = 0; i < enemies.length; i += 1) {
      var enemy = enemies[i];
      if (!isValidTarget(enemy)) continue;
      var dx = x - enemy.x;
      var dy = y - enemy.y;
      var distance = Math.sqrt(dx * dx + dy * dy) || 1;
      if (distance > radius) continue;
      var pull = (1 - distance / radius) * strength * dt;
      enemy.x += dx / distance * pull;
      enemy.y += dy / distance * pull;
    }
  }

  function devourBullets(state, x, y, radius) {
    var bullets = Array.isArray(state && state.enemyBullets) ? state.enemyBullets : [];
    if (!bullets.length) return;
    var canCancel = scope.collisionSystem && scope.collisionSystem.canCancelEnemyBullet;
    var r2 = radius * radius;
    var survivors = [];
    var changed = false;
    for (var i = 0; i < bullets.length; i += 1) {
      var bullet = bullets[i];
      if (!bullet || bullet.dead) { changed = changed || Boolean(bullet && bullet.dead); continue; }
      if (canCancel && !canCancel(bullet)) { survivors.push(bullet); continue; }
      var dx = bullet.x - x;
      var dy = bullet.y - y;
      if (dx * dx + dy * dy <= r2) { bullet.dead = true; changed = true; }
      else { survivors.push(bullet); }
    }
    if (changed) state.enemyBullets = survivors;
  }

  function selectDensePoint(state) {
    var targets = getTargets(state);
    if (!targets.length) return null;
    var best = targets[0];
    var bestScore = -Infinity;
    for (var i = 0; i < targets.length; i += 1) {
      var score = targets[i] === state.boss ? 3 : 1;
      for (var j = 0; j < targets.length; j += 1) {
        if (i === j) continue;
        var dx = targets[i].x - targets[j].x;
        var dy = targets[i].y - targets[j].y;
        if (dx * dx + dy * dy <= 180 * 180) score += 1;
      }
      if (score > bestScore) {
        bestScore = score;
        best = targets[i];
      }
    }
    return { x: best.x, y: best.y };
  }

  function getTargets(state) {
    var targets = Array.isArray(state && state.enemies) ? state.enemies.filter(isValidTarget) : [];
    if (state && state.boss && isValidTarget(state.boss)) targets.push(state.boss);
    return targets;
  }

  function isValidTarget(target) {
    return Boolean(target && !target.dead && target.canTakeDamage !== false && Number(target.hp) > 0);
  }

  function drawEffect(ctx, effect, alpha, progress) {
    var radius = (effect.radius || 140) * (0.82 + Math.sin(progress * Math.PI * 6) * 0.08);
    var gradient = ctx.createRadialGradient(effect.x, effect.y, radius * 0.1, effect.x, effect.y, radius);
    var automatic = effect.visualId === "auto-gravity-well";
    gradient.addColorStop(0, automatic ? "rgba(230, 255, 241, " + (0.72 * alpha).toFixed(3) + ")" : "rgba(255, 255, 255, " + (0.72 * alpha).toFixed(3) + ")");
    gradient.addColorStop(0.24, automatic ? "rgba(69, 232, 157, " + (0.56 * alpha).toFixed(3) + ")" : "rgba(184, 108, 255, " + (0.5 * alpha).toFixed(3) + ")");
    gradient.addColorStop(0.64, automatic ? "rgba(101, 71, 150, " + (0.22 * alpha).toFixed(3) + ")" : "rgba(91, 43, 172, " + (0.26 * alpha).toFixed(3) + ")");
    gradient.addColorStop(1, "rgba(12, 4, 32, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = automatic ? "rgba(99, 255, 180, " + (0.78 * alpha).toFixed(3) + ")" : "rgba(205, 166, 255, " + (0.72 * alpha).toFixed(3) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius * (0.78 + Math.sin(progress * Math.PI * 4) * 0.12), 0, Math.PI * 2);
    ctx.stroke();
  }

  function getVisual(context) {
    var visual = context.source === "auto" && scope.skillVisualTheme && scope.skillVisualTheme.getAutoVisual
      ? scope.skillVisualTheme.getAutoVisual("auto-gravity-well")
      : null;
    return visual || { primary: "#b86cff", secondary: "#d5a6ff" };
  }

  scope.activeSkillSystem.registerActiveSkillHandler(SKILL_ID, {
    canCast: canCast,
    activate: activate,
    update: update,
    drawEffect: drawEffect
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
