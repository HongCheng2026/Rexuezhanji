(function registerActiveDecoy(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var SKILL_ID = "active-decoy";

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
    var duration = Math.max(0.1, Number(gs.shieldDuration) || 1);
    state.player.decoyShieldRemaining = duration;
    var effect = {
      type: SKILL_ID,
      activeSkillId: SKILL_ID,
      visualId: SKILL_ID,
      presentationTier: "premium",
      x: state.player.x,
      y: state.player.y,
      radius: 48,
      life: duration,
      duration: duration,
      color: "#ffd36b"
    };
    state.skillEffects = state.skillEffects || [];
    state.skillEffects.push(effect);
    state.shake = Math.max(Number(state.shake) || 0, 0.2);
    context.runtime.data.effect = effect;
    return true;
  }

  function update(context) {
    var effect = context.runtime.data && context.runtime.data.effect;
    if (!effect) return;
    effect.x = context.state.player.x;
    effect.y = context.state.player.y;
    effect.life = Math.max(0, Number(context.runtime.activeRemaining) || 0);
  }

  function deactivate(context) {
    context.state.player.decoyShieldRemaining = 0;
    var effect = context.runtime.data && context.runtime.data.effect;
    if (effect && context.state.skillEffects) {
      context.state.skillEffects = context.state.skillEffects.filter(function (e) { return e !== effect; });
    }
  }

  function drawEffect(ctx, effect, alpha, progress) {
    var pulse = 1 + Math.sin(progress * Math.PI * 8) * 0.05;
    var radius = (effect.radius || 48) * pulse;
    var age = Math.max(0, (Number(effect.duration) || 0) - (Number(effect.life) || 0));
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.strokeStyle = "rgba(255,211,107," + (0.9 * alpha).toFixed(3) + ")";
    ctx.fillStyle = "rgba(255,180,60," + (0.12 * alpha).toFixed(3) + ")";
    ctx.shadowColor = effect.color || "#ffd36b";
    ctx.shadowBlur = (age <= 0.32 ? 14 : 6) * alpha;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    for (var i = 0; i < 6; i += 1) {
      var angle = -Math.PI / 2 + i * Math.PI / 3;
      var x = Math.cos(angle) * radius;
      var y = Math.sin(angle) * radius;
      if (!i) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.rotate(progress * Math.PI / 2);
    ctx.globalAlpha = 0.62 * alpha;
    ctx.strokeStyle = "rgba(255,244,184," + (0.86 * alpha).toFixed(3) + ")";
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.78, 0, Math.PI * 1.32);
    ctx.stroke();
    ctx.restore();
  }

  scope.activeSkillSystem.registerActiveSkillHandler(SKILL_ID, {
    canCast: canCast,
    activate: activate,
    update: update,
    deactivate: deactivate,
    drawEffect: drawEffect
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
