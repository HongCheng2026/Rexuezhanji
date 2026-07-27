(function registerCloudSave(root) {
  const config = root.RXSupabaseConfig;
  const SESSION_KEY = "rexuezhanjiSupabaseSession";
  let session = readSession();

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
    if (!response.ok) throw new Error(payload.error || payload.message || "云端请求失败。");
    return payload;
  }

  async function ensureSession() {
    if (!configured()) return null;
    if (session?.access_token && Number(session.expires_at || 0) * 1000 > Date.now() + 60_000) return session;
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
  }

  async function api(action, payload = {}, options = {}) {
    await ensureSession();
    return request(`/functions/v1/game-api?action=${encodeURIComponent(action)}`, {
      method: "POST",
      body: payload,
      ...options
    });
  }

  function createOperationId() {
    if (root.crypto && typeof root.crypto.randomUUID === "function") return root.crypto.randomUUID();
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
      const random = Math.floor(Math.random() * 16);
      return (value === "x" ? random : (random & 3) | 8).toString(16);
    });
  }

  async function bootstrap() {
    await ensureSession();
    return api("bootstrap");
  }

  async function identity() {
    await ensureSession();
    return api("identity");
  }

  async function sendEmailCode(email) {
    const normalized = String(email || "").trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) throw new Error("请输入有效的邮箱地址。");
    return request("/auth/v1/otp", { method: "POST", body: { email: normalized, create_user: true }, token: null });
  }

  async function verifyEmailCode(email, token) {
    const previousSession = session;
    const verified = await request("/auth/v1/verify", {
      method: "POST",
      body: { email: String(email || "").trim().toLowerCase(), token: String(token || "").trim(), type: "email" },
      token: null
    });
    saveSession(verified);
    if (previousSession?.access_token && previousSession.user?.id !== verified.user?.id) {
      await api("migrate-anonymous", {}, {
        extraHeaders: { "x-rexuezhanji-source-token": previousSession.access_token }
      });
    }
    return bootstrap();
  }

  function accountLabel() {
    if (!session?.user) return "未连接";
    return session.user.email || "游客账号";
  }

  root.RXCloud = {
    configured,
    bootstrap,
    identity,
    startBattle: (levelId) => api("start-battle", { levelId }),
    finishBattle: (ticket, levelId, rating) => api("finish-battle", { ticket, levelId, rating }),
    abandonBattle: (ticket) => api("abandon-battle", { ticket }),
    sweep: (levelId, count) => api("sweep", { levelId, count }),
    upgrade: (key) => api("upgrade", { key }),
    upgradeFighter: (statType, operationId = createOperationId()) => api("upgrade-fighter", { statType, operationId }, { timeoutMs: 8000 }),
    buyPilot: (pilotId) => api("buy-pilot", { pilotId }),
    buyShip: (shipId) => api("buy-ship", { shipId }),
    saveFighterSkillLoadout: (shipId, loadout) => api("save-fighter-skill-loadout", {
      shipId,
      activeSlots: loadout && loadout.activeSlots,
      fixedWeaponOverrides: loadout && loadout.fixedWeaponOverrides,
      autoWeaponIds: loadout && loadout.autoWeaponIds
    }),
    upgradeAutoWeapon: (moduleId, operationId = createOperationId()) => api("upgrade-auto-weapon", { moduleId, operationId }, { timeoutMs: 8000 }),
    upgradeAutoWeaponWithComponents: (moduleId, operationId = createOperationId()) => api("upgrade-auto-weapon-components", { moduleId, operationId }, { timeoutMs: 8000 }),
    upgradeActiveSkillGrade: (shipId, slotIndex, targetGrade, operationId = createOperationId()) => api("upgrade-active-skill-grade", { shipId, slotIndex, targetGrade, operationId }, { timeoutMs: 8000 }),
    upgradePassiveSkill: (skillId, operationId = createOperationId()) => api("upgrade-passive-skill", { skillId, operationId }, { timeoutMs: 8000 }),
    redeem: (code) => api("redeem", { code }),
    buyShopItem: (itemId, operationId = createOperationId()) => api("shop-buy", { itemId, operationId }),
    promoteUnit: (kind, itemId, tokenId, operationId = createOperationId()) => api("promote-unit", { kind, itemId, tokenId, operationId }),
    starUpPilot: (pilotId, operationId = createOperationId()) => api("pilot-star-up", { pilotId, operationId }),
    starUpFighter: (shipId, operationId = createOperationId()) => api("fighter-star-up", { shipId, operationId }),
    saveCosmetics: (profile) => api("save-cosmetics", { profile }),
    sendEmailCode,
    verifyEmailCode,
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
