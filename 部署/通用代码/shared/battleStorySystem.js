(function registerBattleStorySystem(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const BATTLE_STORY_UI_CONFIG = { position: "bottom_left", nonBlocking: true, pauseBattle: false, blockInput: false, maxVisibleMessages: 1, defaultDurationMs: 2200, importantDurationMs: 2800, fadeInMs: 120, fadeOutMs: 160, portraitSize: 96, textMaxLength: 28 };
  const BATTLE_STORY_EVENT_TYPE = { STAGE_START: "stage_start", MID_WAVE: "mid_wave", BOSS_APPEAR: "boss_appear", BOSS_BURST: "boss_burst", LAST_WARNING: "last_warning", STAGE_CLEAR: "stage_clear", STAGE_FAIL: "stage_fail" };
  const BATTLE_STORY_TIMELINE_SECONDS = { stageStart: 0, midWave: 30, bossAppear: 60, bossBurst: 75, lastWarning: 85 };
  const PILOT_FALLBACK_CONFIG = { id: "pilot_default", name: "飞行员", avatarId: "pilot_default_avatar" };
  const GENERIC_BATTLE_STORY_BY_CHAPTER = {
    0: { start: "指挥官，我已接入战斗系统，开始清扫敌机。", midWave: "敌机数量不多，保持火力压制。", lastWarning: "最后一波敌机，马上结束。" },
    1: { start: "敌群进入射程，指挥官，准许我开火。", midWave: "敌机开始反击，注意弹道。", bossAppear: "高能反应接近，BOSS 进入战场。", bossBurst: "BOSS 火力增强，保持移动。", lastWarning: "它撑不了多久，继续压制。" },
    2: { start: "第二空域敌军增多，准备进入交战。", midWave: "检测到重甲敌机，普通火力效率下降。", bossAppear: "重甲 BOSS 出现，建议提升破甲能力。", bossBurst: "它的装甲正在过载，小心爆发火力。", lastWarning: "集中火力，别让它拖到最后。" },
    7: { start: "第七空域是重甲防线，破甲不足会很吃力。", midWave: "敌方装甲强度异常，S 级战力会更稳定。", bossAppear: "重甲核心出现，普通火力很难击穿。", bossBurst: "它在展开重甲反击，注意弹幕。", lastWarning: "还差一点，继续压制核心。" },
    9: { start: "最终空域已开启，黑潮母舰就在前方。", midWave: "母舰护卫群出现，火力会非常密集。", bossAppear: "弥赛亚的核心投影出现了。", bossBurst: "弥赛亚进入压制模式，保持机动。", lastWarning: "最后十秒，所有火力打进核心。" }
  };
  const SPECIAL_STAGE_BATTLE_STORY = {
    "1_10": { bossAppear: "这不是普通 BOSS，后方还有更大的东西。", clear: "指挥官，天空中出现了黑潮主脑投影。" },
    "2_5": { start: "这关开始会出现重甲敌机，注意输出效率。", midWave: "普通火力打得很慢，破甲属性会越来越重要。" },
    "2_10": { start: "这架 BOSS 装甲很厚，别和它硬耗。", bossAppear: "重甲 BOSS 出现，S 级飞行员和 S 级战机会更有效。", fail: "火力不是问题，问题是破甲不够。" },
    "7_5": { start: "第七章中段开始是真正的重甲防线。", midWave: "破甲不足会明显刮痧，建议检查飞行员和战机。", fail: "这不是操作失误，是当前配置尚未突破敌方装甲。" },
    "7_10": { start: "这是第七空域最后防线，没有 S 级组合会非常吃力。", bossAppear: "重甲核心 BOSS 出现，集中火力打穿它。", fail: "建议启用 S 级飞行员和 S 级战机再来。", clear: "重甲防线被击穿，S 级战力验证完成。" },
    "9_10": { start: "最终战开始，弥赛亚就在母舰核心里。", bossAppear: "弥赛亚核心出现，所有火力集中。", clear: "黑潮核心反应正在消失。" }
  };
  const getSafePilot = (selectedPilot) => selectedPilot ? { id: selectedPilot.id || PILOT_FALLBACK_CONFIG.id, name: selectedPilot.name || PILOT_FALLBACK_CONFIG.name, avatarId: selectedPilot.avatarId || selectedPilot.src || PILOT_FALLBACK_CONFIG.avatarId } : PILOT_FALLBACK_CONFIG;
  const getStageId = (chapterIndex, stageInChapter) => chapterIndex === 0 ? `prologue_${stageInChapter}` : `${chapterIndex}_${stageInChapter}`;
  const trimBattleStoryText = (text) => !text ? "" : text.length <= BATTLE_STORY_UI_CONFIG.textMaxLength ? text : `${text.slice(0, BATTLE_STORY_UI_CONFIG.textMaxLength - 1)}…`;
  function createPilotBattleStoryEvent({ time, type, selectedPilot, text, important = false }) { const pilot = getSafePilot(selectedPilot); return !text ? null : { time, type, speakerType: "pilot", speakerId: pilot.id, speakerName: pilot.name, avatarId: pilot.avatarId, text: trimBattleStoryText(text), rawText: text, uiPosition: "bottom_left", nonBlocking: true, pauseBattle: false, blockInput: false, durationMs: important ? 2800 : 2200 }; }
  function getBattleStoryText({ chapterIndex, stageInChapter, key }) { const stageId = getStageId(chapterIndex, stageInChapter); const stageStory = scope.stageStoryConfig?.getStageBattleStory?.(chapterIndex, stageInChapter); return SPECIAL_STAGE_BATTLE_STORY[stageId]?.[key] || stageStory?.[key] || GENERIC_BATTLE_STORY_BY_CHAPTER[chapterIndex]?.[key] || GENERIC_BATTLE_STORY_BY_CHAPTER[1]?.[key] || ""; }
  function getBattleStoryTimeline({ chapterIndex, stageInChapter, selectedPilot, hasBoss = stageInChapter === 10 && chapterIndex > 0 }) { const items = [[0, "STAGE_START", "start", false], [30, "MID_WAVE", "midWave", false], [85, "LAST_WARNING", "lastWarning", false]]; if (hasBoss) items.splice(2, 0, [60, "BOSS_APPEAR", "bossAppear", true], [75, "BOSS_BURST", "bossBurst", false]); return items.map(([time, type, key, important]) => createPilotBattleStoryEvent({ time, type: BATTLE_STORY_EVENT_TYPE[type], selectedPilot, text: getBattleStoryText({ chapterIndex, stageInChapter, key }), important })).filter(Boolean); }
  function getBattleResultStoryEvent({ chapterIndex, stageInChapter, selectedPilot, isWin }) { return createPilotBattleStoryEvent({ time: 0, type: isWin ? BATTLE_STORY_EVENT_TYPE.STAGE_CLEAR : BATTLE_STORY_EVENT_TYPE.STAGE_FAIL, selectedPilot, text: getBattleStoryText({ chapterIndex, stageInChapter, key: isWin ? "clear" : "fail" }), important: true }); }
  function createBattleStoryRuntime(options) { const timeline = getBattleStoryTimeline(options); const triggered = new Set(); return { timeline, getEventsToShow(seconds) { return timeline.filter((event) => { const id = `${event.type}_${event.time}`; if (seconds < event.time || triggered.has(id)) return false; triggered.add(id); return true; }); }, reset() { triggered.clear(); } }; }
  const shouldRenderBattleStoryMessage = (message) => Boolean(message?.text);
  const api = { BATTLE_STORY_UI_CONFIG, BATTLE_STORY_EVENT_TYPE, BATTLE_STORY_TIMELINE_SECONDS, PILOT_FALLBACK_CONFIG, GENERIC_BATTLE_STORY_BY_CHAPTER, SPECIAL_STAGE_BATTLE_STORY, getSafePilot, getStageId, trimBattleStoryText, createPilotBattleStoryEvent, getBattleStoryText, getBattleStoryTimeline, getBattleResultStoryEvent, createBattleStoryRuntime, shouldRenderBattleStoryMessage };
  scope.battleStorySystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
