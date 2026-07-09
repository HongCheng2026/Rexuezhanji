(function registerStageStoryConfig(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const STORY_META = { title: "热血战姬", finalBoss: "黑潮女王·弥赛亚", finalBossFirstRevealStage: "1_10", sRankValueRevealChapter: 2, sRankGateChapter: 7, totalStageCount: 93 };
  const chapterNames = ["序章：苍穹启动", "第一章：城市外围夺回战", "第二章：重甲空域", "第三章：沦陷空港", "第四章：护盾防线", "第五章：精英舰队", "第六章：黑潮主力舰队", "第七章：重甲核心防线", "第八章：反攻前线基地", "第九章：黑潮母舰"];
  const getStageId = (chapterIndex, stageInChapter) => chapterIndex === 0 ? `prologue_${stageInChapter}` : `${chapterIndex}_${stageInChapter}`;
  function getStageBattleStory(chapterIndex, stageInChapter) { const difficulty = stageInChapter === 10; const title = chapterNames[chapterIndex] || chapterNames[1]; const sRankTip = chapterIndex >= 7 ? "敌方重甲极强，S 级飞行员与战机的穿甲会更有效。" : chapterIndex >= 2 ? "重甲单位增多，注意提升穿甲能力。" : "保持火力压制，清扫前方敌机。"; return { stageId: getStageId(chapterIndex, stageInChapter), chapterTitle: title, start: `进入${title}·第 ${stageInChapter} 关，${sRankTip}`, midWave: "敌机编队仍在压进，注意规避弹道。", bossAppear: difficulty ? "章节难度 BOSS 出现，全力突破。" : "BOSS 出现，准备迎击。", bossBurst: "BOSS 火力爆发，保持机动。", lastWarning: "最后阶段，继续输出。", clear: difficulty ? "章节难度关完成，新的空域已解锁。" : "战斗完成，继续向前推进。", fail: chapterIndex >= 7 ? "当前配置难以击穿重甲，建议检查 S 级组合与强化。" : "本次战斗未完成，调整配置后再试。" }; }
  const api = { STORY_META, chapterNames, getStageId, getStageBattleStory, getStageResultStory: (chapterIndex, stageInChapter, isWin) => getStageBattleStory(chapterIndex, stageInChapter)[isWin ? "clear" : "fail"] };
  scope.stageStoryConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
