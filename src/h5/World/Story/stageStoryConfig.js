(function registerStageStoryConfig(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const campaignStory = scope.campaignStoryFramework || {};
  const fallbackChapterNames = ["序章：苍穹启动", "第一章：城市外围夺回战", "第二章：重甲空域", "第三章：沦陷空港", "第四章：护盾防线", "第五章：精英舰队", "第六章：黑潮主力舰队", "第七章：重甲核心防线", "第八章：反攻前线基地", "第九章：黑潮母舰"];
  const STORY_META = campaignStory.STORY_META || { title: "热血战姬", finalBoss: "黑潮女王·弥赛亚", finalBossFirstRevealStage: "1_10", sRankValueRevealChapter: 2, sRankGateChapter: 7, totalStageCount: 93 };
  const chapterNames = campaignStory.CHAPTER_STORY_ARCS
    ? campaignStory.CHAPTER_STORY_ARCS.map((chapter) => chapter.title)
    : fallbackChapterNames;
  const getStageId = campaignStory.getStageId || ((chapterIndex, stageInChapter) => chapterIndex === 0 ? `prologue_${stageInChapter}` : `${chapterIndex}_${stageInChapter}`);
  function getStageBattleStory(chapterIndex, stageInChapter) {
    if (campaignStory.getStageStory) return campaignStory.getStageStory(chapterIndex, stageInChapter);
    const title = chapterNames[chapterIndex] || chapterNames[1];
    return { stageId: getStageId(chapterIndex, stageInChapter), chapterTitle: title, start: `进入${title}`, midWave: "敌机编队仍在压进。", bossAppear: "BOSS 出现。", bossBurst: "BOSS 火力爆发。", lastWarning: "最后阶段，继续输出。", clear: "战斗完成。", fail: "本次战斗未完成。" };
  }
  const api = { STORY_META, chapterNames, getStageId, getStageBattleStory, getStageResultStory: (chapterIndex, stageInChapter, isWin) => getStageBattleStory(chapterIndex, stageInChapter)[isWin ? "clear" : "fail"] };
  scope.stageStoryConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
