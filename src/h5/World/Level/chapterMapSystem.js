(function registerChapterMapSystem(root) {
  const scope = root.RXGame || (root.RXGame = {});
  function createFullChapterMapViewModel(profile, levels) { const cleared = new Set(profile.progress?.clearedStageIds || []); return levels.map((level) => ({ id: level.id, stageId: level.chapterIndex === 0 ? `prologue_${level.stageInChapter}` : `${level.chapterIndex}_${level.stageInChapter}`, code: level.code, chapterIndex: level.chapterIndex, stageInChapter: level.stageInChapter, isDifficultyStage: Boolean(level.isDifficultyStage), unlocked: level.id <= Number(profile.unlockedLevel || 1), cleared: cleared.has(level.chapterIndex === 0 ? `prologue_${level.stageInChapter}` : `${level.chapterIndex}_${level.stageInChapter}`), stars: Number(profile.progress?.stageStars?.[level.id] || 0) })); }
  const api = { createFullChapterMapViewModel, createChapterMapViewModel: (profile, levels, chapterIndex) => createFullChapterMapViewModel(profile, levels).filter((item) => item.chapterIndex === chapterIndex), getCurrentRecommendedStage: (profile, levels) => levels[Math.max(0, Math.min(levels.length - 1, Number(profile.unlockedLevel || 1) - 1))] };
  scope.chapterMapSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
