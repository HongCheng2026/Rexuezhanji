(function defineGachaRoom(root) {
  "use strict";
  var shared = root.RXGame || (root.RXGame = {});
  var registry = shared.roomRegistry;
  if (!registry) return;

  registry.defineRoom("gacha", function createGachaRoom(context) {
    var capabilities = context.gacha || {};
    var screen = context.dom && context.dom.gachaScreen;
    var mount = context.dom && context.dom.gachaMount;
    var config = shared.gachaConfig;
    var model = shared.gachaModel;
    var store = shared.gachaStateStore && shared.gachaStateStore.create({
      storage: capabilities.storage || root.localStorage,
      profileKey: capabilities.profileKey || (shared.profileRuntime && shared.profileRuntime.STORAGE_KEY),
      config: config
    });
    var view = shared.gachaView && shared.gachaView.create({
      mount: mount,
      config: config,
      uiAssets: shared.assets && shared.assets.GACHA_UI_ASSETS || {}
    });
    var state = store ? store.load() : model && model.normalizeState ? model.normalizeState({}) : {};
    var results = [];
    var lastDrawCount = 1;
    var pendingTopUp = null;
    var message = "";
    var isError = false;

    function getProfile() { return capabilities.getProfile ? capabilities.getProfile() : {}; }
    function isCloudMode() { return Boolean(capabilities.isCloudMode && capabilities.isCloudMode()); }
    function loadState() {
      if (isCloudMode() && getProfile().gacha) return model.normalizeState(getProfile().gacha);
      return store.load();
    }
    function findAsset(targetKey) {
      if (!config || !config.TARGETS || !config.TARGETS[targetKey]) return { id: "", name: "", codeName: "", src: "", owned: false };
      var target = config.TARGETS[targetKey];
      var assets = shared.assets || {};
      var list = targetKey === "pilot" ? assets.PILOT_ASSETS : assets.SHIP_ASSETS;
      var asset = (list || []).find(function byId(item) { return item.id === target.id; }) || {};
      var owned = getProfile().owned && Array.isArray(getProfile().owned[target.ownedKey]) && getProfile().owned[target.ownedKey].indexOf(target.id) >= 0;
      return { id: target.id, name: target.name, codeName: target.codeName, src: asset.lobbySrc || asset.src || "", owned: owned };
    }
    function render() {
      if (!view || !model) return false;
      view.render({
        state: state,
        tickets: model.getTicketCount(getProfile()),
        diamonds: model.getDiamondCount(getProfile()),
        cloudMode: isCloudMode(),
        targets: { pilot: findAsset("pilot"), ship: findAsset("ship") },
        results: results,
        lastDrawCount: lastDrawCount,
        pendingTopUp: pendingTopUp,
        message: message,
        isError: isError
      });
      return true;
    }
    function open() {
      if (!screen || !view || !model || !store) return false;
      if (capabilities.closeFeaturePanel) capabilities.closeFeaturePanel();
      state = loadState();
      results = [];
      pendingTopUp = null;
      message = "";
      isError = false;
      render();
      screen.classList.remove("hidden");
      if (isCloudMode() && capabilities.syncGatewayProfile) {
        Promise.resolve(capabilities.syncGatewayProfile(30000)).then(function renderSyncedGacha() {
          state = loadState();
          render();
        }).catch(function keepCurrentGacha() {});
      }
      return true;
    }
    function close() {
      if (!screen) return false;
      screen.classList.add("hidden");
      results = [];
      pendingTopUp = null;
      return true;
    }
    function selectTarget(payload) {
      var target = typeof payload === "string" ? payload : payload && payload.target;
      if (!config || !config.TARGETS || !config.TARGETS[target] || !model || !store) return false;
      var next = model.normalizeState(state);
      next.target = target;
      try {
        state = store.save(next);
        results = [];
        pendingTopUp = null;
        message = "终极目标已切换为" + config.TARGETS[target].label + "。";
        isError = false;
      } catch (error) {
        message = "目标保存失败，请检查浏览器存储空间。";
        isError = true;
      }
      render();
      return !isError;
    }
    function performDraw(count, buyMissingTickets) {
      if (!model || !store) return { ok: false, reason: "GACHA_MODULE_UNAVAILABLE" };
      var targetKey = state.target;
      if (!targetKey) {
        message = "请先选择终极目标。";
        isError = true;
        render();
        return { ok: false, reason: "TARGET_REQUIRED" };
      }
      if (isCloudMode()) {
        if (!capabilities.ensureGameGateway || !capabilities.getGameGateway) {
          message = "云端抽取服务尚未就绪，请稍后重试。";
          isError = true;
          render();
          return { ok: false, reason: "GACHA_CLOUD_UNAVAILABLE" };
        }
        message = "正在连接云端抽取…";
        render();
        return Promise.resolve(capabilities.ensureGameGateway())
          .then(function runCloudDraw() {
            var gateway = capabilities.getGameGateway();
            if (!gateway || typeof gateway.gachaDraw !== "function") throw new Error("云端抽取服务尚未就绪。");
            return gateway.gachaDraw(targetKey, count, Boolean(buyMissingTickets));
          })
          .then(function applyCloudResult(result) {
            if (!result || result.ok === false) {
              var reason = result && result.reason;
              if (reason === "TICKET_TOPUP_REQUIRED") {
                pendingTopUp = result;
                message = "研究券不足：还差 " + result.missingTickets + " 张，可用 " + result.diamondCost + " 钻石补足。";
                isError = !result.canAfford;
                render();
                return result;
              }
              message = (result && result.error) || (result && result.message) || "云端抽取失败，请重试。";
              isError = true;
              render();
              return result || { ok: false, reason: "GACHA_CLOUD_FAILED" };
            }
            state = result.state;
            store.save(state);
            if (result.profile && capabilities.applyGatewayProfile) capabilities.applyGatewayProfile(result.profile);
            results = result.results || [];
            lastDrawCount = result.count;
            pendingTopUp = null;
            message = result.purchasedTickets
              ? "已用 " + result.diamondCost + " 钻石补购 " + result.purchasedTickets + " 张研究券，奖励已入档。"
              : "跃迁完成，奖励已写入云存档。";
            isError = false;
            if (capabilities.renderLobby) capabilities.renderLobby();
            render();
            return result;
          })
          .catch(function showCloudDrawError(error) {
            message = error && error.message ? error.message : "云端抽取失败。";
            isError = true;
            render();
            return { ok: false, reason: "GACHA_CLOUD_ERROR", error: error };
          });
      }
      var beforeRaw = store.snapshot();
      var result = model.draw(getProfile(), state, {
        count: count,
        target: state.target,
        buyMissingTickets: Boolean(buyMissingTickets),
        rng: capabilities.rng || Math.random
      });
      if (!result.ok) {
        if (result.reason === "TICKET_TOPUP_REQUIRED") {
          pendingTopUp = result;
          message = "研究券不足：还差 " + result.missingTickets + " 张，可用 " + result.diamondCost + " 钻石补足。";
          isError = !result.canAfford;
          render();
          return result;
        }
        pendingTopUp = null;
        message = result.reason === "TARGET_REQUIRED"
          ? "请先选择终极目标。"
          : result.reason === "DIAMOND_NOT_ENOUGH"
            ? "钻石不足，无法购买缺少的研究券。"
            : "抽取条件未满足，本次没有扣券。";
        isError = true;
        render();
        return result;
      }
      try {
        store.save(result.state);
        if (!capabilities.commitProfile) throw new Error("PROFILE_COMMIT_UNAVAILABLE");
        capabilities.commitProfile(result.profile);
        state = result.state;
        results = result.results;
        lastDrawCount = result.count;
        pendingTopUp = null;
        message = result.purchasedTickets
          ? "已用 " + result.diamondCost + " 钻石补购 " + result.purchasedTickets + " 张研究券，奖励已入档。"
          : "跃迁完成，奖励已写入当前存档。";
        isError = false;
        if (capabilities.renderLobby) capabilities.renderLobby();
      } catch (error) {
        try { store.restore(beforeRaw); } catch (restoreError) { /* best effort */ }
        state = store.load();
        results = [];
        message = "存储失败，抽取已回滚且不会扣券。";
        isError = true;
        result = { ok: false, reason: "STORAGE_FAILED", error: error };
      }
      render();
      return result;
    }

    function draw(payload) {
      var count = typeof payload === "number" ? payload : payload && payload.count;
      return performDraw(Number(count) === 10 ? 10 : 1, false);
    }

    function confirmTopUp() {
      if (!pendingTopUp) return { ok: false, reason: "NO_PENDING_TOPUP" };
      var count = pendingTopUp.count;
      pendingTopUp = null;
      return performDraw(count, true);
    }

    function cancelTopUp() {
      if (!pendingTopUp) return false;
      pendingTopUp = null;
      message = "已取消补购，研究券和钻石均未扣除。";
      isError = false;
      render();
      return true;
    }

    function backToGacha() {
      results = [];
      message = "可重新选择目标或返回大厅。";
      isError = false;
      render();
      return true;
    }

    function redraw() {
      results = [];
      return performDraw(lastDrawCount, false);
    }

    return {
      actions: {
        "gacha.open": open,
        "gacha.close": close,
        "gacha.selectTarget": selectTarget,
        "gacha.draw": draw,
        "gacha.confirmTopUp": confirmTopUp,
        "gacha.cancelTopUp": cancelTopUp,
        "gacha.back": backToGacha,
        "gacha.redraw": redraw
      },
      dispose: function dispose() { close(); if (view && view.clear) view.clear(); }
    };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
