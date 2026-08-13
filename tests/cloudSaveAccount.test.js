"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const source = fs.readFileSync(path.join(root, "src/h5/Data/SaveData/cloud-save.js"), "utf8");
const future = Math.floor(Date.now() / 1000) + 3600;

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; }
  };
}

function createHarness(options = {}) {
  const sourceSession = Object.prototype.hasOwnProperty.call(options, "session") ? options.session : {
    access_token: "guest-access",
    refresh_token: "guest-refresh",
    expires_at: future,
    user: { id: "guest-user", is_anonymous: true }
  };
  const targetSession = options.targetSession || {
    access_token: "target-access",
    refresh_token: "target-refresh",
    expires_at: future,
    user: { id: "email-user", email: "pilot@example.com", is_anonymous: false }
  };
  const storage = new Map([["rexuezhanjiSupabaseSession", JSON.stringify(sourceSession)]]);
  if (options.migrationProof) storage.set("rexuezhanjiAuthSourceProof", String(options.migrationProof));
  const requests = [];
  const context = vm.createContext({
    AbortController,
    URL,
    URLSearchParams,
    console,
    crypto: { randomUUID: () => "operation-id" },
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    atob(value) { return Buffer.from(value, "base64").toString("utf8"); },
    location: options.location || { hash: "", pathname: "/", search: "", origin: "https://rexuezhanji.top" },
    history: { replaceState() {} },
    RXSupabaseConfig: { url: "https://cloud.example", publishableKey: "public-key" },
    localStorage: {
      getItem(key) { return storage.has(key) ? storage.get(key) : null; },
      setItem(key, value) { storage.set(key, String(value)); },
      removeItem(key) { storage.delete(key); }
    },
    async fetch(url, request) {
      const body = request && request.body ? JSON.parse(request.body) : {};
      const headers = request && request.headers ? request.headers : {};
      const entry = { url: String(url), body, headers };
      requests.push(entry);
      if (entry.url.includes("/auth/v1/user")) return response({ user: sourceSession.user });
      if (entry.url.includes("/auth/v1/otp")) {
        if (options.otpFailure) return response(options.otpFailure.payload, options.otpFailure.status);
        return response({ ok: true });
      }
      if (entry.url.includes("/auth/v1/verify")) return response(targetSession);
      const action = new URL(entry.url).searchParams.get("action");
      if (action === "prepare-auth-migration") return response({ migrationProof: "1700000000000.signature" });
      if (options.failCallbackWithoutProfile && action === "complete-auth-callback") {
        return response({ error: "该邮箱账号还没有可读取的云存档。", code: "AUTH_CALLBACK_PROFILE_MISSING" }, 409);
      }
      if (options.failAction === action) {
        return response({ error: "migration unavailable", code: "MIGRATION_FAILED" }, 503);
      }
      return response({
        profile: { player: { uid: action === "migrate-anonymous" ? "100000094" : "100000108" } },
        revision: 7,
        economySession: { id: "11111111-1111-4111-8111-111111111111", rulesVersion: "economy-v1" }
      });
    }
  });
  context.window = context;
  context.globalThis = context;
  vm.runInContext(source, context, { filename: "cloud-save.js" });
  return { cloud: context.RXCloud, requests, storage, sourceSession, targetSession };
}

function savedSession(harness) {
  return JSON.parse(harness.storage.get("rexuezhanjiSupabaseSession"));
}

