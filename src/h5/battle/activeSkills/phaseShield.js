(function registerPhaseShield(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var SKILL_ID = "phase-shield";

  function canCast(context) {
    if (context.source !== "auto") return true;
    var player = context.state && context.state.player;
    if (!player) return false;
    return Math.max(0, Number(player.hp) || 0) / Math.max(1, Number(player.maxHp) || 1) <= 0.5;
  }

  function activate(context) {
    var state = context.state;
    var duration = Math.max(0.1, Number(context.skill.duration) || 3);
    state.player.phaseShieldRemaining = duration;
    var effect = {
      type: SKILL_ID,
      activeSkillId: SKILL_ID,
      x: state.player.x,
      y: state.player.y,
      radius: 54,
      life: duration,
      duration: duration,
      color: "#56f2ff"
    };
    state.skillEffects = state.skillEffects || [];
    state.skillEffects.push(effect);
    context.runtime.data.effect = effect;
    return true;
  }

  function update(context) {
    var effect = context.runtime.data && context.runtime.data.effect;
    if (!effect) return;
    effect.x = context.state.player.x;
    effect.y = context.state.player.y;
  }

  function deactivate(context) {
    context.state.player.phaseShieldRemaining = 0;
  }

  function drawEffect(ctx, effect, alpha, progress) {
    var pulse = 1 + Math.sin(progress * Math.PI * 10) * 0.035;
    var radius = (effect.radius || 54) * pulse;
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.strokeStyle = "rgba(86,242,255," + (0.88 * alpha).toFixed(3) + ")";
    ctx.fillStyle = "rgba(40,171,255," + (0.1 * alpha).toFixed(3) + ")";
    ctx.shadowColor = effect.color || "#56f2ff";
    ctx.shadowBlur = 22 * alpha;
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
    ctx.rotate(progress * Math.PI / 3);
    ctx.globalAlpha = 0.58 * alpha;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.76, 0, Math.PI * 1.45);
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
