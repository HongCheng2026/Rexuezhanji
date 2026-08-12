"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const deployedApi = fs.readFileSync(path.join(root, "supabase/functions/game-api/index.ts"), "utf8");
const mirroredApi = fs.readFileSync(path.join(root, "src/backend/functions/game-api/index.ts"), "utf8");
const deployedEconomy = fs.readFileSync(path.join(root, "supabase/functions/game-api/services/economy.ts"), "utf8");
const mirroredEconomy = fs.readFileSync(path.join(root, "src/backend/functions/game-api/services/economy.ts"), "utf8");
const migration = fs.readFileSync(
  path.join(root, "src/backend/migrations/202607300001_economy_sessions.sql"),
  "utf8"
);
const codexMigration = fs.readFileSync(
  path.join(root, "src/backend/migrations/202608050003_codex_activation.sql"),
  "utf8"
);

test("部署函数与后端镜像保持完全一致", () => {
  assert.equal(deployedApi, mirroredApi);
  assert.equal(deployedEconomy, mirroredEconomy);
});

test("批量经济协议只重放白名单动作，并区分业务冲突与权威规则绕过", () => {
  assert.match(deployedApi, /const ECONOMY_BATCH_ACTIONS = new Set\(\[/);
  assert.match(deployedApi, /OPERATION_ID_PAYLOAD_MISMATCH/);
  assert.match(deployedApi, /AUTHORITATIVE_RULE_BYPASS/);
  assert.match(deployedApi, /baseRevision === start\.revision/);
  assert.match(deployedApi, /finalState\.revision === expectedRevisionWithoutExternalWrites/);
  assert.doesNotMatch(deployedApi, /NETWORK_(?:ERROR|TIMEOUT)[\s\S]{0,100}riskPoints/);
});

test("抽卡重试返回原始服务端结果，同一操作号不能替换目标或抽数", () => {
  assert.match(deployedEconomy, /\.eq\("operation_id", operationId\)/);
  assert.match(deployedEconomy, /String\(payload\.target \|\| ""\) !== targetKey/);
  assert.match(deployedEconomy, /Number\(payload\.count\) !== count/);
  assert.match(deployedEconomy, /duplicate: true/);
});

test("存档迁移只允许真实匿名源账号，已绑定账号不能转移归属", () => {
  assert.match(deployedApi, /sourceData\.user\.is_anonymous !== true/);
  assert.match(deployedApi, /SOURCE_ACCOUNT_NOT_ANONYMOUS/);
  assert.match(deployedApi, /if \(destination\) return bootstrap\(ctx\)/);
});

test("图鉴激活使用专用原子事务且只允许已拥有单位和已集齐羁绊", () => {
  assert.match(deployedApi, /const CODEX_BOND_REQUIREMENTS/);
  assert.match(deployedApi, /kind === "unit"/);
  assert.match(deployedApi, /ownedPilots\.has\(entryId\) \|\| ownedShips\.has\(entryId\)/);
  assert.match(deployedApi, /requirement\.pilots\.every/);
  assert.match(deployedApi, /rpc\("activate_codex_entry"/);
  assert.match(deployedApi, /图鉴激活条件校验失败/);
  assert.doesNotMatch(deployedApi, /incoming\.codexBonds/);
  assert.match(codexMigration, /for update/);
  assert.match(codexMigration, /'codex-activate'/);
  assert.match(codexMigration, /profile - 'codexBonds'/);
});

test("数据库记录完整资源快照，充值通过订单和钱包流水幂等到账", () => {
  for (const field of [
    "resources",
    "owned",
    "fighterUpgrades",
    "activeSkillGrades",
    "autoWeaponLevels",
    "passiveSkills",
    "shipSkillLoadouts",
    "pilotRanks",
    "shipRanks",
    "pilotStars",
    "shipStars",
    "pilotCopies",
    "codex",
    "gacha",
    "signIn",
    "progress"
  ]) {
    assert.match(migration, new RegExp("'" + field.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&") + "'"));
  }
  assert.match(migration, /unique\(provider, provider_transaction_id\)/);
  assert.match(migration, /create or replace function public\.settle_payment_order/);
  assert.match(migration, /v_order\.provider_transaction_id <> p_provider_transaction_id/);
  assert.match(migration, /'payment-credit'/);
});
