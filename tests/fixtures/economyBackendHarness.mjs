// Backend economy service harness. Loaded with `node --experimental-strip-types`.
// Receives a JSON scenario via argv[2]: { profile, steps: [{call, ...}] }
// Runs steps sequentially against an in-memory profile (loadProfile returns live state),
// returns JSON { finalProfile, replies: [{ok, ...}] }.
import { createEconomyService } from "../../src/backend/functions/game-api/services/economy.ts";

const scenario = JSON.parse(process.argv[2] || "{}");
const state = { profile: scenario.profile || { resources: { gold: 0, diamonds: 0, energy: 0, maxEnergy: 200, inventory: {} } }, revision: 1 };

const deps = {
  reply: (body) => ({ ok: true, ...body }),
  error: (message, status = 400) => ({ ok: false, error: message, status }),
  loadProfile: async () => ({ profile: state.profile, revision: state.revision, uid: "u1" }),
  commitProfileOperation: async (ctx, profile) => { state.profile = profile; return profile; },
  ledger: async () => {},
  publicProfile: (p) => p,
  refreshLeaderboard: async () => {},
  runBackground: (_label, task) => { void Promise.resolve(task); },
  getGold: (p) => Number(p.resources?.gold ?? p.coins ?? 0),
  setGold: (p, v) => { p.resources = p.resources || {}; p.resources.gold = Math.max(0, Math.floor(v || 0)); p.coins = p.resources.gold; },
  getStageAliases: () => [],
  levels: [],
  readHonorTier: () => 0,
  pilotRankById: { "pilot-s-lingyan": "S" },
  shipRankById: {}
};

const service = createEconomyService(deps);
const replies = [];
for (const step of scenario.steps || []) {
  if (step.call === "buyShopItem") replies.push(await service.buyShopItem({ userId: "u1" }, { itemId: step.itemId, quantity: step.quantity || 1, operationId: step.operationId }));
  else if (step.call === "claimAchievement") replies.push(await service.claimAchievement({ userId: "u1" }, { achievementId: step.achievementId }));
  else if (step.call === "claimTask") replies.push(await service.claimTask({ userId: "u1" }, { taskId: step.taskId }));
  else if (step.call === "claimActivityReward") replies.push(await service.claimActivityReward({ userId: "u1" }, { points: step.points }));
  else if (step.call === "gachaDraw") replies.push(await service.gachaDraw({ userId: "u1" }, { target: step.target, count: step.count || 1, buyMissingTickets: step.buyMissingTickets || false, operationId: step.operationId }));
  else if (step.call === "claimSignIn") replies.push(await service.claimSignIn({ userId: "u1" }, { operationId: step.operationId }));
  else if (step.call === "useInventoryItem") replies.push(await service.useInventoryItem({ userId: "u1" }, { itemId: step.itemId, operationId: step.operationId }));
  else if (step.call === "sellInventoryItem") replies.push(await service.sellInventoryItem({ userId: "u1" }, { itemId: step.itemId, operationId: step.operationId }));
  else if (step.call === "exchangeDiamonds") replies.push(await service.exchangeDiamonds({ userId: "u1" }, { amount: step.amount, operationId: step.operationId }));
}
console.log(JSON.stringify({ finalProfile: state.profile, replies }));
