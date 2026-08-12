(function registerEconomySession(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var STORAGE_KEY = "rxgame_economy_command_queue_v1";
  var RULES_VERSION = "economy-2026-07-30-v1";
  var FLUSH_DEBOUNCE_MS = 180;
  var RETRY_BASE_MS = 1000;
  var MAX_BATCH_SIZE = 50;
  var UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value == null ? {} : value)); }
    catch (error) { return value == null ? {} : value; }
  }

  function createId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") return root.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function replace(value) {
      var random = Math.floor(Math.random() * 16);
      return (value === "x" ? random : (random & 3) | 8).toString(16);
    });
  }

  function validId(value) {
    return UUID_PATTERN.test(String(value || ""));
  }

  function shanghaiDateKey() {
    if (scope.worldTimeSystem && typeof scope.worldTimeSystem.dateKey === "function") return scope.worldTimeSystem.dateKey();
    try {
      var parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Shanghai",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).formatToParts(new Date());
      var values = {};
      parts.forEach(function collect(part) { values[part.type] = part.value; });
      return values.year + "-" + values.month + "-" + values.day;
    } catch (error) {
      return new Date().toISOString().slice(0, 10);
    }
  }

  function create(options) {
    options = options || {};
    var remote = options.remote || root.RXCloud || {};
    var local = options.local || {};
    var shared = options.shared || scope;
    var storage = options.storage || root.localStorage;
    var state = readState();
    var flushPromise = null;
    var flushTimer = 0;
    var retryTimer = 0;
    var retryCount = 0;
    var ready = false;
    var blocked = false;
    var blockedReason = "";
    var lastError = null;
    var barrierTail = Promise.resolve();

    function readState() {
      var fallback = {
        sessionId: createId(),
        ownerUid: "",
        baseRevision: 0,
        nextSequence: 1,
        commands: []
      };
      try {
        var parsed = JSON.parse(storage.getItem(STORAGE_KEY) || "null");
        if (!parsed || typeof parsed !== "object") return fallback;
        var commands = Array.isArray(parsed.commands) ? parsed.commands.filter(function validCommand(command) {
          return command && validId(command.operationId) && Number(command.sequence) > 0 &&
            typeof command.action === "string" && command.body && typeof command.body === "object";
        }) : [];
        return {
          sessionId: validId(parsed.sessionId) ? parsed.sessionId : fallback.sessionId,
          ownerUid: String(parsed.ownerUid || ""),
          baseRevision: Math.max(0, Math.floor(Number(parsed.baseRevision) || 0)),
          nextSequence: Math.max(
            Math.max(0, Math.floor(Number(parsed.nextSequence) || 0)),
            commands.reduce(function maxSequence(maximum, command) {
              return Math.max(maximum, Math.floor(Number(command.sequence) || 0) + 1);
            }, 1)
          ),
          commands: commands
        };
      } catch (error) {
        return fallback;
      }
    }

    function persistState() {
      storage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    function getProfile() {
      return options.getProfile ? options.getProfile() : {};
    }

    function applyProfile(profile) {
      if (options.applyProfile) return options.applyProfile(profile);
      return profile;
    }

    function refreshViews() {
      if (options.refreshViews) options.refreshViews();
    }

    function notify(type, detail) {
      if (typeof options.onEvent === "function") options.onEvent(type, detail || {});
      if (typeof root.dispatchEvent === "function" && typeof root.CustomEvent === "function") {
        root.dispatchEvent(new root.CustomEvent("rx:economy-" + type, { detail: detail || {} }));
      }
    }

    function fail(reason, code) {
      var error = reason instanceof Error ? reason : new Error(String(reason || "经济操作失败。"));
      if (!error.code) error.code = code || "ECONOMY_OPERATION_FAILED";
      throw error;
    }

    function ensureResult(result, fallbackCode) {
      if (!result || result.ok === false || result.success === false) {
        fail(result && (result.error || result.message || result.reason) || "经济操作校验失败。",
          result && result.reason || fallbackCode);
      }
      return result;
    }

    function finishLocalResult(result, command) {
      result = result || {};
      result.profile = getProfile();
      result.operationId = command.operationId;
      result.pending = true;
      return result;
    }

    function applySignin(command) {
      var profile = getProfile();
      var today = shanghaiDateKey();
      var record = profile.signIn && typeof profile.signIn === "object" ? profile.signIn : {};
      if (record.lastClaimDate === today) fail("今日签到奖励已经领取。", "SIGNIN_CLAIMED");
      var day = Math.max(1, Math.min(7, (Math.floor(Number(record.day) || 0) % 7) + 1));
      var content = shared.featurePanelContent && shared.featurePanelContent.SIGNIN_CONTENT || [];
      var item = content.filter(function match(entry) { return Number(entry.day) === day; })[0];
      var rewards = item && item.rewards || [];
      if (shared.taskSystem && typeof shared.taskSystem.applyRewards === "function") {
        shared.taskSystem.applyRewards(profile, rewards);
      }
      profile.signIn = {
        day: day,
        lastClaimDate: today,
        totalClaims: Math.max(0, Math.floor(Number(record.totalClaims) || 0)) + 1
      };
      applyProfile(profile);
      return finishLocalResult({ ok: true, day: day, rewards: rewards }, command);
    }

    function applyOptimistic(command) {
      var body = command.body || {};
      var result;
      if (command.action === "upgrade") result = local.upgrade(body.key, command.operationId);
      else if (command.action === "upgrade-fighter") result = local.upgradeFighter(body.statType, command.operationId);
      else if (command.action === "buy-pilot") result = local.buyPilot(body.pilotId, command.operationId);
      else if (command.action === "buy-ship") result = local.buyShip(body.shipId, command.operationId);
      else if (command.action === "promote-unit") result = local.promoteUnit(body.kind, body.itemId, body.tokenId, command.operationId);
      else if (command.action === "pilot-star-up") result = local.starUpPilot(body.pilotId, command.operationId);
      else if (command.action === "fighter-star-up") result = local.starUpFighter(body.shipId, command.operationId);
      else if (command.action === "save-fighter-skill-loadout") {
        result = local.saveFighterSkillLoadout(body.shipId, {
          activeSlots: body.activeSlots,
          fixedWeaponOverrides: body.fixedWeaponOverrides,
          autoWeaponIds: body.autoWeaponIds
        }, command.operationId);
      } else if (command.action === "upgrade-auto-weapon") {
        result = local.upgradeAutoWeapon(body.moduleId, command.operationId);
      } else if (command.action === "upgrade-auto-weapon-components") {
        result = local.upgradeAutoWeaponWithComponents(body.moduleId, command.operationId);
      } else if (command.action === "upgrade-active-skill-grade") {
        result = local.upgradeActiveSkillGrade(body.shipId, body.slotIndex, body.targetGrade, command.operationId);
      } else if (command.action === "upgrade-passive-skill") {
        result = local.upgradePassiveSkill(body.skillId, command.operationId);
      } else if (command.action === "shop-buy" || command.action === "shop-exchange") {
        if (!shared.shopView || typeof shared.shopView.buyShopItem !== "function") {
          fail("商店本地规则尚未加载。", "SHOP_RULES_UNAVAILABLE");
        }
        result = ensureResult(shared.shopView.buyShopItem(getProfile(), body.itemId, {
          quantity: body.quantity,
          confirmed: true
        }), "SHOP_OPERATION_REJECTED");
        applyProfile(getProfile());
      } else if (command.action === "exchange-diamonds") {
        if (!shared.resourceExchangeModel || typeof shared.resourceExchangeModel.exchange !== "function") {
          fail("资源兑换规则尚未加载。", "EXCHANGE_RULES_UNAVAILABLE");
        }
        result = ensureResult(shared.resourceExchangeModel.exchange(getProfile(), body.amount), "EXCHANGE_REJECTED");
        applyProfile(result.profile || getProfile());
      } else if (command.action === "inventory-use" || command.action === "inventory-sell") {
        if (!shared.inventoryModel) fail("背包规则尚未加载。", "INVENTORY_RULES_UNAVAILABLE");
        result = command.action === "inventory-use"
          ? shared.inventoryModel.use(getProfile(), body.itemId, shared.inventoryCatalog)
          : shared.inventoryModel.sell(getProfile(), body.itemId, shared.inventoryCatalog);
        result = ensureResult(result, "INVENTORY_OPERATION_REJECTED");
        applyProfile(result.profile);
      } else if (command.action === "claim-achievement") {
        if (!shared.mainFeaturePanelsView || typeof shared.mainFeaturePanelsView.claimAchievement !== "function") {
          fail("成就规则尚未加载。", "ACHIEVEMENT_RULES_UNAVAILABLE");
        }
        result = ensureResult(shared.mainFeaturePanelsView.claimAchievement(getProfile(), body.achievementId, {
          levels: shared.levels && shared.levels.levels || []
        }), "ACHIEVEMENT_CLAIM_REJECTED");
        applyProfile(getProfile());
      } else if (command.action === "claim-task") {
        result = ensureResult(shared.taskSystem && shared.taskSystem.claimTask(getProfile(), body.taskId),
          "TASK_CLAIM_REJECTED");
        applyProfile(getProfile());
      } else if (command.action === "claim-activity-reward") {
        result = ensureResult(shared.taskSystem && shared.taskSystem.claimActivityReward(getProfile(), body.points),
          "ACTIVITY_CLAIM_REJECTED");
        applyProfile(getProfile());
      } else if (command.action === "daily-signin") {
        return applySignin(command);
      } else {
        fail("不支持的本地经济操作：" + command.action, "ECONOMY_ACTION_UNSUPPORTED");
      }
      return finishLocalResult(result, command);
    }

    function replayPending() {
      var original = state.commands.slice();
      var kept = [];
      for (var i = 0; i < original.length; i += 1) {
        try {
          applyOptimistic(original[i]);
          kept.push(original[i]);
        } catch (error) {
          lastError = error;
          if (root.console && root.console.warn) {
            root.console.warn("[economy] dropped invalid pending command", original[i].action, error);
          }
        }
      }
      state.commands = kept;
      persistState();
    }

    function scheduleFlush(delay) {
      if (!ready || !state.commands.length || flushPromise || flushTimer) return;
      flushTimer = root.setTimeout(function runScheduledFlush() {
        flushTimer = 0;
        flushEconomy("background").catch(function keepQueued(error) {
          lastError = error;
          scheduleRetry();
        });
      }, Math.max(0, Number(delay == null ? FLUSH_DEBOUNCE_MS : delay) || 0));
    }

    function scheduleRetry() {
      if (!ready || retryTimer || !state.commands.length) return;
      var delay = Math.min(30000, RETRY_BASE_MS * Math.pow(2, Math.min(5, retryCount)));
      retryCount += 1;
      retryTimer = root.setTimeout(function retryFlush() {
        retryTimer = 0;
        scheduleFlush(0);
      }, delay);
    }

    function queue(action, body, suppliedOperationId) {
      if (blocked) {
        return Promise.reject(Object.assign(new Error("经济会话已中止，请重新登录。"), {
          code: blockedReason || "ECONOMY_RELOGIN_REQUIRED"
        }));
      }
      var operationId = validId(suppliedOperationId) ? String(suppliedOperationId) : createId();
      var existing = state.commands.filter(function sameOperation(command) {
        return command.operationId === operationId;
      })[0];
      if (existing) return Promise.resolve({
        ok: true,
        profile: getProfile(),
        operationId: operationId,
        pending: true,
        duplicate: true
      });
      var before = clone(getProfile());
      var command = {
        operationId: operationId,
        sequence: state.nextSequence,
        action: String(action || ""),
        body: Object.assign({}, clone(body || {}), { operationId: operationId }),
        createdAt: Date.now()
      };
      state.nextSequence += 1;
      var result;
      try {
        result = applyOptimistic(command);
        state.commands.push(command);
        persistState();
      } catch (error) {
        applyProfile(before);
        throw error;
      }
      scheduleFlush();
      return Promise.resolve(result);
    }

    function reconcile(result, sentCommands) {
      var sentIds = new Set(sentCommands.map(function id(command) { return command.operationId; }));
      state.commands = state.commands.filter(function keep(command) { return !sentIds.has(command.operationId); });
      if (result && result.profile) applyProfile(result.profile);
      state.baseRevision = Math.max(0, Math.floor(Number(result && result.revision) || state.baseRevision));
      if (result && result.sessionId && validId(result.sessionId)) state.sessionId = result.sessionId;
      persistState();
      replayPending();
      refreshViews();
      retryCount = 0;
      if (result && Array.isArray(result.rejected) && result.rejected.length) {
        lastError = Object.assign(new Error("部分本地操作已按云端数据恢复。"), {
          code: "ECONOMY_COMMAND_REJECTED",
          rejected: result.rejected
        });
        notify("conflict", {
          code: lastError.code,
          rejected: result.rejected,
          profile: result.profile
        });
      } else {
        lastError = null;
      }
      return result;
    }

    function flushNext(reason) {
      if (blocked) {
        return Promise.reject(Object.assign(new Error("经济会话已中止，请重新登录。"), {
          code: blockedReason || "ECONOMY_RELOGIN_REQUIRED"
        }));
      }
      if (!state.commands.length) {
        return Promise.resolve({ ok: true, pending: 0, revision: state.baseRevision, reason: reason || "" });
      }
      if (!remote || typeof remote.commitEconomyBatch !== "function") {
        return Promise.reject(Object.assign(new Error("云端批量经济接口尚未部署。"), {
          code: "ECONOMY_BATCH_UNAVAILABLE"
        }));
      }
      var sent = state.commands.slice(0, MAX_BATCH_SIZE);
      return remote.commitEconomyBatch({
        sessionId: state.sessionId,
        baseRevision: state.baseRevision,
        rulesVersion: RULES_VERSION,
        reason: String(reason || "background").slice(0, 40),
        commands: sent
      }).then(function onBatch(result) {
        reconcile(result, sent);
        if (state.commands.length) return flushNext(reason);
        return result;
      });
    }

    function flushEconomy(reason) {
      if (flushTimer) {
        root.clearTimeout(flushTimer);
        flushTimer = 0;
      }
      if (retryTimer) {
        root.clearTimeout(retryTimer);
        retryTimer = 0;
      }
      if (flushPromise) return flushPromise;
      flushPromise = flushNext(reason).catch(function onFlushError(error) {
        lastError = error;
        if (error && error.code === "ECONOMY_SESSION_REVOKED") {
          state.commands = [];
          blocked = true;
          blockedReason = "ECONOMY_RELOGIN_REQUIRED";
          ready = false;
          if (error.payload && error.payload.profile) applyProfile(error.payload.profile);
          if (error.payload && Number.isFinite(Number(error.payload.revision))) {
            state.baseRevision = Math.max(0, Math.floor(Number(error.payload.revision)));
          }
          persistState();
          refreshViews();
          notify("revoked", {
            code: error.code,
            profile: error.payload && error.payload.profile,
            revision: error.payload && error.payload.revision
          });
        } else if (error && (
          error.code === "ECONOMY_RULES_VERSION_MISMATCH" ||
          error.code === "ECONOMY_REVISION_INVALID"
        )) {
          state.commands = [];
          if (error.payload && error.payload.profile) applyProfile(error.payload.profile);
          if (error.payload && Number.isFinite(Number(error.payload.revision))) {
            state.baseRevision = Math.max(0, Math.floor(Number(error.payload.revision)));
          }
          persistState();
          refreshViews();
          notify("conflict", {
            code: error.code,
            profile: error.payload && error.payload.profile,
            revision: error.payload && error.payload.revision
          });
        }
        throw error;
      }).finally(function releaseFlush() {
        flushPromise = null;
      });
      return flushPromise;
    }

    function acceptAuthoritative(result) {
      if (result && result.profile) applyProfile(result.profile);
      if (result && Number.isFinite(Number(result.revision))) {
        state.baseRevision = Math.max(0, Math.floor(Number(result.revision)));
      }
      persistState();
      return result;
    }

    function refreshProfileInBackground(maxAgeMs) {
      if (blocked || !remote || typeof remote.syncProfile !== "function") {
        return Promise.resolve({
          profile: getProfile(),
          revision: state.baseRevision,
          pending: state.commands.length
        });
      }
      var start = barrierTail.then(function waitForBarrier() {
        return state.commands.length ? flushEconomy("profile-sync") : undefined;
      });
      var refreshPromise = start.then(function fetchLatestProfile() {
        return remote.syncProfile(maxAgeMs);
      }).then(function applyLatestProfile(result) {
        if (result && result.profile) applyProfile(result.profile);
        if (result && Number.isFinite(Number(result.revision))) {
          state.baseRevision = Math.max(0, Math.floor(Number(result.revision)));
        }
        persistState();
        replayPending();
        refreshViews();
        return result;
      }).catch(function keepProjectedProfile(error) {
        lastError = error;
        if (state.commands.length) scheduleRetry();
        return null;
      });
      return Promise.resolve({
        profile: getProfile(),
        revision: state.baseRevision,
        pending: state.commands.length,
        refreshPromise: refreshPromise
      });
    }

    function barrierCall(method, args, reason) {
      if (blocked) {
        return Promise.reject(Object.assign(new Error("经济会话已中止，请重新登录。"), {
          code: blockedReason || "ECONOMY_RELOGIN_REQUIRED"
        }));
      }
      var request = barrierTail.then(function flushBeforeBarrier() {
        return flushEconomy(reason || method);
      }).then(function callRemote() {
        if (!remote || typeof remote[method] !== "function") fail("云端接口缺少 " + method, "CLOUD_METHOD_MISSING");
        return remote[method].apply(remote, args || []);
      }).then(acceptAuthoritative);
      barrierTail = request.catch(function keepBarrierChainAlive() {});
      return request;
    }

    function bootstrap() {
      if (blocked) {
        return Promise.reject(Object.assign(new Error("请重新登录后恢复云端数据。"), {
          code: blockedReason || "ECONOMY_RELOGIN_REQUIRED"
        }));
      }
      if (!remote || typeof remote.bootstrap !== "function") return Promise.reject(new Error("云存档尚未连接。"));
      return remote.bootstrap().then(function establish(result) {
        if (result && result.profile) applyProfile(result.profile);
        var uid = String(result && result.profile && result.profile.player && result.profile.player.uid || "");
        if (state.ownerUid && uid && state.ownerUid !== uid) {
          state.commands = [];
          state.sessionId = createId();
          state.nextSequence = 1;
        }
        state.ownerUid = uid;
        state.baseRevision = Math.max(0, Math.floor(Number(result && result.revision) || 0));
        if (result && result.economySession && validId(result.economySession.id) && !state.commands.length) {
          state.sessionId = result.economySession.id;
        }
        ready = true;
        persistState();
        replayPending();
        if (!state.commands.length) {
          result.profile = getProfile();
          return result;
        }
        return flushEconomy("recovery").then(function recoveryComplete() {
          result.profile = getProfile();
          result.revision = state.baseRevision;
          return result;
        }).catch(function keepRecoveryPending() {
          result.profile = getProfile();
          return result;
        });
      });
    }

    function verifyAccountCode(methodName, identifier, token) {
      if (!remote || typeof remote[methodName] !== "function") {
        return Promise.reject(Object.assign(new Error("账号登录接口尚未连接。"), {
          code: "CLOUD_METHOD_MISSING"
        }));
      }
      var beforeSwitch = blocked ? Promise.resolve() : flushEconomy("account-switch");
      return beforeSwitch.then(function verifyAccount() {
        return remote[methodName](identifier, token);
      }).then(function establishAccount(result) {
        state.commands = [];
        state.nextSequence = 1;
        state.ownerUid = String(result && result.profile && result.profile.player && result.profile.player.uid || "");
        state.baseRevision = Math.max(0, Math.floor(Number(result && result.revision) || 0));
        state.sessionId = result && result.economySession && validId(result.economySession.id)
          ? result.economySession.id
          : createId();
        blocked = false;
        blockedReason = "";
        ready = true;
        lastError = null;
        if (result && result.profile) applyProfile(result.profile);
        persistState();
        refreshViews();
        return result;
      });
    }

    function verifyEmailCode(email, token) {
      return verifyAccountCode("verifyEmailCode", email, token);
    }

    function verifyPhoneCode(phone, token) {
      return verifyAccountCode("verifyPhoneCode", phone, token);
    }

    var adapter = {};
    Object.keys(remote || {}).forEach(function copyRemoteMethod(key) {
      adapter[key] = typeof remote[key] === "function" ? remote[key].bind(remote) : remote[key];
    });

    adapter.bootstrap = bootstrap;
    adapter.syncProfile = refreshProfileInBackground;
    adapter.verifyEmailCode = verifyEmailCode;
    adapter.verifyPhoneCode = verifyPhoneCode;
    adapter.startBattle = function startBattle(levelId) { return barrierCall("startBattle", [levelId], "battle-entry"); };
    adapter.finishBattle = function finishBattle(ticket, levelId, rating, details) {
      return barrierCall("finishBattle", [ticket, levelId, rating, details], "battle-settlement");
    };
    adapter.sweep = function sweep(levelId, count) { return barrierCall("sweep", [levelId, count], "sweep"); };
    adapter.startEndless = function startEndless() { return barrierCall("startEndless", [], "endless-entry"); };
    adapter.finishEndless = function finishEndless(ticket, kills, survivalSeconds) {
      return barrierCall("finishEndless", [ticket, kills, survivalSeconds], "endless-settlement");
    };
    adapter.gachaDraw = function gachaDraw(target, count, buyMissingTickets, operationId) {
      return barrierCall("gachaDraw", [target, count, buyMissingTickets, operationId], "gacha");
    };
    adapter.redeem = function redeem(code) { return barrierCall("redeem", [code], "redeem"); };
    adapter.saveCosmetics = function saveCosmetics(profile, operationId) {
      return barrierCall("saveCosmetics", [profile, operationId], "cosmetics");
    };
    adapter.activateCodexEntry = function activateCodexEntry(kind, entryId, operationId) {
      return barrierCall("activateCodexEntry", [kind, entryId, operationId], "codex-activation");
    };
    adapter.leaderboardRefresh = function leaderboardRefresh() {
      return barrierCall("leaderboardRefresh", [], "leaderboard");
    };
    adapter.getPaymentCatalog = function getPaymentCatalog(market) {
      return barrierCall("getPaymentCatalog", [market], "payment-catalog");
    };
    adapter.createPaymentOrder = function createPaymentOrder(offerId, market, paymentScene, idempotencyKey) {
      return barrierCall("createPaymentOrder", [offerId, market, paymentScene, idempotencyKey], "payment");
    };
    adapter.capturePaypalPayment = function capturePaypalPayment(orderId, providerOrderId) {
      return barrierCall("capturePaypalPayment", [orderId, providerOrderId], "payment-capture");
    };
    adapter.getPaymentOrder = function getPaymentOrder(orderId) {
      return barrierCall("getPaymentOrder", [orderId], "payment-status");
    };

    adapter.upgrade = function upgrade(key, operationId) {
      return queue("upgrade", { key: key }, operationId);
    };
    adapter.upgradeFighter = function upgradeFighter(statType, operationId) {
      return queue("upgrade-fighter", { statType: statType }, operationId);
    };
    adapter.buyPilot = function buyPilot(pilotId, operationId) {
      return queue("buy-pilot", { pilotId: pilotId }, operationId);
    };
    adapter.buyShip = function buyShip(shipId, operationId) {
      return queue("buy-ship", { shipId: shipId }, operationId);
    };
    adapter.promoteUnit = function promoteUnit(kind, itemId, tokenId, operationId) {
      return queue("promote-unit", { kind: kind, itemId: itemId, tokenId: tokenId }, operationId);
    };
    adapter.starUpPilot = function starUpPilot(pilotId, operationId) {
      return queue("pilot-star-up", { pilotId: pilotId }, operationId);
    };
    adapter.starUpFighter = function starUpFighter(shipId, operationId) {
      return queue("fighter-star-up", { shipId: shipId }, operationId);
    };
    adapter.saveFighterSkillLoadout = function saveFighterSkillLoadout(shipId, loadout, operationId) {
      return queue("save-fighter-skill-loadout", {
        shipId: shipId,
        activeSlots: loadout && loadout.activeSlots,
        fixedWeaponOverrides: loadout && loadout.fixedWeaponOverrides,
        autoWeaponIds: loadout && loadout.autoWeaponIds
      }, operationId);
    };
    adapter.upgradeAutoWeapon = function upgradeAutoWeapon(moduleId, operationId) {
      return queue("upgrade-auto-weapon", { moduleId: moduleId }, operationId);
    };
    adapter.upgradeAutoWeaponWithComponents = function upgradeAutoWeaponWithComponents(moduleId, operationId) {
      return queue("upgrade-auto-weapon-components", { moduleId: moduleId }, operationId);
    };
    adapter.upgradeActiveSkillGrade = function upgradeActiveSkillGrade(shipId, slotIndex, targetGrade, operationId) {
      return queue("upgrade-active-skill-grade", {
        shipId: shipId,
        slotIndex: slotIndex,
        targetGrade: targetGrade
      }, operationId);
    };
    adapter.upgradePassiveSkill = function upgradePassiveSkill(skillId, operationId) {
      return queue("upgrade-passive-skill", { skillId: skillId }, operationId);
    };
    adapter.buyShopItem = function buyShopItem(itemId, quantity, operationId) {
      return queue("shop-buy", {
        itemId: itemId,
        quantity: Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)))
      }, operationId);
    };
    adapter.shopExchange = function shopExchange(itemId, quantity, operationId) {
      return queue("shop-exchange", {
        itemId: itemId,
        quantity: Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1)))
      }, operationId);
    };
    adapter.exchangeDiamonds = function exchangeDiamonds(amount, operationId) {
      return queue("exchange-diamonds", { amount: Math.max(1, Math.floor(Number(amount) || 1)) }, operationId);
    };
    adapter.useInventoryItem = function useInventoryItem(itemId, operationId) {
      return queue("inventory-use", { itemId: itemId }, operationId);
    };
    adapter.sellInventoryItem = function sellInventoryItem(itemId, operationId) {
      return queue("inventory-sell", { itemId: itemId }, operationId);
    };
    adapter.claimSignIn = function claimSignIn(operationId) {
      return queue("daily-signin", {}, operationId);
    };
    adapter.claimAchievement = function claimAchievement(achievementId, operationId) {
      return queue("claim-achievement", { achievementId: achievementId }, operationId);
    };
    adapter.claimTask = function claimTask(taskId, operationId) {
      return queue("claim-task", { taskId: taskId }, operationId);
    };
    adapter.claimActivityReward = function claimActivityReward(points, operationId) {
      return queue("claim-activity-reward", { points: points }, operationId);
    };
    adapter.flushEconomy = flushEconomy;
    adapter.economyStatus = function economyStatus() {
      return {
        sessionId: state.sessionId,
        baseRevision: state.baseRevision,
        rulesVersion: RULES_VERSION,
        pending: state.commands.length,
        syncing: Boolean(flushPromise),
        blocked: blocked,
        blockedReason: blockedReason,
        lastError: lastError && (lastError.code || lastError.message) || ""
      };
    };

    return adapter;
  }

  scope.economySession = {
    STORAGE_KEY: STORAGE_KEY,
    RULES_VERSION: RULES_VERSION,
    create: create
  };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.economySession;
})(typeof globalThis !== "undefined" ? globalThis : window);
