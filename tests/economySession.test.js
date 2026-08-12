"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const economySession = require("../src/h5/Game/Gateway/economySession.js");

const SESSION_ID = "10000000-0000-4000-8000-000000000001";
const NEXT_SESSION_ID = "10000000-0000-4000-8000-000000000002";
const OPERATION_ID = "20000000-0000-4000-8000-000000000001";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); }
  };
}

function createProfile(gold = 1000, level = 1) {
  return {
    player: { uid: "RX-PLAYER-1", level: 10 },
    resources: { gold, diamonds: 100, energy: 120, inventory: {} },
    fighterUpgrades: { attack: level, armorPenetration: 1, hp: 1 }
  };
}

function createHarness(options = {}) {
  let profile = clone(options.profile || createProfile());
  const storage = options.storage || createStorage();
  const calls = [];
  const events = [];
  const remote = Object.assign({
    configured() { return true; },
    async bootstrap() {
      calls.push({ method: "bootstrap" });
      return {
        profile: clone(options.serverProfile || createProfile()),
        revision: 7,
        economySession: { id: SESSION_ID, rulesVersion: economySession.RULES_VERSION }
      };
    },
    async commitEconomyBatch(batch) {
      calls.push({ method: "commitEconomyBatch", batch: clone(batch) });
      return {
        ok: true,
        sessionId: batch.sessionId,
        revision: 8,
        profile: createProfile(900, 2),
        acceptedOperationIds: batch.commands.map((command) => command.operationId),
        duplicateOperationIds: [],
        rejected: []
      };
    },
    async syncProfile(maxAgeMs) {
      calls.push({ method: "syncProfile", maxAgeMs });
      return { profile: createProfile(900, 2), revision: 8 };
    },
    async verifyEmailCode(email, token) {
      calls.push({ method: "verifyEmailCode", email, token });
      return {
        profile: clone(authoritativeProfileForLogin()),
        revision: 10,
        economySession: { id: NEXT_SESSION_ID, rulesVersion: economySession.RULES_VERSION }
      };
    },
    async verifyPhoneCode(phone, token) {
      calls.push({ method: "verifyPhoneCode", phone, token });
      return {
        profile: clone(authoritativeProfileForLogin()),
        revision: 10,
        economySession: { id: NEXT_SESSION_ID, rulesVersion: economySession.RULES_VERSION }
      };
    },
    async startBattle(levelId) {
      calls.push({ method: "startBattle", levelId });
      return { ticket: "battle-ticket" };
    }
  }, options.remote || {});
  const local = {
    upgradeFighter(statType) {
      profile.resources.gold -= 100;
      profile.fighterUpgrades[statType] += 1;
      return { ok: true, profile, cost: 100, statType, level: profile.fighterUpgrades[statType] };
    }
  };
  const adapter = economySession.create({
    remote,
    local,
    storage,
    getProfile() { return profile; },
    applyProfile(next) { profile = clone(next); return profile; },
    refreshViews() {},
    onEvent(type, detail) { events.push({ type, detail }); }
  });
  return {
    adapter,
    calls,
    events,
    storage,
    get profile() { return profile; }
  };
}

function authoritativeProfileForLogin() {
  return createProfile(1000, 1);
}

test("强化立即更新本地投影，进入战斗前才等待云端批量确认", async () => {
  let releaseBatch;
  const harness = createHarness({
    remote: {
      commitEconomyBatch(batch) {
        harness.calls.push({ method: "commitEconomyBatch", batch: clone(batch) });
        return new Promise((resolve) => {
          releaseBatch = () => resolve({
            ok: true,
            sessionId: batch.sessionId,
            revision: 8,
            profile: createProfile(900, 2),
            acceptedOperationIds: [OPERATION_ID],
            duplicateOperationIds: [],
            rejected: []
          });
        });
      }
    }
  });
  await harness.adapter.bootstrap();

  const result = await harness.adapter.upgradeFighter("attack", OPERATION_ID);
  assert.equal(result.pending, true);
  assert.equal(harness.profile.resources.gold, 900);
  assert.equal(harness.profile.fighterUpgrades.attack, 2);
  assert.equal(harness.adapter.economyStatus().pending, 1);

  const roomEntrySnapshot = await harness.adapter.syncProfile(30000);
  assert.equal(roomEntrySnapshot.pending, 1);
  assert.equal(roomEntrySnapshot.profile.resources.gold, 900);

  let battleResolved = false;
  const battle = harness.adapter.startBattle(3).then((value) => {
    battleResolved = true;
    return value;
  });
  await Promise.resolve();
  assert.equal(battleResolved, false);
  assert.equal(harness.calls.some((call) => call.method === "startBattle"), false);
  const batchCall = harness.calls.find((call) => call.method === "commitEconomyBatch");
  assert.equal(batchCall.batch.commands.length, 1);
  assert.equal(batchCall.batch.commands[0].operationId, OPERATION_ID);

  releaseBatch();
  const battleResult = await battle;
  assert.equal(battleResult.ticket, "battle-ticket");
  assert.equal(harness.adapter.economyStatus().pending, 0);
  assert.equal(harness.calls.at(-1).method, "startBattle");
});

