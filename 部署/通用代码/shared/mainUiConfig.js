(function registerMainUiConfig(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const MAIN_UI_LAYOUT = { leftEntries: ["战姬", "战机", "战机升级"], rightGrid: [["任务", "活动", "成就"], ["商店", "好友", "排行榜"]], profileActions: ["上传头像", "改名", "成就铭牌", "荣誉等级"], bottomPromo: ["星穹之绊", "赞助我们"], chatChannels: ["系统", "世界", "公会", "好友"] };
  scope.mainUiConfig = { MAIN_UI_LAYOUT };
  if (typeof module !== "undefined" && module.exports) module.exports = { MAIN_UI_LAYOUT };
})(typeof globalThis !== "undefined" ? globalThis : this);
