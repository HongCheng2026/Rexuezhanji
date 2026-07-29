// Pure DOM input adapter. It translates raw input into synchronous room actions.
(function registerGameEventRouter(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var registry = options.registry || scope.roomRegistry;
    if (!registry || typeof registry.dispatch !== "function") {
      throw new Error("H5 game bootstrap failed: room registry missing (input adapter has no doors).");
    }
    var battleInput = options.battleInput;
    if (!battleInput || typeof battleInput.getActiveSlotIndex !== "function") {
      throw new Error("H5 game bootstrap failed: missing battle input adapter.");
    }
    var dom = options.dom || {};
    var canvas = options.canvas;
    var keys = options.keys;
    var pointer = options.pointer;
    var getState = options.getState || function getEmptyState() { return {}; };
    var isExternalBattleActive = options.isExternalBattleActive || function noExternalBattle() { return false; };
    var updatePointer = options.updatePointer;
    var bound = false;

    function dispatch(name, payload) {
      return registry.dispatch(name, payload);
    }

    function unlockAudio() {
      var state = getState() || {};
      dispatch("setting.unlock", state.mode);
    }

    function bindEvents() {
      if (bound) return;
      bound = true;

      root.addEventListener("pointerdown", unlockAudio, { once: true });
      root.addEventListener("click", unlockAudio, { once: true });
      root.addEventListener("touchstart", unlockAudio, { once: true, passive: true });
      root.addEventListener("keydown", unlockAudio, { once: true });

      root.document.addEventListener("click", function onStoryReplayClick(event) {
        dispatch("story.replay", event);
      }, true);

      root.document.addEventListener("click", function onAnyUiClick(event) {
        if (event.target && event.target.closest && event.target.closest("button")) dispatch("setting.uiClick");
      });

      dom.startButton.addEventListener("click", function onStart() {
        var mode = (getState() || {}).mode;
        if (mode === "settlement-error") dispatch("battle.settlePending");
        else if (mode === "paused") dispatch("battle.resume");
        else dispatch("battle.startSelectedLevel");
      });
      dom.battleEntryButton.addEventListener("click", function onBattleEntry() {
        dispatch("lobby.openBattleSelect");
      });
      if (dom.openResourceExchange) {
        dom.openResourceExchange.addEventListener("click", function onOpenResourceExchange() {
          dispatch("resourceExchange.open");
        });
      }
      if (dom.resourceExchangeScreen) {
        dom.resourceExchangeScreen.addEventListener("click", function onResourceExchangeClick(event) {
          var target = event.target && event.target.closest ? event.target.closest("[data-exchange-action]") : null;
          if (!target) {
            if (event.target === dom.resourceExchangeScreen) dispatch("resourceExchange.close");
            return;
          }
          var action = target.dataset.exchangeAction;
          if (action === "close") dispatch("resourceExchange.close");
          else if (action === "confirm") dispatch("resourceExchange.confirm");
          else if (action === "adjust") dispatch("resourceExchange.adjust", Number(target.dataset.exchangeDelta) || 0);
          else if (action === "preset") dispatch("resourceExchange.setAmount", Number(target.dataset.exchangeAmount) || 1);
        });
        dom.resourceExchangeScreen.addEventListener("input", function onResourceExchangeInput(event) {
          var input = event.target && event.target.closest ? event.target.closest("[data-exchange-input]") : null;
          if (input) dispatch("resourceExchange.setAmount", input.value);
        });
      }
      if (dom.gachaScreen) {
        dom.gachaScreen.addEventListener("click", function onGachaClick(event) {
          var target = event.target && event.target.closest ? event.target.closest("[data-gacha-action]") : null;
          if (!target) {
            if (event.target === dom.gachaScreen) dispatch("gacha.close");
            return;
          }
          var action = target.dataset.gachaAction;
          if (action === "close") dispatch("gacha.close");
          else if (action === "target") dispatch("gacha.selectTarget", target.dataset.gachaTarget);
          else if (action === "draw") dispatch("gacha.draw", { count: Number(target.dataset.gachaCount) || 1 });
          else if (action === "back") dispatch("gacha.back");
          else if (action === "redraw") dispatch("gacha.redraw");
          else if (action === "confirm-topup") dispatch("gacha.confirmTopUp");
          else if (action === "cancel-topup") dispatch("gacha.cancelTopUp");
          else if (action === "shop") { dispatch("gacha.close"); dispatch("featurePanel.open", "shop"); }
        });
      }
      if (dom.inventoryScreen) {
        dom.inventoryScreen.addEventListener("click", function onInventoryClick(event) {
          var target = event.target && event.target.closest ? event.target.closest("[data-inventory-action]") : null;
          if (!target) {
            if (event.target === dom.inventoryScreen) dispatch("inventory.close");
            return;
          }
          var action = target.dataset.inventoryAction;
          if (action === "close") dispatch("inventory.close");
          else if (action === "filter") dispatch("inventory.filter", target.dataset.inventoryFilter);
          else if (action === "select") dispatch("inventory.select", target.dataset.inventoryId);
          else if (action === "use") dispatch("inventory.use", target.dataset.inventoryId);
          else if (action === "sell") dispatch("inventory.sell", target.dataset.inventoryId);
          else if (action === "dismiss-feedback") dispatch("inventory.dismissFeedback");
        });
      }

      if (dom.battleUiRoot) {
        dom.battleUiRoot.addEventListener("click", function onBattleUiAction(event) {
          var target = event.target && event.target.closest ? event.target.closest("[data-battle-action]") : null;
          if (!target || target.disabled) return;
          var action = target.dataset.battleAction;
          if (action === "pause") {
            if ((getState() || {}).mode === "paused") dispatch("battle.resume");
            else dispatch("battle.pause");
          } else if (action === "decisive-command") {
            dispatch("battle.decisiveCommand");
          } else if (action === "active-auto-toggle") {
            dispatch("battle.toggleActiveSlotAuto", Number(target.dataset.slotIndex));
          } else if (action === "pause-resume") {
            dispatch("battle.resume");
          } else if (action === "pause-chapter") {
            dispatch("battle.abort", "chapter");
          } else if (action === "pause-lobby") {
            dispatch("battle.abort", "lobby");
          }
        });
      }

      if (dom.shopButton) dom.shopButton.addEventListener("click", function onShop() { dispatch("shop.open"); });
      dom.replayButton.addEventListener("click", function onReplay() { dispatch("battle.startSelectedLevel"); });
      dom.backToChapterButton.addEventListener("click", function onBackToChapter() { dispatch("lobby.openBattleSelect"); });
      dom.nextLevelButton.addEventListener("click", function onNext() { dispatch("battle.nextOrReplay"); });

      dom.upgradeList.addEventListener("click", function onSettlementAction(event) {
        var reportAction = event.target && event.target.closest ? event.target.closest("[data-settlement-action]") : null;
        if (reportAction) {
          var action = reportAction.dataset ? reportAction.dataset.settlementAction : "";
          if (action === "next") dispatch("battle.nextOrReplay");
          else if (action === "replay") dispatch("battle.startSelectedLevel");
          else if (action === "chapter") dispatch("lobby.openBattleSelect");
          return;
        }
        var state = getState() || {};
        var victoryChest = event.target && event.target.closest ? event.target.closest("[data-open-victory-chest]") : null;
        if (victoryChest && state.lastBattleResult) {
          dispatch("settlement.chest", state.lastBattleResult);
          return;
        }
        var target = event.target && event.target.closest ? event.target.closest("[data-open-settlement]") : null;
        if (target && state.lastBattleResult) {
          dispatch("setting.chest");
          dispatch("settlement.open", state.lastBattleResult);
        }
      });

      dom.closeFeaturePanel.addEventListener("click", function close() { dispatch("featurePanel.close"); });
      dom.featurePanel.addEventListener("click", function onFeaturePanelClick(event) {
        if (dispatch("setting.handleClick", event)) return;
        if (dispatch("featurePanel.handleEvent", event)) return;
        var achievementClaim = event.target && event.target.closest ? event.target.closest("[data-achievement-claim]") : null;
        if (achievementClaim && !achievementClaim.disabled) { dispatch("achievement.claim", achievementClaim); return; }
        var taskClaim = event.target && event.target.closest ? event.target.closest("[data-task-claim]") : null;
        if (taskClaim && !taskClaim.disabled) { dispatch("task.claim", taskClaim); return; }
        var activityClaim = event.target && event.target.closest ? event.target.closest("[data-activity-claim]") : null;
        if (activityClaim && !activityClaim.disabled) { dispatch("activity.claim", activityClaim); return; }
        var signinClaim = event.target && event.target.closest ? event.target.closest("[data-signin-claim]") : null;
        if (signinClaim && !signinClaim.disabled) { dispatch("signin.claim", signinClaim); return; }
        var shopBuy = event.target && event.target.closest ? event.target.closest("[data-shop-buy]") : null;
        if (shopBuy && !shopBuy.disabled) {
          if (shopBuy.dataset.shopBuy === "daily_free_supply") dispatch("shop.dailyFree", shopBuy);
          else dispatch("shop.buy", shopBuy);
          return;
        }
        var shopExchange = event.target && event.target.closest ? event.target.closest("[data-shop-exchange]") : null;
        if (shopExchange && !shopExchange.disabled) {
          dispatch("shop.exchange", shopExchange);
          return;
        }
        var back = event.target && event.target.closest ? event.target.closest("[data-feature-back]") : null;
        if (back) { dispatch("featurePanel.close"); return; }
      });
      if (dom.fighterUpgradeScreen) {
        dom.fighterUpgradeScreen.addEventListener("click", function onFighterUpgradeClick(event) {
          var close = event.target && event.target.closest ? event.target.closest("[data-upgrade-close],[data-feature-back]") : null;
          if (close) { dispatch("upgrade.close"); return; }
          dispatch("upgrade.click", event);
        });
      }
      dom.featurePanel.addEventListener("keydown", function onFeaturePanelKeydown(event) {
        dispatch("featurePanel.handleKeydown", event);
      });
      dom.featurePanel.addEventListener("click", function closeBackdrop(event) {
        dispatch("profile.backdropClick", event);
        if (event.target === dom.featurePanel) dispatch("featurePanel.close");
      });
      dom.featurePanel.addEventListener("input", function onFeaturePanelInput(event) {
        dispatch("setting.handleInput", event);
      });
      dom.featurePanel.addEventListener("change", function onFeaturePanelChange(event) {
        dispatch("setting.handleInput", event);
      });
      dom.featurePanel.addEventListener("submit", function onFeaturePanelSubmit(event) {
        var form = event.target && event.target.closest ? event.target.closest("[data-redeem-form]") : null;
        if (!form) return;
        event.preventDefault();
        var input = form.querySelector("[data-redeem-code]");
        dispatch("redeem.submit", {
          code: input ? String(input.value || "").trim() : "",
          input: input,
          submit: form.querySelector("button[type='submit']"),
          status: form.querySelector("[data-redeem-status]")
        });
      });

      if (dom.avatarUpload) dom.avatarUpload.addEventListener("change", function onAvatarUpload(event) {
        dispatch("profile.avatarUpload", event);
      });

      Array.prototype.forEach.call(root.document.querySelectorAll(".lobby-action"), function bind(button) {
        button.addEventListener("click", function openPanel() { dispatch("featurePanel.open", button.dataset.panel); });
      });

      root.addEventListener("keydown", function onKeyDown(event) {
        if (isExternalBattleActive()) return;
        var target = event.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
        var eventCode = battleInput.getCode(event);
        var activeSlotIndex = battleInput.getActiveSlotIndex(event);
        var gameKey = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyA", "KeyD", "KeyW", "KeyS", "Space", "KeyP"].indexOf(eventCode) >= 0 || activeSlotIndex >= 0;
        if (gameKey) event.preventDefault();
        if (eventCode) keys.add(eventCode);
        if (event.repeat && (eventCode === "Space" || eventCode === "KeyP" || activeSlotIndex >= 0)) return;
        var mode = (getState() || {}).mode;
        if (eventCode === "Space" && mode === "fight") dispatch("battle.decisiveCommand");
        if (activeSlotIndex >= 0 && mode === "fight") dispatch("battle.castActiveSlot", activeSlotIndex);
        if (eventCode === "KeyP") {
          if (mode === "paused") dispatch("battle.resume");
          else dispatch("battle.pause");
        }
      });
      root.addEventListener("keyup", function onKeyUp(event) {
        var target = event.target;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
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
      canvas.addEventListener("pointercancel", function onPointerCancel() { pointer.active = false; });
    }

    return { bind: bindEvents, isBound: function isBound() { return bound; } };
  }

  var api = { create: create };
  scope.gameEventRouter = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
