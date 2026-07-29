(function registerActiveSummonWingman(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var SKILL_ID = "active-summon-wingman";
  var DEFAULT_ATTACK_RANGE = 720;

  function gradeStats(context) {
    return scope.skillGradeConfig
      ? scope.skillGradeConfig.getSkillGradeStats(SKILL_ID, (context.skill && context.skill.grade) ? context.skill.grade : "D")
      : null;
  }

  function canCast(context) {
    var gs = gradeStats(context);
    var cap = Math.max(1, Math.floor(Number(gs && gs.maxAllies) || 1));
    var allies = Array.isArray(context.state && context.state.allies) ? context.state.allies : [];
    var alive = countLiveWingmen(allies);
    return alive < cap;
  }

  function activate(context) {
    var gs = gradeStats(context);
    if (!gs) return false;
    var state = context.state;
    var player = state.player;
    if (!player) return false;
    state.allies = state.allies || [];
    state.skillEffects = state.skillEffects || [];
    state.skillEffects.push({
      type: "active-summon-portal",
      activeSkillId: SKILL_ID,
      visualId: SKILL_ID,
      presentationTier: "premium",
      x: player.x - 18,
      y: player.y,
      life: 1.15,
      duration: 1.15,
      color: "#82f7ff"
    });
    state.shake = Math.max(Number(state.shake) || 0, 0.28);
    var cap = Math.max(1, Math.floor(Number(gs.maxAllies) || 1));
    var existing = countLiveWingmen(state.allies);
    if (existing >= cap) return false;
    var elapsed = Number(state.elapsed) || 0;
    var maxHp = Math.max(80, Math.round((Number(context.loadout && context.loadout.finalStats && context.loadout.finalStats.maxHp) || 100) * (0.28 + cap * 0.04)));
    var referenceDamage = scope.weaponSystem.getReferenceVolleyDamage(context.loadout, 8);
    var index = existing;
    var side = (index % 2 === 0) ? -1 : 1;
    var row = Math.floor(index / 2) + 1;
    var ally = {
      id: SKILL_ID + "-ally-" + elapsed + "-" + index,
      x: player.x - 40 - row * 12,
      y: player.y + side * (42 + row * 14),
      vx: 160,
      vy: side * 45,
      radius: 16,
      hp: maxHp,
      maxHp: maxHp,
      side: side,
      row: row,
      aiSeed: Math.random() * Math.PI * 2,
      fireTimer: 0.25,
      damagePerShot: Math.max(1, Math.round(referenceDamage * (Number(gs.attackMultiplier) || 1))),
      maxHits: Math.max(1, Math.floor(Number(gs.maxHits) || 1)),
      attackAngle: Math.max(8, Number(gs.attackAngle) || 30),
      attackRange: Math.max(240, Number(gs.attackRange) || DEFAULT_ATTACK_RANGE),
      blockChance: Math.max(0, Number(gs.blockChance) || 0),
      skillId: SKILL_ID
    };
    state.allies.push(ally);
    return true;
  }

  function updatePersistent(state, loadout, dt) {
    var allies = Array.isArray(state.allies) ? state.allies : [];
    if (!allies.length) return;
    var field = state.field || { width: 1280, height: 720 };
    var now = Math.max(0, Number(state.elapsed) || 0);
    var targets = getEnemies(state);
    var enemyBullets = Array.isArray(state.enemyBullets) ? state.enemyBullets : [];
    for (var a = 0; a < allies.length; a += 1) {
      var ally = allies[a];
      if (!ally || ally.dead || ally.skillId !== SKILL_ID) continue;
      var target = selectNearestTarget(targets, ally);
      var firingTarget = selectTargetForAlly(targets, ally);
      var dodge = findThreat(enemyBullets, ally);
      var destination = chooseDestination(field, ally, target, dodge, now);
      steer(ally, destination.x, destination.y, dt);
      ally.fireTimer -= dt;
      if (ally.fireTimer <= 0 && firingTarget) {
        ally.fireTimer = 0.5;
        fireAllyVolley(state, ally, firingTarget);
      } else if (!firingTarget) {
        ally.fireTimer = Math.max(0, ally.fireTimer);
      }
      applyBlock(state, ally, dt);
    }
    var write = 0;
    for (var read = 0; read < allies.length; read += 1) {
      var current = allies[read];
      if (current && !current.dead && Number(current.hp) > 0) allies[write++] = current;
    }
    allies.length = write;
    state.allies = allies;
  }

  function fireAllyVolley(state, ally, primaryTarget) {
    var targets = getEnemies(state);
    if (!targets.length) return;
    targets.sort(function (p, q) {
      if (p === primaryTarget) return -1;
      if (q === primaryTarget) return 1;
      return dist2(ally, p) - dist2(ally, q);
    });
    var maxHits = ally.maxHits;
    var hits = 0;
    for (var i = 0; i < targets.length && hits < maxHits; i += 1) {
      var t = targets[i];
      if (!isTargetInFireZone(t, ally)) continue;
      var ang = Math.atan2(t.y - ally.y, t.x - ally.x);
      state.bullets.push(scope.weaponSystem.createBullet(ally.x, ally.y, ang, "allyBeam", ally.damagePerShot, 1180, 6, "#9fffd0", {
        owner: "player",
        shape: "beam",
        width: 42,
        height: 5,
        pierceRemaining: 1
      }));
      hits += 1;
    }
  }

  function applyBlock(state, ally, dt) {
    var chance = Number(ally.blockChance) || 0;
    if (!(chance > 0) || !Array.isArray(state.enemyBullets) || !state.enemyBullets.length) return;
    for (var i = 0; i < state.enemyBullets.length; i += 1) {
      var bullet = state.enemyBullets[i];
      if (!bullet || bullet.dead || dist2(ally, bullet) > 70 * 70) continue;
      if (Math.random() < chance * dt * 4) bullet.dead = true;
      return;
    }
  }

  function deactivate() {}

  function drawEffect(ctx, effect, alpha) {
    if (effect.type !== "ally") return;
    ctx.save();
    ctx.translate(effect.x, effect.y);
    ctx.strokeStyle = "rgba(159,255,208," + (0.9 * alpha).toFixed(3) + ")";
    ctx.fillStyle = "rgba(60,200,150," + (0.25 * alpha).toFixed(3) + ")";
    ctx.shadowColor = effect.color || "#9fffd0";
    ctx.shadowBlur = 10 * alpha;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-9, 0);
    ctx.lineTo(0, -7);
    ctx.lineTo(9, 0);
    ctx.lineTo(0, 7);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  function getEnemies(state) {
    var list = state._wingmanTargets || (state._wingmanTargets = []);
    list.length = 0;
    var enemies = Array.isArray(state.enemies) ? state.enemies : [];
    for (var i = 0; i < enemies.length; i += 1) {
      if (isValidTarget(enemies[i])) list.push(enemies[i]);
    }
    if (state.boss && isValidTarget(state.boss)) list.push(state.boss);
    return list;
  }

  function countLiveWingmen(allies) {
    var count = 0;
    for (var i = 0; i < allies.length; i += 1) {
      var ally = allies[i];
      if (ally && !ally.dead && ally.skillId === SKILL_ID) count += 1;
    }
    return count;
  }

  function selectTargetForAlly(targets, ally) {
    if (!targets.length) return null;
    var nearest = null;
    var best = Infinity;
    for (var i = 0; i < targets.length; i += 1) {
      if (!isTargetInFireZone(targets[i], ally)) continue;
      var nextDistance = dist2(ally, targets[i]);
      if (nextDistance < best) {
        best = nextDistance;
        nearest = targets[i];
      }
    }
    return nearest;
  }

  function selectNearestTarget(targets, ally) {
    if (!targets.length) return null;
    var nearest = null;
    var best = Infinity;
    for (var i = 0; i < targets.length; i += 1) {
      var nextDistance = dist2(ally, targets[i]);
      if (nextDistance < best) {
        best = nextDistance;
        nearest = targets[i];
      }
    }
    return nearest;
  }

  function isTargetInFireZone(target, ally) {
    if (!isValidTarget(target)) return false;
    var dx = target.x - ally.x;
    var dy = target.y - ally.y;
    if (dx <= 0) return false;
    var range = Math.max(240, Number(ally.attackRange) || DEFAULT_ATTACK_RANGE);
    if (dx * dx + dy * dy > range * range) return false;
    var halfAngle = (Math.max(8, Number(ally.attackAngle) || 30) * Math.PI / 180) / 2;
    return Math.abs(normalizeAngle(Math.atan2(dy, dx))) <= halfAngle;
  }

  function findThreat(bullets, ally) {
    var nearest = null;
    var best = 110 * 110;
    for (var i = 0; i < bullets.length; i += 1) {
      var bullet = bullets[i];
      if (!bullet || bullet.dead) continue;
      var d = dist2(ally, bullet);
      if (d < best) { best = d; nearest = bullet; }
    }
    return nearest;
  }

  function chooseDestination(field, ally, target, threat, now) {
    var width = Math.max(320, Number(field.width) || 1280);
    var height = Math.max(240, Number(field.height) || 720);
    if (threat) {
      var awayY = ally.y <= threat.y ? -1 : 1;
      return { x: ally.x - 24, y: ally.y + awayY * 145 };
    }
    if (target) {
      return {
        x: Math.max(width * 0.28, Math.min(width * 0.72, target.x - 150 - ally.row * 18)),
        y: Math.max(42, Math.min(height - 42, target.y + Math.sin(now * 1.7 + ally.aiSeed) * (70 + ally.row * 18)))
      };
    }
    return {
      x: width * (0.38 + Math.sin(now * 0.47 + ally.aiSeed) * 0.16),
      y: height * (0.5 + Math.sin(now * 0.71 + ally.aiSeed * 1.7) * 0.34)
    };
  }

  function steer(ally, x, y, dt) {
    var dx = x - ally.x;
    var dy = y - ally.y;
    var length = Math.sqrt(dx * dx + dy * dy) || 1;
    var desiredSpeed = Math.min(360, 150 + length * 1.8);
    var desiredVx = dx / length * desiredSpeed;
    var desiredVy = dy / length * desiredSpeed;
    var blend = Math.min(1, Math.max(0, dt) * 3.8);
    ally.vx += (desiredVx - ally.vx) * blend;
    ally.vy += (desiredVy - ally.vy) * blend;
    ally.x += ally.vx * dt;
    ally.y += ally.vy * dt;
  }

  function isValidTarget(t) {
    return Boolean(t && !t.dead && t.canTakeDamage !== false && Number(t.hp) > 0);
  }

  function dist2(a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return dx * dx + dy * dy;
  }

  function normalizeAngle(a) {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  }

  scope.activeSkillSystem.registerActiveSkillHandler(SKILL_ID, {
    canCast: canCast,
    activate: activate,
    updatePersistent: updatePersistent,
    deactivate: deactivate,
    drawEffect: drawEffect
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
