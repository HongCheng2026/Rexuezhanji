(function registerGameGateway(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var CLOUD_HOSTS = ["rexuezhanji.top", "www.rexuezhanji.top"];

  function getStorageOverride(locationRef) {
    var search = String(locationRef && locationRef.search || "");
    var match = search.match(/(?:^|[?&])storage=(local|cloud)(?:&|$)/i);
    return match ? match[1].toLowerCase() : "";
  }

  function shouldUseCloud(locationRef, requestedMode) {
    var hostname = String(locationRef && locationRef.hostname || "").toLowerCase();
    if (CLOUD_HOSTS.indexOf(hostname) >= 0) return true;
    if (requestedMode === "local") return false;
    if (requestedMode === "cloud") return true;
    var override = getStorageOverride(locationRef);
    if (override) return override === "cloud";
    return false;
  }

  function unavailableCloud() {
    var error = new Error("云存档尚未连接，请稍后重试。");
    error.code = "CLOUD_UNAVAILABLE";
    return Promise.reject(error);
  }

  function callAdapter(adapter, method, args, mode) {
    if (!adapter || typeof adapter[method] !== "function") {
      if (mode === "cloud") return unavailableCloud();
      var missing = new Error("本地游戏服务缺少 " + method + " 接口。");
      missing.code = "LOCAL_GATEWAY_MISSING";
      return Promise.reject(missing);
    }
    try {
      // 普通经济操作的云端适配器会先执行本地投影。这里必须同步调用，
      // 才能保证一次点击事件结束前资源和强化结果已经进入当前帧。
      return Promise.resolve(adapter[method].apply(adapter, args || []));
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function appendOptional(args, value) {
    if (typeof value !== "undefined") args.push(value);
    return args;
  }

  function create(options) {
    options = options || {};
    var useCloud = shouldUseCloud(options.location || root.location, options.mode);
    var cloud = options.cloud || root.RXCloud || null;
    var local = options.local || null;
    var cloudReady = cloud && (!cloud.configured || cloud.configured());
    var mode = useCloud ? "cloud" : "local";
    var adapter = useCloud && cloudReady ? cloud : useCloud ? null : local;

    return {
      mode: mode,
      isCloud: mode === "cloud",
      bootstrap: function bootstrap() {
        return callAdapter(adapter, "bootstrap", [], mode);
      },
      syncProfile: function syncProfile(maxAgeMs) {
        return callAdapter(adapter, "syncProfile", [maxAgeMs], mode);
      },
      identity: function identity() {
        return callAdapter(adapter, "identity", [], mode);
      },
      getAccountState: function getAccountState() {
        if (mode !== "cloud") {
          return { available: false, status: "unavailable", provider: null, maskedIdentifier: "", reason: "local" };
        }
        if (!adapter || typeof adapter.getAccountState !== "function") {
          return { available: false, status: "unavailable", provider: null, maskedIdentifier: "", reason: "cloud" };
        }
        return adapter.getAccountState();
      },
      sendEmailCode: function sendEmailCode(email, accountOptions) {
        return callAdapter(adapter, "sendEmailCode", [email, accountOptions || {}], mode);
      },
      verifyEmailCode: function verifyEmailCode(email, token) {
        return callAdapter(adapter, "verifyEmailCode", [email, token], mode);
      },
      sendPhoneCode: function sendPhoneCode(phone, accountOptions) {
        return callAdapter(adapter, "sendPhoneCode", [phone, accountOptions || {}], mode);
      },
      verifyPhoneCode: function verifyPhoneCode(phone, token) {
        return callAdapter(adapter, "verifyPhoneCode", [phone, token], mode);
      },
      accountLabel: function accountLabel() {
        if (!adapter || typeof adapter.accountLabel !== "function") return "";
        return adapter.accountLabel();
      },
      startBattle: function startBattle(levelId) {
        return callAdapter(adapter, "startBattle", [levelId], mode);
      },
      finishBattle: function finishBattle(ticket, levelId, rating, details) {
        return callAdapter(adapter, "finishBattle", [ticket, levelId, rating, details], mode);
      },
      abandonBattle: function abandonBattle(ticket) {
        return callAdapter(adapter, "abandonBattle", [ticket], mode);
      },
      sweep: function sweep(levelId, count) {
        return callAdapter(adapter, "sweep", [levelId, count], mode);
      },
      upgrade: function upgrade(key, operationId) {
        return callAdapter(adapter, "upgrade", appendOptional([key], operationId), mode);
      },
      upgradeFighter: function upgradeFighter(statType, operationId) {
        return callAdapter(adapter, "upgradeFighter", appendOptional([statType], operationId), mode);
      },
      buyPilot: function buyPilot(pilotId, operationId) {
        return callAdapter(adapter, "buyPilot", appendOptional([pilotId], operationId), mode);
      },
      buyShip: function buyShip(shipId, operationId) {
        return callAdapter(adapter, "buyShip", appendOptional([shipId], operationId), mode);
      },
      saveFighterSkillLoadout: function saveFighterSkillLoadout(shipId, loadout, operationId) {
        return callAdapter(adapter, "saveFighterSkillLoadout", appendOptional([shipId, loadout], operationId), mode);
      },
      upgradeAutoWeapon: function upgradeAutoWeapon(moduleId, operationId) {
        return callAdapter(adapter, "upgradeAutoWeapon", appendOptional([moduleId], operationId), mode);
      },
      upgradeAutoWeaponWithComponents: function upgradeAutoWeaponWithComponents(moduleId, operationId) {
        return callAdapter(adapter, "upgradeAutoWeaponWithComponents", appendOptional([moduleId], operationId), mode);
      },
      upgradeActiveSkillGrade: function upgradeActiveSkillGrade(shipId, slotIndex, targetGrade, operationId) {
        return callAdapter(adapter, "upgradeActiveSkillGrade", appendOptional([shipId, slotIndex, targetGrade], operationId), mode);
      },
      upgradePassiveSkill: function upgradePassiveSkill(skillId, operationId) {
        return callAdapter(adapter, "upgradePassiveSkill", appendOptional([skillId], operationId), mode);
      },
      redeem: function redeem(code) {
        return callAdapter(adapter, "redeem", [code], mode);
      },
      saveCosmetics: function saveCosmetics(profile, operationId) {
        return callAdapter(adapter, "saveCosmetics", appendOptional([profile], operationId), mode);
      },
      buyShopItem: function buyShopItem(itemId, quantity, operationId) {
        return callAdapter(adapter, "buyShopItem", appendOptional([itemId, quantity], operationId), mode);
      },
      shopExchange: function shopExchange(itemId, quantity, operationId) {
        return callAdapter(adapter, "shopExchange", appendOptional([itemId, quantity], operationId), mode);
      },
      gachaDraw: function gachaDraw(target, count, buyMissingTickets, operationId) {
        return callAdapter(adapter, "gachaDraw", appendOptional([target, count, buyMissingTickets], operationId), mode);
      },
      claimSignIn: function claimSignIn(operationId) {
        return callAdapter(adapter, "claimSignIn", appendOptional([], operationId), mode);
      },
      useInventoryItem: function useInventoryItem(itemId, operationId) {
        return callAdapter(adapter, "useInventoryItem", appendOptional([itemId], operationId), mode);
      },
      sellInventoryItem: function sellInventoryItem(itemId, operationId) {
        return callAdapter(adapter, "sellInventoryItem", appendOptional([itemId], operationId), mode);
      },
      exchangeDiamonds: function exchangeDiamonds(amount, operationId) {
        return callAdapter(adapter, "exchangeDiamonds", appendOptional([amount], operationId), mode);
      },
      promoteUnit: function promoteUnit(kind, itemId, tokenId, operationId) {
        return callAdapter(adapter, "promoteUnit", appendOptional([kind, itemId, tokenId], operationId), mode);
      },
      starUpPilot: function starUpPilot(pilotId, operationId) {
        return callAdapter(adapter, "starUpPilot", appendOptional([pilotId], operationId), mode);
      },
      starUpFighter: function starUpFighter(shipId, operationId) {
        return callAdapter(adapter, "starUpFighter", appendOptional([shipId], operationId), mode);
      },
      activateCodexEntry: function activateCodexEntry(kind, entryId, operationId) {
        return callAdapter(adapter, "activateCodexEntry", appendOptional([kind, entryId], operationId), mode);
      },
      // Social features
      leaderboardRefresh: function leaderboardRefresh() {
        return callAdapter(adapter, "leaderboardRefresh", [], mode);
      },
      leaderboardFetch: function leaderboardFetch(category, season) {
        return callAdapter(adapter, "leaderboardFetch", [category, season], mode);
      },
      friendSearch: function friendSearch(publicUid) {
        return callAdapter(adapter, "friendSearch", [publicUid], mode);
      },
      friendRequest: function friendRequest(toPublicUid) {
        return callAdapter(adapter, "friendRequest", [toPublicUid], mode);
      },
      friendRespond: function friendRespond(requestId, action) {
        return callAdapter(adapter, "friendRespond", [requestId, action], mode);
      },
      friendList: function friendList() {
        return callAdapter(adapter, "friendList", [], mode);
      },
      friendRemove: function friendRemove(friendPublicUid) {
        return callAdapter(adapter, "friendRemove", [friendPublicUid], mode);
      },
      chatSend: function chatSend(channel, message) {
        return callAdapter(adapter, "chatSend", [channel, message], mode);
      },
      chatPoll: function chatPoll(channel, since) {
        return callAdapter(adapter, "chatPoll", [channel, since], mode);
      },
      startEndless: function startEndless() {
        return callAdapter(adapter, "startEndless", [], mode);
      },
      finishEndless: function finishEndless(ticket, kills, survivalSeconds) {
        return callAdapter(adapter, "finishEndless", [ticket, kills, survivalSeconds], mode);
      },
      getEndlessRecord: function getEndlessRecord() {
        return callAdapter(adapter, "getEndlessRecord", [], mode);
      },
      // Achievement claim
      claimAchievement: function gatewayClaimAchievement(achievementId, operationId) {
        return callAdapter(adapter, "claimAchievement", appendOptional([achievementId], operationId), mode);
      },
      // Task claim
      claimTask: function gatewayClaimTask(taskId, operationId) {
        return callAdapter(adapter, "claimTask", appendOptional([taskId], operationId), mode);
      },
      claimActivityReward: function gatewayClaimActivityReward(points, operationId) {
        return callAdapter(adapter, "claimActivityReward", appendOptional([points], operationId), mode);
      },
      flushEconomy: function flushEconomy(reason) {
        if (!adapter || typeof adapter.flushEconomy !== "function") return Promise.resolve({ ok: true, pending: 0 });
        return callAdapter(adapter, "flushEconomy", [reason], mode);
      },
      economyStatus: function economyStatus() {
        if (!adapter || typeof adapter.economyStatus !== "function") return { pending: 0, syncing: false };
        return adapter.economyStatus();
      },
      getPaymentCatalog: function getPaymentCatalog(market) {
        return callAdapter(adapter, "getPaymentCatalog", [market], mode);
      },
      createPaymentOrder: function createPaymentOrder(offerId, market, paymentScene, idempotencyKey) {
        return callAdapter(adapter, "createPaymentOrder", [offerId, market, paymentScene, idempotencyKey], mode);
      },
      capturePaypalPayment: function capturePaypalPayment(orderId, providerOrderId) {
        return callAdapter(adapter, "capturePaypalPayment", [orderId, providerOrderId], mode);
      },
      getPaymentOrder: function getPaymentOrder(orderId) {
        return callAdapter(adapter, "getPaymentOrder", [orderId], mode);
      }
    };
  }

  var api = {
    CLOUD_HOSTS: CLOUD_HOSTS.slice(),
    shouldUseCloud: shouldUseCloud,
    create: create
  };

  scope.gameGateway = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