test("账号状态区分游客、邮箱和手机号，并且不暴露完整标识", () => {
  const guest = createHarness();
  assert.deepEqual(JSON.parse(JSON.stringify(guest.cloud.getAccountState())), {
    available: true,
    status: "guest",
    provider: null,
    maskedIdentifier: "游客云档",
    reason: ""
  });

  const bound = createHarness({
    session: {
      access_token: "bound-access",
      refresh_token: "bound-refresh",
      expires_at: future,
      user: { id: "bound-user", email: "commander@example.com", is_anonymous: false }
    }
  });
  const state = JSON.parse(JSON.stringify(bound.cloud.getAccountState()));
  assert.equal(state.status, "email");
  assert.equal(state.maskedIdentifier, "co*******@example.com");
  assert.equal(bound.cloud.accountLabel(), state.maskedIdentifier);

  const phoneBound = createHarness({
    session: {
      access_token: "phone-access",
      refresh_token: "phone-refresh",
      expires_at: future,
      user: { id: "phone-user", phone: "+8613800138000", is_anonymous: false }
    }
  });
  const phoneState = JSON.parse(JSON.stringify(phoneBound.cloud.getAccountState()));
  assert.equal(phoneState.status, "phone");
  assert.equal(phoneState.provider, "phone");
  assert.equal(phoneState.maskedIdentifier, "+86 138****8000");
});

test("邮箱和手机验证码支持禁止创建账号，并校验输入格式", async () => {
  const harness = createHarness();
  await harness.cloud.sendEmailCode(" Pilot@Example.com ", { createUser: false });
  await harness.cloud.sendPhoneCode("138 0013 8000", { createUser: false });
  const otpRequests = harness.requests.filter((entry) => entry.url.includes("/auth/v1/otp"));
  assert.deepEqual(otpRequests[0].body, { email: "pilot@example.com", create_user: false });
  assert.deepEqual(otpRequests[1].body, { phone: "+8613800138000", create_user: false, channel: "sms" });
  await assert.rejects(harness.cloud.sendEmailCode("invalid-email"), /有效的邮箱/);
  await assert.rejects(harness.cloud.sendPhoneCode("123"), /有效的手机号/);
  await assert.rejects(harness.cloud.verifyEmailCode("pilot@example.com", "12ab"), /6 位数字/);
  await assert.rejects(harness.cloud.verifyPhoneCode("13800138000", "12ab"), /6 位数字/);
  assert.ok(harness.requests.some((entry) => entry.url.includes("action=prepare-auth-migration")));
  assert.equal(harness.storage.get("rexuezhanjiAuthSourceProof"), "1700000000000.signature");
});

test("游客绑定邮箱更新当前账号，不创建会丢失 UID 的新账号", async () => {
  const harness = createHarness();
  await harness.cloud.sendEmailCode(" Pilot@Example.com ", { createUser: true });
  const update = harness.requests.find((entry) => entry.url.includes("/auth/v1/user"));
  assert.ok(update);
  assert.deepEqual(update.body, { email: "pilot@example.com" });
  assert.equal(update.headers.Authorization, "Bearer guest-access");
  assert.equal(harness.requests.some((entry) => entry.url.includes("/auth/v1/otp")), false);
});

test("邮件安全链接回跳时自动接管 Session 并清理地址栏令牌", () => {
  const storage = new Map();
  const payload = Buffer.from(JSON.stringify({ sub: "email-user", email: "pilot@example.com", is_anonymous: false })).toString("base64url");
  const location = {
    hash: `#access_token=x.${payload}.y&refresh_token=refresh&expires_in=3600&token_type=bearer&type=magiclink`,
    pathname: "/",
    search: "",
    origin: "https://rexuezhanji.top"
  };
  const harness = createHarness({ location, migrationProof: "1700000000000.signature" });
  const state = JSON.parse(JSON.stringify(harness.cloud.getAccountState()));
  assert.equal(state.status, "email");
  assert.equal(state.maskedIdentifier, "pi***@example.com");
  assert.equal(savedSession(harness).user.id, "guest-user");
  return harness.cloud.bootstrap().then(() => {
    assert.equal(savedSession(harness).user.id, "email-user");
    const migration = harness.requests.find((entry) => entry.url.includes("action=migrate-anonymous"));
    assert.ok(migration);
    assert.equal(migration.headers["x-rexuezhanji-source-proof"], "1700000000000.signature");
  });
});

