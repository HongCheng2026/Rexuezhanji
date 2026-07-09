```js
// stageStoryConfig.js

export const STORY_SPEAKER_TYPE = {
  CURRENT_PILOT: "current_pilot",
  SYSTEM: "system",
  ENEMY: "enemy"
};

export const STORY_EVENT_TYPE = {
  STAGE_START: "stage_start",
  MID_WAVE: "mid_wave",
  BOSS_APPEAR: "boss_appear",
  BOSS_BURST: "boss_burst",
  LAST_WARNING: "last_warning",
  STAGE_CLEAR: "stage_clear",
  STAGE_FAIL: "stage_fail"
};

export const STORY_META = {
  "title": "热血战姬",
  "finalBoss": "黑潮女王·弥赛亚",
  "finalBossFirstRevealStage": "1_10",
  "sRankValueRevealChapter": 2,
  "sRankGateChapter": 7,
  "totalStageCount": 93
};

export const CHAPTER_STORY_CONFIG = {
  "0": {
    "chapterTitle": "序章：苍穹启动",
    "summary": "玩家以新任空战指挥官身份接入战姬作战系统，完成第一次出击，并确认黑潮军团正在入侵人类空域。",
    "enemyFeature": "低威胁小型敌机",
    "boss": "无",
    "unlockValue": "教学、基础战斗、当前飞行员通讯",
    "opening": [
      "苍穹防线正在失守。",
      "你被临时任命为空战指挥官，接管战姬小队。",
      "第一名飞行员已经完成接入，等待你的出击指令。"
    ],
    "ending": [
      "序章空域清扫完成。",
      "远方出现黑潮舰队信号，人类空域正式进入战争状态。"
    ]
  },
  "1": {
    "chapterTitle": "第一章：城市外围夺回战",
    "summary": "战姬小队夺回城市外围空域，玩家获得第一次爽感推进；1-10结尾，最终BOSS黑潮女王·弥赛亚首次现身。",
    "enemyFeature": "普通敌群、射击敌机、第一台章节BOSS",
    "boss": "外围压制机·黑鸦",
    "unlockValue": "明确最终目标：弥赛亚",
    "opening": [
      "黑潮军团正在压向城市外围。",
      "指挥官，战姬小队将从低空航线切入，夺回第一片空域。"
    ],
    "ending": [
      "外围BOSS被击落后，天空中出现巨大黑色投影。",
      "黑潮女王·弥赛亚扫描了玩家的战机，并宣告人类已经失去天空。"
    ]
  },
  "2": {
    "chapterTitle": "第二章：重甲空域",
    "summary": "敌方重甲敌机出现，玩家在第二章明确知道S级飞行员和S级战机的重要性。",
    "enemyFeature": "重甲敌机、护盾单位、重甲BOSS",
    "boss": "重甲核心机·铁幕",
    "unlockValue": "强调S级飞行员与S级战机的破甲价值",
    "opening": [
      "黑潮军团开始投放重甲敌机。",
      "普通火力仍能推进，但面对后续战场会明显吃力。",
      "系统提示：S级飞行员与S级战机拥有更高破甲能力。"
    ],
    "ending": [
      "铁幕被击退，但黑潮重甲体系已经展开。",
      "飞行员提醒指挥官：后期必须准备S级战力。"
    ]
  },
  "3": {
    "chapterTitle": "第三章：沦陷空港",
    "summary": "空港被黑潮控制，敌机数量和火力密度上升，玩家开始感受到持续强化的必要性。",
    "enemyFeature": "射击敌机增多、多方向入场",
    "boss": "空港拦截机·灰隼",
    "unlockValue": "推动战机强化",
    "opening": [
      "城市北部空港已经沦陷。",
      "敌机将从多方向进入战场，清理效率决定推进速度。"
    ],
    "ending": [
      "空港航线被重新打开。",
      "黑潮主力舰队的位置被短暂捕获。"
    ]
  },
  "4": {
    "chapterTitle": "第四章：护盾量产线",
    "summary": "护盾敌机被量产，玩家进一步理解破甲和强化的重要性。",
    "enemyFeature": "护盾敌机、高减伤单位",
    "boss": "护盾母机·蓝棘",
    "unlockValue": "强化破甲属性",
    "opening": [
      "黑潮在废弃工业区建立护盾量产线。",
      "护盾单位会削弱普通火力，破甲属性开始变得关键。"
    ],
    "ending": [
      "护盾母机被摧毁。",
      "弥赛亚开始将玩家标记为可成长威胁。"
    ]
  },
  "5": {
    "chapterTitle": "第五章：精英猎杀令",
    "summary": "黑潮派出精英战机针对战姬小队，玩家需要提升飞行员与战机的综合强度。",
    "enemyFeature": "精英战机、锁定火力",
    "boss": "猎杀号令机·赤蝎",
    "unlockValue": "推动飞行员养成",
    "opening": [
      "弥赛亚发布猎杀令。",
      "黑潮精英战机开始针对战姬小队的飞行轨迹。"
    ],
    "ending": [
      "猎杀编队被击穿。",
      "战姬小队夺回中部高空通道。"
    ]
  },
  "6": {
    "chapterTitle": "第六章：主力舰队压境",
    "summary": "黑潮主力舰队压境，弹幕密度和组合敌人明显增强，玩家迎来第一轮综合战力检测。",
    "enemyFeature": "组合敌群、弹幕压力、精英编队",
    "boss": "主力舰护卫机·雷铠",
    "unlockValue": "检测综合战力",
    "opening": [
      "黑潮主力舰队已经进入城市上空。",
      "这不是清扫战，而是正面拦截。"
    ],
    "ending": [
      "主力舰队护卫线被撕开。",
      "第七空域的重甲核心防线暴露。"
    ]
  },
  "7": {
    "chapterTitle": "第七章：重甲核心防线",
    "summary": "第七章是S级门槛章节，7-5开始显著压迫，7-10需要S级飞行员和S级战机才能稳定突破。",
    "enemyFeature": "高减伤重甲核心、护盾单位、穿甲检测",
    "boss": "重甲核心·黑曜王座",
    "unlockValue": "S飞行员+S战机真正生效",
    "opening": [
      "第七空域覆盖着黑潮重甲核心防线。",
      "破甲不足的战机，会在这里被拖垮。"
    ],
    "ending": [
      "黑曜王座被击穿。",
      "S级飞行员与S级战机的价值被完全验证。"
    ]
  },
  "8": {
    "chapterTitle": "第八章：反攻前线基地",
    "summary": "玩家突破重甲防线后开始反攻，节奏回到爽感推进，同时为最终战铺垫。",
    "enemyFeature": "前线基地防卫群、混合敌机",
    "boss": "基地防卫核·白烬",
    "unlockValue": "爽感回流、反攻情绪",
    "opening": [
      "黑潮前线基地暴露在攻击航线内。",
      "指挥官，反攻开始。"
    ],
    "ending": [
      "前线基地被摧毁。",
      "通往黑潮母舰的航线已经打开。"
    ]
  },
  "9": {
    "chapterTitle": "第九章：黑潮母舰决战",
    "summary": "最终章，玩家攻入黑潮母舰核心，对决黑潮女王·弥赛亚。",
    "enemyFeature": "最高火力密度、母舰护卫、最终BOSS",
    "boss": "黑潮女王·弥赛亚",
    "unlockValue": "终局挑战",
    "opening": [
      "黑潮母舰悬停在城市最高空域。",
      "弥赛亚的核心就在母舰内部。"
    ],
    "ending": [
      "弥赛亚核心反应消失。",
      "人类重新夺回天空。"
    ]
  }
};

export const STAGE_STORY_CONFIG = {
  "prologue_1": {
    "id": "prologue_1",
    "chapterIndex": 0,
    "stageInChapter": 1,
    "chapterTitle": "序章：苍穹启动",
    "title": "系统接入",
    "mission": "完成系统接入",
    "unlockAfter": null,
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "指挥官，我已接入系统。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "指挥官，我已接入系统。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "基础火控正常，可以继续推进。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后一波，稳住。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "系统接入完成，等待下一步指令。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "系统还不稳定，重新调整后再来。"
      }
    ]
  },
  "prologue_2": {
    "id": "prologue_2",
    "chapterIndex": 0,
    "stageInChapter": 2,
    "chapterTitle": "序章：苍穹启动",
    "title": "低空清扫",
    "mission": "清扫低空敌机",
    "unlockAfter": "prologue_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "低空敌机进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "低空敌机进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机正在分散，保持压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后一波，稳住。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "低空清扫完成，航线打开。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "敌机没有清完，建议重新出击。"
      }
    ]
  },
  "prologue_3": {
    "id": "prologue_3",
    "chapterIndex": 0,
    "stageInChapter": 3,
    "chapterTitle": "序章：苍穹启动",
    "title": "黑潮警报",
    "mission": "确认黑潮入侵信号",
    "unlockAfter": "prologue_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "黑潮信号增强，准备迎战。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "黑潮信号增强，准备迎战。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "这不是普通演习，敌军在增多。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后一波，稳住。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "确认黑潮入侵，人类空域进入战备。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "指挥官，火力节奏还需要适应。"
      }
    ]
  },
  "1_1": {
    "id": "1_1",
    "chapterIndex": 1,
    "stageInChapter": 1,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "外围航线",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "prologue_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "城市外围夺回战空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "城市外围夺回战空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "1_2": {
    "id": "1_2",
    "chapterIndex": 1,
    "stageInChapter": 2,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "残骸街区",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "1_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "城市外围夺回战空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "城市外围夺回战空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "1_3": {
    "id": "1_3",
    "chapterIndex": 1,
    "stageInChapter": 3,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "低空突围",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "1_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "城市外围夺回战空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "城市外围夺回战空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "1_4": {
    "id": "1_4",
    "chapterIndex": 1,
    "stageInChapter": 4,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "压制阵线",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "1_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "城市外围夺回战空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "城市外围夺回战空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "1_5": {
    "id": "1_5",
    "chapterIndex": 1,
    "stageInChapter": 5,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "火力测试",
    "mission": "击破新型敌机，确认敌方机制",
    "unlockAfter": "1_4",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌方机制确认，别让它拖住节奏。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "击破这批敌机，就能继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "1_6": {
    "id": "1_6",
    "chapterIndex": 1,
    "stageInChapter": 6,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "敌群增援",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "1_5",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "1_7": {
    "id": "1_7",
    "chapterIndex": 1,
    "stageInChapter": 7,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "斜翼夹击",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "1_6",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "1_8": {
    "id": "1_8",
    "chapterIndex": 1,
    "stageInChapter": 8,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "高楼空战",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "1_7",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "1_9": {
    "id": "1_9",
    "chapterIndex": 1,
    "stageInChapter": 9,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "黑鸦前哨",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "1_8",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "1_10": {
    "id": "1_10",
    "chapterIndex": 1,
    "stageInChapter": 10,
    "chapterTitle": "第一章：城市外围夺回战",
    "title": "黑鸦压境",
    "mission": "击败章节BOSS",
    "unlockAfter": "1_9",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "外围压制机·黑鸦即将出现。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "外围压制机·黑鸦即将出现。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "护卫机正在集结，清出攻击窗口。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "那架BOSS背后还有东西。"
      },
      {
        "time": 75,
        "type": "boss_burst",
        "speakerType": "current_pilot",
        "text": "它在上传我们的战斗数据。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后十秒，所有火力压上。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "enemy",
        "speakerName": "弥赛亚",
        "text": "人类的天空，已经不属于人类。"
      },
      {
        "speakerType": "system",
        "speakerName": "系统",
        "text": "黑潮主脑识别完成，威胁等级未知。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_1": {
    "id": "2_1",
    "chapterIndex": 2,
    "stageInChapter": 1,
    "chapterTitle": "第二章：重甲空域",
    "title": "北部空域",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "1_10",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲空域空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "重甲空域空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_2": {
    "id": "2_2",
    "chapterIndex": 2,
    "stageInChapter": 2,
    "chapterTitle": "第二章：重甲空域",
    "title": "装甲残影",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "2_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲空域空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "重甲空域空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_3": {
    "id": "2_3",
    "chapterIndex": 2,
    "stageInChapter": 3,
    "chapterTitle": "第二章：重甲空域",
    "title": "铁灰航线",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "2_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲空域空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "重甲空域空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_4": {
    "id": "2_4",
    "chapterIndex": 2,
    "stageInChapter": 4,
    "chapterTitle": "第二章：重甲空域",
    "title": "重甲试探",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "2_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲空域空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "重甲空域空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_5": {
    "id": "2_5",
    "chapterIndex": 2,
    "stageInChapter": 5,
    "chapterTitle": "第二章：重甲空域",
    "title": "重甲初现",
    "mission": "击破新型敌机，确认敌方机制",
    "unlockAfter": "2_4",
    "preStage": [
      {
        "speakerType": "system",
        "speakerName": "系统",
        "text": "检测到重甲敌机。"
      },
      {
        "speakerType": "current_pilot",
        "text": "指挥官，普通火力会变慢。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "重甲敌机出现，准备测试火力。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "破甲属性会越来越重要。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "打穿装甲层，别让它拖住。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "重甲单位已击破，但后面会更多。"
      },
      {
        "speakerType": "system",
        "speakerName": "系统",
        "text": "建议培养高破甲飞行员与战机。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_6": {
    "id": "2_6",
    "chapterIndex": 2,
    "stageInChapter": 6,
    "chapterTitle": "第二章：重甲空域",
    "title": "护盾编队",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "2_5",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_7": {
    "id": "2_7",
    "chapterIndex": 2,
    "stageInChapter": 7,
    "chapterTitle": "第二章：重甲空域",
    "title": "钢翼夹击",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "2_6",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_8": {
    "id": "2_8",
    "chapterIndex": 2,
    "stageInChapter": 8,
    "chapterTitle": "第二章：重甲空域",
    "title": "破甲缺口",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "2_7",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_9": {
    "id": "2_9",
    "chapterIndex": 2,
    "stageInChapter": 9,
    "chapterTitle": "第二章：重甲空域",
    "title": "铁幕前哨",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "2_8",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "2_10": {
    "id": "2_10",
    "chapterIndex": 2,
    "stageInChapter": 10,
    "chapterTitle": "第二章：重甲空域",
    "title": "铁幕核心",
    "mission": "击败章节BOSS",
    "unlockAfter": "2_9",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲核心机·铁幕即将出现。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "这架BOSS装甲很厚。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "护卫机正在集结，清出攻击窗口。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "重甲BOSS出现，破甲不足会超时。"
      },
      {
        "time": 75,
        "type": "boss_burst",
        "speakerType": "current_pilot",
        "text": "它的装甲层在反击。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "集中火力，打穿核心。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "铁幕被击退了。"
      },
      {
        "speakerType": "system",
        "speakerName": "系统",
        "text": "后续重甲单位将持续增加。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "指挥官，不是操作问题，是破甲不够。"
      },
      {
        "speakerType": "system",
        "speakerName": "系统",
        "text": "S级飞行员与S级战机拥有更高穿甲。"
      }
    ]
  },
  "3_1": {
    "id": "3_1",
    "chapterIndex": 3,
    "stageInChapter": 1,
    "chapterTitle": "第三章：沦陷空港",
    "title": "空港入口",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "2_10",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "沦陷空港空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "沦陷空港空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "3_2": {
    "id": "3_2",
    "chapterIndex": 3,
    "stageInChapter": 2,
    "chapterTitle": "第三章：沦陷空港",
    "title": "跑道残骸",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "3_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "沦陷空港空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "沦陷空港空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "3_3": {
    "id": "3_3",
    "chapterIndex": 3,
    "stageInChapter": 3,
    "chapterTitle": "第三章：沦陷空港",
    "title": "塔台火线",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "3_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "沦陷空港空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "沦陷空港空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "3_4": {
    "id": "3_4",
    "chapterIndex": 3,
    "stageInChapter": 4,
    "chapterTitle": "第三章：沦陷空港",
    "title": "机库清扫",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "3_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "沦陷空港空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "沦陷空港空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "3_5": {
    "id": "3_5",
    "chapterIndex": 3,
    "stageInChapter": 5,
    "chapterTitle": "第三章：沦陷空港",
    "title": "空港反扑",
    "mission": "击破新型敌机，确认敌方机制",
    "unlockAfter": "3_4",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌方机制确认，别让它拖住节奏。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "击破这批敌机，就能继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "3_6": {
    "id": "3_6",
    "chapterIndex": 3,
    "stageInChapter": 6,
    "chapterTitle": "第三章：沦陷空港",
    "title": "多线增援",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "3_5",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "3_7": {
    "id": "3_7",
    "chapterIndex": 3,
    "stageInChapter": 7,
    "chapterTitle": "第三章：沦陷空港",
    "title": "灰隼巡航",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "3_6",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "3_8": {
    "id": "3_8",
    "chapterIndex": 3,
    "stageInChapter": 8,
    "chapterTitle": "第三章：沦陷空港",
    "title": "侧翼封锁",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "3_7",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "3_9": {
    "id": "3_9",
    "chapterIndex": 3,
    "stageInChapter": 9,
    "chapterTitle": "第三章：沦陷空港",
    "title": "灰隼前哨",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "3_8",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "3_10": {
    "id": "3_10",
    "chapterIndex": 3,
    "stageInChapter": 10,
    "chapterTitle": "第三章：沦陷空港",
    "title": "灰隼拦截",
    "mission": "击败章节BOSS",
    "unlockAfter": "3_9",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "空港拦截机·灰隼即将出现。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "空港拦截机·灰隼即将出现。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "护卫机正在集结，清出攻击窗口。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "空港拦截机·灰隼进入战场。"
      },
      {
        "time": 75,
        "type": "boss_burst",
        "speakerType": "current_pilot",
        "text": "BOSS火力增强，保持移动。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后十秒，所有火力压上。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_1": {
    "id": "4_1",
    "chapterIndex": 4,
    "stageInChapter": 1,
    "chapterTitle": "第四章：护盾量产线",
    "title": "工业废区",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "3_10",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "护盾量产线空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "护盾量产线空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_2": {
    "id": "4_2",
    "chapterIndex": 4,
    "stageInChapter": 2,
    "chapterTitle": "第四章：护盾量产线",
    "title": "护盾残响",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "4_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "护盾量产线空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "护盾量产线空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_3": {
    "id": "4_3",
    "chapterIndex": 4,
    "stageInChapter": 3,
    "chapterTitle": "第四章：护盾量产线",
    "title": "蓝光装甲",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "4_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "护盾量产线空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "护盾量产线空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_4": {
    "id": "4_4",
    "chapterIndex": 4,
    "stageInChapter": 4,
    "chapterTitle": "第四章：护盾量产线",
    "title": "量产机群",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "4_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "护盾量产线空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "护盾量产线空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_5": {
    "id": "4_5",
    "chapterIndex": 4,
    "stageInChapter": 5,
    "chapterTitle": "第四章：护盾量产线",
    "title": "护盾样本",
    "mission": "击破新型敌机，确认敌方机制",
    "unlockAfter": "4_4",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "护盾敌机出现，火力会被削弱。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "先击穿护盾，再打本体。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "击破这批敌机，就能继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_6": {
    "id": "4_6",
    "chapterIndex": 4,
    "stageInChapter": 6,
    "chapterTitle": "第四章：护盾量产线",
    "title": "装甲工线",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "4_5",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_7": {
    "id": "4_7",
    "chapterIndex": 4,
    "stageInChapter": 7,
    "chapterTitle": "第四章：护盾量产线",
    "title": "高压弹幕",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "4_6",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_8": {
    "id": "4_8",
    "chapterIndex": 4,
    "stageInChapter": 8,
    "chapterTitle": "第四章：护盾量产线",
    "title": "蓝棘护卫",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "4_7",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_9": {
    "id": "4_9",
    "chapterIndex": 4,
    "stageInChapter": 9,
    "chapterTitle": "第四章：护盾量产线",
    "title": "核心防门",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "4_8",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "4_10": {
    "id": "4_10",
    "chapterIndex": 4,
    "stageInChapter": 10,
    "chapterTitle": "第四章：护盾量产线",
    "title": "蓝棘母机",
    "mission": "击败章节BOSS",
    "unlockAfter": "4_9",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "护盾母机·蓝棘即将出现。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "护盾母机·蓝棘即将出现。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "护卫机正在集结，清出攻击窗口。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "护盾母机·蓝棘进入战场。"
      },
      {
        "time": 75,
        "type": "boss_burst",
        "speakerType": "current_pilot",
        "text": "BOSS火力增强，保持移动。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后十秒，所有火力压上。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_1": {
    "id": "5_1",
    "chapterIndex": 5,
    "stageInChapter": 1,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "猎杀信号",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "4_10",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "精英猎杀令空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "精英猎杀令空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_2": {
    "id": "5_2",
    "chapterIndex": 5,
    "stageInChapter": 2,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "赤色航迹",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "5_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "精英猎杀令空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "精英猎杀令空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_3": {
    "id": "5_3",
    "chapterIndex": 5,
    "stageInChapter": 3,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "精英尾随",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "5_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "精英猎杀令空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "精英猎杀令空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_4": {
    "id": "5_4",
    "chapterIndex": 5,
    "stageInChapter": 4,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "锁定警报",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "5_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "精英猎杀令空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "精英猎杀令空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_5": {
    "id": "5_5",
    "chapterIndex": 5,
    "stageInChapter": 5,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "猎杀小队",
    "mission": "击破新型敌机，确认敌方机制",
    "unlockAfter": "5_4",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌方机制确认，别让它拖住节奏。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "击破这批敌机，就能继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_6": {
    "id": "5_6",
    "chapterIndex": 5,
    "stageInChapter": 6,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "赤蝎之眼",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "5_5",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_7": {
    "id": "5_7",
    "chapterIndex": 5,
    "stageInChapter": 7,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "高空追击",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "5_6",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_8": {
    "id": "5_8",
    "chapterIndex": 5,
    "stageInChapter": 8,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "精英合围",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "5_7",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_9": {
    "id": "5_9",
    "chapterIndex": 5,
    "stageInChapter": 9,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "赤蝎前哨",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "5_8",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "5_10": {
    "id": "5_10",
    "chapterIndex": 5,
    "stageInChapter": 10,
    "chapterTitle": "第五章：精英猎杀令",
    "title": "赤蝎号令",
    "mission": "击败章节BOSS",
    "unlockAfter": "5_9",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "猎杀号令机·赤蝎即将出现。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "猎杀号令机·赤蝎即将出现。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "护卫机正在集结，清出攻击窗口。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "猎杀号令机·赤蝎进入战场。"
      },
      {
        "time": 75,
        "type": "boss_burst",
        "speakerType": "current_pilot",
        "text": "BOSS火力增强，保持移动。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后十秒，所有火力压上。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_1": {
    "id": "6_1",
    "chapterIndex": 6,
    "stageInChapter": 1,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "舰队阴影",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "5_10",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "主力舰队压境空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "主力舰队压境空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_2": {
    "id": "6_2",
    "chapterIndex": 6,
    "stageInChapter": 2,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "主力前锋",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "6_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "主力舰队压境空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "主力舰队压境空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_3": {
    "id": "6_3",
    "chapterIndex": 6,
    "stageInChapter": 3,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "雷云航线",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "6_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "主力舰队压境空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "主力舰队压境空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_4": {
    "id": "6_4",
    "chapterIndex": 6,
    "stageInChapter": 4,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "压境火力",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "6_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "主力舰队压境空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "主力舰队压境空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_5": {
    "id": "6_5",
    "chapterIndex": 6,
    "stageInChapter": 5,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "舰队护卫",
    "mission": "击破新型敌机，确认敌方机制",
    "unlockAfter": "6_4",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌方机制确认，别让它拖住节奏。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "击破这批敌机，就能继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_6": {
    "id": "6_6",
    "chapterIndex": 6,
    "stageInChapter": 6,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "组合弹幕",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "6_5",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_7": {
    "id": "6_7",
    "chapterIndex": 6,
    "stageInChapter": 7,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "雷铠突击",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "6_6",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_8": {
    "id": "6_8",
    "chapterIndex": 6,
    "stageInChapter": 8,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "火网封锁",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "6_7",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_9": {
    "id": "6_9",
    "chapterIndex": 6,
    "stageInChapter": 9,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "主舰门廊",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "6_8",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "6_10": {
    "id": "6_10",
    "chapterIndex": 6,
    "stageInChapter": 10,
    "chapterTitle": "第六章：主力舰队压境",
    "title": "雷铠护卫",
    "mission": "击败章节BOSS",
    "unlockAfter": "6_9",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "主力舰护卫机·雷铠即将出现。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "主力舰护卫机·雷铠即将出现。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "护卫机正在集结，清出攻击窗口。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "主力舰护卫机·雷铠进入战场。"
      },
      {
        "time": 75,
        "type": "boss_burst",
        "speakerType": "current_pilot",
        "text": "BOSS火力增强，保持移动。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后十秒，所有火力压上。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "7_1": {
    "id": "7_1",
    "chapterIndex": 7,
    "stageInChapter": 1,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "重甲边界",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "6_10",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲核心防线空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "重甲核心防线空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "7_2": {
    "id": "7_2",
    "chapterIndex": 7,
    "stageInChapter": 2,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "黑曜残阵",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "7_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲核心防线空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "重甲核心防线空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "7_3": {
    "id": "7_3",
    "chapterIndex": 7,
    "stageInChapter": 3,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "装甲封锁",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "7_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲核心防线空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "重甲核心防线空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "7_4": {
    "id": "7_4",
    "chapterIndex": 7,
    "stageInChapter": 4,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "核心外环",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "7_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲核心防线空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "重甲核心防线空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "7_5": {
    "id": "7_5",
    "chapterIndex": 7,
    "stageInChapter": 5,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "重甲门槛",
    "mission": "击破新型敌机，确认敌方机制",
    "unlockAfter": "7_4",
    "preStage": [
      {
        "speakerType": "system",
        "speakerName": "系统",
        "text": "重甲核心防线启动。"
      },
      {
        "speakerType": "current_pilot",
        "text": "指挥官，这里会真正考验破甲。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "第七章中段是真正门槛。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "破甲不足会明显刮痧。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "重甲核心出现。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "还差一点，继续压制。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "这不是普通装甲，建议换S级组合。"
      }
    ]
  },
  "7_6": {
    "id": "7_6",
    "chapterIndex": 7,
    "stageInChapter": 6,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "黑曜火线",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "7_5",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "7_7": {
    "id": "7_7",
    "chapterIndex": 7,
    "stageInChapter": 7,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "穿甲试炼",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "7_6",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "7_8": {
    "id": "7_8",
    "chapterIndex": 7,
    "stageInChapter": 8,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "王座护卫",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "7_7",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "7_9": {
    "id": "7_9",
    "chapterIndex": 7,
    "stageInChapter": 9,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "核心门前",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "7_8",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "7_10": {
    "id": "7_10",
    "chapterIndex": 7,
    "stageInChapter": 10,
    "chapterTitle": "第七章：重甲核心防线",
    "title": "黑曜王座",
    "mission": "击败章节BOSS",
    "unlockAfter": "7_9",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "重甲核心·黑曜王座即将出现。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "没有S级组合会非常吃力。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "S级穿甲能打开缺口。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "黑曜王座出现，集中火力。"
      },
      {
        "time": 75,
        "type": "boss_burst",
        "speakerType": "current_pilot",
        "text": "它在强行压制空域。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "打穿它，重甲防线就会崩。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "重甲防线被击穿了。"
      },
      {
        "speakerType": "system",
        "speakerName": "系统",
        "text": "S级战力验证完成。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "建议启用S级飞行员和S级战机。"
      }
    ]
  },
  "8_1": {
    "id": "8_1",
    "chapterIndex": 8,
    "stageInChapter": 1,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "反攻起点",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "7_10",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "反攻前线基地空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "反攻前线基地空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "8_2": {
    "id": "8_2",
    "chapterIndex": 8,
    "stageInChapter": 2,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "基地外墙",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "8_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "反攻前线基地空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "反攻前线基地空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "8_3": {
    "id": "8_3",
    "chapterIndex": 8,
    "stageInChapter": 3,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "白烬哨塔",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "8_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "反攻前线基地空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "反攻前线基地空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "8_4": {
    "id": "8_4",
    "chapterIndex": 8,
    "stageInChapter": 4,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "前线机库",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "8_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "反攻前线基地空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "反攻前线基地空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "8_5": {
    "id": "8_5",
    "chapterIndex": 8,
    "stageInChapter": 5,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "基地防卫",
    "mission": "击破新型敌机，确认敌方机制",
    "unlockAfter": "8_4",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌方机制确认，别让它拖住节奏。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "击破这批敌机，就能继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "8_6": {
    "id": "8_6",
    "chapterIndex": 8,
    "stageInChapter": 6,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "炮台清扫",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "8_5",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "8_7": {
    "id": "8_7",
    "chapterIndex": 8,
    "stageInChapter": 7,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "白烬中枢",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "8_6",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "8_8": {
    "id": "8_8",
    "chapterIndex": 8,
    "stageInChapter": 8,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "反扑航线",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "8_7",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "8_9": {
    "id": "8_9",
    "chapterIndex": 8,
    "stageInChapter": 9,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "核心入口",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "8_8",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "8_10": {
    "id": "8_10",
    "chapterIndex": 8,
    "stageInChapter": 10,
    "chapterTitle": "第八章：反攻前线基地",
    "title": "白烬防卫核",
    "mission": "击败章节BOSS",
    "unlockAfter": "8_9",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "基地防卫核·白烬即将出现。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "基地防卫核·白烬即将出现。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "护卫机正在集结，清出攻击窗口。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "基地防卫核·白烬进入战场。"
      },
      {
        "time": 75,
        "type": "boss_burst",
        "speakerType": "current_pilot",
        "text": "BOSS火力增强，保持移动。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后十秒，所有火力压上。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_1": {
    "id": "9_1",
    "chapterIndex": 9,
    "stageInChapter": 1,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "母舰外环",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "8_10",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "黑潮母舰决战空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "黑潮母舰决战空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_2": {
    "id": "9_2",
    "chapterIndex": 9,
    "stageInChapter": 2,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "黑潮护卫",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "9_1",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "黑潮母舰决战空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "黑潮母舰决战空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_3": {
    "id": "9_3",
    "chapterIndex": 9,
    "stageInChapter": 3,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "核心航道",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "9_2",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "黑潮母舰决战空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "黑潮母舰决战空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_4": {
    "id": "9_4",
    "chapterIndex": 9,
    "stageInChapter": 4,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "弥赛亚凝视",
    "mission": "清扫敌群，夺回推进航线",
    "unlockAfter": "9_3",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "黑潮母舰决战空域已进入射程。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "黑潮母舰决战空域已进入射程。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机开始反击，保持火力压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "航线快打开了，继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_5": {
    "id": "9_5",
    "chapterIndex": 9,
    "stageInChapter": 5,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "母舰防线",
    "mission": "击破新型敌机，确认敌方机制",
    "unlockAfter": "9_4",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "前方出现新型敌机，注意变化。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌方机制确认，别让它拖住节奏。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "击破这批敌机，就能继续推进。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_6": {
    "id": "9_6",
    "chapterIndex": 9,
    "stageInChapter": 6,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "全域压制",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "9_5",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_7": {
    "id": "9_7",
    "chapterIndex": 9,
    "stageInChapter": 7,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "核心外壳",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "9_6",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_8": {
    "id": "9_8",
    "chapterIndex": 9,
    "stageInChapter": 8,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "最终航线",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "9_7",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_9": {
    "id": "9_9",
    "chapterIndex": 9,
    "stageInChapter": 9,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "女王门前",
    "mission": "突破强化敌群，打开BOSS航线",
    "unlockAfter": "9_8",
    "preStage": [
      {
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "敌群强度上升，准备进入压力区。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "敌机火力变密，优先清理射击单位。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "BOSS航线即将打开，别漏怪。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "current_pilot",
        "text": "目标清除，继续推进。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  },
  "9_10": {
    "id": "9_10",
    "chapterIndex": 9,
    "stageInChapter": 10,
    "chapterTitle": "第九章：黑潮母舰决战",
    "title": "弥赛亚核心",
    "mission": "击败章节BOSS",
    "unlockAfter": "9_9",
    "preStage": [
      {
        "speakerType": "enemy",
        "speakerName": "弥赛亚",
        "text": "指挥官，你终于来到这里。"
      },
      {
        "speakerType": "current_pilot",
        "text": "别听它的，所有火力准备。"
      }
    ],
    "battle": [
      {
        "time": 0,
        "type": "stage_start",
        "speakerType": "current_pilot",
        "text": "最终战开始，弥赛亚就在前方。"
      },
      {
        "time": 30,
        "type": "mid_wave",
        "speakerType": "current_pilot",
        "text": "母舰护卫群正在重组。"
      },
      {
        "time": 60,
        "type": "boss_appear",
        "speakerType": "current_pilot",
        "text": "弥赛亚核心出现，集中火力。"
      },
      {
        "time": 75,
        "type": "boss_burst",
        "speakerType": "current_pilot",
        "text": "弥赛亚释放全域压制。"
      },
      {
        "time": 85,
        "type": "last_warning",
        "speakerType": "current_pilot",
        "text": "最后一轮，把天空夺回来。"
      }
    ],
    "afterClear": [
      {
        "speakerType": "enemy",
        "speakerName": "弥赛亚",
        "text": "天空……不该回到人类手里。"
      },
      {
        "speakerType": "current_pilot",
        "text": "指挥官，我们赢了。"
      },
      {
        "speakerType": "system",
        "speakerName": "系统",
        "text": "黑潮核心反应消失。"
      }
    ],
    "afterFail": [
      {
        "speakerType": "current_pilot",
        "text": "火力不足，建议强化后再来。"
      }
    ]
  }
};

export function getStageId(chapterIndex, stageInChapter) {
  if (chapterIndex === 0) {
    return `prologue_${stageInChapter}`;
  }

  return `${chapterIndex}_${stageInChapter}`;
}

export function getStageStoryConfig(chapterIndex, stageInChapter) {
  const stageId = getStageId(chapterIndex, stageInChapter);
  return STAGE_STORY_CONFIG[stageId] || null;
}

export function getChapterStoryConfig(chapterIndex) {
  return CHAPTER_STORY_CONFIG[chapterIndex] || null;
}

export function getStagePreStory(chapterIndex, stageInChapter) {
  const config = getStageStoryConfig(chapterIndex, stageInChapter);
  return config ? config.preStage : [];
}

export function getStageBattleStory(chapterIndex, stageInChapter) {
  const config = getStageStoryConfig(chapterIndex, stageInChapter);
  return config ? config.battle : [];
}

export function getStageResultStory({ chapterIndex, stageInChapter, isWin }) {
  const config = getStageStoryConfig(chapterIndex, stageInChapter);

  if (!config) {
    return [];
  }

  return isWin ? config.afterClear : config.afterFail;
}

export function getAllStageStoryConfigs() {
  return Object.values(STAGE_STORY_CONFIG);
}
```