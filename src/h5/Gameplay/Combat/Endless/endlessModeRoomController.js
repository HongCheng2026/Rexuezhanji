(function registerEndlessModeRoomController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var battleInput = options.battleInput || shared.battleInput;
    if (!battleInput || typeof battleInput.getActiveSlotIndex !== "function") {
      throw new Error("H5 endless room bootstrap failed: missing battle input adapter.");
    }
    var dom = options.dom || {};
    var screen = dom.endlessBattleScreen;
    var uiRoot = dom.endlessBattleUiRoot;
    var settlementRoot = dom.endlessSettlementRoot;
    var field = shared.battleGeometry && shared.battleGeometry.getField ? shared.battleGeometry.getField() : { width: 1600, height: 720, playerLeft: 80, playerRight: 80, playerTop: 40, playerBottom: 40 };
    var inputState = {
      keys: new Set(),
      pointer: { active: false, x: field.playerLeft, y: field.height / 2 }
    };
    var uiHandle = options.uiHandle || (shared.battleUiView && shared.battleUiView.mount ? shared.battleUiView.mount(uiRoot) : null);
    var canvas = uiHandle && uiHandle.canvas;
    var renderer = options.renderer || createRenderer();
    var state = null;
    var battleContext = null;
    var battleSession = null;
    var currentLoadout = null;
    var resultModel = null;
    var finished = true;
    var busy = false;
    var bound = false;
    var uiController = uiHandle && shared.battleUiController && shared.battleUiController.create
      ? shared.battleUiController.create({
          view: uiHandle,
          getState: function getEndlessState() { return state; },
          getLoadout: function getEndlessLoadout() { return currentLoadout; },
          renderInterval: 100
        })
      : null;

    function createRenderer() {
      if (!canvas || !shared.canvasRenderer || !shared.canvasRenderer.create) return null;
      var ctx = canvas.getContext("2d");
      if (!ctx) return null;
      var logicalWidth = Math.max(1, Number(canvas.dataset && canvas.dataset.logicalWidth) || field.width);
      var logicalHeight = Math.max(1, Number(canvas.dataset && canvas.dataset.logicalHeight) || field.height);
      ctx.setTransform(canvas.width / logicalWidth, 0, 0, canvas.height / logicalHeight, 0, 0);
      ctx.imageSmoothingEnabled = true;
      if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality = "medium";
      return shared.canvasRenderer.create({
        ctx: ctx,
        width: logicalWidth,
        height: logicalHeight,
        assetsConfig: options.assetsConfig || shared.assets || {},
        levelsConfig: options.levelsConfig || shared.levels || {},
        getShipAsset: options.getShipAsset || function emptyShipAsset() { return ""; },
        clamp: options.clamp
      });
    }

    function getGateway() {
      return options.getGameGateway ? options.getGameGateway() : null;
    }

    function clearInput() {
      inputState.keys.clear();
      inputState.pointer.active = false;
      if (options.clearCampaignInput) options.clearCampaignInput();
    }

    function showRoom() {
      clearInput();
      if (dom.featurePanel) dom.featurePanel.classList.add("hidden");
      if (dom.lobbyScreen) {
        dom.lobbyScreen.classList.add("hidden");
        dom.lobbyScreen.classList.remove("panel-open");
      }
      if (dom.battleScreen) dom.battleScreen.classList.add("hidden");
      if (screen) {
        screen.classList.remove("hidden", "settlement-active");
      }
      if (settlementRoot) settlementRoot.classList.add("hidden");
    }

    function hideRoom() {
      clearInput();
      if (battleContext && battleContext.animationId) cancelAnimationFrame(battleContext.animationId);
      if (screen) screen.classList.add("hidden");
      if (settlementRoot) settlementRoot.classList.add("hidden");
      if (dom.battleScreen) dom.battleScreen.classList.add("hidden");
      if (dom.lobbyScreen) dom.lobbyScreen.classList.remove("hidden");
    }

    function start() {
      if (busy) return Promise.reject(new Error("无尽模式正在处理中，请稍候。"));
      if (!shared.battleRuntime || !shared.endlessModeDirector) return Promise.reject(new Error("无尽战斗房间尚未就绪。"));
      busy = true;
      return Promise.resolve(options.ensureGameGateway && options.ensureGameGateway()).then(function requestTicket() {
        var gateway = getGateway();
        if (!gateway || typeof gateway.startEndless !== "function") throw new Error("无尽模式服务尚未就绪。");
        return gateway.startEndless();
      }).then(function begin(response) {
        beginRun(response || {});
        return response;
      }).finally(function releaseStartLock() {
        busy = false;
      });
    }

    function beginRun(response) {
      if (battleContext && battleContext.animationId) cancelAnimationFrame(battleContext.animationId);
      showRoom();
      finished = false;
      resultModel = null;
      battleSession = {
        ticket: response.ticket || "",
        record: response.record || {},
        startedAt: Date.now(),
        result: null,
        saved: false
      };
      var level = { id: 93, code: "ENDLESS", chapterIndex: 1, stageInChapter: 10, name: "黑潮信标" };
      battleContext = shared.battleRuntime.startLevelBattle(level, options.getProfile && options.getProfile(), getGateway(), {
        battleMode: "endless",
        inputState: inputState,
        modeDirector: shared.endlessModeDirector,
        onBattleStart: function onBattleStart(nextState) {
          state = nextState;
          shared.endlessModeDirector.start(state);
          state.player.x = field.playerLeft;
          state.player.y = field.height / 2;
        },
        onFrame: function onFrame(nextState) {
          state = nextState;
          if (renderer && renderer.drawScene) renderer.drawScene(state);
        },
        onUpdateHud: function onUpdateHud(nextState) {
          state = nextState;
          var force = Boolean(state.hudDirty);
          state.hudDirty = false;
          if (uiController) uiController.render(force);
          checkEnd();
        }
      });
      if (!battleContext) throw new Error("无尽战斗房间初始化失败。");
      state = battleContext.state;
      currentLoadout = battleContext.loadout;
      battleSession.loadout = currentLoadout;
      if (uiController) uiController.render(true);
      if (renderer && renderer.drawScene) renderer.drawScene(state);
      if (options.audioSystem && options.audioSystem.playBgm) options.audioSystem.playBgm("battle");
      if (options.playSfx) options.playSfx("start");
      battleContext.lastTime = currentTime();
      battleContext.animationId = requestAnimationFrame(function run(time) {
        shared.battleRuntime.loop(battleContext, time);
      });
    }

    function checkEnd() {
      if (finished || !state || state.mode !== "fight") return;
      if (state.player && (state.player.hp != null ? state.player.hp <= 0 : state.player.lives <= 0)) {
        finish("defeat", false);
      }
    }

    function createResult(reason) {
      var run = state && state.endless || {};
      var stats = state && state.killStats || {};
      var bossKills = Math.max(0, Math.floor(Number(run.kills) || 0));
      var survivalSeconds = Math.max(0, Math.floor(Number(state && state.elapsed) || 0));
      var enemyKills = Math.max(0, Math.floor(Number(stats.total) || 0) - Math.max(0, Math.floor(Number(stats.boss) || 0)));
      var previous = battleSession && battleSession.record || {};
      return {
        reason: reason || "quit",
        bossKills: bossKills,
        survivalSeconds: survivalSeconds,
        enemyKills: enemyKills,
        damageTaken: Math.max(0, Math.floor(Number(state && state.damageTakenAmount) || 0)),
        roundReached: Math.max(1, Math.floor(Number(run.round) || bossKills + 1)),
        bestKills: Math.max(Number(previous.bestKills) || 0, bossKills),
        bestSurvivalSeconds: Math.max(Number(previous.bestSurvivalSeconds) || 0, survivalSeconds),
        newBestKills: bossKills > (Number(previous.bestKills) || 0),
        newBestTime: survivalSeconds > (Number(previous.bestSurvivalSeconds) || 0),
        syncState: "syncing",
        errorMessage: ""
      };
    }

    function presentResult() {
      if (screen) screen.classList.add("settlement-active");
      if (shared.endlessModeSettlementView && shared.endlessModeSettlementView.render) {
        shared.endlessModeSettlementView.render(settlementRoot, resultModel);
      }
    }

    function finish(reason, retrySave) {
      if (busy) return Promise.reject(new Error("无尽纪录正在处理中。"));
      if (!retrySave) {
        if (finished) return Promise.resolve({ result: resultModel });
        finished = true;
        if (battleContext && battleContext.animationId) {
          cancelAnimationFrame(battleContext.animationId);
          battleContext.animationId = 0;
        }
        clearInput();
        resultModel = createResult(reason);
        battleSession.result = resultModel;
        if (state) state.mode = "settling";
      } else if (!resultModel || !battleSession) {
        return Promise.reject(new Error("无尽模式结算信息缺失。"));
      }
      resultModel.syncState = "syncing";
      resultModel.errorMessage = "";
      presentResult();
      busy = true;
      return Promise.resolve(options.ensureGameGateway && options.ensureGameGateway()).then(function saveResult() {
        var gateway = getGateway();
        if (!gateway || typeof gateway.finishEndless !== "function") throw new Error("无尽模式结算服务尚未就绪。");
        return gateway.finishEndless(battleSession.ticket, resultModel.bossKills, resultModel.survivalSeconds);
      }).then(function saved(response) {
        var record = response && response.record || {};
        resultModel.bestKills = Math.max(resultModel.bestKills, Number(record.bestKills) || 0);
        resultModel.bestSurvivalSeconds = Math.max(resultModel.bestSurvivalSeconds, Number(record.bestSurvivalSeconds) || 0);
        resultModel.syncState = "success";
        battleSession.saved = true;
        battleSession.record = record;
        if (state) state.mode = "endless-result";
        var profile = options.getProfile && options.getProfile();
        if (profile) {
          profile.endlessRecord = {
            bestKills: resultModel.bestKills,
            bestSurvivalSeconds: resultModel.bestSurvivalSeconds
          };
          if (options.saveProfile) options.saveProfile();
        }
        if (shared.endlessModeEntryView && shared.endlessModeEntryView.setLastRun) {
          shared.endlessModeEntryView.setLastRun(resultModel);
        }
        presentResult();
        if (options.audioSystem && options.audioSystem.stopBgm) options.audioSystem.stopBgm();
        if (options.playSfx) options.playSfx("defeat");
        return response;
      }).catch(function saveFailed(error) {
        resultModel.syncState = "error";
        resultModel.errorMessage = error && error.message ? error.message : "纪录保存失败，请重试。";
        if (state) state.mode = "endless-settlement-error";
        presentResult();
        return { error: error };
      }).finally(function releaseSaveLock() {
        busy = false;
      });
    }

    function pause() {
      if (!state || state.mode !== "fight" || !battleContext) return false;
      state.mode = "paused";
      if (battleContext.animationId) cancelAnimationFrame(battleContext.animationId);
      battleContext.animationId = 0;
      clearInput();
      if (uiController) uiController.render(true);
      if (renderer && renderer.drawScene) renderer.drawScene(state);
      return true;
    }

    function resume() {
      if (!state || state.mode !== "paused" || !battleContext) return false;
      state.mode = "fight";
      if (uiController) uiController.render(true);
      shared.battleRuntime.resumeBattle(battleContext);
      return true;
    }

    function tryDecisiveCommand() {
      if (!state || state.mode !== "fight" || !shared.abilitySystem || !shared.abilitySystem.tryUseDecisiveCommand) return false;
      var casted = shared.abilitySystem.tryUseDecisiveCommand(state, currentLoadout);
      if (casted && options.playSfx) options.playSfx("skill");
      if (casted && uiController) uiController.render(true);
      return casted;
    }

    function tryActiveSlot(index) {
      if (!state || state.mode !== "fight" || !shared.abilitySystem || !shared.abilitySystem.tryCastActiveSlot) return false;
      var casted = shared.abilitySystem.tryCastActiveSlot(state, currentLoadout, index);
      if (casted && uiController) uiController.render(true);
      return casted;
    }

    function toggleAuto(index) {
      if (!state || state.mode !== "fight" || !shared.abilitySystem || !shared.abilitySystem.toggleActiveSlotAuto) return null;
      var enabled = shared.abilitySystem.toggleActiveSlotAuto(state, currentLoadout, index);
      if (enabled !== null && uiController) uiController.render(true);
      return enabled;
    }

    function returnToActivity() {
      if (!battleSession || !battleSession.saved) return false;
      hideRoom();
      battleContext = null;
      battleSession = null;
      currentLoadout = null;
      if (options.audioSystem && options.audioSystem.playBgm) options.audioSystem.playBgm("lobby");
      if (options.openActivityPanel) options.openActivityPanel();
      return true;
    }

    function handleClick(event) {
      var resultAction = event.target && event.target.closest ? event.target.closest("[data-endless-result-action]") : null;
      if (resultAction && !resultAction.disabled) {
        if (resultAction.dataset.endlessResultAction === "retry-save") runUiPromise(finish(resultModel && resultModel.reason, true));
        if (resultAction.dataset.endlessResultAction === "replay") runUiPromise(start());
        if (resultAction.dataset.endlessResultAction === "activity") returnToActivity();
        return;
      }
      var actionNode = event.target && event.target.closest ? event.target.closest("[data-battle-action]") : null;
      if (!actionNode || actionNode.disabled) return;
      var action = actionNode.dataset.battleAction;
      if (action === "pause") state && state.mode === "paused" ? resume() : pause();
      if (action === "decisive-command") tryDecisiveCommand();
      if (action === "active-auto-toggle") toggleAuto(Number(actionNode.dataset.slotIndex));
      if (action === "pause-resume") resume();
      if (action === "pause-chapter" || action === "pause-lobby") runUiPromise(finish("quit", false));
    }

    function runUiPromise(promise) {
      Promise.resolve(promise).catch(function showActionError(error) {
        if (!resultModel) return;
        resultModel.syncState = "error";
        resultModel.errorMessage = error && error.message ? error.message : "操作失败，请重试。";
        presentResult();
      });
    }

    function handleKeydown(event) {
      if (!isActive()) return;
      var eventCode = battleInput.getCode(event);
      var slot = battleInput.getActiveSlotIndex(event);
      var gameKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space", "KeyP"].indexOf(eventCode) >= 0 || slot >= 0;
      if (gameKey && event.preventDefault) event.preventDefault();
      if (eventCode) inputState.keys.add(eventCode);
      if (event.repeat && (eventCode === "Space" || eventCode === "KeyP" || slot >= 0)) return;
      if (eventCode === "Space") tryDecisiveCommand();
      if (slot >= 0) tryActiveSlot(slot);
      if (eventCode === "KeyP") state && state.mode === "paused" ? resume() : pause();
    }

    function updatePointer(event) {
      if (!canvas) return;
      var rect = canvas.getBoundingClientRect();
      inputState.pointer.x = clamp(((event.clientX - rect.left) / Math.max(1, rect.width)) * canvas.width, field.playerLeft, canvas.width - field.playerRight);
      inputState.pointer.y = clamp(((event.clientY - rect.top) / Math.max(1, rect.height)) * canvas.height, field.playerTop, canvas.height - field.playerBottom);
    }

    function bind() {
      if (bound || !screen) return;
      bound = true;
      screen.addEventListener("click", handleClick);
      if (root.addEventListener) {
        root.addEventListener("keydown", handleKeydown);
        root.addEventListener("keyup", function onKeyup(event) { inputState.keys.delete(battleInput.getCode(event)); });
      }
      if (canvas) {
        canvas.addEventListener("pointerdown", function onPointerDown(event) {
          if (!isActive()) return;
          if (canvas.focus) canvas.focus({ preventScroll: true });
          inputState.pointer.active = true;
          updatePointer(event);
          if (canvas.setPointerCapture) canvas.setPointerCapture(event.pointerId);
        });
        canvas.addEventListener("pointermove", function onPointerMove(event) {
          if (inputState.pointer.active) updatePointer(event);
        });
        canvas.addEventListener("pointerup", function onPointerUp(event) {
          inputState.pointer.active = false;
          if (canvas.releasePointerCapture) canvas.releasePointerCapture(event.pointerId);
        });
        canvas.addEventListener("pointercancel", function onPointerCancel() { inputState.pointer.active = false; });
      }
    }

    function isActive() {
      return Boolean(screen && !screen.classList.contains("hidden"));
    }

    function getSnapshot() {
      return {
        state: state,
        battleContext: battleContext,
        battleSession: battleSession,
        currentLoadout: currentLoadout,
        inputState: inputState,
        renderer: renderer,
        result: resultModel,
        busy: busy,
        active: isActive()
      };
    }

    function currentTime() {
      return root.performance && root.performance.now ? root.performance.now() : Date.now();
    }

    function clamp(value, min, max) {
      var fn = options.clamp || function defaultClamp(number, lower, upper) { return Math.max(lower, Math.min(upper, Number(number) || lower)); };
      return fn(value, min, max);
    }

    bind();
    return {
      start: start,
      finish: finish,
      pause: pause,
      resume: resume,
      returnToActivity: returnToActivity,
      isActive: isActive,
      getSnapshot: getSnapshot,
      clearInput: clearInput
    };
  }

  var api = { create: create };
  scope.endlessModeRoomController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
