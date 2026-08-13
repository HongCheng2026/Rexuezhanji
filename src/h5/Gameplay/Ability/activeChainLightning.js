(function registerActiveChainLightning(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var SKILL_ID = "active-chain-lightning";

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
    var enemies = getEnemies(state);
    if (!enemies.length) return false;
    enemies.sort(function (a, b) { return dist2(state.player, a) - dist2(state.player, b); });
    var jumps = Math.max(1, Math.floor(Number(gs.jumps) || 1));
    var referenceDamage = scope.weaponSystem.getReferenceVolleyDamage(context.loadout, 8);
    var dmg = Math.max(1, Math.round(referenceDamage * (Number(gs.hitMultiplier) || 0.4)));
    var chain = [];
    var hit = {};
    var current = enemies[0];
    for (var j = 0; j < jumps && current; j += 1) {
      if (hit[current.id]) break;
      hit[current.id] = true;
      chain.push(current);
      if (scope.collisionSystem && scope.collisionSystem.damageArea) {
        scope.collisionSystem.damageArea(state, { x: current.x, y: current.y, color: "#aef6ff" }, (Number(current.radius) || 22) + 6, dmg, null);
      }
      var next = null;
      var best = Infinity;
      for (var k = 0; k < enemies.length; k += 1) {
        var e = enemies[k];
        if (hit[e.id]) continue;
        var d = dist2(current, e);
        if (d < best) { best = d; next = e; }
      }
      current = next;
    }
    state.skillEffects = state.skillEffects || [];
    state.shake = Math.max(Number(state.shake) || 0, 0.34);
    for (var c = 0; c < chain.length; c += 1) {
      var from = (c === 0) ? { x: state.player.x, y: state.player.y } : chain[c - 1];
      var to = chain[c];
      state.skillEffects.push({
        type: SKILL_ID,
        activeSkillId: SKILL_ID,
        visualId: SKILL_ID,
        presentationTier: "premium",
        x: from.x,
        y: from.y,
        targetX: to.x,
        targetY: to.y,
        chainIndex: c,
        chainCount: chain.length,
        life: 0.48,
        duration: 0.48,
        color: "#aef6ff"
      });
    }
    return true;
  }

  function drawEffect(ctx, effect, alpha, progress) {
    ctx.strokeStyle = "rgba(174,246,255," + (0.9 * alpha).toFixed(3) + ")";
    ctx.shadowColor = effect.color || "#aef6ff";
    ctx.shadowBlur = 14 * alpha;
    ctx.lineWidth = 3 + Math.sin(progress * Math.PI) * 2;
    ctx.beginPath();
    ctx.moveTo(effect.x, effect.y);
    ctx.lineTo(effect.targetX, effect.targetY);
    ctx.stroke();
  }

  function getEnemies(state) {
    var list = Array.isArray(state.enemies) ? state.enemies.filter(isValidTarget) : [];
    if (state.boss && isValidTarget(state.boss)) list.push(state.boss);
    return list;
  }

  function isValidTarget(t) {
    return Boolean(t && !t.dead && t.canTakeDamage !== false && Number(t.hp) > 0);
  }

  function dist2(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  scope.activeSkillSystem.registerActiveSkillHandler(SKILL_ID, {
    canCast: canCast,
    activate: activate,
    drawEffect: drawEffect
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
