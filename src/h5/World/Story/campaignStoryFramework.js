(function registerCampaignStoryFramework(root) {
  const scope = root.RXGame || (root.RXGame = {});
  let script = scope.campaignStoryScript;

  if (!script && typeof require === "function") {
    try {
      script = require("./campaignStoryScript.js");
    } catch (error) {
      script = null;
    }
  }

  script = script || {};

  const STORY_META = script.STORY_META || {
    version: 0,
    title: "热血战姬",
    finalBoss: "黑潮女王·弥赛亚",
    finalBossFirstRevealStage: "1_10",
    sRankValueRevealChapter: 2,
    sRankGateChapter: 7,
    totalStageCount: 93
  };
  const STORY_TRIGGER = script.STORY_TRIGGER || {
    STAGE_START: "stage_start",
    MID_WAVE: "mid_wave",
    BOSS_APPEAR: "boss_appear",
    BOSS_BURST: "boss_burst",
    LAST_WARNING: "last_warning",
    STAGE_CLEAR: "stage_clear",
    STAGE_FAIL: "stage_fail"
  };
  const BATTLE_TIMELINE_SECONDS = script.BATTLE_TIMELINE_SECONDS || {
    stageStart: 0,
    midWave: 30,
    bossAppear: 60,
    bossBurst: 75,
    lastWarning: 85
  };
  const CHARACTERS = script.CHARACTERS || {};
  const CHAPTER_STORY_ARCS = Array.isArray(script.CHAPTER_STORY_ARCS) ? script.CHAPTER_STORY_ARCS : [];
  const STORY_SCENES = Array.isArray(script.STORY_SCENES) ? script.STORY_SCENES : [];
  const GENERIC_BATTLE_STORY_BY_CHAPTER = script.GENERIC_BATTLE_STORY_BY_CHAPTER || {};
  const SPECIAL_STAGE_STORY = script.SPECIAL_STAGE_STORY || {};

  function normalizeChapterIndex(chapterIndex) {
    const value = Math.floor(Number(chapterIndex) || 0);
    return Math.max(0, Math.min(9, value));
  }

  function normalizeStageInChapter(stageInChapter, chapterIndex) {
    const maxStage = normalizeChapterIndex(chapterIndex) === 0 ? 3 : 10;
    const value = Math.floor(Number(stageInChapter) || 1);
    return Math.max(1, Math.min(maxStage, value));
  }

  function getStageId(chapterIndex, stageInChapter) {
    const chapter = normalizeChapterIndex(chapterIndex);
    const stage = normalizeStageInChapter(stageInChapter, chapter);
    return chapter === 0 ? "prologue_" + stage : chapter + "_" + stage;
  }

  function parseStageId(stageId) {
    const value = String(stageId || "");
    if (value.indexOf("prologue_") === 0) {
      return { chapterIndex: 0, stageInChapter: normalizeStageInChapter(value.slice(9), 0) };
    }
    const parts = value.split("_");
    return {
      chapterIndex: normalizeChapterIndex(parts[0]),
      stageInChapter: normalizeStageInChapter(parts[1], parts[0])
    };
  }

  function getProgressRoot(profile) {
    profile.progress = profile.progress || {};
    profile.progress.storySeenSceneIds = Array.isArray(profile.progress.storySeenSceneIds)
      ? profile.progress.storySeenSceneIds
      : [];
    return profile.progress;
  }

  function getStageStoryScenes(options) {
    options = options || {};
    const stageId = options.stageId || getStageId(options.chapterIndex, options.stageInChapter);
    return STORY_SCENES.filter((scene) => {
      if (scene.stageId !== stageId) return false;
      return !options.trigger || scene.trigger === options.trigger;
    });
  }

  function isStorySceneSeen(profile, sceneId) {
    if (!profile || !sceneId) return false;
    return getProgressRoot(profile).storySeenSceneIds.indexOf(sceneId) >= 0;
  }

  function markStorySceneSeen(profile, sceneId) {
    if (!profile || !sceneId) return profile;
    const progress = getProgressRoot(profile);
    if (progress.storySeenSceneIds.indexOf(sceneId) < 0) progress.storySeenSceneIds.push(sceneId);
    return profile;
  }

  function getNextUnseenStoryScene(options) {
    options = options || {};
    return getStageStoryScenes(options).find((scene) => (
      !isStorySceneSeen(options.profile, scene.onceKey || scene.sceneId)
    )) || null;
  }

  function getStoryReplayScenes(options) {
    return getStageStoryScenes(options || {});
  }

  function createFallbackChapter(chapterIndex) {
    const chapter = normalizeChapterIndex(chapterIndex);
    return {
      chapterIndex: chapter,
      title: chapter === 0 ? "序章" : "第" + chapter + "章",
      shortTitle: chapter === 0 ? "序章" : "第" + chapter + "章",
      summary: "剧情数据暂不可用。",
      objective: "完成当前作战节点。",
      enemyFocus: "前线敌军。",
      progressLine: "继续推进主线。",
      unlockLine: "章节已开放。",
      clearLine: "章节作战完成。"
    };
  }

  function getChapterStory(chapterIndex) {
    const chapter = normalizeChapterIndex(chapterIndex);
    return CHAPTER_STORY_ARCS.find((item) => Number(item.chapterIndex) === chapter)
      || CHAPTER_STORY_ARCS[chapter]
      || createFallbackChapter(chapter);
  }

  function getChapterBriefingViewModel(chapterIndex) {
    const chapter = getChapterStory(chapterIndex);
    return {
      surface: "chapter_briefing",
      kicker: "剧情简报 / CAMPAIGN STORY",
      title: chapter.title,
      summary: chapter.summary,
      rows: [
        { label: "作战目标", value: chapter.objective },
        { label: "敌情判断", value: chapter.enemyFocus },
        { label: "推进状态", value: chapter.progressLine }
      ],
      unlockLine: chapter.unlockLine,
      clearLine: chapter.clearLine
    };
  }

  function getStageStory(stageIdOrChapterIndex, maybeStageInChapter) {
    const parsed = maybeStageInChapter == null
      ? parseStageId(stageIdOrChapterIndex)
      : {
          chapterIndex: normalizeChapterIndex(stageIdOrChapterIndex),
          stageInChapter: normalizeStageInChapter(maybeStageInChapter, stageIdOrChapterIndex)
        };
    const stageId = getStageId(parsed.chapterIndex, parsed.stageInChapter);
    const chapter = getChapterStory(parsed.chapterIndex);
    const generic = GENERIC_BATTLE_STORY_BY_CHAPTER[parsed.chapterIndex]
      || GENERIC_BATTLE_STORY_BY_CHAPTER[1]
      || {};
    const special = SPECIAL_STAGE_STORY[stageId] || {};
    const isFinalNode = parsed.chapterIndex > 0 && parsed.stageInChapter === 10;
    return {
      stageId,
      chapterIndex: parsed.chapterIndex,
      stageInChapter: parsed.stageInChapter,
      chapterTitle: chapter.title,
      chapterShortTitle: chapter.shortTitle,
      title: parsed.chapterIndex === 0 ? "序章 " + parsed.stageInChapter : parsed.chapterIndex + "-" + parsed.stageInChapter,
      briefing: special.briefing || (isFinalNode ? chapter.objective : chapter.summary),
      objective: special.objective || (isFinalNode ? chapter.clearLine : chapter.objective),
      enemyFocus: special.enemyFocus || chapter.enemyFocus,
      progressLine: special.progressLine || chapter.progressLine,
      start: special.start || generic.start || "",
      midWave: special.midWave || generic.midWave || "",
      bossAppear: special.bossAppear || generic.bossAppear || "",
      bossBurst: special.bossBurst || generic.bossBurst || "",
      lastWarning: special.lastWarning || generic.lastWarning || "",
      clear: special.clear || generic.clear || chapter.clearLine || "",
      fail: special.fail || generic.fail || ""
    };
  }

  function getStageBriefingViewModel(stageIdOrChapterIndex, maybeStageInChapter) {
    const story = getStageStory(stageIdOrChapterIndex, maybeStageInChapter);
    return {
      surface: "stage_briefing",
      stageId: story.stageId,
      kicker: story.stageInChapter === 10 && story.chapterIndex > 0 ? "章节决战 / BOSS NODE" : "航线节点 / MISSION NODE",
      title: story.title,
      summary: story.briefing,
      rows: [
        { label: "作战目标", value: story.objective },
        { label: "主要敌情", value: story.enemyFocus },
        { label: "剧情推进", value: story.progressLine }
      ]
    };
  }

  function getBattleStoryText(options) {
    options = options || {};
    return getStageStory(options.chapterIndex, options.stageInChapter)[options.key] || "";
  }

  function createTimelineItem(time, trigger, key, story, important) {
    const text = story[key] || "";
    if (!text) return null;
    return {
      time,
      trigger,
      key,
      stageId: story.stageId,
      chapterIndex: story.chapterIndex,
      stageInChapter: story.stageInChapter,
      speakerType: "pilot",
      text,
      important: Boolean(important)
    };
  }

  function getBattleStoryTimeline(options) {
    options = options || {};
    const chapterIndex = normalizeChapterIndex(options.chapterIndex);
    const stageInChapter = normalizeStageInChapter(options.stageInChapter, chapterIndex);
    const story = getStageStory(chapterIndex, stageInChapter);
    const items = [
      createTimelineItem(BATTLE_TIMELINE_SECONDS.stageStart, STORY_TRIGGER.STAGE_START, "start", story, false),
      createTimelineItem(BATTLE_TIMELINE_SECONDS.midWave, STORY_TRIGGER.MID_WAVE, "midWave", story, false)
    ];
    if (options.hasBoss !== false) {
      items.push(
        createTimelineItem(BATTLE_TIMELINE_SECONDS.bossAppear, STORY_TRIGGER.BOSS_APPEAR, "bossAppear", story, true),
        createTimelineItem(BATTLE_TIMELINE_SECONDS.bossBurst, STORY_TRIGGER.BOSS_BURST, "bossBurst", story, false)
      );
    }
    items.push(createTimelineItem(BATTLE_TIMELINE_SECONDS.lastWarning, STORY_TRIGGER.LAST_WARNING, "lastWarning", story, false));
    return items.filter(Boolean);
  }

  function getBattleResultStory(options) {
    options = options || {};
    const chapterIndex = normalizeChapterIndex(options.chapterIndex);
    const stageInChapter = normalizeStageInChapter(options.stageInChapter, chapterIndex);
    const story = getStageStory(chapterIndex, stageInChapter);
    const isWin = Boolean(options.isWin);
    return {
      type: isWin ? STORY_TRIGGER.STAGE_CLEAR : STORY_TRIGGER.STAGE_FAIL,
      key: isWin ? "clear" : "fail",
      stageId: story.stageId,
      chapterIndex,
      stageInChapter,
      speakerType: "pilot",
      text: isWin ? story.clear : story.fail,
      important: true
    };
  }

  function getBattleResultViewModel(options) {
    options = options || {};
    const result = getBattleResultStory(options);
    const stage = getStageStory(result.chapterIndex, result.stageInChapter);
    const chapter = getChapterStory(result.chapterIndex);
    return {
      surface: "battle_result",
      type: result.type,
      stageId: result.stageId,
      title: options.isWin ? "剧情推进" : "战术回收",
      message: result.text,
      chapterTitle: chapter.title,
      stageTitle: stage.title,
      rows: [
        { label: "章节", value: chapter.title },
        { label: "节点", value: stage.title },
        { label: options.isWin ? "推进" : "建议", value: result.text }
      ]
    };
  }

  function getNextUnseenEpilogueScene(profile) {
    if (!profile) return null;
    return STORY_SCENES.filter(function (scene) {
      return scene.trigger === "epilogue";
    }).find(function (scene) {
      return !isStorySceneSeen(profile, scene.onceKey || scene.sceneId);
    }) || null;
  }

  const api = {
    version: script.version || STORY_META.version || 0,
    STORY_META,
    STORY_TRIGGER,
    BATTLE_TIMELINE_SECONDS,
    CHARACTERS,
    CHAPTER_STORY_ARCS,
    STORY_SCENES,
    GENERIC_BATTLE_STORY_BY_CHAPTER,
    SPECIAL_STAGE_STORY,
    getStageId,
    parseStageId,
    getChapterStory,
    getStageStory,
    getChapterBriefingViewModel,
    getStageBriefingViewModel,
    getStageStoryScenes,
    getNextUnseenStoryScene,
    getNextUnseenEpilogueScene,
    markStorySceneSeen,
    isStorySceneSeen,
    getStoryReplayScenes,
    getBattleStoryText,
    getBattleStoryTimeline,
    getBattleResultStory,
    getBattleResultViewModel
  };

  scope.campaignStoryFramework = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
