"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const apiSource = fs.readFileSync(path.join(root, "supabase/functions/game-api/index.ts"), "utf8");
const cleanupSql = fs.readFileSync(path.join(root, "supabase/migrations/202607130002_remove_legacy_cloud_schema.sql"), "utf8");
const atomicSql = fs.readFileSync(path.join(root, "supabase/migrations/202607130003_atomic_battle_commits.sql"), "utf8");
const loaderSource = fs.readFileSync(path.join(root, "src/h5/shared-loader.js"), "utf8");

test("服务端提供正式游戏所需的全部写操作", () => {
  for (const action of ["start-battle", "finish-battle", "abandon-battle", "sweep", "upgrade", "upgrade-fighter", "buy-pilot", "buy-ship", "buy-weapon-module", "equip-weapon-module", "save-cosmetics"]) {
    assert.match(apiSource, new RegExp(`action === ["']${action}["']`), `缺少 ${action}`);
  }
});

test("云端战姬战机购买由服务端定价并校验金币与重复购买", () => {
  assert.match(apiSource, /PILOT_PRICE_BY_RANK\s*=\s*\{\s*B:\s*30000,\s*A:\s*120000,\s*S:\s*900000/);
  assert.match(apiSource, /SHIP_PRICE_BY_RANK\s*=\s*\{\s*B:\s*50000,\s*A:\s*150000,\s*S:\s*1300000/);
  assert.match(apiSource, /if \(ownedIds\.includes\(itemId\)\)/);
  assert.match(apiSource, /getGold\(profile\) < cost/);
  assert.match(apiSource, /type === "pilot" \? "buy-pilot" : "buy-ship"/);
});

test("云端模块接口校验ID、金币、重复购买、S级槽位并记录流水", () => {
  assert.match(apiSource, /const WEAPON_MODULES/);
  assert.match(apiSource, /ownedIds\.includes\(moduleId\)/);
  assert.match(apiSource, /getGold\(profile\) < definition\.price/);
  assert.match(apiSource, /S_RANK_SHIP_IDS\.has/);
  assert.match(apiSource, /ledger\(ctx, "buy-weapon-module"/);
  assert.match(apiSource, /ledger\(ctx, "equip-weapon-module"/);
});

test("CORS 同时覆盖两个正式域名和本地预览", () => {
  assert.match(apiSource, /https:\/\/rexuezhanji\.top/);
  assert.match(apiSource, /https:\/\/www\.rexuezhanji\.top/);
  assert.match(apiSource, /localhost/);
  assert.match(apiSource, /127\\\.0\\\.0\\\.1/);
  assert.match(apiSource, /rexuezhanji\\\.netlify\\\.app/);
});

test("清理迁移只移除旧结构，不重写迁移历史", () => {
  assert.match(cleanupSql, /drop table if exists public\.battle_tickets/i);
  assert.match(cleanupSql, /drop table if exists public\.profiles/i);
  assert.doesNotMatch(cleanupSql, /drop table if exists public\.player_profiles/i);
  assert.doesNotMatch(cleanupSql, /drop table if exists public\.battle_sessions/i);
  assert.doesNotMatch(cleanupSql, /drop table if exists public\.reward_ledger/i);
});

test("启动器按顺序加载统一网关、渲染器和结算控制器", () => {
  const gateway = loaderSource.indexOf('"app/gameGateway.js"');
  const renderer = loaderSource.indexOf('"battle/canvasRenderer.js"');
  const settlement = loaderSource.indexOf('"ui/settlementController.js"');
  const gameApp = loaderSource.indexOf('"app/gameApp.js"');
  assert.ok(gateway >= 0 && renderer > gateway && settlement > renderer && gameApp > settlement);
});

test("开战和结算由数据库事务一次提交", () => {
  assert.match(apiSource, /rpc\("commit_battle_start"/);
  assert.match(apiSource, /rpc\("commit_battle_settlement"/);
  assert.match(atomicSql, /create or replace function public\.commit_battle_start/i);
  assert.match(atomicSql, /create or replace function public\.commit_battle_settlement/i);
  assert.match(atomicSql, /revoke all on function public\.commit_battle_start[\s\S]*from public, anon, authenticated/i);
  assert.match(atomicSql, /grant execute on function public\.commit_battle_settlement[\s\S]*to service_role/i);
});

test("云端不允许选择未拥有的战姬、战机或背景", () => {
  assert.match(apiSource, /ownershipFields/);
  assert.match(apiSource, /ownedIds\.includes\(incoming\.scene\[field\]\)/);
  assert.match(apiSource, /不能使用尚未拥有的外观/);
});
