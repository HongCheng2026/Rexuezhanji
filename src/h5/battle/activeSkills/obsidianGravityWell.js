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
    var effect = {
      type: SKILL_ID,
      activeSkillId: SKILL_ID,
      x: point.x,
      y: point.y,
      radius: Math.max(1, Number(skill.radius) || 140),
      life: Math.max(0.1, Number(skill.duration) || 5),
      duration: Math.max(0.1, Number(skill.duration) || 5),
      color: "#b86cff"
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
    var referenceDamage = scope.weaponSystem.getReferenceVolleyDamage(context.loadout, Number(skill.referenceLevel) || 8);
    var damage = Math.round(referenceDamage * (Number(skill.damageBudget) || 1) / totalTicks);
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
    gradient.addColorStop(0, "rgba(255, 255, 255, " + (0.72 * alpha).toFixed(3) + ")");
    gradient.addColorStop(0.24, "rgba(184, 108, 255, " + (0.5 * alpha).toFixed(3) + ")");
    gradient.addColorStop(0.64, "rgba(91, 43, 172, " + (0.26 * alpha).toFixed(3) + ")");
    gradient.addColorStop(1, "rgba(12, 4, 32, 0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(205, 166, 255, " + (0.72 * alpha).toFixed(3) + ")";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius * (0.78 + Math.sin(progress * Math.PI * 4) * 0.12), 0, Math.PI * 2);
    ctx.stroke();
  }

  scope.activeSkillSystem.registerActiveSkillHandler(SKILL_ID, {
    canCast: canCast,
    activate: activate,
    update: update,
    drawEffect: drawEffect
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
