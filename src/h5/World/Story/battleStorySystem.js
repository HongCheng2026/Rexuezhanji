(function registerBattleStorySystem(root) {
  const scope = root.RXGame || (root.RXGame = {});
  const campaignStory = scope.campaignStoryFramework || {};

  const BATTLE_STORY_UI_CONFIG = { position: "bottom_left", nonBlocking: true, pauseBattle: false, blockInput: false, maxVisibleMessages: 1, defaultDurationMs: 2200, importantDurationMs: 2800, fadeInMs: 120, fadeOutMs: 160, portraitSize: 96, textMaxLength: 28 };
  const BATTLE_STORY_EVENT_TYPE = { STAGE_START: "stage_start", MID_WAVE: "mid_wave", BOSS_APPEAR: "boss_appear", BOSS_BURST: "boss_burst", LAST_WARNING: "last_warning", STAGE_CLEAR: "stage_clear", STAGE_FAIL: "stage_fail" };
  const BATTLE_STORY_TIMELINE_SECONDS = campaignStory.BATTLE_TIMELINE_SECONDS || { stageStart: 0, midWave: 30, bossAppear: 60, bossBurst: 75, lastWarning: 85 };
  const PILOT_FALLBACK_CONFIG = { id: "pilot_default", name: "飞行员", avatarId: "pilot_default_avatar" };
  const GENERIC_BATTLE_STORY_BY_CHAPTER = campaignStory.GENERIC_BATTLE_STORY_BY_CHAPTER || {};
  const SPECIAL_STAGE_BATTLE_STORY = campaignStory.SPECIAL_STAGE_STORY || {};

  const getSafePilot = (selectedPilot) => selectedPilot ? { id: selectedPilot.id || PILOT_FALLBACK_CONFIG.id, name: selectedPilot.name || PILOT_FALLBACK_CONFIG.name, avatarId: selectedPilot.avatarId || selectedPilot.src || PILOT_FALLBACK_CONFIG.avatarId } : PILOT_FALLBACK_CONFIG;
  const getStageId = campaignStory.getStageId || ((chapterIndex, stageInChapter) => chapterIndex === 0 ? `prologue_${stageInChapter}` : `${chapterIndex}_${stageInChapter}`);
  const trimBattleStoryText = (text) => !text ? "" : text.length <= BATTLE_STORY_UI_CONFIG.textMaxLength ? text : `${text.slice(0, BATTLE_STORY_UI_CONFIG.textMaxLength - 1)}…`;

  function createPilotBattleStoryEvent({ time, type, selectedPilot, text, important = false }) {
    const pilot = getSafePilot(selectedPilot);
    return !text ? null : {
      time,
      type,
      speakerType: "pilot",
      speakerId: pilot.id,
      speakerName: pilot.name,
      avatarId: pilot.avatarId,
      text: trimBattleStoryText(text),
      rawText: text,
      uiPosition: "bottom_left",
      nonBlocking: true,
      pauseBattle: false,
      blockInput: false,
      durationMs: important ? BATTLE_STORY_UI_CONFIG.importantDurationMs : BATTLE_STORY_UI_CONFIG.defaultDurationMs
    };
  }

  function getBattleStoryText({ chapterIndex, stageInChapter, key }) {
    if (campaignStory.getBattleStoryText) return campaignStory.getBattleStoryText({ chapterIndex, stageInChapter, key });
    const stageId = getStageId(chapterIndex, stageInChapter);
    return SPECIAL_STAGE_BATTLE_STORY[stageId]?.[key] || GENERIC_BATTLE_STORY_BY_CHAPTER[chapterIndex]?.[key] || GENERIC_BATTLE_STORY_BY_CHAPTER[1]?.[key] || "";
  }

  function normalizeTimelineItem(item, selectedPilot) {
    if (!item) return null;
    return createPilotBattleStoryEvent({
      time: item.time || 0,
      type: item.trigger || item.type,
      selectedPilot,
      text: item.text,
      important: item.important
    });
  }

  function getBattleStoryTimeline(options) {
    options = options || {};
    if (campaignStory.getBattleStoryTimeline) {
      return campaignStory.getBattleStoryTimeline(options)
        .map((item) => normalizeTimelineItem(item, options.selectedPilot))
        .filter(Boolean);
    }
    const items = [[0, "STAGE_START", "start", false], [30, "MID_WAVE", "midWave", false], [85, "LAST_WARNING", "lastWarning", false]];
    if (options.hasBoss !== false) items.splice(2, 0, [60, "BOSS_APPEAR", "bossAppear", true], [75, "BOSS_BURST", "bossBurst", false]);
    return items.map(([time, type, key, important]) => createPilotBattleStoryEvent({ time, type: BATTLE_STORY_EVENT_TYPE[type], selectedPilot: options.selectedPilot, text: getBattleStoryText({ chapterIndex: options.chapterIndex, stageInChapter: options.stageInChapter, key }), important })).filter(Boolean);
  }

  function getBattleResultStoryEvent({ chapterIndex, stageInChapter, selectedPilot, isWin }) {
    if (campaignStory.getBattleResultStory) {
      const result = campaignStory.getBattleResultStory({ chapterIndex, stageInChapter, isWin });
      return normalizeTimelineItem(result, selectedPilot);
    }
    return createPilotBattleStoryEvent({ time: 0, type: isWin ? BATTLE_STORY_EVENT_TYPE.STAGE_CLEAR : BATTLE_STORY_EVENT_TYPE.STAGE_FAIL, selectedPilot, text: getBattleStoryText({ chapterIndex, stageInChapter, key: isWin ? "clear" : "fail" }), important: true });
  }

  function createBattleStoryRuntime(options) {
    const timeline = getBattleStoryTimeline(options);
    const triggered = new Set();
    return {
      timeline,
      getEventsToShow(seconds) {
        return timeline.filter((event) => {
          const id = `${event.type}_${event.time}`;
          if (seconds < event.time || triggered.has(id)) return false;
          triggered.add(id);
          return true;
        });
      },
      reset() { triggered.clear(); }
    };
  }

  const shouldRenderBattleStoryMessage = (message) => Boolean(message?.text);
  const api = { BATTLE_STORY_UI_CONFIG, BATTLE_STORY_EVENT_TYPE, BATTLE_STORY_TIMELINE_SECONDS, PILOT_FALLBACK_CONFIG, GENERIC_BATTLE_STORY_BY_CHAPTER, SPECIAL_STAGE_BATTLE_STORY, getSafePilot, getStageId, trimBattleStoryText, createPilotBattleStoryEvent, getBattleStoryText, getBattleStoryTimeline, getBattleResultStoryEvent, createBattleStoryRuntime, shouldRenderBattleStoryMessage };
  scope.battleStorySystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
