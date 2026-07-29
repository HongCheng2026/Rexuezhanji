(function defineInventoryRoom(root) {
  "use strict";
  var shared = root.RXGame || (root.RXGame = {});
  var registry = shared.roomRegistry;
  if (!registry) return;

  registry.defineRoom("inventory", function createInventoryRoom(context) {
    var capabilities = context.inventory || {};
    var screen = context.dom && context.dom.inventoryScreen;
    var mount = context.dom && context.dom.inventoryMount;
    var catalog = shared.inventoryCatalog;
    var model = shared.inventoryModel;
    var view = shared.inventoryView && shared.inventoryView.create({ mount: mount, catalog: catalog, uiAssets: shared.assets && shared.assets.INVENTORY_UI_ASSETS || {} });
    var filter = "all";
    var selectedId = null;
    var message = "";
    var isError = false;
    var feedback = null;
    var busy = false;

    function getProfile() { return capabilities.getProfile ? capabilities.getProfile() : {}; }
    function isCloudMode() { return Boolean(capabilities.isCloudMode && capabilities.isCloudMode()); }
    function getItems() {
      var iconAssets = Object.assign({}, shared.assets && shared.assets.SHOP_ITEM_ASSETS || {}, shared.assets && shared.assets.INVENTORY_UI_ASSETS || {});
      return model.project(getProfile(), filter, catalog, iconAssets, shared.assets && shared.assets.INVENTORY_UI_ASSETS && shared.assets.INVENTORY_UI_ASSETS.unknownItem);
    }
    function render() {
      if (!view || !model) return false;
      var profile = getProfile();
      var resources = profile.resources || {};
      var items = getItems();
      if (selectedId && !items.some(function has(item) { return item.id === selectedId; })) selectedId = items.length ? items[0].id : null;
      var selected = items.find(function byId(item) { return item.id === selectedId; }) || null;
      view.render({
        filter: filter,
        items: items,
        selectedId: selectedId,
        selected: selected,
        cloudMode: isCloudMode(),
        message: message,
        isError: isError,
        feedback: feedback,
        resources: {
          gold: resources.gold != null ? resources.gold : profile.coins,
          diamonds: resources.diamonds,
          tickets: model.getInventory(profile).starlink_ticket
        }
      });
      return true;
    }
    function open() {
      if (!screen || !view || !model) return false;
      if (capabilities.closeFeaturePanel) capabilities.closeFeaturePanel();
      filter = "all";
      selectedId = null;
      message = "";
      isError = false;
      feedback = null;
      render();
      screen.classList.remove("hidden");
      if (isCloudMode() && capabilities.syncGatewayProfile) {
        Promise.resolve(capabilities.syncGatewayProfile(30000)).then(function renderSyncedInventory() {
          render();
        }).catch(function keepCurrentInventory() {});
      }
      return true;
    }
    function close() { if (!screen) return false; feedback = null; screen.classList.add("hidden"); return true; }
    function setFilter(payload) {
      var next = typeof payload === "string" ? payload : payload && payload.filter;
      if (!catalog.CATEGORIES.some(function valid(item) { return item.id === next; })) return false;
      filter = next;
      selectedId = null;
      message = "";
      isError = false;
      feedback = null;
      render();
      return true;
    }
    function select(payload) {
      var id = typeof payload === "string" ? payload : payload && payload.id;
      var item = getItems().find(function byId(entry) { return entry.id === id; });
      if (!item) return false;
      selectedId = id;
      feedback = null;
      render();
      return true;
    }
    function use(payload) {
      var id = typeof payload === "string" ? payload : payload && payload.id || selectedId;
      if (isCloudMode()) {
        return runCloudAction("useInventoryItem", id);
      }
      var result = model.use(getProfile(), id, catalog);
      if (!result.ok) {
        feedback = null;
        message = result.reason === "ENERGY_FULL" ? "体力已满，道具没有消耗。" : result.reason === "ITEM_READ_ONLY" ? "该物资当前仅供查看。" : "物资数量不足。";
        isError = true;
        render();
        return result;
      }
      try {
        if (!capabilities.commitProfile) throw new Error("PROFILE_COMMIT_UNAVAILABLE");
        capabilities.commitProfile(result.profile);
        feedback = null;
        message = "已恢复 " + result.restored + " 点体力。";
        isError = false;
        if (capabilities.renderLobby) capabilities.renderLobby();
      } catch (error) {
        feedback = null;
        message = "存储失败，道具没有消耗。";
        isError = true;
        result = { ok: false, reason: "STORAGE_FAILED", error: error };
      }
      render();
      return result;
    }
    function sell(payload) {
      var id = typeof payload === "string" ? payload : payload && payload.id || selectedId;
      if (isCloudMode()) {
        return runCloudAction("sellInventoryItem", id);
      }
      var result = model.sell(getProfile(), id, catalog);
      if (!result.ok) {
        feedback = null;
        message = result.reason === "CANNOT_SELL" ? "该物资不可出售或数量不足。" : "出售失败。";
        isError = true;
        render();
        return result;
      }
      try {
        if (!capabilities.commitProfile) throw new Error("PROFILE_COMMIT_UNAVAILABLE");
        capabilities.commitProfile(result.profile);
        feedback = { kind: "sell", currency: result.sellCurrency, amount: result.refunded };
        message = "";
        isError = false;
        if (capabilities.renderLobby) capabilities.renderLobby();
      } catch (error) {
        feedback = null;
        message = "存储失败，道具没有消耗。";
        isError = true;
        result = { ok: false, reason: "STORAGE_FAILED", error: error };
      }
      render();
      return result;
    }
    function runCloudAction(method, id) {
      if (busy) return Promise.resolve({ ok: false, reason: "INVENTORY_BUSY" });
      if (!capabilities.ensureGameGateway || !capabilities.getGameGateway) {
        feedback = null;
        message = "云端背包服务尚未就绪，请稍后重试。";
        isError = true;
        render();
        return { ok: false, reason: "INVENTORY_CLOUD_UNAVAILABLE" };
      }
      busy = true;
      feedback = null;
      message = method === "useInventoryItem" ? "正在使用物资…" : "正在回收物资…";
      isError = false;
      render();
      return Promise.resolve(capabilities.ensureGameGateway())
        .then(function commitInventoryAction() {
          var gateway = capabilities.getGameGateway();
          if (!gateway || typeof gateway[method] !== "function") throw new Error("云端背包服务尚未就绪。");
          return gateway[method](id);
        })
        .then(function applyCloudInventory(result) {
          if (!result || !result.profile) throw new Error("云端背包结果无效。");
          if (capabilities.applyGatewayProfile) capabilities.applyGatewayProfile(result.profile);
          if (method === "useInventoryItem") {
            message = "已恢复 " + result.restored + " 点体力，云存档已更新。";
          } else {
            feedback = { kind: "sell", currency: result.sellCurrency, amount: result.refunded };
            message = "";
          }
          isError = false;
          if (capabilities.renderLobby) capabilities.renderLobby();
          return result;
        })
        .catch(function showCloudInventoryError(error) {
          feedback = null;
          message = error && error.message ? error.message : "云端背包操作失败。";
          isError = true;
          return { ok: false, reason: "INVENTORY_CLOUD_ERROR", error: error };
        })
        .finally(function releaseInventoryLock() {
          busy = false;
          render();
        });
    }
    function dismissFeedback() {
      if (!feedback) return false;
      feedback = null;
      render();
      return true;
    }
    return {
      actions: {
        "inventory.open": open,
        "inventory.close": close,
        "inventory.filter": setFilter,
        "inventory.select": select,
        "inventory.use": use,
        "inventory.sell": sell,
        "inventory.dismissFeedback": dismissFeedback
      },
      dispose: function dispose() { close(); if (view) view.clear(); }
    };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
