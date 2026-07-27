(function defineFighterUpgradeRoom(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var registry = scope.roomRegistry;
  if (!registry) return;

  registry.defineRoom("upgrade", function createFighterUpgradeRoom(context) {
    var shared = context.shared || scope;
    var dom = context.dom || {};
    var capabilities = context.fighterUpgrade || {};
    var gatewayLock = capabilities.gatewayActionLock || { busy: false };
    var isOpen = false;

    if (!shared.fighterUpgradeModel || !shared.fighterUpgradeView) {
      return { actions: {
        open: function unavailableOpen() { return false; },
        close: function unavailableClose() { return false; },
        click: function unavailableClick() { return false; },
        upgradeStat: function unavailableStat() { return Promise.resolve(null); },
        upgradeAutoWeapon: function unavailableWeapon() { return Promise.resolve(null); },
        upgradeAutoWeaponWithComponents: function unavailableComponents() { return Promise.resolve(null); },
        saveLoadout: function unavailableLoadout() { return Promise.resolve(null); },
        upgradeActiveGrade: function unavailableGrade() { return Promise.resolve(null); },
        upgradePassiveSkill: function unavailablePassive() { return Promise.resolve(null); }
      }, dispose: function disposeUnavailableRoom() {} };
    }

    var model = shared.fighterUpgradeModel.create({
      shared: shared,
      levelsConfig: capabilities.levelsConfig,
      getProfile: capabilities.getProfile,
      getPilotAsset: capabilities.getPilotAsset,
      getShipAsset: capabilities.getShipAsset
    });
    var view = shared.fighterUpgradeView.create({
      shared: shared,
      levelsConfig: capabilities.levelsConfig,
      getStatBonus: model.statBonus
    });

    function open() {
      isOpen = true;
      render();
      if (dom.lobbyScreen) dom.lobbyScreen.classList.add("panel-open");
      if (dom.fighterUpgradeScreen) dom.fighterUpgradeScreen.classList.remove("hidden");
      if (capabilities.syncGatewayProfile) {
        Promise.resolve(capabilities.syncGatewayProfile(30000)).then(function renderSyncedUpgrade() {
          if (isOpen) render();
        }).catch(function keepUpgradeSnapshot() {});
      }
      return true;
    }

    function close() {
      isOpen = false;
      if (dom.fighterUpgradeScreen) dom.fighterUpgradeScreen.classList.add("hidden");
      if (dom.lobbyScreen) dom.lobbyScreen.classList.remove("panel-open");
      return true;
    }

    function render() {
      if (!dom.fighterUpgradeMount) return false;
      view.mount(dom.fighterUpgradeMount, model.snapshot());
      return true;
    }

    function handleClick(event) {
      var dockRoot = dom.fighterUpgradeMount && dom.fighterUpgradeMount.querySelector
        ? dom.fighterUpgradeMount.querySelector("[data-fighter-upgrade-root]") : null;
      if (!dockRoot || !event || !event.target || !dockRoot.contains(event.target)) return false;
      var target = event.target.closest ? event.target.closest([
        "[data-dock-page]", "[data-dock-select-stat]", "[data-dock-slot-type]", "[data-dock-tab]", "[data-dock-select-skill]",
        "[data-dock-equip-active]", "[data-dock-equip-auto]", "[data-dock-unequip]",
        "[data-dock-auto-toggle]", "[data-dock-upgrade-auto]", "[data-dock-upgrade-auto-components]", "[data-dock-upgrade-passive]",
        "[data-dock-upgrade-grade]", "[data-fighter-upgrade]",
        "[data-dock-buy-material]", "[data-dock-cancel-buy]", "[data-dock-confirm-buy]"
      ].join(",")) : null;
      if (!target || target.closest("button") && target.closest("button").disabled) return false;

      if (target.dataset.dockPage) {
        model.selectPage(target.dataset.dockPage);
        render();
        return true;
      }
      if (target.dataset.dockSelectStat) {
        model.selectUpgradeStat(target.dataset.dockSelectStat);
        render();
        return true;
      }

      if (target.dataset.dockSlotType) {
        model.selectSlot(target.dataset.dockSlotType, target.dataset.dockSlotIndex);
        render();
        return true;
      }
      if (target.dataset.dockTab) {
        model.selectTab(target.dataset.dockTab);
        render();
        return true;
      }
      if (target.dataset.dockSelectSkill) {
        var selId = target.dataset.dockSelectSkill;
        var curPage = dockRoot.getAttribute("data-dock-current-page");
        model.selectLibrarySkill(selId);
        if (curPage === "auto") {
          // 自动页：局部补丁，保留库滚动位置（spec §5.1 方案 1）
          view.patchLibrarySelection("auto", selId);
        } else {
          render();
        }
        return true;
      }
      if (target.dataset.dockUpgradeAuto) {
        upgradeAutoWeapon(target.dataset.dockUpgradeAuto);
        return true;
      }
      if (target.dataset.dockUpgradeAutoComponents) {
        upgradeAutoWeaponWithComponents(target.dataset.dockUpgradeAutoComponents);
        return true;
      }
      if (target.dataset.dockUpgradePassive) {
        upgradePassiveSkill(target.dataset.dockUpgradePassive);
        return true;
      }
      if (target.dataset.fighterUpgrade) {
        upgradeFighterStat(target.dataset.fighterUpgrade);
        return true;
      }
      if (target.dataset.dockUpgradeGrade) {
        upgradeActiveGrade(target.dataset.dockUpgradeGrade);
        return true;
      }
      if (target.dataset.dockBuyMaterial) {
        openPurchaseOverlay(target.dataset.dockBuyMaterial);
        return true;
      }
      if (target.dataset.dockCancelBuy) {
        closePurchaseOverlay();
        return true;
      }
      if (target.dataset.dockConfirmBuy) {
        confirmPurchase(target.dataset.dockConfirmBuy);
        return true;
      }
      return updateLoadout(target);
    }

    function updateLoadout(target) {
      var data = model.snapshot();
      var selected = data.selectedSlot;
      var next = model.cloneLoadout(data.shipLoadout);
      if (target.dataset.dockEquipActive && selected.type === "active") {
        next.activeSlots[selected.index] = { skillId: target.dataset.dockEquipActive, autoEnabled: false };
      } else if (target.dataset.dockEquipAuto && selected.type === "auto") {
        if (shared.autoSkillModule && shared.autoSkillModule.equip) {
          next = shared.autoSkillModule.equip(next, selected.index, target.dataset.dockEquipAuto);
        } else if (selected.index < 3) {
          next.fixedWeaponOverrides[selected.index] = target.dataset.dockEquipAuto;
        } else {
          next.autoWeaponIds[selected.index - 3] = target.dataset.dockEquipAuto;
        }
      } else if (target.dataset.dockUnequip === "active" && selected.type === "active") {
        next.activeSlots[selected.index] = null;
      } else if (target.dataset.dockUnequip === "auto" && selected.type === "auto") {
        if (shared.autoSkillModule && shared.autoSkillModule.unequip) {
          next = shared.autoSkillModule.unequip(next, selected.index);
        } else if (selected.index < 3) {
          next.fixedWeaponOverrides[selected.index] = null;
        } else {
          next.autoWeaponIds[selected.index - 3] = null;
        }
      } else if (target.dataset.dockAutoToggle != null) {
        var index = Math.max(0, Math.min(3, Math.floor(Number(target.dataset.dockAutoToggle) || 0)));
        if (!next.activeSlots[index]) return false;
        next.activeSlots[index].autoEnabled = !next.activeSlots[index].autoEnabled;
      } else {
        return false;
      }
      saveLoadout(data.ship.id, next);
      return true;
    }

    function saveLoadout(shipId, loadout) {
      return runGatewayAction("loadout", "正在校验并同步战机配装…", function submitLoadout() {
        return capabilities.ensureGameGateway().then(function saveWithGateway() {
          return capabilities.getGameGateway().saveFighterSkillLoadout(shipId, loadout);
        });
      }, function loadoutSuccess() {
        refreshScreens(true);
        return "配装已同步到当前战机。";
      }, "配装保存失败，已恢复最后一次有效配置。");
    }

    function upgradeAutoWeapon(moduleId) {
      var operationId = root.crypto && root.crypto.randomUUID
        ? root.crypto.randomUUID()
        : "local-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      return runGatewayAction("weapon:" + moduleId, "正在提交自动技能升级…", function submitWeaponUpgrade() {
        return capabilities.ensureGameGateway().then(function upgradeWithGateway() {
          return capabilities.getGameGateway().upgradeAutoWeapon(moduleId, operationId);
        });
      }, function weaponSuccess(response) {
        refreshScreens(false);
        return "自动技能已完成" + (response && Number(response.level) === 1 ? "购买" : "升级") + "。";
      }, "自动技能升级失败。");
    }

    function upgradeAutoWeaponWithComponents(moduleId) {
      var operationId = root.crypto && root.crypto.randomUUID
        ? root.crypto.randomUUID()
        : "local-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      return runGatewayAction("weapon-components:" + moduleId, "正在提交自动技能模块升级…", function submitWeaponUpgrade() {
        return capabilities.ensureGameGateway().then(function upgradeWithGateway() {
          return capabilities.getGameGateway().upgradeAutoWeaponWithComponents(moduleId, operationId);
        });
      }, function weaponComponentsSuccess(response) {
        refreshScreens(false);
        return "自动技能已完成模块" + (response && Number(response.level) === 1 ? "解锁" : "升级") + "。";
      }, "自动技能模块升级失败。");
    }

    function upgradeFighterStat(statType) {
      return runGatewayAction("stat:" + statType, "强化请求已发出，正在同步资源…", function submitStatUpgrade() {
        return capabilities.ensureGameGateway().then(function upgradeWithGateway() {
          return capabilities.getGameGateway().upgradeFighter(statType);
        });
      }, function statSuccess() {
        if (capabilities.updateHud) capabilities.updateHud(true);
        return "战机强化完成。";
      }, "强化失败，请稍后重试。");
    }

    function upgradeActiveGrade(targetGrade) {
      var data = model.snapshot();
      if (data.selectedSlot.type !== "active") return Promise.resolve(null);
      return runGatewayAction("grade:" + targetGrade, "正在消耗档案令升级主动技能…", function submitGrade() {
        return capabilities.ensureGameGateway().then(function gradeWithGateway() {
          var operationId = root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : "active-" + Date.now() + "-" + Math.random().toString(16).slice(2);
          return capabilities.getGameGateway().upgradeActiveSkillGrade(data.ship.id, data.selectedSlot.index, targetGrade, operationId);
        });
      }, function gradeSuccess() {
        refreshScreens(false);
        return "主动技能已升级至 " + targetGrade + " 级。";
      }, "档案令升级失败。");
    }

    function upgradePassiveSkill(skillId) {
      return runGatewayAction("passive:" + skillId, "正在消耗战术核心升级自动技能…", function submitPassiveUpgrade() {
        return capabilities.ensureGameGateway().then(function upgradeWithGateway() {
          var operationId = root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : "auto-" + Date.now() + "-" + Math.random().toString(16).slice(2);
          return capabilities.getGameGateway().upgradePassiveSkill(skillId, operationId);
        });
      }, function passiveSuccess(response) {
        refreshScreens(false);
        return "自动技能已升级至 Lv." + (response && response.targetGrade ? response.targetGrade : 1) + "。";
      }, "自动技能升级失败。");
    }

    function escapeHtml(value) {
      return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
        return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
      });
    }
    function escapeAttr(value) { return escapeHtml(value); }
    function formatCompact(value) {
      var n = Math.max(0, Math.floor(Number(value) || 0));
      return n >= 1000000 ? (n / 1000000) + "M" : n >= 1000 ? (n / 1000) + "K" : String(n);
    }

    // ── 材料不足 → 商店真购买 → 重试升级（spec §3.3 / §5.2）──
    function openPurchaseOverlay(spec) {
      if (!dom.fighterUpgradeMount) return false;
      var dockRoot = dom.fighterUpgradeMount.querySelector("[data-fighter-upgrade-root]");
      if (!dockRoot) return false;
      closePurchaseOverlay();
      var parts = String(spec || "").split(":");
      var itemId = parts[0];
      var qty = Math.max(1, Math.floor(Number(parts[1]) || 1));
      var item = shared.shopConfig && shared.shopConfig.getShopItem ? shared.shopConfig.getShopItem(itemId) : null;
      if (!item) return false;
      var currencyLabel = item.priceCurrency === "diamonds" ? "钻石" : "金币";
      var name = item.title || itemId;
      var overlay = document.createElement("section");
      overlay.className = "fu-buy-overlay";
      overlay.setAttribute("data-fu-buy-overlay", "");
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.style.cssText = "position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(2,8,16,.74);padding:16px;";
      overlay.innerHTML =
        '<div class="fu-buy-panel" style="min-width:280px;max-width:90%;background:#02101c;border:1px solid #2e7498;box-shadow:0 0 24px rgba(94,199,239,.25);padding:18px 20px;display:grid;gap:16px;grid-template-columns:1fr auto;">' +
          '<p class="fu-buy-msg" style="grid-column:1 / 3;margin:0;color:#e9f4fb;font-size:13px;line-height:1.8;">材料不足：' + escapeHtml(name) + ' 还差 ' + qty + ' 个。<br>是否以 ' + formatCompact(item.priceAmount) + ' ' + currencyLabel + '购买 ' + qty + ' 个 ' + escapeHtml(name) + '？</p>' +
          '<button type="button" class="fu-btn" data-dock-cancel-buy style="justify-self:start;min-height:34px;padding:6px 14px;">再看看</button>' +
          '<button type="button" class="fu-btn fu-btn--primary" data-dock-confirm-buy="' + escapeAttr(itemId + ":" + qty) + '" style="justify-self:end;min-height:34px;padding:6px 14px;">以 ' + formatCompact(item.priceAmount) + ' ' + currencyLabel + '购买</button>' +
        '</div>';
      dockRoot.appendChild(overlay);
      return true;
    }

    function closePurchaseOverlay() {
      if (!dom.fighterUpgradeMount) return false;
      var existing = dom.fighterUpgradeMount.querySelector("[data-fu-buy-overlay]");
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      return true;
    }

    // 记录购买前的升级上下文，购买成功后自动重试原升级。
    function buildRetryAction() {
      var data = model.snapshot();
      if (data.page === "auto" && data.selectedSlot.type === "auto") {
        return function () { return upgradePassiveSkill(data.selectedAutoSkillId); };
      }
      if (data.page === "active" && data.selectedSlot.type === "active") {
        var plan = data.gradeUpgrade;
        if (plan && plan.nextGrade) return function () { return upgradeActiveGrade(plan.nextGrade); };
      }
      return null;
    }

    function confirmPurchase(spec) {
      if (gatewayLock.busy) return;
      var parts = String(spec || "").split(":");
      var itemId = parts[0];
      var qty = Math.max(1, Math.floor(Number(parts[1]) || 1));
      var retry = buildRetryAction();
      closePurchaseOverlay();
      gatewayLock.busy = true;
      model.setPending("buy", "正在购入材料…");
      render();
      capabilities.ensureGameGateway().then(function (gw) {
        return gw.buyShopItem(itemId, qty);
      }).then(function applyPurchase(response) {
        if (!response || !response.profile) throw new Error("云端返回的存档无效。");
        if (capabilities.applyGatewayProfile) capabilities.applyGatewayProfile(response.profile);
      }).then(function () {
        gatewayLock.busy = false;
        model.finish("材料已购入，正在重试升级…");
        render();
        if (retry) return retry();
        return null;
      }).catch(function (error) {
        gatewayLock.busy = false;
        model.finish(error && error.message ? error.message : "购买失败，请稍后重试。");
        render();
      });
    }

    function runGatewayAction(action, pendingMessage, task, successMessage, fallbackError) {
      if (gatewayLock.busy) return Promise.resolve(null);
      gatewayLock.busy = true;
      model.setPending(action, pendingMessage);
      render();
      var completedMessage = "";
      return Promise.resolve().then(task).then(function applyResult(response) {
        if (response && response.profile && capabilities.applyGatewayProfile) capabilities.applyGatewayProfile(response.profile);
        completedMessage = successMessage(response);
        return response;
      }).catch(function showFailure(error) {
        completedMessage = error && error.message ? error.message : fallbackError;
        return null;
      }).finally(function releaseAction() {
        gatewayLock.busy = false;
        model.finish(completedMessage);
        render();
      });
    }

    function refreshScreens(includeChapter) {
      if (capabilities.renderLobby) capabilities.renderLobby();
      if (includeChapter && capabilities.renderChapterSelect) capabilities.renderChapterSelect();
      if (capabilities.updateHud) capabilities.updateHud();
    }

    function dispose() {
      close();
      if (dom.fighterUpgradeMount) {
        dom.fighterUpgradeMount.innerHTML = "";
      }
    }

    var actions = {
      open: open,
      close: close,
      click: handleClick,
      upgradeStat: upgradeFighterStat,
      upgradeAutoWeapon: upgradeAutoWeapon,
      upgradeAutoWeaponWithComponents: upgradeAutoWeaponWithComponents,
      upgradeActiveGrade: upgradeActiveGrade,
      upgradePassiveSkill: upgradePassiveSkill,
      saveLoadout: saveLoadout
    };
    return { actions: actions, dispose: dispose };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