test("网络失败保留原操作号，下一次启动从持久化队列恢复并幂等重放", async () => {
  const storage = createStorage();
  const first = createHarness({
    storage,
    remote: {
      async commitEconomyBatch() {
        const error = new Error("offline");
        error.code = "NETWORK_ERROR";
        throw error;
      }
    }
  });
  await first.adapter.bootstrap();
  await first.adapter.upgradeFighter("attack", OPERATION_ID);
  await assert.rejects(first.adapter.flushEconomy("test-offline"), (error) => error.code === "NETWORK_ERROR");
  assert.equal(first.adapter.economyStatus().pending, 1);

  const second = createHarness({ storage });
  await second.adapter.bootstrap();
  const replay = second.calls.find((call) => call.method === "commitEconomyBatch");
  assert.ok(replay);
  assert.equal(replay.batch.commands[0].operationId, OPERATION_ID);
  assert.equal(second.adapter.economyStatus().pending, 0);
  assert.equal(second.profile.resources.gold, 900);
  assert.equal(second.profile.fighterUpgrades.attack, 2);
});

test("高风险会话撤销后恢复云端数据并阻止继续本地消费，普通业务冲突只回滚不判作弊", async () => {
  const authoritative = createProfile(1000, 1);
  const revoked = createHarness({
    remote: {
      async commitEconomyBatch() {
        const error = new Error("revoked");
        error.code = "ECONOMY_SESSION_REVOKED";
        error.payload = { profile: authoritative, revision: 9 };
        throw error;
      }
    }
  });
  await revoked.adapter.bootstrap();
  await revoked.adapter.upgradeFighter("attack", OPERATION_ID);
  await assert.rejects(revoked.adapter.flushEconomy("security"), (error) => error.code === "ECONOMY_SESSION_REVOKED");
  assert.equal(revoked.profile.resources.gold, 1000);
  assert.equal(revoked.adapter.economyStatus().blocked, true);
  await assert.rejects(revoked.adapter.upgradeFighter("attack"), (error) => error.code === "ECONOMY_RELOGIN_REQUIRED");
  await assert.rejects(revoked.adapter.startBattle(1), (error) => error.code === "ECONOMY_RELOGIN_REQUIRED");
  assert.equal(revoked.events.some((event) => event.type === "revoked"), true);
  await revoked.adapter.verifyEmailCode("pilot@example.com", "123456");
  assert.equal(revoked.adapter.economyStatus().blocked, false);
  assert.equal(revoked.adapter.economyStatus().sessionId, NEXT_SESSION_ID);
  await revoked.adapter.verifyPhoneCode("+8613800138000", "654321");
  assert.equal(revoked.calls.some((entry) => entry.method === "verifyPhoneCode"), true);

  const conflicted = createHarness({
    remote: {
      async commitEconomyBatch(batch) {
        return {
          ok: true,
          sessionId: batch.sessionId,
          revision: 8,
          profile: authoritative,
          acceptedOperationIds: [],
          duplicateOperationIds: [],
          rejected: [{ operationId: OPERATION_ID, code: "GOLD_NOT_ENOUGH" }],
          riskScore: 0
        };
      }
    }
  });
  await conflicted.adapter.bootstrap();
  await conflicted.adapter.upgradeFighter("attack", OPERATION_ID);
  await conflicted.adapter.flushEconomy("business-conflict");
  assert.equal(conflicted.adapter.economyStatus().blocked, false);
  assert.equal(conflicted.adapter.economyStatus().lastError, "ECONOMY_COMMAND_REJECTED");
  assert.equal(conflicted.profile.resources.gold, 1000);
  assert.equal(conflicted.events.some((event) => event.type === "conflict"), true);
});

test("图鉴等原子屏障操作串行确认，资料刷新不会越过未完成激活", async () => {
  let releaseFirst;
  const harness = createHarness({
    remote: {
      activateCodexEntry(kind, entryId) {
        harness.calls.push({ method: "activateCodexEntry", kind, entryId });
        if (entryId === "pilot-b-linzhihan") {
          return new Promise((resolve) => {
            releaseFirst = () => resolve({ profile: createProfile(), revision: 8 });
          });
        }
        return Promise.resolve({ profile: createProfile(), revision: 9 });
      }
    }
  });
  await harness.adapter.bootstrap();

  const first = harness.adapter.activateCodexEntry("unit", "pilot-b-linzhihan", OPERATION_ID);
  const second = harness.adapter.activateCodexEntry("unit", "pilot-s-lingyan", "20000000-0000-4000-8000-000000000002");
  harness.adapter.syncProfile(0);
  await new Promise((resolve) => setImmediate(resolve));

  assert.deepEqual(
    harness.calls.filter((call) => call.method === "activateCodexEntry").map((call) => call.entryId),
    ["pilot-b-linzhihan"]
  );
  assert.equal(harness.calls.some((call) => call.method === "syncProfile"), false);

  releaseFirst();
  await Promise.all([first, second]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(
    harness.calls.filter((call) => call.method === "activateCodexEntry").map((call) => call.entryId),
    ["pilot-b-linzhihan", "pilot-s-lingyan"]
  );
  assert.equal(harness.calls.at(-1).method, "syncProfile");
});
