(function registerGameEventRouter(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var battleInput = options.battleInput || shared.battleInput;
    if (!battleInput || typeof battleInput.getActiveSlotIndex !== "function") {
      throw new Error("H5 game bootstrap failed: missing battle input adapter.");
    }
    var dom = options.dom || {};
    var canvas = options.canvas;
    var keys = options.keys;
    var pointer = options.pointer;
    var levels = options.levels || [];
    var audioSystem = options.audioSystem || null;
    var clamp = options.clamp || function clampValue(value, min, max) { return Math.max(min, Math.min(max, Number(value) || min)); };
    var playSfx = options.playSfx;
    var handleStoryReplayClick = options.handleStoryReplayClick;
    var settlePendingBattle = options.settlePendingBattle;
    var resumeGame = options.resumeGame;
    var startSelectedLevel = options.startSelectedLevel;
    var openBattleSelect = options.openBattleSelect;
    var pauseGame = options.pauseGame;
    var tryUseDecisiveCommand = options.tryUseDecisiveCommand;
    var tryCastActiveSlot = options.tryCastActiveSlot;
    var toggleActiveSlotAuto = options.toggleActiveSlotAuto;
    var renderShop = options.renderShop;
    var showShop = options.showShop;
    var renderSettlementChest = options.renderSettlementChest;
    var renderSettlement = options.renderSettlement;
    var abortBattle = options.abortBattle;
    var closeFeaturePanel = options.closeFeaturePanel;
    var calculateTotalPower = options.calculateTotalPower;
    var isCloudMode = options.isCloudMode;
    var saveProfile = options.saveProfile;
    var renderLobby = options.renderLobby;
    var handleFighterUpgradeClick = options.handleFighterUpgradeClick;
    var redeemCode = options.redeemCode;
    var handleProfilePanelClick = options.handleProfilePanelClick;
    var handleAvatarUpload = options.handleAvatarUpload;
    var openFeaturePanel = options.openFeaturePanel;
    var updatePointer = options.updatePointer;
    var gatewayActionLock = options.gatewayActionLock || { busy: false };
    var ensureGameGateway = options.ensureGameGateway;
    var getGameGateway = options.getGameGateway;
    var applyGatewayProfile = options.applyGatewayProfile;
    var updateHud = options.updateHud;
    var bound = false;
    var economyController = shared.economyFeatureController && shared.economyFeatureController.create({
      shared: shared,
      dom: dom,
      levels: levels,
      audioSystem: audioSystem,
      gatewayActionLock: gatewayActionLock,
      calculateTotalPower: calculateTotalPower,
      getProfile: options.getProfile,
      ensureGameGateway: ensureGameGateway,
      getGameGateway: getGameGateway,
      applyGatewayProfile: applyGatewayProfile,
      saveProfile: saveProfile,
      renderLobby: renderLobby,
      updateHud: updateHud,
      playSfx: playSfx
    });

    function runCloudEconomyAction(button, method, value, panel) {
      return economyController && economyController.run(button, method, value, panel);
    }

    function unlockAudio() {
      if (!audioSystem || !audioSystem.unlock) return;
      audioSystem.unlock();
      if (options.getState() && options.getState().mode === "fight") audioSystem.playBgm("battle");
      else audioSystem.playBgm("lobby");
    }

    function refreshSettingPanel() {
      if (!dom.featurePanel || dom.featurePanel.classList.contains("hidden")) return;
      if (!dom.featurePanelTitle || dom.featurePanelTitle.textContent !== "设置") return;
      if (!shared.mainFeaturePanelsView || !shared.mainFeaturePanelsView.renderPanel) return;
      shared.mainFeaturePanelsView.renderPanel("setting", dom, {
        profile: options.getProfile(),
        levels: levels,
        combatPower: calculateTotalPower(),
        audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
      });
    }

    function handleSettingPanelClick(event) {
      if (!audioSystem) return false;
      var toggle = event.target && event.target.closest ? event.target.closest("[data-audio-toggle]") : null;
      if (toggle) {
        unlockAudio();
        if (toggle.dataset.audioToggle === "music" && audioSystem.setMusicMuted) {
          var musicMuted = audioSystem.getSettings && audioSystem.getSettings().musicMuted;
          audioSystem.setMusicMuted(!musicMuted);
        }
        if (toggle.dataset.audioToggle === "sfx" && audioSystem.setSfxMuted) {
          var sfxMuted = audioSystem.getSettings && audioSystem.getSettings().sfxMuted;
          audioSystem.setSfxMuted(!sfxMuted);
        }
        refreshSettingPanel();
        return true;
      }
      var action = event.target && event.target.closest ? event.target.closest("[data-setting-action]") : null;
      if (action && action.dataset.settingAction === "restart-bgm" && audioSystem.restartBgm) {
        unlockAudio();
        audioSystem.restartBgm();
        refreshSettingPanel();
        return true;
      }
      return false;
    }

    function handleSettingPanelInput(event) {
      if (!audioSystem) return;
      var input = event.target && event.target.closest ? event.target.closest("[data-audio-volume]") : null;
      if (!input) return;
      var value = Math.max(0, Math.min(1, Number(input.value || 0) / 100));
      unlockAudio();
      if (input.dataset.audioVolume === "music" && audioSystem.setMusicVolume) audioSystem.setMusicVolume(value);
      if (input.dataset.audioVolume === "sfx" && audioSystem.setSfxVolume) audioSystem.setSfxVolume(value);
      var row = input.closest(".settings-control-row");
      if (row) {
        var text = row.querySelector("p");
        if (text) text.textContent = "当前 " + Math.round(value * 100) + "%，拖动后即时生效。";
      }
    }

    function handleRedeemSubmission(event) {
      var form = event.target && event.target.closest ? event.target.closest("[data-redeem-form]") : null;
      if (!form) return false;
      event.preventDefault();
      var input = form.querySelector("[data-redeem-code]");
      var submit = form.querySelector("button[type='submit']");
      var status = form.querySelector("[data-redeem-status]");
      var code = input ? String(input.value || "").trim() : "";
      if (!code) {
        if (status) status.textContent = "请输入兑换码。";
        return true;
      }
      if (submit) submit.disabled = true;
      if (status) status.textContent = "正在兑换…";
      Promise.resolve().then(function submitRedeemCode() {
        return redeemCode(code);
      }).then(function showRedeemSuccess(result) {
        var rewards = result && Array.isArray(result.rewards) ? result.rewards : [];
        var goldReward = rewards.filter(function isGold(reward) { return reward && reward.type === "gold"; }).reduce(function sumGold(total, reward) { return total + (Number(reward.amount) || 0); }, 0);
        if (status) status.textContent = "兑换成功，获得 " + Math.floor(goldReward).toLocaleString("zh-CN") + " 金币。";
        if (input) input.value = "";
      }).catch(function showRedeemError(error) {
        if (status) status.textContent = error && error.message ? error.message : "兑换失败，请稍后重试。";
      }).finally(function releaseRedeemButton() {
        if (submit) submit.disabled = false;
      });
      return true;
    }

  function bindEvents() {
    if (bound) return;
    bound = true;
    root.addEventListener("pointerdown", unlockAudio, { once: true });
    root.addEventListener("click", unlockAudio, { once: true });
    root.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
    root.addEventListener("keydown", unlockAudio, { once: true });
    document.addEventListener("click", handleStoryReplayClick, true);
    document.addEventListener("click", function onAnyUiClick(event) {
      if (event.target && event.target.closest && event.target.closest("button")) playSfx("button");
    });
    dom.startButton.addEventListener("click", function onStart() {
      if (options.getState().mode === "settlement-error") settlePendingBattle();
      else if (options.getState().mode === "paused") resumeGame();
      else startSelectedLevel();
    });
    dom.battleEntryButton.addEventListener("click", openBattleSelect);
    if (dom.battleUiRoot) {
      dom.battleUiRoot.addEventListener("click", function onBattleUiAction(event) {
        var target = event.target && event.target.closest ? event.target.closest("[data-battle-action]") : null;
        if (!target || target.disabled) return;
        var action = target.dataset.battleAction;
        if (action === "pause") {
          if (options.getState().mode === "paused") resumeGame();
          else pauseGame();
        }
        if (action === "decisive-command") tryUseDecisiveCommand();
        if (action === "active-auto-toggle") toggleActiveSlotAuto(Number(target.dataset.slotIndex));
        if (action === "pause-resume") resumeGame();
        if (action === "pause-chapter") abortBattle("chapter");
        if (action === "pause-lobby") abortBattle("lobby");
      });
    }
    if (dom.shopButton) {
      dom.shopButton.addEventListener("click", function onShop() {
        if (options.getBattleContext()) cancelAnimationFrame(options.getBattleContext().animationId);
        options.getState().mode = "shop";
        renderShop();
        showShop();
      });
    }
    dom.replayButton.addEventListener("click", startSelectedLevel);
    dom.backToChapterButton.addEventListener("click", openBattleSelect);
    dom.nextLevelButton.addEventListener("click", function onNext() {
      if (options.getLastBattleResult() && !options.getLastBattleResult().isWin) {
        startSelectedLevel();
        return;
      }
      options.setSelectedLevel(clamp(options.getSelectedLevel() + 1, 1, levels.length));
      openBattleSelect();
    });
    dom.upgradeList.addEventListener("click", function onSettlementChest(event) {
      var reportAction = event.target && event.target.closest ? event.target.closest("[data-settlement-action]") : null;
      if (reportAction) {
        var action = reportAction.dataset ? reportAction.dataset.settlementAction : "";
        if (action === "next") dom.nextLevelButton.click();
        if (action === "replay") dom.replayButton.click();
        if (action === "chapter") dom.backToChapterButton.click();
        return;
      }
      var victoryChest = event.target && event.target.closest ? event.target.closest("[data-open-victory-chest]") : null;
      if (victoryChest && options.getLastBattleResult()) {
        renderSettlementChest(options.getLastBattleResult());
        return;
      }
      var target = event.target && event.target.closest ? event.target.closest("[data-open-settlement]") : null;
      if (target && options.getLastBattleResult()) {
        playSfx("chest");
        renderSettlement(options.getLastBattleResult());
      }
    });
    dom.closeFeaturePanel.addEventListener("click", function close() {
      closeFeaturePanel();
    });
    dom.featurePanel.addEventListener("click", function onFighterUpgradeClick(event) {
      if (handleSettingPanelClick(event)) return;
      if (shared.starWingsGachaView && shared.starWingsGachaView.handleEvent && shared.starWingsGachaView.handleEvent(event, dom)) {
        playSfx("button");
        return;
      }
      if (shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.handleEvent && shared.mainFeaturePanelsView.handleEvent(event, dom, {
        profile: options.getProfile(),
        levels: levels,
        combatPower: calculateTotalPower(),
        audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null,
        startEndlessMode: options.startEndlessMode
      })) {
        playSfx("button");
        return;
      }
      var activityClaim = event.target && event.target.closest ? event.target.closest("[data-activity-claim]") : null;
      if (activityClaim && !activityClaim.disabled && shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.claimActivityReward) {
        if (isCloudMode()) {
          runCloudEconomyAction(activityClaim, "claimActivityReward", Number(activityClaim.dataset.activityClaim), "task");
          return;
        }
        var activityResult = shared.mainFeaturePanelsView.claimActivityReward(options.getProfile(), activityClaim.dataset.activityClaim, { levels: levels });
        if (activityResult && activityResult.ok) {
          playSfx("button");
          saveProfile();
          renderLobby();
          shared.mainFeaturePanelsView.renderPanel("task", dom, {
            profile: options.getProfile(),
            levels: levels,
            combatPower: calculateTotalPower(),
            audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
          });
        }
        return;
      }
      var achievementClaim = event.target && event.target.closest ? event.target.closest("[data-achievement-claim]") : null;
      if (achievementClaim && !achievementClaim.disabled && shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.claimAchievement) {
        if (isCloudMode()) {
          runCloudEconomyAction(achievementClaim, "claimAchievement", achievementClaim.dataset.achievementClaim, "achievement");
          return;
        }
        var achievementResult = shared.mainFeaturePanelsView.claimAchievement(options.getProfile(), achievementClaim.dataset.achievementClaim, { levels: levels });
        if (achievementResult && achievementResult.ok) {
          playSfx("button");
          saveProfile();
          renderLobby();
          shared.mainFeaturePanelsView.renderPanel("achievement", dom, {
            profile: options.getProfile(),
            levels: levels,
            combatPower: calculateTotalPower(),
            audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
          });
        }
        return;
      }
      var taskClaim = event.target && event.target.closest ? event.target.closest("[data-task-claim]") : null;
      if (taskClaim && !taskClaim.disabled && shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.claimTask) {
        if (isCloudMode()) {
          runCloudEconomyAction(taskClaim, "claimTask", taskClaim.dataset.taskClaim, "task");
          return;
        }
        var claimResult = shared.mainFeaturePanelsView.claimTask(options.getProfile(), taskClaim.dataset.taskClaim, { levels: levels });
        if (claimResult && claimResult.ok) {
          playSfx("button");
          saveProfile();
          renderLobby();
          shared.mainFeaturePanelsView.renderPanel("task", dom, {
            profile: options.getProfile(),
            levels: levels,
            combatPower: calculateTotalPower(),
            audioSettings: audioSystem && audioSystem.getSettings ? audioSystem.getSettings() : null
          });
        }
        return;
      }
      var shopBuy = event.target && event.target.closest ? event.target.closest("[data-shop-buy]") : null;
      if (shopBuy && !shopBuy.disabled) {
        if (!isCloudMode()) {
          if (shopBuy.dataset.shopBuy === "daily_free_supply" && shared.mainFeaturePanelsView && shared.mainFeaturePanelsView.claimDailyShopItem) {
            var shopClaim = shared.mainFeaturePanelsView.claimDailyShopItem(options.getProfile(), shopBuy.dataset.shopBuy);
            if (shopClaim && shopClaim.ok) {
              playSfx("button");
              saveProfile();
              renderLobby();
              shared.mainFeaturePanelsView.renderPanel("shop", dom, { profile: options.getProfile(), levels: levels });
            }
            return;
          }
          dom.featurePanelBody.textContent = "商店购买仅在云端正式服开放。";
          return;
        }
        runCloudEconomyAction(shopBuy, "buyShopItem", shopBuy.dataset.shopBuy, "shop");
        return;
      }
      var back = event.target && event.target.closest ? event.target.closest("[data-feature-back]") : null;
      if (back) {
        closeFeaturePanel();
        return;
      }
      if (handleFighterUpgradeClick && handleFighterUpgradeClick(event)) return;
    });
    dom.featurePanel.addEventListener("keydown", function onFeaturePanelKeydown(event) {
      if (shared.eventModeHubView && shared.eventModeHubView.handleKeydown && shared.eventModeHubView.handleKeydown(event, dom)) {
        playSfx("button");
      }
    });
    dom.featurePanel.addEventListener("click", function closeBackdrop(event) {
      handleProfilePanelClick(event);
      if (event.target === dom.featurePanel) closeFeaturePanel();
    });
    dom.featurePanel.addEventListener("input", handleSettingPanelInput);
    dom.featurePanel.addEventListener("change", handleSettingPanelInput);
    dom.featurePanel.addEventListener("submit", handleRedeemSubmission);
    if (dom.avatarUpload) dom.avatarUpload.addEventListener("change", handleAvatarUpload);
    Array.prototype.forEach.call(document.querySelectorAll(".lobby-action"), function bind(button) {
      button.addEventListener("click", function openPanel() {
        openFeaturePanel(button.dataset.panel);
      });
    });

    root.addEventListener("keydown", function onKeyDown(event) {
      if (options.isExternalBattleActive && options.isExternalBattleActive()) return;
      var eventCode = battleInput.getCode(event);
      var activeSlotIndex = battleInput.getActiveSlotIndex(event);
      var gameKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space", "KeyP"].indexOf(eventCode) >= 0 || activeSlotIndex >= 0;
      if (gameKey) event.preventDefault();
      if (eventCode) keys.add(eventCode);
      if (event.repeat && (eventCode === "Space" || eventCode === "KeyP" || activeSlotIndex >= 0)) return;
      if (eventCode === "Space" && options.getState().mode === "fight") tryUseDecisiveCommand();
      if (activeSlotIndex >= 0 && options.getState().mode === "fight") tryCastActiveSlot(activeSlotIndex);
      if (eventCode === "KeyP") {
        if (options.getState().mode === "paused") resumeGame();
        else pauseGame();
      }
    });

    root.addEventListener("keyup", function onKeyUp(event) {
      keys.delete(battleInput.getCode(event));
    });
    canvas.addEventListener("pointerdown", function onPointerDown(event) {
      if (canvas.focus) canvas.focus({ preventScroll: true });
      pointer.active = true;
      updatePointer(event);
      canvas.setPointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointermove", function onPointerMove(event) {
      if (pointer.active) updatePointer(event);
    });
    canvas.addEventListener("pointerup", function onPointerUp(event) {
      pointer.active = false;
      canvas.releasePointerCapture(event.pointerId);
    });
    canvas.addEventListener("pointercancel", function onPointerCancel() {
      pointer.active = false;
    });
  }

    return {
      bind: bindEvents,
      isBound: function isBound() { return bound; }
    };
  }

  var api = { create: create };
  scope.gameEventRouter = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
