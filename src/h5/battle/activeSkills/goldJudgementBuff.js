(function registerGoldJudgementBuff(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var SKILL_ID = "gold-judgement-buff";

  function canCast(context) {
    return hasTarget(context.state);
  }

  function activate(context) {
    var state = context.state;
    var effect = {
      type: SKILL_ID,
      activeSkillId: SKILL_ID,
      x: state.player.x,
      y: state.player.y,
      radius: 62,
      life: Math.max(0.1, Number(context.skill.duration) || 4),
      duration: Math.max(0.1, Number(context.skill.duration) || 4),
      color: "#ffd166"
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

  function getWeaponModifiers(context, weaponType) {
    if (["spread", "laser", "missile"].indexOf(weaponType) < 0) return null;
    return {
      damageMultiplier: Math.max(0, Number(context.skill.damageMultiplier) || 1.3),
      armorPierceBonus: Math.max(0, Number(context.skill.armorPierceBonus) || 0.25)
    };
  }

  function hasTarget(state) {
    var enemies = Array.isArray(state && state.enemies) ? state.enemies : [];
    for (var i = 0; i < enemies.length; i += 1) {
      if (enemies[i] && !enemies[i].dead && enemies[i].canTakeDamage !== false && Number(enemies[i].hp) > 0) return true;
    }
    return Boolean(state && state.boss && !state.boss.dead && state.boss.canTakeDamage !== false && Number(state.boss.hp) > 0);
  }

  function drawEffect(ctx, effect, alpha, progress) {
    var radius = (effect.radius || 62) * (0.88 + Math.sin(progress * Math.PI * 8) * 0.08);
    ctx.strokeStyle = "rgba(255, 225, 132, " + (0.9 * alpha).toFixed(3) + ")";
    ctx.shadowColor = effect.color || "#ffd166";
    ctx.shadowBlur = 18 * alpha;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    ctx.stroke();
    for (var i = 0; i < 3; i += 1) {
      var angle = progress * Math.PI * 2 + i * Math.PI * 2 / 3;
      var orbit = radius + 12;
      ctx.fillStyle = "rgba(255, 241, 174, " + (0.82 * alpha).toFixed(3) + ")";
      ctx.beginPath();
      ctx.arc(effect.x + Math.cos(angle) * orbit, effect.y + Math.sin(angle) * orbit, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  scope.activeSkillSystem.registerActiveSkillHandler(SKILL_ID, {
    canCast: canCast,
    activate: activate,
    update: update,
    getWeaponModifiers: getWeaponModifiers,
    drawEffect: drawEffect
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
