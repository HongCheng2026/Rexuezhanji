(function registerAchievementSystem(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const ACHIEVEMENT_CONFIG = [
    { id: "achievement_first_clear", title: "初战告捷", metric: "clearCount", target: 1, rewards: [{ type: "gold", amount: 2000 }] },
    { id: "achievement_perfect_20", title: "无漏之翼", metric: "perfectClearCount", target: 20, rewards: [{ type: "gold", amount: 30000 }] },
    { id: "achievement_boss_no_damage", title: "王牌规避", metric: "noDamageBossClearCount", target: 5, rewards: [{ type: "gold", amount: 20000 }] }
  ];
  const getAchievementStatus = (item, progress, claimed = []) => claimed.includes(item.id) ? "claimed" : Number(progress[item.metric] || 0) >= item.target ? "completed" : "in_progress";
  const api = { ACHIEVEMENT_CONFIG, getAchievementStatus };
  scope.achievementSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