test("没有原设备游客凭据时先校验目标账号云档，禁止自动创建空存档", async () => {
  const payload = Buffer.from(JSON.stringify({ sub: "email-user", email: "pilot@example.com", is_anonymous: false })).toString("base64url");
  const harness = createHarness({
    session: null,
    failCallbackWithoutProfile: true,
    location: {
      hash: `#access_token=x.${payload}.y&refresh_token=refresh&expires_in=3600&type=magiclink`,
      pathname: "/",
      search: "",
      origin: "https://rexuezhanji.top"
    }
  });
  await assert.rejects(harness.cloud.bootstrap(), (error) => error.code === "AUTH_CALLBACK_PROFILE_MISSING");
  const callbackCheck = harness.requests.find((entry) => entry.url.includes("action=complete-auth-callback"));
  assert.ok(callbackCheck);
  assert.equal(harness.requests.some((entry) => entry.url.includes("action=bootstrap")), false);
  assert.equal(harness.storage.has("rexuezhanjiSupabaseSession"), false);
});

test("Supabase 的 msg 与 error_code 会完整透传给界面", async () => {
  const harness = createHarness({
    otpFailure: {
      status: 400,
      payload: { code: 400, error_code: "phone_provider_disabled", msg: "Unsupported phone provider" }
    }
  });
  await assert.rejects(
    harness.cloud.sendPhoneCode("13800138000"),
    (error) => error.status === 400 && error.code === "phone_provider_disabled" && error.message === "Unsupported phone provider"
  );
});

test("手机验证码按 sms 类型验证，并安全迁移游客存档", async () => {
  const harness = createHarness({
    targetSession: {
      access_token: "phone-target-access",
      refresh_token: "phone-target-refresh",
      expires_at: future,
      user: { id: "phone-user", phone: "+8613800138000", is_anonymous: false }
    }
  });
  const result = await harness.cloud.verifyPhoneCode("13800138000", "123456");
  const verification = harness.requests.find((entry) => entry.url.includes("/auth/v1/verify"));
  assert.deepEqual(verification.body, { phone: "+8613800138000", token: "123456", type: "sms" });
  const migration = harness.requests.find((entry) => entry.url.includes("action=migrate-anonymous"));
  assert.ok(migration);
  assert.equal(migration.headers.Authorization, "Bearer phone-target-access");
  assert.equal(result.profile.player.uid, "100000094");
  assert.equal(savedSession(harness).user.id, "phone-user");
});

test("游客验证邮箱后用目标令牌迁移存档，服务端成功后才保存新 Session", async () => {
  const harness = createHarness();
  const result = await harness.cloud.verifyEmailCode("pilot@example.com", "123456");
  const migration = harness.requests.find((entry) => entry.url.includes("action=migrate-anonymous"));
  assert.ok(migration);
  assert.equal(migration.headers.Authorization, "Bearer target-access");
  assert.equal(migration.headers["x-rexuezhanji-source-token"], "guest-access");
  assert.equal(result.profile.player.uid, "100000094");
  assert.equal(savedSession(harness).user.id, "email-user");
});

test("已绑定账号切换时只加载目标云档，绝不迁移原账号", async () => {
  const harness = createHarness({
    session: {
      access_token: "bound-access",
      refresh_token: "bound-refresh",
      expires_at: future,
      user: { id: "bound-user", email: "first@example.com", is_anonymous: false }
    }
  });
  const result = await harness.cloud.verifyEmailCode("pilot@example.com", "123456");
  assert.equal(harness.requests.some((entry) => entry.url.includes("action=migrate-anonymous")), false);
  const bootstrap = harness.requests.find((entry) => entry.url.includes("action=bootstrap"));
  assert.ok(bootstrap);
  assert.equal(bootstrap.headers.Authorization, "Bearer target-access");
  assert.equal(result.profile.player.uid, "100000108");
  assert.equal(savedSession(harness).user.id, "email-user");
});

test("迁移失败时原 Session 和原存档归属保持不变", async () => {
  const harness = createHarness({ failAction: "migrate-anonymous" });
  await assert.rejects(harness.cloud.verifyEmailCode("pilot@example.com", "123456"), /migration unavailable/);
  assert.equal(savedSession(harness).user.id, "guest-user");
  assert.equal(savedSession(harness).access_token, "guest-access");
});
