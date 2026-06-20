(function registerFailGuideSystem(root) {
  const scope = root.RXGame || (root.RXGame = {});
  function getFailGuideViewModel({ level, profile }) { const chapter = Number(level?.chapterIndex || 0); const hasSRank = profile.scene?.pilotId?.includes("-s-") && profile.scene?.shipId?.includes("-s-"); if (chapter >= 7 && !hasSRank) return { title: "重甲防线", message: "当前关卡需要更高穿甲。建议启用 S 级飞行员与 S 级战机。", action: "open_hangar" }; return { title: "任务失败", message: "强化战机、调整飞行员后再试。", action: "open_upgrade" }; }
  const api = { getFailGuideViewModel, handleFailGuideAction: (action) => action };
  scope.failGuideSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
