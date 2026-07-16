(function registerBattleRuntime(root) {
  var scope = root.RXGame || (root.RXGame = {});

  var levelsConfig = scope.levels || {};
  var battleRules = scope.battleRules || {};
  var battleStorySystem = scope.battleStorySystem || {};
  var enemySys = scope.enemySystem || {};
  var bossSys = scope.bossSystem || {};
  var weaponSys = scope.weaponSystem || {};
  var collisionSys = scope.collisionSystem || {};
  var dropSys = scope.dropSystem || {};
  var fxSys = scope.fxSystem || {};

  /**
   * 开始关卡
   * @param {Object} level - 关卡配置
   * @param {Object} profile - 养成存档（用于 BattleLoadout）
   * @param {Object} cloud - 云端服务实例（可选）
   * @param {Object} callbacks - 回调集合 { onSaveProfile, onBattleStart, onComplete, onFail }
   */
  function startLevelBattle(level, profile, cloud, callbacks) {
    var combatStats = scope.combatStats || {};
    var loadout = combatStats.generateBattleLoadout
      ? combatStats.generateBattleLoadout(profile)
      : null;

    var state = (scope.battleState && scope.battleState.createMenuState)
      ? scope.battleState.createMenuState(level.id)
      : null;

    if (!state) return null;

    state.mode = "fight";
    state.level = level;
    state.battleMode = callbacks && callbacks.battleMode || "campaign";

    // 使用 BattleLoadout 覆盖玩家初始属性
    if (loadout) {
      state.player = (scope.battleState && scope.battleState.createPlayer)
        ? scope.battleState.createPlayer(loadout, state.field)
        : state.player;
    }

    // 创建战斗剧情运行时
    if (battleStorySystem.createBattleStoryRuntime) {
      try {
        var pilot = loadout ? loadout.pilot : {};
        state.storyRuntime = battleStorySystem.createBattleStoryRuntime({
          chapterIndex: level.chapterIndex != null ? level.chapterIndex : 1,
          stageInChapter: level.stageInChapter != null ? level.stageInChapter : level.id,
          selectedPilot: {
            id: pilot.id || "pilot-s-lingyan",
            name: pilot.name || "\u51cc\u7130",
            avatarId: pilot.avatarSrc || ""
          },
          hasBoss: true
        });
      } catch (e) {
        state.storyRuntime = null;
      }
    }

    // 回调
    if (callbacks && callbacks.onBattleStart) {
      callbacks.onBattleStart(state);
    }

    return {
      state: state,
      loadout: loadout,
      cloud: cloud,
      callbacks: callbacks || {},
      inputState: callbacks && callbacks.inputState || { keys: root.rxKeys, pointer: root.rxPointer },
      modeDirector: callbacks && callbacks.modeDirector || null,
      lastTime: 0,
      animationId: 0,
      activeBattleTicket: null
    };
  }

  /**
   * 主循环 - 每帧调用
   */
  function loop(battleContext, now) {
    if (!battleContext || !battleContext.state) return;
    var state = battleContext.state;
    if (state.mode !== "fight") return;

    var dt = Math.min((now - (battleContext.lastTime || now)) / 1000, 0.033);
    battleContext.lastTime = now;
    update(battleContext, dt);

    // drawScene 由外部调用
    if (battleContext.callbacks && battleContext.callbacks.onFrame) {
      battleContext.callbacks.onFrame(state, dt);
    }

    battleContext.animationId = requestAnimationFrame(function (t) {
      loop(battleContext, t);
    });
  }

  /**
   * 每帧更新
   */
  function update(battleContext, dt) {
    var state = battleContext.state;
    if (!state) return;

    state.elapsed += dt;
    state.enemyTimer -= dt;
    state.powerTimer -= dt;
    state.bossWarning = Math.max(0, state.bossWarning - dt);
    state.shake = Math.max(0, (state.shake || 0) - dt);
    state.player.cooldown -= dt;
    state.player.invincible = Math.max(0, state.player.invincible - dt);
    state.player.shield = Math.max(0, state.player.shield - dt);
    state.player.phaseShieldRemaining = Math.max(0, (Number(state.player.phaseShieldRemaining) || 0) - dt);
    if (scope.abilitySystem && scope.abilitySystem.update) {
      scope.abilitySystem.update(state, battleContext.loadout, dt);
    }

    // 剧情更新
    updateBattleStoryFrame(state);

    // 星空
    updateStars(state, dt);

    // 玩家移动
    updatePlayer(state, dt, battleContext.inputState);

    // 射击
    if (scope.weaponSystem && scope.weaponSystem.autoShoot) {
      scope.weaponSystem.autoShoot(state, battleContext.loadout, state.bullets);
    }

    if (battleContext.modeDirector && battleContext.modeDirector.beforeUpdate) {
      battleContext.modeDirector.beforeUpdate(state);
    } else {
      // 普通关卡继续使用原导演和章节平衡。
      if (enemySys && enemySys.spawnEnemies) enemySys.spawnEnemies(state, state.level);
      if (bossSys && bossSys.spawnBossIfNeeded) bossSys.spawnBossIfNeeded(state, state.level);
    }

    if (scope.extensionWeaponSystem && scope.extensionWeaponSystem.update) {
      scope.extensionWeaponSystem.update(state);
    }

    // 道具生成
    if (dropSys && dropSys.spawnPowerups) {
      dropSys.spawnPowerups(state);
    }

    // 子弹更新
    if (scope.weaponSystem && scope.weaponSystem.updateBullets) {
      scope.weaponSystem.updateBullets(state, dt);
    }
    if (scope.weaponSystem && scope.weaponSystem.updateEnemyBullets) {
      scope.weaponSystem.updateEnemyBullets(state, dt);
    }

    // 敌军更新
    if (enemySys && enemySys.updateEnemies) {
      enemySys.updateEnemies(state, dt);
    }

    // BOSS 更新
    if (bossSys && bossSys.updateBoss) {
      bossSys.updateBoss(state, dt);
    }

    // 掉落物更新
    if (dropSys && dropSys.updateCoins) {
      dropSys.updateCoins(state, dt, battleContext.loadout ? (battleContext.loadout.upgrades ? battleContext.loadout.upgrades.bounty : 0) : 0);
    }
    if (dropSys && dropSys.updatePowerups) {
      dropSys.updatePowerups(state, dt);
    }
    if (dropSys && dropSys.updateParticles) {
      dropSys.updateParticles(state, dt);
    }
    if (dropSys && dropSys.updateShockwaves) {
      dropSys.updateShockwaves(state, dt);
    }
    if (dropSys && dropSys.updateNotices) {
      dropSys.updateNotices(state, dt);
    }

    // 碰撞检测
    if (collisionSys && collisionSys.checkCollisions) {
      collisionSys.checkCollisions(state, null, battleContext.loadout);
    }
    if (battleContext.modeDirector && battleContext.modeDirector.afterCollisions) {
      battleContext.modeDirector.afterCollisions(state);
    }

    if (scope.audioSystem && scope.audioSystem.flushFrameAudio) {
      scope.audioSystem.flushFrameAudio();
    }

    // HUD 更新（由外部回调）
    if (battleContext.callbacks && battleContext.callbacks.onUpdateHud) {
      battleContext.callbacks.onUpdateHud(state);
    }
  }

  /**
   * 暂停游戏
   */
  function pauseBattle(battleContext) {
    if (!battleContext) return;
    cancelAnimationFrame(battleContext.animationId);
    if (battleContext.callbacks && battleContext.callbacks.onPause) {
      battleContext.callbacks.onPause();
    }
  }

  /**
   * 恢复游戏
   */
  function resumeBattle(battleContext) {
    if (!battleContext) return;
    battleContext.lastTime = performance.now();
    battleContext.animationId = requestAnimationFrame(function (t) {
      loop(battleContext, t);
    });
  }

  // === 内部辅助函数 ===

  function updateBattleStoryFrame(state) {
    var runtime = state.storyRuntime;
    if (!runtime || !battleStorySystem.shouldRenderBattleStoryMessage) return;
    var events = runtime.getEventsToShow(state.elapsed);
    for (var i = 0; i < events.length; i++) {
      if (battleStorySystem.shouldRenderBattleStoryMessage(events[i])) {
        state.storyMessage = events[i];
        state.storyMessageUntil = performance.now() + (events[i].durationMs || 3000);
      }
    }
  }

  function updateStars(state, dt) {
    var field = getField(state);
    for (var i = 0; i < state.stars.length; i++) {
      var star = state.stars[i];
      var speedMultiplier = state.boss ? 1.25 : 1;
      star.x -= star.speed * dt * speedMultiplier;
      if (star.x < -8) {
        star.x = field.width + 8;
        star.y = Math.random() * field.height;
      }
    }
  }

  function updatePlayer(state, dt, inputState) {
    // playerSystem.updatePlayer 已不再单独导出，此处内联
    var upgrades = {};
    var speed = 320;

    // 尝试从 battleContext 获取，这里简化
    speed = 320;

    var keys = inputState && inputState.keys;
    var pointer = inputState && inputState.pointer;
    var dx = 0, dy = 0;

    if (keys) {
      if (keys.has("ArrowLeft") || keys.has("KeyA")) dx -= 1;
      if (keys.has("ArrowRight") || keys.has("KeyD")) dx += 1;
      if (keys.has("ArrowUp") || keys.has("KeyW")) dy -= 1;
      if (keys.has("ArrowDown") || keys.has("KeyS")) dy += 1;
    }

    if (pointer && pointer.active) {
      state.player.x += (pointer.x - state.player.x) * 12 * dt;
      state.player.y += (pointer.y - state.player.y) * 12 * dt;
    } else if (dx || dy) {
      var length = Math.sqrt(dx * dx + dy * dy) || 1;
      state.player.x += (dx / length) * speed * dt;
      state.player.y += (dy / length) * speed * dt;
    }

    if (scope.battleGeometry && scope.battleGeometry.clampPlayer) scope.battleGeometry.clampPlayer(state, state.player);
  }

  function getField(state) {
    return scope.battleGeometry.getField(state);
  }

  var api = {
    startLevelBattle: startLevelBattle,
    loop: loop,
    update: update,
    pauseBattle: pauseBattle,
    resumeBattle: resumeBattle
  };

  scope.battleRuntime = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
