const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

test("社交表只允许云函数访问且好友使用无序唯一玩家对", () => {
  const migration = read("supabase/migrations/202607150001_cloud_transactions_endless.sql");
  assert.match(migration, /friend_relations_unordered_pair_key/);
  assert.match(migration, /revoke all on table public\.chat_messages from public, anon, authenticated/);
  assert.match(migration, /grant select, insert, delete on table public\.chat_messages to service_role/);
});

test("强化、任务、成就和商店共用幂等原子存档事务", () => {
  const server = read("supabase/functions/game-api/index.ts");
  const economy = read("supabase/functions/game-api/services/economy.ts");
  const transaction = read("supabase/functions/game-api/services/profileTransaction.ts");
  const migration = read("supabase/migrations/202607150001_cloud_transactions_endless.sql");
  assert.match(migration, /commit_profile_operation/);
  assert.match(transaction, /rpc\("commit_profile_operation"/);
  assert.match(server, /profileTransaction\.commit\([^;]+"upgrade-fighter"/s);
  for (const action of ["task-claim", "achievement-claim", "activity-reward-claim", "shop-buy"]) assert.match(economy, new RegExp(`"${action}"`));
});

test("完整商店商品和全部成就奖励都在服务端登记", () => {
  const frontend = read("src/shared/featurePanelContent.js");
  const server = read("supabase/functions/game-api/services/economy.ts");
  const shopIds = [...frontend.matchAll(/\{ id: "([^"]+)", category: "(?:每日|资源|强化|战机\/抽取)"/g)].map((match) => match[1]);
  const achievementIds = [...frontend.matchAll(/\{ id: "(ach_[^"]+)"/g)].map((match) => match[1]);
  assert.equal(shopIds.length, 15);
  assert.equal(achievementIds.length, 16);
  for (const id of [...shopIds, ...achievementIds]) assert.match(server, new RegExp(`\\b${id}:`), id);
});

test("无尽模式云端票据限制理论最大出怪数", () => {
  const server = read("supabase/functions/game-api/services/endless.ts");
  assert.match(server, /Math\.floor\(elapsedSeconds \/ 30\) \+ 1/);
  assert.match(server, /kills > theoreticalMaximum/);
  assert.match(server, /commit_endless_result/);
});

test("云函数入口把社交、经济和无尽业务委托给独立服务", () => {
  const server = read("supabase/functions/game-api/index.ts");
  assert.match(server, /createSocialService/);
  assert.match(server, /createEconomyService/);
  assert.match(server, /createEndlessService/);
  assert.match(server, /createProfileTransactionService/);
  assert.doesNotMatch(server, /async function friendList|async function chatPoll|async function finishEndless|async function claimTask|async function buyShopItem/);
  assert.match(read("supabase/functions/game-api/services/social.ts"), /async function friendList/);
  assert.match(read("supabase/functions/game-api/services/economy.ts"), /async function buyShopItem/);
});
