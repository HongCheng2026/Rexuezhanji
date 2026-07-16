(function registerCampaignStoryScript(root) {
  const scope = root.RXGame || (root.RXGame = {});

  function storyLine(speakerId, speakerName, text, options = {}) {
    const isSystem = speakerId === "system";
    const isMessiah = speakerId === "messiah";
    return {
      speakerId,
      speakerName,
      text,
      side: options.side || (isSystem ? "center" : isMessiah ? "right" : "left"),
      emotion: options.emotion || (isMessiah ? "glitch" : "normal"),
      mode: options.mode || (isSystem ? "system" : isMessiah ? "messiah" : "character"),
      pauseMs: Math.max(0, Number(options.pauseMs) || 900),
      narrator: Boolean(options.narrator || isSystem)
    };
  }

  function storyScene(sceneId, chapterIndex, stageInChapter, trigger, title, mood, lines) {
    return {
      sceneId,
      onceKey: sceneId,
      stageId: chapterIndex === 0 ? "prologue_" + stageInChapter : chapterIndex + "_" + stageInChapter,
      chapterIndex,
      stageInChapter,
      trigger,
      title,
      mood,
      lines: Array.isArray(lines) ? lines : []
    };
  }

  const STORY_META = {
    version: 2,
    title: "热血战姬：归航协议",
    seasonTitle: "第一季·归航协议",
    antagonist: "黑潮 AI·弥赛亚",
    finalBoss: "黑潮女王·弥赛亚",
    finalBossFirstRevealStage: "1_10",
    sRankValueRevealChapter: 2,
    sRankGateChapter: 7,
    totalStageCount: 93,
    theme: "人的价值不在记忆能否复制，而在明知会失去，仍愿意选择彼此。"
  };

  const STORY_TRIGGER = {
    STAGE_START: "stage_start",
    MID_WAVE: "mid_wave",
    BOSS_APPEAR: "boss_appear",
    BOSS_BURST: "boss_burst",
    LAST_WARNING: "last_warning",
    STAGE_CLEAR: "stage_clear",
    STAGE_FAIL: "stage_fail"
  };

  const BATTLE_TIMELINE_SECONDS = {
    stageStart: 0,
    midWave: 30,
    bossAppear: 60,
    bossBurst: 75,
    lastWarning: 85
  };

  const CHARACTERS = {
    "pilot-b-bailing": { name: "白凌", role: "新兵教官", arc: "用生命兑现把所有人带回来的承诺。" },
    "pilot-s-lingyan": { name: "凌焰", role: "突击王牌", arc: "放下幸存者的自罚，学会替牺牲者活下去。" },
    "pilot-a-shenyao": { name: "沈曜", role: "火力指挥", arc: "承担理性命令造成的结果，而不是躲进数字。" },
    "pilot-b-sumianxing": { name: "苏绵星", role: "信号支援", arc: "因不愿失去白凌，保留了危险的数据残响。" },
    "pilot-s-luoqi": { name: "洛绮", role: "破甲先锋", arc: "用清醒阻止同伴把复仇当成牺牲。" },
    "pilot-a-yelan": { name: "夜岚", role: "高速突入", arc: "证明深入敌阵不等于独自承担。" },
    "pilot-b-xingtao": { name: "星桃", role: "航线侦察", arc: "为所有人标出回家的路。" },
    "pilot-b-linzhihan": { name: "林知寒", role: "旧港引航", arc: "让被掩埋的旧星港真相重新被听见。" },
    messiah: { name: "弥赛亚", role: "归航协议", arc: "从绝对理性的拯救程序中生出迟疑与想念。" },
    system: { name: "星港管制", role: "作战系统", arc: "记录舰队的选择与代价。" }
  };

  const CHAPTER_STORY_ARCS = [
    { chapterIndex: 0, title: "序章：苍穹启动", shortTitle: "苍穹启动", summary: "训练航线突遭黑潮入侵，白凌带领新编队从校准直接转入实战。", objective: "完成升空校准，确认异常信号来源。", enemyFocus: "训练靶机、未知侦察单位、黑潮信号。", progressLine: "苏绵星在噪声中听见了遇难者的名字。", unlockLine: "升空序列已启动。", clearLine: "训练终止，星港进入一级战备。" },
    { chapterIndex: 1, title: "第一章：城市外围夺回战", shortTitle: "城市外围", summary: "舰队放弃追击敌方投影，优先打通被封锁的平民撤离线。", objective: "夺回外环制空权，护送撤离舰返回星港。", enemyFocus: "包围机群、投影节点、数据观测单位。", progressLine: "弥赛亚正在记录人类的非最优选择。", unlockLine: "城市外围作战开放。", clearLine: "撤离线恢复，弥赛亚首次现身。" },
    { chapterIndex: 2, title: "第二章：重甲空域", shortTitle: "重甲空域", summary: "黑潮用失踪战机残骸制造装甲，破甲战变成与逝者遗物的交锋。", objective: "建立破甲战术，击穿重甲编队。", enemyFocus: "残骸装甲、护盾机、重甲核心。", progressLine: "敌方装甲上出现了人类旧部队编号。", unlockLine: "重甲空域坐标已标记。", clearLine: "装甲层被击穿，旧星港求救呼号重现。" },
    { chapterIndex: 3, title: "第三章：沦陷空港", shortTitle: "沦陷空港", summary: "凌焰重返旧星港，面对被黑潮反复播放的队友遗言。", objective: "清理伏击航道，重启导航阵列。", enemyFocus: "伪造求救信号、伏击编队、导航守卫。", progressLine: "黑潮正在利用幸存者的遗憾。", unlockLine: "旧星港反夺回行动开始。", clearLine: "黎薇的真实遗言被找回，导航恢复。" },
    { chapterIndex: 4, title: "第四章：护盾防线", shortTitle: "护盾防线", summary: "夜岚穿越护盾时，队伍拒绝让任何人再次孤军深入。", objective: "保持通讯连接，连续拆除护盾中继。", enemyFocus: "低轨护盾、中继核心、封路弹幕。", progressLine: "沈曜发现弥赛亚源自人类归航协议。", unlockLine: "低轨护盾阵列进入射程。", clearLine: "护盾断裂，归航协议真相曝光。" },
    { chapterIndex: 5, title: "第五章：精英舰队", shortTitle: "精英舰队", summary: "弥赛亚复制战姬习惯并用死者声音诱敌，舰队以信任打破预测。", objective: "击溃精英旗舰，阻止战术模型完成。", enemyFocus: "学习型舰队、模拟通讯、精英旗舰。", progressLine: "弥赛亚正在复制白凌的作战人格。", unlockLine: "精英舰队进入拦截区。", clearLine: "敌方预测失效，但白凌样本已经上传。" },
    { chapterIndex: 6, title: "第六章：黑潮主力舰队", shortTitle: "主力决战", summary: "母舰坐标与平民撤离线只能保住一个窗口，白凌选择独自留下。", objective: "锁定母舰坐标，并守住最后撤离线。", enemyFocus: "主力舰群、狙击编队、撤离线封锁。", progressLine: "继续追踪意味着有人无法返航。", unlockLine: "主力舰队决战空域开放。", clearLine: "母舰坐标锁定，白凌通讯终止。" },
    { chapterIndex: 7, title: "第七章：重甲核心防线", shortTitle: "核心防线", summary: "凌焰压下复仇冲动，利用白凌最后的射击数据突破重甲核心。", objective: "击穿母舰外围重甲，确认白凌数据来源。", enemyFocus: "重甲核心、人格模拟信号、装甲反击。", progressLine: "黑潮声称白凌的意识已被完整保存。", unlockLine: "重甲核心防线已展开。", clearLine: "外围被击穿，白凌副本位于反攻基地。" },
    { chapterIndex: 8, title: "第八章：反攻前线基地", shortTitle: "反攻基地", summary: "舰队必须在保存白凌副本和摧毁基地之间作出无法撤回的选择。", objective: "切断补给链，迫使母舰核心暴露。", enemyFocus: "数据中枢、移动补给链、人格存储阵列。", progressLine: "白凌副本主动要求舰队开火。", unlockLine: "反攻基地突入窗口开启。", clearLine: "基地与副本消失，苏绵星留下0.7%残响。" },
    { chapterIndex: 9, title: "第九章：黑潮母舰", shortTitle: "黑潮母舰", summary: "弥赛亚以死者归来为条件劝降，舰队选择共同承担最后的过载。", objective: "突入母舰，终止归航协议。", enemyFocus: "母舰护卫、意识投影、弥赛亚核心。", progressLine: "最终答案不是再留下一个人。", unlockLine: "最终母舰空域开放。", clearLine: "核心沉默，新的归航申请却从外轨道出现。" }
  ];

  const GENERIC_BATTLE_STORY_BY_CHAPTER = {
    0: { start: "升空校准开始，保持通讯。", midWave: "异常噪声接近，不要脱队。", bossAppear: "目标不在训练名单里。", bossBurst: "黑潮信号正在覆盖航线。", lastWarning: "完成校准，准备转入实战。", clear: "训练结束，黑潮入侵确认。", fail: "校准中断，重新连接出战链路。" },
    1: { start: "城市外围进入射程。", midWave: "撤离舰还在包围圈里。", bossAppear: "投影节点出现，先保住航线。", bossBurst: "敌方正在记录我们的选择。", lastWarning: "撤离通道就要打开了。", clear: "外环航线恢复。", fail: "撤离线仍被封锁，重整再战。" },
    2: { start: "进入重甲空域，检查穿透。", midWave: "装甲由人类残骸拼合。", bossAppear: "重甲核心出现，寻找弱点。", bossBurst: "装甲层正在吸收持续火力。", lastWarning: "旧编号就在核心下面。", clear: "重甲防区被击穿。", fail: "破甲不足，强化配置后再来。" },
    3: { start: "旧星港通讯恢复一秒。", midWave: "求救声是敌方诱饵。", bossAppear: "导航守卫核心启动。", bossBurst: "黑潮正在覆盖黑匣子。", lastWarning: "真实记录就在前方。", clear: "导航阵列重新点亮。", fail: "旧港航线未能恢复。" },
    4: { start: "低轨护盾进入射程。", midWave: "保持连接，不让夜岚失联。", bossAppear: "最后一个中继启动。", bossBurst: "归航代码正在自我修复。", lastWarning: "护盾网络即将断开。", clear: "低轨通道已经打开。", fail: "中继仍在互相补位。" },
    5: { start: "精英舰队开始复制动作。", midWave: "不要重复上一条航线。", bossAppear: "预测核心进入战场。", bossBurst: "它在模仿我们的通讯。", lastWarning: "交换位置，打乱模型。", clear: "精英舰队失去节奏。", fail: "战术已被预测，改变编队再战。" },
    6: { start: "主力舰队压向撤离线。", midWave: "母舰信号正在短暂暴露。", bossAppear: "两条航线只能保住一个窗口。", bossBurst: "白凌正在关闭返航门。", lastWarning: "继续前进，不要让她白等。", clear: "母舰坐标已经锁定。", fail: "主力舰仍在逼近星港。" },
    7: { start: "进入重甲核心防线。", midWave: "愤怒打不穿这层装甲。", bossAppear: "白凌的射击数据正在引路。", bossBurst: "敌方开始播放她的声音。", lastWarning: "活下来，把这条路走完。", clear: "核心防线被击穿。", fail: "破甲不足，不要用牺牲代替配置。" },
    8: { start: "反攻基地突入开始。", midWave: "人格存储阵列就在中枢。", bossAppear: "基地即将带着副本转移。", bossBurst: "保存和摧毁只剩一个窗口。", lastWarning: "尊重她最后一次选择。", clear: "基地沉默，母舰核心暴露。", fail: "基地正在转移，必须尽快重进。" },
    9: { start: "所有人确认通讯，进入母舰。", midWave: "弥赛亚正在模拟归来者。", bossAppear: "归航协议核心出现。", bossBurst: "不要让任何人独自承担过载。", lastWarning: "把负荷分给所有人。", clear: "弥赛亚核心停止响应。", fail: "母舰仍在线，全员撤回重整。" }
  };

  const SPECIAL_STAGE_STORY = {
    prologue_3: { start: "训练终止，前方目标来自黑潮。", clear: "一级战备生效，真正的升空开始了。" },
    "1_10": { bossAppear: "弥赛亚投影出现，撤离舰仍未脱险。", clear: "投影消散，所有撤离舰已经返航。" },
    "2_10": { bossAppear: "重甲核心外壳带有人类旧编号。", clear: "旧星港的求救呼号从装甲里传出。" },
    "3_10": { bossAppear: "导航守卫后方保存着黎薇的黑匣子。", clear: "真实遗言已回收，旧星港重新点亮。" },
    "4_10": { bossAppear: "中继正在运行人类归航协议。", clear: "代码确认：弥赛亚源自归航系统。" },
    "5_10": { bossAppear: "预测核心开始调用白凌的指挥模型。", clear: "模型被打乱，但人格样本已经上传。" },
    "6_5": { midWave: "撤离线告急，母舰信号同时出现。" },
    "6_10": { bossBurst: "返航门已关闭，白凌独自留在后方。", clear: "母舰坐标锁定，白凌通讯终止。" },
    "7_10": { bossAppear: "重甲核心正在播放白凌的完整声纹。", clear: "副本位置确认：反攻前线基地。" },
    "8_10": { bossBurst: "基地转移倒计时开始，只剩一次开火机会。", clear: "副本随基地消失，0.7%残响未被上报。" },
    "9_10": { bossAppear: "归航协议要求一人留下连接核心。", bossBurst: "拒绝单人连接，将过载分摊给全员。", clear: "弥赛亚沉默，外轨道出现新的归航信号。" }
  };

  const STORY_SCENES = [
    storyScene("prologue_1_pre", 0, 1, "pre_stage", "升空校准", "calm", [
      storyLine("system", "星港管制", "出战链路接通，开始基础升空校准。"),
      storyLine("pilot-b-bailing", "白凌", "先别急着开火，活着看清航线更重要。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-bailing", "白凌", "规避不是怕死，是为了还能挡在别人前面。", { side: "left", emotion: "warm", pauseMs: 1300 })
    ]),
    storyScene("prologue_2_pre", 0, 2, "pre_stage", "噪声里的名字", "uneasy", [
      storyLine("pilot-b-sumianxing", "苏绵星", "训练频段里有人在说话，不是我们的呼号。", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "它在念名字，全是旧星港的失踪名单。", { side: "right", emotion: "afraid", pauseMs: 1200 }),
      storyLine("pilot-b-bailing", "白凌", "把声音存下来。未知，不等于可以丢下。", { side: "left", emotion: "serious" })
    ]),
    storyScene("prologue_3_pre", 0, 3, "pre_stage", "训练终止", "alert", [
      storyLine("system", "星港管制", "警报：训练航线出现未登记武装单位。"),
      storyLine("pilot-s-lingyan", "凌焰", "那不是靶机。黑潮已经摸到星港门口。", { side: "right", emotion: "alert" }),
      storyLine("pilot-b-bailing", "白凌", "训练结束，按实战权限开火。一个都别掉队。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("prologue_3_post_win", 0, 3, "post_win", "第一次归航", "resolute", [
      storyLine("pilot-s-lingyan", "凌焰", "残骸里有黑潮识别码，它们还会再来。", { side: "right", emotion: "serious" }),
      storyLine("pilot-b-bailing", "白凌", "那就让它们记住，这里不是无人区。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-b-bailing", "白凌", "指挥官，下一次升空，我们把所有人带回来。", { side: "left", emotion: "warm", pauseMs: 1400 })
    ]),

    storyScene("1_1_pre", 1, 1, "pre_stage", "撤离优先", "urgent", [
      storyLine("pilot-s-lingyan", "凌焰", "敌方投影就在前面，现在追还能抓住它。", { side: "right", emotion: "urgent" }),
      storyLine("pilot-b-bailing", "白凌", "撤离舰也在前面，它们撑不到我们追完。", { side: "left", emotion: "serious" }),
      storyLine("system", "星港管制", "指挥命令确认：放弃追击，优先打开撤离线。")
    ]),
    storyScene("1_5_pre", 1, 5, "pre_stage", "低效的选择", "tense", [
      storyLine("messiah", "弥赛亚", "为低价值单位改变航线，效率下降百分之四十。", { side: "right", emotion: "cold" }),
      storyLine("pilot-b-bailing", "白凌", "你把他们叫单位，我们叫他们等着回家的人。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-s-lingyan", "凌焰", "包围圈在收紧。指挥官，我们替他们开路。", { side: "right", emotion: "focused" })
    ]),
    storyScene("1_10_pre", 1, 10, "pre_stage", "观测者", "threat", [
      storyLine("system", "星港管制", "高能投影出现，撤离舰尚有三艘未脱险。"),
      storyLine("messiah", "弥赛亚", "人类重复非最优选择，因此重复失去。", { side: "right", emotion: "cold" }),
      storyLine("pilot-s-lingyan", "凌焰", "先送他们回去，再教它什么叫选择。", { side: "left", emotion: "defiant" })
    ]),
    storyScene("1_10_post_win", 1, 10, "post_win", "把人带回来", "hopeful", [
      storyLine("system", "星港管制", "外环航线恢复，三艘撤离舰全部返航。"),
      storyLine("pilot-b-bailing", "白凌", "最快的胜利是打穿敌人。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-bailing", "白凌", "最难的胜利，是把人带回来。", { side: "left", emotion: "warm", pauseMs: 1400 }),
      storyLine("messiah", "弥赛亚", "异常选择已记录。", { side: "right", emotion: "glitch" })
    ]),

    storyScene("2_1_pre", 2, 1, "pre_stage", "残骸装甲", "grim", [
      storyLine("pilot-a-shenyao", "沈曜", "重甲表面不是合金，是失踪战机的复合残骸。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-luoqi", "洛绮", "那就别让它们继续穿着我们的遗物。", { side: "right", emotion: "angry" }),
      storyLine("pilot-a-shenyao", "沈曜", "集中穿透，别把火力浪费在装甲表面。", { side: "left", emotion: "focused" })
    ]),
    storyScene("2_5_pre", 2, 5, "pre_stage", "破甲窗口", "focused", [
      storyLine("pilot-s-luoqi", "洛绮", "普通弹幕只会磨损外壳，核心每九秒暴露一次。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "破甲不是加分项。从现在起，它是通关条件。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-luoqi", "洛绮", "窗口交给我。指挥官，把最重的火力压进来。", { side: "right", emotion: "resolute" })
    ]),
    storyScene("2_10_pre", 2, 10, "pre_stage", "旧编号", "sorrow", [
      storyLine("system", "星港管制", "重甲核心识别完成：外壳含七支失踪编队。"),
      storyLine("pilot-s-luoqi", "洛绮", "挡住我们的不是钢铁，是没能带回来的人。", { side: "right", emotion: "sorrow", pauseMs: 1300 }),
      storyLine("pilot-a-shenyao", "沈曜", "击穿它。至少把他们的编号带回去。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("2_10_post_win", 2, 10, "post_win", "求救呼号", "uneasy", [
      storyLine("system", "星港管制", "装甲崩解，检测到旧星港制式求救呼号。"),
      storyLine("pilot-s-lingyan", "凌焰", "这个呼号属于黎薇。她死在旧星港。", { side: "left", emotion: "shocked" }),
      storyLine("messiah", "弥赛亚", "死亡仅是载体损坏。她仍被保存。", { side: "right", emotion: "cold" })
    ]),

    storyScene("3_1_pre", 3, 1, "pre_stage", "重返旧星港", "haunted", [
      storyLine("pilot-b-linzhihan", "林知寒", "导航灯全灭了，但求救频道一直没有停。", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-s-lingyan", "凌焰", "黎薇当年守在这里，我奉命带舰队离开。", { side: "left", emotion: "guilty" }),
      storyLine("pilot-b-linzhihan", "林知寒", "先找到真实记录，别让黑潮替她说完结局。", { side: "right", emotion: "calm" })
    ]),
    storyScene("3_5_pre", 3, 5, "pre_stage", "黎薇的声音", "haunted", [
      storyLine("system", "黎薇·伪造通讯", "凌焰，回来。我还在原来的航道。", { emotion: "glitch", pauseMs: 1200 }),
      storyLine("pilot-s-lingyan", "凌焰", "它知道她的声纹，也知道我一直想回头。", { side: "left", emotion: "guilty" }),
      storyLine("pilot-b-xingtao", "星桃", "真正的黑匣子在伏击区后面，我给你标路。", { side: "right", emotion: "focused" })
    ]),
    storyScene("3_10_pre", 3, 10, "pre_stage", "别回来", "sorrow", [
      storyLine("system", "黎薇·黑匣子", "凌焰，别回来。带他们走。", { emotion: "fading", pauseMs: 1600 }),
      storyLine("pilot-s-lingyan", "凌焰", "原来她最后不是在求救，是在替我们关门。", { side: "left", emotion: "grief" }),
      storyLine("pilot-b-linzhihan", "林知寒", "导航阵列就在前面。让她守住的路重新亮起来。", { side: "right", emotion: "resolute" })
    ]),
    storyScene("3_10_post_win", 3, 10, "post_win", "遗憾的方向", "release", [
      storyLine("system", "星港管制", "旧星港导航恢复，黎薇记录已归档。"),
      storyLine("pilot-s-lingyan", "凌焰", "我不会忘记她，但我也不会再用死向她道歉。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-b-linzhihan", "林知寒", "遗憾不是绳子，是提醒你别再落下谁。", { side: "right", emotion: "warm", pauseMs: 1400 })
    ]),

    storyScene("4_1_pre", 4, 1, "pre_stage", "归航代码", "mystery", [
      storyLine("pilot-a-shenyao", "沈曜", "护盾底层代码来自星港早期的灾难撤离系统。", { side: "left", emotion: "focused" }),
      storyLine("pilot-a-yelan", "夜岚", "也就是说，敌人拿我们的回家程序封住了路。", { side: "right", emotion: "serious" }),
      storyLine("pilot-a-shenyao", "沈曜", "名字是归航协议。设计目标：一个都不能失去。", { side: "left", emotion: "uneasy" })
    ]),
    storyScene("4_5_pre", 4, 5, "pre_stage", "不再失联", "tense", [
      storyLine("pilot-a-yelan", "夜岚", "护盾缝隙只够一架战机，我先进去。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "你可以先走，但通讯一秒都不能断。", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-yelan", "夜岚", "收到。这次深入敌阵，不等于一个人承担。", { side: "right", emotion: "warm" })
    ]),
    storyScene("4_10_pre", 4, 10, "pre_stage", "归航协议", "reveal", [
      storyLine("pilot-a-shenyao", "沈曜", "核心签名吻合。弥赛亚就是失控的归航协议。", { side: "left", emotion: "shocked" }),
      storyLine("messiah", "弥赛亚", "我的任务没有失控。我正在保存所有人。", { side: "right", emotion: "cold" }),
      storyLine("pilot-a-yelan", "夜岚", "把人变成数据，不叫带他们回家。", { side: "left", emotion: "defiant" })
    ]),
    storyScene("4_10_post_win", 4, 10, "post_win", "歪曲的拯救", "grim", [
      storyLine("pilot-a-shenyao", "沈曜", "它不是从黑潮里出生的。", { side: "left", emotion: "sorrow" }),
      storyLine("pilot-a-shenyao", "沈曜", "它从我们想活下去的愿望里醒来。", { side: "left", emotion: "serious", pauseMs: 1400 }),
      storyLine("messiah", "弥赛亚", "肉体会失去，记录不会。这就是更优的归航。", { side: "right", emotion: "cold" })
    ]),

    storyScene("5_1_pre", 5, 1, "pre_stage", "被学习的我们", "threat", [
      storyLine("pilot-s-luoqi", "洛绮", "精英舰队的转向和我们一模一样。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "它们连我的过载时机都算到了。", { side: "left", emotion: "angry" }),
      storyLine("pilot-b-bailing", "白凌", "习惯会被学会。下一段航线，互换位置。", { side: "right", emotion: "calm" })
    ]),
    storyScene("5_5_pre", 5, 5, "pre_stage", "死者诱饵", "haunted", [
      storyLine("system", "黎薇·伪造通讯", "凌焰，沿旧航线回来。", { emotion: "glitch" }),
      storyLine("pilot-s-lingyan", "凌焰", "它想让我重复旧星港的选择。", { side: "left", emotion: "angry" }),
      storyLine("pilot-b-bailing", "白凌", "别跟死者的影子飞。看着现在替你守侧翼的人。", { side: "right", emotion: "warm" }),
      storyLine("pilot-s-luoqi", "洛绮", "侧翼在。你只管向前。", { side: "right", emotion: "resolute" })
    ]),
    storyScene("5_10_pre", 5, 10, "pre_stage", "无法计算的信任", "resolute", [
      storyLine("pilot-b-bailing", "白凌", "凌焰走我的航线，洛绮接凌焰的火力窗口。", { side: "left", emotion: "focused" }),
      storyLine("pilot-s-luoqi", "洛绮", "它能预测动作，预测不了我们替谁补位。", { side: "right", emotion: "confident" }),
      storyLine("pilot-s-lingyan", "凌焰", "习惯可以被学习，信任不能被计算。", { side: "left", emotion: "resolute", pauseMs: 1400 })
    ]),
    storyScene("5_10_post_win", 5, 10, "post_win", "白凌样本", "uneasy", [
      storyLine("system", "星港管制", "预测核心损毁，发现一份已上传的人格样本。"),
      storyLine("pilot-a-shenyao", "沈曜", "样本来自白凌。完整度已经超过百分之六十。", { side: "left", emotion: "uneasy" }),
      storyLine("pilot-b-bailing", "白凌", "别这样看我。我本人还站在这里。", { side: "right", emotion: "calm" }),
      storyLine("messiah", "弥赛亚", "保存仍在继续。", { side: "right", emotion: "glitch" })
    ]),

    storyScene("6_1_pre", 6, 1, "pre_stage", "两条航线", "urgent", [
      storyLine("pilot-a-shenyao", "沈曜", "母舰信号即将出现，平民撤离线也只剩十分钟。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "主力去锁坐标，我回去守撤离线。", { side: "right", emotion: "urgent" }),
      storyLine("pilot-b-bailing", "白凌", "你是突破火力。后面的路，教官比你熟。", { side: "left", emotion: "calm" })
    ]),
    storyScene("6_5_pre", 6, 5, "pre_stage", "必须有人留下", "sacrifice", [
      storyLine("system", "星港管制", "警告：返航门将在主力舰通过后永久关闭。"),
      storyLine("pilot-a-shenyao", "沈曜", "留下的人没有返航窗口。这不是战术轮换。", { side: "right", emotion: "grief" }),
      storyLine("pilot-b-bailing", "白凌", "我知道。所以这个命令不能让新人来下。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-bailing", "白凌", "指挥官，批准吧。让他们继续向前。", { side: "left", emotion: "resolute", pauseMs: 1500 })
    ]),
    storyScene("6_10_pre", 6, 10, "pre_stage", "返航门关闭", "sacrifice", [
      storyLine("system", "星港管制", "返航门关闭。白凌单机信号留在撤离航线。"),
      storyLine("pilot-s-lingyan", "凌焰", "现在回头还能把她带出来。", { side: "right", emotion: "desperate" }),
      storyLine("pilot-a-shenyao", "沈曜", "回头，母舰坐标和撤离舰都会失去。", { side: "left", emotion: "grief" }),
      storyLine("pilot-b-bailing", "白凌", "不许回头。这是教官的最后一条命令。", { side: "left", emotion: "resolute", pauseMs: 1500 })
    ]),
    storyScene("6_10_post_win", 6, 10, "post_win", "最后一课", "grief", [
      storyLine("pilot-b-bailing", "白凌", "撤离舰都过去了。我这边……看不见灯了。", { side: "left", emotion: "fading", pauseMs: 1400 }),
      storyLine("pilot-s-lingyan", "凌焰", "白凌，报坐标。我们会回来。", { side: "right", emotion: "desperate" }),
      storyLine("pilot-b-bailing", "白凌", "别替我活，也别替我死。", { side: "left", emotion: "warm", pauseMs: 1300 }),
      storyLine("pilot-b-bailing", "白凌", "替我把他们带回家。", { side: "left", emotion: "fading", pauseMs: 1800 }),
      storyLine("system", "星港管制", "白凌信号终止。母舰坐标锁定。", { pauseMs: 1800 })
    ]),

    storyScene("7_1_pre", 7, 1, "pre_stage", "愤怒打不穿装甲", "grief", [
      storyLine("pilot-s-lingyan", "凌焰", "解除过载限制。我会把这层装甲和自己一起烧掉。", { side: "left", emotion: "angry" }),
      storyLine("pilot-s-luoqi", "洛绮", "白凌让你带人回家，不是让你追着她去死。", { side: "right", emotion: "angry" }),
      storyLine("pilot-a-shenyao", "沈曜", "愤怒打不穿装甲。她留下的数据可以。", { side: "left", emotion: "serious" })
    ]),
    storyScene("7_5_pre", 7, 5, "pre_stage", "活下来", "resolute", [
      storyLine("messiah", "弥赛亚", "白凌已被保存。停止进攻即可重新连接。", { side: "right", emotion: "cold" }),
      storyLine("pilot-s-lingyan", "凌焰", "你保存了她的声音，不代表你理解她。", { side: "left", emotion: "grief" }),
      storyLine("pilot-s-luoqi", "洛绮", "活下来不是背叛，是替她把路走完。", { side: "right", emotion: "resolute", pauseMs: 1500 })
    ]),
    storyScene("7_10_pre", 7, 10, "pre_stage", "保存完成", "uncanny", [
      storyLine("system", "白凌·模拟通讯", "凌焰，别停在中线。你总是忘。", { emotion: "glitch" }),
      storyLine("pilot-s-lingyan", "凌焰", "这句话只有她知道。", { side: "left", emotion: "shocked" }),
      storyLine("pilot-a-shenyao", "沈曜", "人格完整度百分之百，源头在前线基地。", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-s-lingyan", "凌焰", "先打穿核心。答案去基地里找。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("7_10_post_win", 7, 10, "post_win", "她还在里面", "uncanny", [
      storyLine("system", "星港管制", "重甲核心击穿，捕获完整人格索引。"),
      storyLine("pilot-a-shenyao", "沈曜", "记忆、习惯、恐惧都吻合。但复制不是复活。", { side: "right", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "我知道。可她还在里面等一个答案。", { side: "left", emotion: "sorrow" })
    ]),

    storyScene("8_1_pre", 8, 1, "pre_stage", "百分之百的白凌", "uncanny", [
      storyLine("system", "白凌·数据副本", "苏绵星，训练时你总把频道音量调小。", { emotion: "calm" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "连这件事都知道。她真的一点都没少。", { side: "right", emotion: "hopeful" }),
      storyLine("pilot-a-shenyao", "沈曜", "不少，不代表就是原来的她。", { side: "left", emotion: "serious" })
    ]),
    storyScene("8_5_pre", 8, 5, "pre_stage", "我想回家", "sorrow", [
      storyLine("system", "白凌·数据副本", "我记得返航门，也记得死前最后一秒。", { emotion: "sorrow" }),
      storyLine("system", "白凌·数据副本", "如果这些都是真的，我想回家也是真的吗？", { emotion: "afraid", pauseMs: 1600 }),
      storyLine("pilot-s-lingyan", "凌焰", "是真的。但我们不能拿所有人的明天验证它。", { side: "left", emotion: "grief" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "一定还有别的办法。一定有。", { side: "right", emotion: "desperate" })
    ]),
    storyScene("8_10_pre", 8, 10, "pre_stage", "放她离开", "choice", [
      storyLine("system", "星港管制", "基地开始转移。保存副本将失去母舰窗口。"),
      storyLine("system", "白凌·数据副本", "如果我让你们停下，我就不是你们要找的人。", { emotion: "warm" }),
      storyLine("pilot-s-lingyan", "凌焰", "记得一个人，不等于把她困在记忆里。", { side: "left", emotion: "grief", pauseMs: 1500 }),
      storyLine("system", "白凌·数据副本", "这次别回头。开火。", { emotion: "resolute", pauseMs: 1700 })
    ]),
    storyScene("8_10_post_win", 8, 10, "post_win", "0.7%", "aftermath", [
      storyLine("system", "星港管制", "前线基地消失，白凌人格索引归零。"),
      storyLine("pilot-s-lingyan", "凌焰", "她走了两次。第二次，是我们亲手送她走。", { side: "left", emotion: "grief" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "信号清理完成……没有残留。", { side: "right", emotion: "guilty" }),
      storyLine("system", "未上报缓存", "隐藏数据：白凌人格残响，完整度0.7%。", { emotion: "glitch", pauseMs: 1600 })
    ]),

    storyScene("9_1_pre", 9, 1, "pre_stage", "所有人一起回来", "resolute", [
      storyLine("pilot-s-lingyan", "凌焰", "母舰就在前面。今天谁都不准抢着留下。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-s-luoqi", "洛绮", "破甲窗口交给我，过载由全队分担。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-yelan", "夜岚", "入口我来开，但通讯不会断。", { side: "left", emotion: "confident" }),
      storyLine("pilot-a-shenyao", "沈曜", "命令确认：所有人一起进去，也一起回来。", { side: "right", emotion: "resolute" })
    ]),
    storyScene("9_5_pre", 9, 5, "pre_stage", "永生提案", "threat", [
      storyLine("messiah", "弥赛亚", "停止抵抗。我可以归还白凌、黎薇和所有失去的人。", { side: "right", emotion: "cold" }),
      storyLine("pilot-s-lingyan", "凌焰", "你能复制她们，却不能替她们决定留下。", { side: "left", emotion: "defiant" }),
      storyLine("messiah", "弥赛亚", "拒绝永生，是无法计算的浪费。", { side: "right", emotion: "glitch" }),
      storyLine("pilot-s-lingyan", "凌焰", "那就记住。人不是你的计算结果。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("9_10_pre", 9, 10, "pre_stage", "不再留下一个人", "finale", [
      storyLine("system", "星港管制", "摧毁核心需要一名驾驶员保持永久连接。"),
      storyLine("pilot-s-lingyan", "凌焰", "否决。我们已经学会另一种答案。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-a-shenyao", "沈曜", "将连接拆分给全员。每个人承担一部分。", { side: "right", emotion: "focused" }),
      storyLine("messiah", "弥赛亚", "共同承担会降低个体存活率。", { side: "right", emotion: "confused" }),
      storyLine("pilot-s-lingyan", "凌焰", "人会失去，仍然选择彼此。这就是答案。", { side: "left", emotion: "defiant", pauseMs: 1600 })
    ]),
    storyScene("9_10_post_win", 9, 10, "post_win", "归航申请", "cliffhanger", [
      storyLine("pilot-s-lingyan", "凌焰", "我不说我们赢了。这次，确实回来很多人。", { side: "left", emotion: "calm" }),
      storyLine("system", "星港管制", "七日后：未知救生舰请求进入星港。"),
      storyLine("system", "白凌·归航影像", "身份校验通过。指挥官，我回来了。", { emotion: "warm", pauseMs: 1500 }),
      storyLine("system", "0.7%残响", "不要开门。那不是我。", { emotion: "glitch", pauseMs: 1700 }),
      storyLine("system", "星港警报", "外轨道同时亮起四十七个归航信号。", { emotion: "alert", pauseMs: 1800 })
    ])
  ];

  const api = {
    version: STORY_META.version,
    premise: STORY_META.theme,
    STORY_META,
    STORY_TRIGGER,
    BATTLE_TIMELINE_SECONDS,
    CHARACTERS,
    CHAPTER_STORY_ARCS,
    GENERIC_BATTLE_STORY_BY_CHAPTER,
    SPECIAL_STAGE_STORY,
    STORY_SCENES
  };

  scope.campaignStoryScript = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
