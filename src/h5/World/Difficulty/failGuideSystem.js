(function registerFailGuideSystem(root) {
  const scope = root.RXGame || (root.RXGame = {});
  function findById(list, id, fallbackId) { return (list || []).find((item) => item.id === id) || (list || []).find((item) => item.id === fallbackId) || (list || [])[0]; }
  function getFailGuideViewModel({ level, profile }) { const chapter = Number(level?.chapterIndex || 0); const assets = scope.assets || {}; const pilot = findById(assets.PILOT_ASSETS, profile.scene?.pilotId, assets.DEFAULT_PILOT_ID); const ship = findById(assets.SHIP_ASSETS, profile.scene?.shipId, assets.DEFAULT_SHIP_ID); const hasSRank = pilot?.rank === "S" && ship?.rank === "S"; if (chapter >= 7 && !hasSRank) return { title: "重甲防线", message: "当前关卡需要更高穿甲。建议启用 S 级飞行员与 S 级战机。", action: "open_hangar" }; return { title: "任务失败", message: "强化战机、调整飞行员后再试。", action: "open_upgrade" }; }
  const api = { getFailGuideViewModel, handleFailGuideAction: (action) => action };
  scope.failGuideSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
