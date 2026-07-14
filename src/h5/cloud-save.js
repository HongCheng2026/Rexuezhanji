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

  async function request(path, { method = "GET", body, token = session?.access_token, extraHeaders = {} } = {}) {
    if (!configured()) throw new Error("云存档尚未配置。");
    const response = await fetch(`${config.url}${path}`, {
      method,
      headers: {
        apikey: config.publishableKey,
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...extraHeaders
      },
      body: body ? JSON.stringify(body) : undefined
    });
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
    sweep: (levelId) => api("sweep", { levelId }),
    upgrade: (key) => api("upgrade", { key }),
    upgradeFighter: (statType) => api("upgrade-fighter", { statType }),
    buyPilot: (pilotId) => api("buy-pilot", { pilotId }),
    buyShip: (shipId) => api("buy-ship", { shipId }),
    buyWeaponModule: (moduleId) => api("buy-weapon-module", { moduleId }),
    equipWeaponModule: (moduleId) => api("equip-weapon-module", { moduleId: moduleId || null }),
    redeem: (code) => api("redeem", { code }),
    buyShopItem: (itemId) => api("shop-buy", { itemId }),
    saveCosmetics: (profile) => api("save-cosmetics", { profile }),
    sendEmailCode,
    verifyEmailCode,
    accountLabel
  };
})(window);
