(function registerCloudSave(root) {
  const config = root.RXSupabaseConfig;
  const SESSION_KEY = "rexuezhanjiSupabaseSession";
  const DEFAULT_PROFILE_SNAPSHOT_MAX_AGE = 30_000;
  let session = readSession();
  let sessionPromise = null;
  let profileSnapshot = null;
  let profileSnapshotAt = 0;
  let profileSyncPromise = null;

  function readSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch {
      return null;
    }
  }

  function saveSession(nextSession) {
    session = nextSession || null;
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
    return session;
  }

  function configured() {
    return Boolean(config?.url && config?.publishableKey);
  }

  async function request(path, { method = "GET", body, token = session?.access_token, extraHeaders = {}, timeoutMs = 12000 } = {}) {
    if (!configured()) throw new Error("云存档尚未配置。");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.max(1000, Number(timeoutMs) || 12000));
    let response;
    try {
      response = await fetch(`${config.url}${path}`, {
        method,
        headers: {
          apikey: config.publishableKey,
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...extraHeaders
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal
      });
    } catch (requestError) {
      if (requestError && requestError.name === "AbortError") {
        const timeoutError = new Error("云端响应超时，请重新同步后再试。");
        timeoutError.code = "REQUEST_TIMEOUT";
        throw timeoutError;
      }
      throw requestError;
    } finally {
      clearTimeout(timer);
    }
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const cloudError = new Error(payload.error || payload.message || "云端请求失败。");
      cloudError.code = payload.code || "CLOUD_REQUEST_FAILED";
      cloudError.status = response.status;
      cloudError.payload = payload;
      throw cloudError;
    }
    return payload;
  }

  async function ensureSession() {
    if (!configured()) return null;
    if (session?.access_token && Number(session.expires_at || 0) * 1000 > Date.now() + 60_000) return session;
    if (sessionPromise) return sessionPromise;
    sessionPromise = (async function establishSession() {
      if (session?.refresh_token) {
        try {
          const refreshed = await request("/auth/v1/token?grant_type=refresh_token", {
            method: "POST",
            body: { refresh_token: session.refresh_token },
            token: null
          });
          return saveSession(refreshed);
        } catch {
          saveSession(null);
        }
      }
      const created = await request("/auth/v1/signup", { method: "POST", body: {}, token: null });
      return saveSession(created);
    })();
    try {
      return await sessionPromise;
    } finally {
      sessionPromise = null;
    }
  }

  async function api(action, payload = {}, options = {}) {
    if (!Object.prototype.hasOwnProperty.call(options, "token")) await ensureSession();
    const result = await request(`/functions/v1/game-api?action=${encodeURIComponent(action)}`, {
      method: "POST",
      body: payload,
      ...options
    });
    if (result?.worldTime && root.RXGame?.worldTimeSystem?.sync) {
      root.RXGame.worldTimeSystem.sync(result.worldTime, { source: "server" });
    }
    if (result?.profile) {
      profileSnapshot = result;
      profileSnapshotAt = Date.now();
    }
    return result;
  }

  function createOperationId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") return root.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
      const random = Math.floor(Math.random() * 16);
      return (value === "x" ? random : (random & 3) | 8).toString(16);
    });
  }

  async function syncProfile(maxAgeMs = DEFAULT_PROFILE_SNAPSHOT_MAX_AGE) {
    const maxAge = Math.max(0, Number(maxAgeMs) || 0);
    if (profileSnapshot && Date.now() - profileSnapshotAt <= maxAge) return profileSnapshot;
    return bootstrap();
  }

  async function bootstrap() {
    if (profileSyncPromise) return profileSyncPromise;
    profileSyncPromise = api("bootstrap");
    try {
      return await profileSyncPromise;
    } finally {
      profileSyncPromise = null;
    }
  }

  async function identity() {
    await ensureSession();
    return api("identity");
  }

  function normalizeEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error("请输入有效的邮箱地址。");
    return normalized;
  }

  function maskEmail(email) {
    const normalized = String(email || "").trim().toLowerCase();
    const parts = normalized.split("@");
    if (parts.length !== 2) return "";
    const local = parts[0];
    const visible = local.length <= 1 ? local : local.slice(0, Math.min(2, local.length));
    return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${parts[1]}`;
  }

  function normalizePhone(phone) {
    let normalized = String(phone || "").trim().replace(/[\s()-]/g, "");
    if (/^1[3-9]\d{9}$/.test(normalized)) normalized = `+86${normalized}`;
    else if (/^861[3-9]\d{9}$/.test(normalized)) normalized = `+${normalized}`;
    else if (/^00\d+$/.test(normalized)) normalized = `+${normalized.slice(2)}`;
    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      throw new Error("请输入有效的手机号，国际号码需包含国家区号。");
    }
    return normalized;
  }

  function maskPhone(phone) {
    const normalized = String(phone || "").trim();
    if (/^\+861[3-9]\d{9}$/.test(normalized)) {
      return `+86 ${normalized.slice(3, 6)}****${normalized.slice(-4)}`;
    }
    const visiblePrefix = normalized.slice(0, Math.min(4, Math.max(2, normalized.length - 4)));
    return `${visiblePrefix}${"*".repeat(Math.max(4, normalized.length - visiblePrefix.length - 4))}${normalized.slice(-4)}`;
  }

  function isGuestSession(value) {
    const user = value?.user;
    if (!user) return false;
    return user.is_anonymous === true || (!user.email && !user.phone);
  }

  function getAccountState() {
    if (!configured()) {
      return { available: false, status: "unavailable", provider: null, maskedIdentifier: "", reason: "unconfigured" };
    }
    const user = session?.user;
    if (user?.email) {
      return { available: true, status: "email", provider: "email", maskedIdentifier: maskEmail(user.email), reason: "" };
    }
    if (user?.phone) {
      return { available: true, status: "phone", provider: "phone", maskedIdentifier: maskPhone(user.phone), reason: "" };
    }
    return { available: true, status: "guest", provider: null, maskedIdentifier: "游客云档", reason: "" };
  }

  async function sendEmailCode(email, options = {}) {
    const normalized = normalizeEmail(email);
    return request("/auth/v1/otp", {
      method: "POST",
      body: { email: normalized, create_user: options.createUser !== false },
      token: null
    });
  }

  async function sendPhoneCode(phone, options = {}) {
    const normalized = normalizePhone(phone);
    return request("/auth/v1/otp", {
      method: "POST",
      body: { phone: normalized, create_user: options.createUser !== false, channel: "sms" },
      token: null
    });
  }

  async function verifyAccountCode(provider, identifier, token) {
    const isPhone = provider === "phone";
    const normalized = isPhone ? normalizePhone(identifier) : normalizeEmail(identifier);
    const normalizedToken = String(token || "").trim();
    if (!/^\d{6}$/.test(normalizedToken)) throw new Error("请输入 6 位数字验证码。");
    const previousSession = session;
    const verified = await request("/auth/v1/verify", {
      method: "POST",
      body: isPhone
        ? { phone: normalized, token: normalizedToken, type: "sms" }
        : { email: normalized, token: normalizedToken, type: "email" },
      token: null
    });
    if (!verified?.access_token || !verified?.user?.id) {
      throw new Error(`${isPhone ? "手机" : "邮箱"}身份验证失败。`);
    }

    let result;
    const isDifferentUser = previousSession?.user?.id && previousSession.user.id !== verified.user.id;
    if (isDifferentUser && previousSession?.access_token && isGuestSession(previousSession)) {
      result = await api("migrate-anonymous", {}, {
        token: verified.access_token,
        extraHeaders: { "x-rexuezhanji-source-token": previousSession.access_token }
      });
    } else {
      result = await api("bootstrap", {}, { token: verified.access_token });
    }
    saveSession(verified);
    return result;
  }

  function verifyEmailCode(email, token) {
    return verifyAccountCode("email", email, token);
  }

  function verifyPhoneCode(phone, token) {
    return verifyAccountCode("phone", phone, token);
  }

  function accountLabel() {
    const state = getAccountState();
    return state.maskedIdentifier || (state.status === "guest" ? "游客云档" : "未连接");
  }

  root.RXCloud = {
    configured,
    bootstrap,
    syncProfile,
    identity,
    getAccountState,
    startBattle: (levelId) => api("start-battle", { levelId }),
    finishBattle: (ticket, levelId, rating) => api("finish-battle", { ticket, levelId, rating }),
    abandonBattle: (ticket) => api("abandon-battle", { ticket }),
    sweep: (levelId, count) => api("sweep", { levelId, count }),
    upgrade: (key, operationId = createOperationId()) => api("upgrade", { key, operationId }),
    upgradeFighter: (statType, operationId = createOperationId()) => api("upgrade-fighter", { statType, operationId }, { timeoutMs: 8000 }),
    buyPilot: (pilotId, operationId = createOperationId()) => api("buy-pilot", { pilotId, operationId }),
    buyShip: (shipId, operationId = createOperationId()) => api("buy-ship", { shipId, operationId }),
    saveFighterSkillLoadout: (shipId, loadout, operationId = createOperationId()) => api("save-fighter-skill-loadout", {
      shipId,
      activeSlots: loadout && loadout.activeSlots,
      fixedWeaponOverrides: loadout && loadout.fixedWeaponOverrides,
      autoWeaponIds: loadout && loadout.autoWeaponIds,
      operationId
    }),
    upgradeAutoWeapon: (moduleId, operationId = createOperationId()) => api("upgrade-auto-weapon", { moduleId, operationId }, { timeoutMs: 8000 }),
    upgradeAutoWeaponWithComponents: (moduleId, operationId = createOperationId()) => api("upgrade-auto-weapon-components", { moduleId, operationId }, { timeoutMs: 8000 }),
    upgradeActiveSkillGrade: (shipId, slotIndex, targetGrade, operationId = createOperationId()) => api("upgrade-active-skill-grade", { shipId, slotIndex, targetGrade, operationId }, { timeoutMs: 8000 }),
    upgradePassiveSkill: (skillId, operationId = createOperationId()) => api("upgrade-passive-skill", { skillId, operationId }, { timeoutMs: 8000 }),
    redeem: (code) => api("redeem", { code }),
    buyShopItem: (itemId, quantity = 1, operationId = createOperationId()) => api("shop-buy", {
      itemId,
      quantity: Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1))),
      operationId
    }),
    shopExchange: (itemId, quantity = 1, operationId = createOperationId()) => api("shop-exchange", {
      itemId,
      quantity: Math.max(1, Math.min(99, Math.floor(Number(quantity) || 1))),
      operationId
    }),
    gachaDraw: (target, count = 1, buyMissingTickets = false, operationId = createOperationId()) => api("gacha-draw", {
      target,
      count: Number(count) === 10 ? 10 : 1,
      buyMissingTickets: Boolean(buyMissingTickets),
      operationId
    }),
    commitEconomyBatch: (batch) => api("economy-batch", batch || {}, { timeoutMs: 20000 }),
    claimSignIn: (operationId = createOperationId()) => api("daily-signin", { operationId }),
    useInventoryItem: (itemId, operationId = createOperationId()) => api("inventory-use", { itemId, operationId }),
    sellInventoryItem: (itemId, operationId = createOperationId()) => api("inventory-sell", { itemId, operationId }),
    exchangeDiamonds: (amount, operationId = createOperationId()) => api("exchange-diamonds", {
      amount: Math.max(1, Math.min(9999, Math.floor(Number(amount) || 1))),
      operationId
    }),
    promoteUnit: (kind, itemId, tokenId, operationId = createOperationId()) => api("promote-unit", { kind, itemId, tokenId, operationId }),
    starUpPilot: (pilotId, operationId = createOperationId()) => api("pilot-star-up", { pilotId, operationId }),
    starUpFighter: (shipId, operationId = createOperationId()) => api("fighter-star-up", { shipId, operationId }),
    activateCodexEntry: (kind, entryId, operationId = createOperationId()) => api("codex-activate", {
      kind: String(kind || ""),
      entryId: String(entryId || ""),
      operationId
    }),
    saveCosmetics: (profile, operationId = createOperationId()) => api("save-cosmetics", { profile, operationId }),
    getPaymentCatalog: (market) => api("payment-catalog", {
      market: String(market || "")
    }, { timeoutMs: 20000 }),
    createPaymentOrder: (offerId, market, paymentScene, idempotencyKey = createOperationId()) => api("payment-order-create", {
      offerId: String(offerId || ""),
      market: String(market || ""),
      paymentScene: String(paymentScene || ""),
      idempotencyKey: String(idempotencyKey || "")
    }, { timeoutMs: 20000 }),
    capturePaypalPayment: (orderId, providerOrderId) => api("payment-paypal-capture", {
      orderId: String(orderId || ""),
      providerOrderId: String(providerOrderId || "")
    }, { timeoutMs: 30000 }),
    getPaymentOrder: (orderId) => api("payment-order-status", {
      orderId: String(orderId || "")
    }, { timeoutMs: 20000 }),
    sendEmailCode,
    verifyEmailCode,
    sendPhoneCode,
    verifyPhoneCode,
    accountLabel,
    // Social features
    leaderboardRefresh: () => api("leaderboard-submit", { category: "power" }),
    leaderboardFetch: (category, season) => api("leaderboard-fetch", { category, season }),
    friendSearch: (publicUid) => api("friend-search", { publicUid }),
    friendRequest: (toPublicUid) => api("friend-request", { toPublicUid }),
    friendRespond: (requestId, action) => api("friend-respond", { requestId, action }),
    friendList: () => api("friend-list"),
    friendRemove: (friendPublicUid) => api("friend-remove", { friendPublicUid }),
    chatSend: (_channel, message) => api("chat-send", { channel: "world", message }),
    chatPoll: (_channel, since) => api("chat-poll", { channel: "world", since }),
    startEndless: () => api("start-endless"),
    finishEndless: (ticket, kills, survivalSeconds) => api("finish-endless", { ticket, kills, survivalSeconds }),
    getEndlessRecord: () => api("get-endless-record"),
    // Achievement claim
    claimAchievement: (achievementId, operationId = createOperationId()) => api("claim-achievement", { achievementId, operationId }),
    // Task claim
    claimTask: (taskId, operationId = createOperationId()) => api("claim-task", { taskId, operationId }),
    claimActivityReward: (points, operationId = createOperationId()) => api("claim-activity-reward", { points, operationId })
  };
})(window);
