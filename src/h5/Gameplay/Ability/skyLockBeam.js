(function registerSkyLockBeam(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var SKILL_ID = "sky-lock-beam";

  function canCast(context) {
    return Boolean(selectTarget(context.state));
  }

  function activate(context) {
    var data = context.runtime.data;
    data.shotsRemaining = Math.max(1, Math.floor(Number(context.skill.shotCount) || 5));
    data.shotTimer = 0;
    return fireNextBeam(context);
  }

  function update(context, dt) {
    var data = context.runtime.data;
    if (!data || data.shotsRemaining <= 0) return;
    data.shotTimer -= dt;
    while (data.shotsRemaining > 0 && data.shotTimer <= 0) {
      if (!fireNextBeam(context)) return;
    }
  }

  function fireNextBeam(context) {
    var target = selectTarget(context.state);
    if (!target) return false;
    var state = context.state;
    var skill = context.skill;
    var data = context.runtime.data;
    var originX = state.player.x + 38;
    var originY = state.player.y;
    var angle = Math.atan2(target.y - originY, target.x - originX);
    var count = Math.max(1, Math.floor(Number(skill.shotCount) || 5));
    var snapshotTotal = Math.max(0, Number(skill.totalDamage) || 0);
    var referenceDamage = snapshotTotal > 0
      ? snapshotTotal
      : scope.weaponSystem.getReferenceVolleyDamage(context.loadout, Number(skill.referenceLevel) || 8) * (Number(skill.damageBudget) || 1);
    var damage = Math.round(referenceDamage / count);
    var visual = getVisual(context, "auto-sky-lock", "#9dffe0");
    state.bullets.push(scope.weaponSystem.createBullet(originX, originY, angle, "skyLockBeam", damage, 1260, 7, visual.primary, {
      owner: "player",
      shape: "beam",
      width: 88,
      height: 7,
      pierceRemaining: 999,
      trailColor: visual.trail || "rgba(99,255,180,0.46)",
      bulletVisualId: context.source === "auto" ? "auto-sky-lock" : ""
    }));
    addEffect(state, {
      type: SKILL_ID,
      activeSkillId: SKILL_ID,
      x: originX,
      y: originY,
      targetX: target.x,
      targetY: target.y,
      life: 0.18,
      duration: 0.18,
      color: visual.primary,
      visualId: context.source === "auto" ? "auto-sky-lock" : "",
      presentationTier: context.source === "auto" ? "automatic" : "standard"
    });
    data.shotsRemaining -= 1;
    data.shotTimer += Math.max(0.1, Number(skill.shotInterval) || 0.6);
    return true;
  }

  function selectTarget(state) {
    var targets = getTargets(state);
    var selected = null;
    var best = -Infinity;
    for (var i = 0; i < targets.length; i += 1) {
      var target = targets[i];
      var hp = Math.max(0, Number(target.hp) || 0);
      var maxHp = Math.max(hp, Number(target.maxHp) || hp);
      var score = maxHp * 0.2;
      if (target === state.boss) score += 500000;
      if (target.enemyType === "elite" || target.heavy) score += 100000;
      if (target.enemyType === "shooter") score += 30000;
      if (score > best) {
        best = score;
        selected = target;
      }
    }
    return selected;
  }

  function getTargets(state) {
    var targets = Array.isArray(state && state.enemies)
      ? state.enemies.filter(function keepValidTarget(target) { return isValidTarget(target, state); })
      : [];
    if (state && state.boss && isValidTarget(state.boss, state)) targets.push(state.boss);
    return targets;
  }

  function isValidTarget(target, state) {
    if (!target || target.dead || target.canTakeDamage === false || Number(target.hp) <= 0) return false;
    return !scope.weaponSystem.isValidMissileTarget || scope.weaponSystem.isValidMissileTarget(target, state);
  }

  function addEffect(state, effect) {
    state.skillEffects = state.skillEffects || [];
    state.skillEffects.push(effect);
  }

  function drawEffect(ctx, effect, alpha, progress) {
    var automatic = effect.visualId === "auto-sky-lock";
    ctx.strokeStyle = automatic
      ? "rgba(216, 255, 233, " + (0.92 * alpha).toFixed(3) + ")"
      : "rgba(218, 255, 255, " + (0.9 * alpha).toFixed(3) + ")";
    ctx.shadowColor = effect.color || (automatic ? "#63ffb4" : "#a8f6ff");
    ctx.shadowBlur = 16 * alpha;
    ctx.lineWidth = 2 + Math.sin(progress * Math.PI) * 3;
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.lineTo(effect.targetX, effect.targetY);
    ctx.stroke();
  }

  function getVisual(context, visualId, fallback) {
    var visual = context.source === "auto" && scope.skillVisualTheme && scope.skillVisualTheme.getAutoVisual
      ? scope.skillVisualTheme.getAutoVisual(visualId)
      : null;
    return visual || { primary: fallback, trail: "rgba(130,247,255,0.3)" };
  }

  scope.activeSkillSystem.registerActiveSkillHandler(SKILL_ID, {
    canCast: canCast,
    activate: activate,
    update: update,
    drawEffect: drawEffect
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
