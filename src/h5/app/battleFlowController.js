(function registerBattleFlowController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function mergeSettlementRating(localRating, serverRating) {
    return Object.assign({}, localRating || {}, serverRating || {});
  }

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var dom = options.dom || {};
    var lobby = options.lobbyController;
    var settlementController = options.settlementController;
    var audioSystem = options.audioSystem || null;
    var demoConfig = options.demoConfig || {};
    var field = shared.battleGeometry.getField();
    var width = options.width || field.width;
    var height = options.height || field.height;
    var safeLeft = options.safeLeft || field.playerLeft;
    var energyCost = options.energyCost || 5;
    var profile;
    var state;
    var battleContext;
    var battleSession;
    var currentLoadout;
    var selectedLevel;
    var pendingSettlement;
    var finished;
    var gatewayActionLock = options.gatewayActionLock || { busy: false };
    var ensureGameGateway = options.ensureGameGateway;
    var applyGatewayProfile = options.applyGatewayProfile;
    var saveProfile = options.saveProfile;
    var getLevelById = options.getLevelById;
    var createMenuState = options.createMenuState;
    var createLevelProgressSnapshot = options.createLevelProgressSnapshot;
    var updateHud = options.updateHud;
    var drawScene = options.drawScene;
    var playSfx = options.playSfx;

    function syncContext() {
      profile = options.getProfile();
      state = options.getState();
      battleContext = options.getBattleContext();
      battleSession = options.getBattleSession();
      currentLoadout = options.getCurrentLoadout();
      selectedLevel = options.getSelectedLevel();
      pendingSettlement = options.getPendingSettlement();
      finished = options.getFinished();
    }

    function assignProfile(value) { options.setProfile(value); return value; }
    function assignState(value) { options.setState(value); return value; }
    function assignBattleContext(value) { options.setBattleContext(value); return value; }
    function assignBattleSession(value) { options.setBattleSession(value); return value; }
    function assignCurrentLoadout(value) { options.setCurrentLoadout(value); return value; }
    function assignPendingSettlement(value) { options.setPendingSettlement(value); return value; }
    function assignFinished(value) { options.setFinished(value); return value; }

    function renderVictoryIntro(result) { settlementController.renderVictoryIntro(result); }
    function renderSettlement(result) { settlementController.renderSettlement(result); }

  function startSelectedLevel() {
    syncContext();
    if (gatewayActionLock.busy) return;
    var level = getLevelById(selectedLevel);
    if (!level || level.id > (profile.unlockedLevel || 0)) return;
    var preStory = getNextCampaignStoryScene(level, "pre_stage");
    if (preStory && playCampaignStoryScene(preStory, {
      finishLabel: "开始作战",
      markSeen: true,
      onDone: startSelectedLevel
    })) {
      return;
    }
    gatewayActionLock.busy = true;
    if (dom.startButton) dom.startButton.disabled = true;
    if (lobby.showBusyOverlay) {
      lobby.showBusyOverlay("正在进入战斗", "正在同步云端战斗凭证，请稍候…");
    }
    ensureGameGateway().then(function startThroughGateway() {
      return options.getGameGateway().startBattle(level.id);
    }).then(function onBattleAuthorized(result) {
      if (result && result.profile) applyGatewayProfile(result.profile);
      beginAuthorizedBattle(level, result && result.ticket || "");
    }).catch(function onBattleStartError(error) {
      lobby.showBattleScreen();
      var message = error && error.message ? error.message : "暂时无法开始战斗，请稍后重试。";
      lobby.showOverlay(error && error.code === "NO_ENERGY" ? "体力不足" : "无法开始战斗", message, "返回关卡");
      lobby.renderChapterSelect();
    }).finally(function releaseBattleStart() {
      gatewayActionLock.busy = false;
      if (dom.startButton) dom.startButton.disabled = Boolean(options.getGatewayError() && options.getGameGateway() && options.getGameGateway().isCloud);
    });
  }

  function beginAuthorizedBattle(level, ticket) {
    syncContext();
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    battleContext = assignBattleContext(null);
    battleSession = assignBattleSession(null);
    finished = assignFinished(false);
    battleSession = assignBattleSession(createBattleSession(level, ticket));
    lobby.hideShop();
    lobby.showBattleScreen();
    playSfx("start");
    if (audioSystem && audioSystem.playBgm) audioSystem.playBgm("battle");
    dom.battleScreen.classList.remove("select-mode", "overlay-active", "settlement-active");
    dom.overlay.classList.remove("busy-overlay");
    dom.overlay.classList.add("hidden");
    currentLoadout = assignCurrentLoadout(shared.combatStats && shared.combatStats.generateBattleLoadout
      ? shared.combatStats.generateBattleLoadout(profile)
      : null);

    battleContext = assignBattleContext(shared.battleRuntime.startLevelBattle(level, profile, options.getGameGateway(), {
      onBattleStart: function onBattleStart(nextState) {
        state = assignState(nextState);
        state.player.x = safeLeft;
        state.player.y = height / 2;
      },
      onFrame: function onFrame(nextState) {
        state = assignState(nextState);
        drawScene();
      },
      onUpdateHud: function onUpdateHud(nextState) {
        state = assignState(nextState);
        var forceHud = Boolean(state.hudDirty);
        state.hudDirty = false;
        updateHud(forceHud);
        checkBattleEnd();
      }
    }));

    if (!battleContext) return;
    state = assignState(battleContext.state);
    if (demoConfig.enabled) {
      state.powerTimer = 2;
      state.demoMode = "influencer";
      state.notices = state.notices || [];
      state.notices.push({ text: "三武器启动", color: "#5ee7ff", x: width / 2, y: shared.battleGeometry.getField(state).noticeY, life: 2.2 });
    }
    currentLoadout = assignCurrentLoadout(battleContext.loadout || currentLoadout);
    if (battleSession) battleSession.loadout = currentLoadout;
    updateHud(true);
    battleContext.lastTime = performance.now();
    battleContext.animationId = requestAnimationFrame(function run(t) {
      shared.battleRuntime.loop(battleContext, t);
    });
  }

  function checkBattleEnd() {
    syncContext();
    if (finished || !state || state.mode !== "fight") return;
    if (state.player && (state.player.hp != null ? state.player.hp <= 0 : state.player.lives <= 0)) {
      completeBattle(false);
      return;
    }
    if (state.boss && state.boss.hp <= 0) {
      completeBattle(true);
    }
  }

  function completeBattle(isWin) {
    syncContext();
    if (gatewayActionLock.busy) return;
    finished = assignFinished(true);
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    state.mode = "settling";
    dom.battleScreen.classList.remove("select-mode", "overlay-active");
    if (battleSession) battleSession.endReason = isWin ? "win" : "fail";

    var level = state.level || getLevelById(selectedLevel);
    var result = shared.settlementSystem && shared.settlementSystem.generateBattleResult
      ? shared.settlementSystem.generateBattleResult(state, level, isWin, isWin ? "win" : "fail")
      : { isWin: isWin, levelId: level.id, coinsEarned: 0, expEarned: 0, rating: { stars: isWin ? 1 : 0 } };

    if (isWin) updateStageHonorRecord(level, result);
    pendingSettlement = assignPendingSettlement({
      isWin: isWin,
      level: level,
      result: result,
      ticket: battleSession && battleSession.ticket || "",
      progressBefore: createLevelProgressSnapshot(profile.player)
    });
    if (lobby.showBusyOverlay) {
      lobby.showBusyOverlay("正在生成战报", formatSettlementBusyMessage(result));
    }
    settlePendingBattle();
  }

  function settlePendingBattle() {
    syncContext();
    if (!pendingSettlement || gatewayActionLock.busy) return;
    var settlement = pendingSettlement;
    gatewayActionLock.busy = true;
    ensureGameGateway().then(function settleThroughGateway() {
      if (options.getGameGateway().isCloud && !settlement.isWin) return options.getGameGateway().abandonBattle(settlement.ticket);
      return options.getGameGateway().finishBattle(
        settlement.ticket,
        settlement.level.id,
        settlement.result.rating || { stars: settlement.isWin ? 1 : 0 },
        { isWin: settlement.isWin, result: settlement.result }
      );
    }).then(function onBattleSettled(response) {
      if (response && response.profile) { applyGatewayProfile(response.profile); syncContext(); }
      applyGatewaySettlement(settlement, response);
      pendingSettlement = assignPendingSettlement(null);
      battleContext = assignBattleContext(null);
      battleSession = assignBattleSession(null);
      state.mode = "shop";
      presentSettlement(settlement.isWin, settlement.level, settlement.result);
    }).catch(function onSettlementError(error) {
      state.mode = "settlement-error";
      lobby.showBattleScreen();
      lobby.showOverlay("结算未完成", error && error.message ? error.message : "云端结算失败，请重试。", "重试结算");
    }).finally(function releaseSettlement() {
      gatewayActionLock.busy = false;
    });
  }

  function applyGatewaySettlement(pending, response) {
    syncContext();
    var server = response && response.settlement || {};
    if (options.getGameGateway() && options.getGameGateway().isCloud) {
      pending.result.coinsEarned = Math.max(0, Math.floor(server.gold || 0));
      pending.result.expEarned = Math.max(0, Math.floor(server.experience || 0));
      if (server.rating) pending.result.rating = mergeSettlementRating(pending.result.rating, server.rating);
      pending.result.levelProgress = {
        before: pending.progressBefore,
        after: createLevelProgressSnapshot(profile.player)
      };
      saveProfile();
    }
  }

  function isCloudMode() {
    syncContext();
    return Boolean(options.getGameGateway() && options.getGameGateway().isCloud);
  }

  function persistProfileMetadata() {
    syncContext();
    saveProfile();
    if (!isCloudMode()) return Promise.resolve({ profile: profile });
    return ensureGameGateway().then(function saveMetadataThroughGateway() {
      return options.getGameGateway().saveCosmetics(profile);
    }).then(function onMetadataSaved(response) {
      if (response && response.profile) { applyGatewayProfile(response.profile); syncContext(); }
      return response;
    }).catch(function onMetadataSaveError(error) {
      console.error("Cloud profile metadata save failed", error);
      throw error;
    });
  }

  function presentSettlement(isWin, level, result) {
    syncContext();
    var finishSettlement = function finishSettlement() {
      if (isWin) renderVictoryIntro(result);
      else renderSettlement(result);
      if (audioSystem && audioSystem.stopBgm) audioSystem.stopBgm();
      playSfx(isWin ? "victory" : "defeat");
      lobby.showShop();
      updateHud(true);
      drawScene();
    };

    var postStory = isWin ? getNextCampaignStoryScene(level, "post_win") : null;
    if (postStory && playCampaignStoryScene(postStory, {
      finishLabel: "领取奖励",
      markSeen: true,
      onDone: finishSettlement
    })) {
      return;
    }
    finishSettlement();
  }

  function formatSettlementBusyMessage(result) {
    result = result || {};
    var rating = result.rating || {};
    var killedEnemies = Math.max(0, Math.floor(Number(rating.killedEnemies != null ? rating.killedEnemies : result.killedEnemies) || 0));
    var damageTaken = Math.max(0, Math.floor(Number(rating.damageTaken != null ? rating.damageTaken : result.damageTaken) || 0));
    var bossTime = Number(rating.bossClearTime != null ? rating.bossClearTime : result.bossClearTime);
    var bossTimeText = bossTime >= 999 || !isFinite(bossTime) ? "--" : Math.ceil(bossTime) + " 秒";
    return "击落 " + killedEnemies + " 架 · 受击 " + damageTaken + " 次 · BOSS " + bossTimeText + "。奖励正在云端结算…";
  }

  function updateStageHonorRecord(level, result) {
    syncContext();
    if (!level || !result || !result.rating) return;
    if (!shared.stageHonorSystem || !shared.stageHonorSystem.recordStageHonor) return;
    var record = shared.stageHonorSystem.recordStageHonor(profile, level, result.rating);
    result.rating.bestHonorTier = record.tier;
    result.rating.isNewRecord = record.isNewRecord;
  }

  function getStageKey(level) {
    syncContext();
    if (!level) return "";
    return level.chapterIndex === 0
      ? "prologue_" + level.stageInChapter
      : level.chapterIndex + "_" + level.stageInChapter;
  }

  function getSettlementStoryMessage(result, fallback) {
    syncContext();
    result = result || {};
    var chapterIndex = result.chapterIndex;
    var stageInChapter = result.stageInChapter;
    if (chapterIndex == null || stageInChapter == null) {
      var level = getLevelById(result.levelId || selectedLevel);
      chapterIndex = level && level.chapterIndex;
      stageInChapter = level && level.stageInChapter;
    }
    var story = shared.campaignStoryFramework && shared.campaignStoryFramework.getBattleResultViewModel
      ? shared.campaignStoryFramework.getBattleResultViewModel({
        chapterIndex: chapterIndex,
        stageInChapter: stageInChapter,
        isWin: result.isWin
      })
      : null;
    return story && (story.message || story.text) || fallback || "";
  }

  function getNextCampaignStoryScene(level, trigger) {
    syncContext();
    if (!level || !shared.campaignStoryFramework || !shared.campaignStoryFramework.getNextUnseenStoryScene) return null;
    return shared.campaignStoryFramework.getNextUnseenStoryScene({
      profile: profile,
      chapterIndex: level.chapterIndex,
      stageInChapter: level.stageInChapter,
      trigger: trigger
    });
  }

  function playCampaignStoryScene(scene, options) {
    syncContext();
    options = options || {};
    if (!scene || !shared.campaignStoryPlayerView || !shared.campaignStoryPlayerView.openStoryScene) return false;
    shared.campaignStoryPlayerView.openStoryScene(scene, {
      finishLabel: options.finishLabel || "继续",
      onFinish: function onStoryFinish() {
        var storyPersistence = Promise.resolve();
        if (options.markSeen && shared.campaignStoryFramework && shared.campaignStoryFramework.markStorySceneSeen) {
          profile = assignProfile(shared.campaignStoryFramework.markStorySceneSeen(profile, scene.onceKey || scene.sceneId) || profile);
          storyPersistence = Promise.resolve(persistProfileMetadata()).catch(function keepLocalStoryProgress() {});
        }
        storyPersistence.then(function continueAfterStoryPersistence() {
          if (options.onDone) options.onDone();
        });
      }
    });
    return true;
  }

  function playCampaignStoryReplay(level) {
    syncContext();
    if (!level || !shared.campaignStoryFramework || !shared.campaignStoryFramework.getStoryReplayScenes) return;
    var scenes = shared.campaignStoryFramework.getStoryReplayScenes({
      chapterIndex: level.chapterIndex,
      stageInChapter: level.stageInChapter
    }) || [];
    var index = 0;
    function playNextScene() {
      var scene = scenes[index];
      index += 1;
      if (!scene) return;
      playCampaignStoryScene(scene, {
        finishLabel: index >= scenes.length ? "关闭" : "下一段",
        markSeen: false,
        onDone: playNextScene
      });
    }
    playNextScene();
  }

  function handleStoryReplayClick(event) {
    syncContext();
    var replay = event.target && event.target.closest ? event.target.closest("[data-story-replay]") : null;
    if (!replay) return;
    event.preventDefault();
    event.stopPropagation();
    var levelId = Number(replay.dataset && replay.dataset.storyReplayLevel) || selectedLevel;
    playCampaignStoryReplay(getLevelById(levelId));
  }

  function createBattleSession(level, ticket) {
    syncContext();
    return {
      levelId: level && level.id,
      ticket: ticket || "",
      energyCost: energyCost,
      loadout: currentLoadout,
      startedAt: Date.now(),
      energyRefunded: false,
      endReason: "active"
    };
  }

  function refundBattleEnergy() {
    syncContext();
    if (demoConfig.enabled) return 0;
    if (!battleSession || battleSession.energyRefunded) return 0;
    var amount = Math.max(0, Math.floor(battleSession.energyCost || 0));
    profile.resources = profile.resources || {};
    profile.resources.energy = Math.min(
      Math.max(amount, Math.floor(profile.resources.maxEnergy || amount)),
      Math.max(0, Math.floor(profile.resources.energy || 0)) + amount
    );
    battleSession.energyRefunded = true;
    saveProfile();
    lobby.renderLobby();
    return amount;
  }

  function abortBattle(target) {
    syncContext();
    if (!battleContext && !battleSession) {
      if (target === "chapter") lobby.openBattleSelect();
      else lobby.showLobby();
      return;
    }
    if (gatewayActionLock.busy) return;
    if (battleContext) cancelAnimationFrame(battleContext.animationId);
    gatewayActionLock.busy = true;
    var ticket = battleSession && battleSession.ticket || "";
    ensureGameGateway().then(function abandonThroughGateway() {
      return options.getGameGateway().abandonBattle(ticket);
    }).then(function onBattleAbandoned(response) {
      if (response && response.profile) { applyGatewayProfile(response.profile); syncContext(); }
      var refunded = Math.max(0, Math.floor(response && response.refundedEnergy || 0));
      battleContext = assignBattleContext(null);
      battleSession = assignBattleSession(null);
      finished = assignFinished(true);
      state = assignState(createMenuState(selectedLevel));
      state.mode = "menu";
      dom.overlay.classList.add("hidden");
      dom.battleScreen.classList.remove("overlay-active", "settlement-active");
      lobby.hideShop();
      if (target === "chapter") {
        lobby.openBattleSelect();
        lobby.showOverlay("已撤离战场", refunded > 0 ? "本次主动撤离已返还体力 +" + refunded + "。" : "本次战斗已安全结束。", "开始 " + getLevelById(selectedLevel).code);
      } else {
        lobby.showLobby();
      }
    }).catch(function onAbandonError(error) {
      state.mode = "paused";
      lobby.showOverlay("撤离未完成", error && error.message ? error.message : "云端暂时无法确认撤离，请重试。", "继续战斗");
    }).finally(function releaseAbandon() {
      gatewayActionLock.busy = false;
    });
  }


    return {
      startSelectedLevel: startSelectedLevel,
      settlePendingBattle: settlePendingBattle,
      isCloudMode: isCloudMode,
      persistProfileMetadata: persistProfileMetadata,
      getSettlementStoryMessage: getSettlementStoryMessage,
      playCampaignStoryReplay: playCampaignStoryReplay,
      handleStoryReplayClick: handleStoryReplayClick,
      abortBattle: abortBattle,
      checkBattleEnd: checkBattleEnd
    };
  }

  var api = { create: create, mergeSettlementRating: mergeSettlementRating };
  scope.battleFlowController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
