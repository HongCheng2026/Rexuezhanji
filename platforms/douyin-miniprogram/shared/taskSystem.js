(function registerTaskSystem(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const TASK_CONFIG = [
    { id: "growth_clear_prologue_1", title: "首次接入", condition: { type: "clear_stage", stageId: "prologue_1" }, rewards: [{ type: "gold", amount: 3000 }] },
    { id: "growth_clear_prologue_3", title: "黑潮警报", condition: { type: "clear_stage", stageId: "prologue_3" }, rewards: [{ type: "gold", amount: 5000 }] },
    { id: "chapter_clear_1", title: "夺回外围", condition: { type: "clear_chapter", chapterIndex: 1 }, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "challenge_perfect_10", title: "完美作战", condition: { type: "perfect_clear_count", target: 10 }, rewards: [{ type: "gold", amount: 20000 }] }
  ];
  function isTaskComplete(task, progress) { const c = task.condition; if (c.type === "clear_stage") return (progress.clearedStageIds || []).includes(c.stageId); if (c.type === "clear_chapter") return (progress.clearedChapterIds || []).includes(c.chapterIndex); if (c.type === "perfect_clear_count") return Number(progress.perfectClearCount || 0) >= c.target; return false; }
  const api = { TASK_CONFIG, isTaskComplete, getTaskStatus: (task, progress, claimed = []) => claimed.includes(task.id) ? "claimed" : isTaskComplete(task, progress) ? "completed" : "in_progress" };
  scope.taskSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
