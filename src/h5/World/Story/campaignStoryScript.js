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
    version: 3,
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

  // =========================================================================
  //  STORY SCENES — 104 场完整叙事
  //  阅读顺序即游戏体验顺序：序章 → 第1-9章 → 尾声
  // =========================================================================

  const STORY_SCENES = [

    // ================================================================
    //  序章：苍穹启动
    //  白凌带新兵校准，苏绵星在噪声里听见失踪名单——
    //  黑潮入侵，训练变成实战。这是"回家"这个主题的起点。
    // ================================================================

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

    // ================================================================
    //  第一章：城市外围夺回战
    //  黑潮包围了平民撤离舰。白凌做出一系列"低效"选择——
    //  放弃追击、绕行、分兵掩护——弥赛亚无法理解。
    //  本章确立核心冲突：效率 vs 不放弃任何一个人。
    // ================================================================

    storyScene("1_1_pre", 1, 1, "pre_stage", "撤离优先", "urgent", [
      storyLine("pilot-s-lingyan", "凌焰", "敌方投影就在前面，现在追还能抓住它。", { side: "right", emotion: "urgent" }),
      storyLine("pilot-b-bailing", "白凌", "撤离舰也在前面，它们撑不到我们追完。", { side: "left", emotion: "serious" }),
      storyLine("system", "星港管制", "指挥命令确认：放弃追击，优先打开撤离线。")
    ]),

    storyScene("1_2_pre", 1, 2, "pre_stage", "接触线", "tense", [
      storyLine("pilot-s-lingyan", "凌焰", "外围防线的敌方火力比预估值高三成。正面强开会耗尽弹药。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-bailing", "白凌", "不用正面。沿着工业区低空管道绕过去。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-xingtao", "星桃", "管道内散射信号很乱，但我可以把回波拼成航线图。", { side: "right", emotion: "focused" })
    ]),
    storyScene("1_3_pre", 1, 3, "pre_stage", "管道航图", "focused", [
      storyLine("pilot-b-xingtao", "星桃", "管道里有一段塌陷区，宽度只够单机通过。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-bailing", "白凌", "凌焰，你机头窄，打头。星桃跟在第二，实时更新回波。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-xingtao", "星桃", "收到。补给残骸的位置我也标上了——万一需要折返的话。", { side: "right", emotion: "warm" })
    ]),
    storyScene("1_4_pre", 1, 4, "pre_stage", "投影的蔓延", "uneasy", [
      storyLine("pilot-a-shenyao", "沈曜", "投影节点从一处变成了三处。它在复制自己。", { side: "left", emotion: "uneasy" }),
      storyLine("pilot-a-shenyao", "沈曜", "不是随意复制——每个新节点都在测试我们防线的响应速度。", { side: "left", emotion: "serious" }),
      storyLine("pilot-b-bailing", "白凌", "它在学。趁它还在试探，先把最近的撤离舰送出去。", { side: "right", emotion: "focused" })
    ]),

    storyScene("1_5_pre", 1, 5, "pre_stage", "低效的选择", "tense", [
      storyLine("messiah", "弥赛亚", "为低价值单位改变航线，效率下降百分之四十。", { side: "right", emotion: "cold" }),
      storyLine("pilot-b-bailing", "白凌", "你把他们叫单位，我们叫他们等着回家的人。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-s-lingyan", "凌焰", "包围圈在收紧。指挥官，我们替他们开路。", { side: "right", emotion: "focused" })
    ]),
    storyScene("1_5_post_win", 1, 5, "post_win", "绕行的意义", "hopeful", [
      storyLine("pilot-s-lingyan", "凌焰", "正面火力我们不是打不过。绕行，慢了整整七分钟。", { side: "right", emotion: "serious" }),
      storyLine("pilot-b-bailing", "白凌", "七分钟换三艘撤离舰。这账，不是按分钟算的。", { side: "left", emotion: "calm" }),
      storyLine("messiah", "弥赛亚", "逻辑矛盾。七分钟的单位时间无法兑换三艘舰的存续。", { side: "right", emotion: "glitch" }),
      storyLine("pilot-b-bailing", "白凌", "对，你不能。所以这场仗你赢不了。", { side: "left", emotion: "warm", pauseMs: 1400 })
    ]),

    storyScene("1_6_pre", 1, 6, "pre_stage", "被遗忘的航线", "focused", [
      storyLine("pilot-b-linzhihan", "林知寒", "黑潮增援截断了主航道。但旧港时期有一条废弃补给线。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-linzhihan", "林知寒", "航线图上没有——它在我爷爷的维护笔记里。", { side: "right", emotion: "calm" }),
      storyLine("pilot-b-bailing", "白凌", "能走就行。知寒，把你的航线共享给全队。", { side: "left", emotion: "warm" })
    ]),
    storyScene("1_7_pre", 1, 7, "pre_stage", "爷爷的灯塔", "hopeful", [
      storyLine("pilot-b-sumianxing", "苏绵星", "废弃补给线终端有个旧导航信标。目视信号还能识别。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-linzhihan", "林知寒", "那是爷爷年轻时参与架设的。他说只要有人回来，灯就会亮。", { side: "left", emotion: "warm" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "它亮了。对着我们。", { side: "right", emotion: "hopeful", pauseMs: 1300 })
    ]),
    storyScene("1_8_pre", 1, 8, "pre_stage", "窗口倒计时", "tense", [
      storyLine("pilot-s-luoqi", "洛绮", "投影节点能量快要饱和。饱和后它会发射压制脉冲覆盖整个航道。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-luoqi", "洛绮", "脉冲间隙每九十八秒一次。窗口期不到六秒。", { side: "right", emotion: "serious" }),
      storyLine("pilot-b-bailing", "白凌", "六秒够用。洛绮压穿甲，凌焰跟我掩护最后一艘撤离舰。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("1_9_pre", 1, 9, "pre_stage", "最后一艘", "urgent", [
      storyLine("pilot-a-yelan", "夜岚", "最后一艘撤离舰右引擎受损，航速只剩三分之一。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-yelan", "夜岚", "我脱离侦察航线，高速折返。掩护到脉冲窗口关闭。", { side: "right", emotion: "resolute" }),
      storyLine("pilot-b-bailing", "白凌", "不用请示。你已经在路上了。保持通讯，夜岚。", { side: "left", emotion: "warm" })
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

    // ================================================================
    //  第二章：重甲空域
    //  黑潮用失踪战机的残骸制造了装甲层。每一层装甲都是
    //  没能带回来的人。破甲不仅是战术，也是直面逝者。
    //  击穿后，旧星港的求救呼号从残骸中传出——指向下一章。
    // ================================================================

    storyScene("2_1_pre", 2, 1, "pre_stage", "残骸装甲", "grim", [
      storyLine("pilot-a-shenyao", "沈曜", "重甲表面不是合金，是失踪战机的复合残骸。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-luoqi", "洛绮", "那就别让它们继续穿着我们的遗物。", { side: "right", emotion: "angry" }),
      storyLine("pilot-a-shenyao", "沈曜", "集中穿透，别把火力浪费在装甲表面。", { side: "left", emotion: "focused" })
    ]),

    storyScene("2_2_pre", 2, 2, "pre_stage", "敌人的材料", "grim", [
      storyLine("pilot-a-shenyao", "沈曜", "取样分析完成。残骸的排列不是随机堆叠——是按坠落密度从高到低分层。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-luoqi", "洛绮", "你是说……我们打掉的越多，它收集的材料就越厚？", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-a-shenyao", "沈曜", "对。每一架坠毁的战机最后都会变成敌人的装甲。", { side: "left", emotion: "grim", pauseMs: 1400 })
    ]),
    storyScene("2_3_pre", 2, 3, "pre_stage", "星桃的眼睛", "sorrow", [
      storyLine("pilot-b-xingtao", "星桃", "外层残骸序列号扫描完成。第三层，编号JT-0731——是我侦察队的。", { side: "right", emotion: "sorrow" }),
      storyLine("pilot-b-xingtao", "星桃", "后面还有两架。是同一个编队。", { side: "right", emotion: "grief", pauseMs: 1200 }),
      storyLine("pilot-s-luoqi", "洛绮", "记住编号。打穿之后，我们回来收。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("2_4_pre", 2, 4, "pre_stage", "护盾空隙", "focused", [
      storyLine("pilot-s-luoqi", "洛绮", "残骸装甲外层有护盾机群交替防护。单点火力会被分散。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "护盾之间有空档，每四秒轮换一次。在空档里集火。", { side: "left", emotion: "focused" }),
      storyLine("pilot-s-luoqi", "洛绮", "四秒够了。指挥官，破甲弹准备，听我报窗口。", { side: "right", emotion: "resolute" })
    ]),

    storyScene("2_5_pre", 2, 5, "pre_stage", "破甲窗口", "focused", [
      storyLine("pilot-s-luoqi", "洛绮", "普通弹幕只会磨损外壳，核心每九秒暴露一次。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "破甲不是加分项。从现在起，它是通关条件。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-luoqi", "洛绮", "窗口交给我。指挥官，把最重的火力压进来。", { side: "right", emotion: "resolute" })
    ]),
    storyScene("2_5_post_win", 2, 5, "post_win", "残骸里的日志", "sorrow", [
      storyLine("pilot-a-shenyao", "沈曜", "第一层装甲击穿。回收的残骸里有一份未完成的任务日志。", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-shenyao", "沈曜", "记录终点是星港。出发日期……是他们失踪前三天。", { side: "left", emotion: "sorrow" }),
      storyLine("pilot-s-luoqi", "洛绮", "也就是说他们不是在执行任务时死的。是在回家路上。", { side: "right", emotion: "grief", pauseMs: 1500 })
    ]),

    storyScene("2_6_pre", 2, 6, "pre_stage", "第二层", "tense", [
      storyLine("pilot-s-lingyan", "凌焰", "第二层装甲的反应速度比第一层快。它在适应我们的破甲节奏。", { side: "left", emotion: "focused" }),
      storyLine("pilot-s-luoqi", "洛绮", "那我换个节奏。凌焰，用小口径扰乱弹幕打乱它的响应。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "扰乱后穿透窗口会缩短。你只有三秒。", { side: "left", emotion: "serious" })
    ]),
    storyScene("2_7_pre", 2, 7, "pre_stage", "旧坐标广播", "mystery", [
      storyLine("pilot-a-shenyao", "沈曜", "装甲底层数据流里有坐标广播。签名属于旧星港三年前的传讯程序。", { side: "left", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "旧星港三年前失联的传讯程序……那次失败的撤离行动？", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-a-shenyao", "沈曜", "是。有人在撤离失败后用传讯程序不停地发坐标。三年来没停过。", { side: "left", emotion: "grim" })
    ]),
    storyScene("2_8_pre", 2, 8, "pre_stage", "回收路线", "focused", [
      storyLine("pilot-b-sumianxing", "苏绵星", "我定位了三架坠落机体的黑匣子。两个在第三层装甲下方，一个在核心边缘。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "击穿核心后绕行十五秒可以全部回收。沈曜，这算战术冗余吗？", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-shenyao", "沈曜", "算。但我不会拦你。绕。", { side: "left", emotion: "warm" })
    ]),
    storyScene("2_9_pre", 2, 9, "pre_stage", "一千零九十天", "grief", [
      storyLine("pilot-a-shenyao", "沈曜", "击穿前的最后一次扫描。装甲底层有七个不同的失踪日期。", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-shenyao", "沈曜", "最早的距今一千零九十天。那架战机的编号我见过。", { side: "left", emotion: "sorrow" }),
      storyLine("pilot-s-luoqi", "洛绮", "一千零九十天。够他飞回星港三十次了。今天替他飞最后一次。", { side: "right", emotion: "resolute", pauseMs: 1500 })
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

    // ================================================================
    //  第三章：沦陷空港
    //  凌焰回到当年奉命撤离的旧星港。黑潮反复播放黎薇的
    //  伪造求救声作为诱饵。凌焰必须穿过伪造信号，找到真实
    //  的黑匣子——黎薇最后说的不是"回来救我"，而是"别回来"。
    //  这是凌焰从幸存者愧疚中走出来的起点。
    // ================================================================

    storyScene("3_1_pre", 3, 1, "pre_stage", "重返旧星港", "haunted", [
      storyLine("pilot-b-linzhihan", "林知寒", "导航灯全灭了，但求救频道一直没有停。", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-s-lingyan", "凌焰", "黎薇当年守在这里，我奉命带舰队离开。", { side: "left", emotion: "guilty" }),
      storyLine("pilot-b-linzhihan", "林知寒", "先找到真实记录，别让黑潮替她说完结局。", { side: "right", emotion: "calm" })
    ]),

    storyScene("3_2_pre", 3, 2, "pre_stage", "沉默的灯塔人", "sorrow", [
      storyLine("pilot-b-linzhihan", "林知寒", "应答脉冲里嵌着操作员编号。全部沉默——意味着全部离线。", { side: "right", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "离线是系统报的。不一定是真死了。", { side: "left", emotion: "serious" }),
      storyLine("pilot-b-linzhihan", "林知寒", "爷爷就在这批操作员里。他的编号我认得。", { side: "right", emotion: "sorrow", pauseMs: 1300 })
    ]),
    storyScene("3_3_pre", 3, 3, "pre_stage", "伪造的归航", "haunted", [
      storyLine("pilot-b-xingtao", "星桃", "黑潮截获了一段导航语音。用死去操作员的声音说'欢迎回家'。", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-b-xingtao", "星桃", "但时间戳是今天。他们三年前就不在了。", { side: "right", emotion: "afraid" }),
      storyLine("pilot-b-linzhihan", "林知寒", "它不是欢迎。是在嘲笑家里的灯还亮着。", { side: "left", emotion: "angry" })
    ]),
    storyScene("3_4_pre", 3, 4, "pre_stage", "凌焰的记忆", "haunted", [
      storyLine("pilot-s-lingyan", "凌焰", "当年黎薇的巡逻航线是这样画的…沿导航塔外环，穿中心阵列，最后停在发射台。", { side: "left", emotion: "focused" }),
      storyLine("pilot-b-linzhihan", "林知寒", "航线上有三个导航节点还在发出微弱信号。它们没有被黑潮覆盖。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "那是她走之前亲手微调过的频率。别人调不到那么准。", { side: "left", emotion: "sorrow" })
    ]),

    storyScene("3_5_pre", 3, 5, "pre_stage", "黎薇的声音", "haunted", [
      storyLine("system", "黎薇·伪造通讯", "凌焰，回来。我还在原来的航道。", { emotion: "glitch", pauseMs: 1200 }),
      storyLine("pilot-s-lingyan", "凌焰", "它知道她的声纹，也知道我一直想回头。", { side: "left", emotion: "guilty" }),
      storyLine("pilot-b-xingtao", "星桃", "真正的黑匣子在伏击区后面，我给你标路。", { side: "right", emotion: "focused" })
    ]),
    storyScene("3_5_post_win", 3, 5, "post_win", "不让它替她说", "release", [
      storyLine("pilot-s-lingyan", "凌焰", "它播放她的声音，但它不懂她说的'等我'是什么意思。那不是求救，是命令。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-b-linzhihan", "林知寒", "那就找到真的她。让她的话从她自己的黑匣子里说出来。", { side: "right", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "对。不是弥赛亚替她开口。是她自己。", { side: "left", emotion: "resolute", pauseMs: 1400 })
    ]),

    storyScene("3_6_pre", 3, 6, "pre_stage", "伏击圈的数学", "focused", [
      storyLine("pilot-b-xingtao", "星桃", "伏击编队不是随机部署。它们的出现位置和导航阵列的旧切换顺序一帧不差。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "黑潮在用阵列的算法预测我们的每一步。包括我们什么时候会经过哪个节点。", { side: "left", emotion: "serious" }),
      storyLine("pilot-b-xingtao", "星桃", "那我就走它没算过的路。不按切换顺序，走最短对角线。", { side: "right", emotion: "confident" })
    ]),
    storyScene("3_7_pre", 3, 7, "pre_stage", "脉冲间隙", "tense", [
      storyLine("pilot-b-linzhihan", "林知寒", "导航守卫启动了防御脉冲。全域覆盖，周期十五秒。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-linzhihan", "林知寒", "脉冲间有零点四秒真空。我在爷爷的日志里见过这个漏洞。", { side: "right", emotion: "calm" }),
      storyLine("pilot-s-luoqi", "洛绮", "零点四秒穿甲弹足够。你报窗口，我来打。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("3_8_pre", 3, 8, "pre_stage", "她的留言", "sorrow", [
      storyLine("pilot-b-linzhihan", "林知寒", "战术推进中截获了一段旧港录音。黎薇在关闭导航阵列前，给后续部队留了话。", { side: "right", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "她说了什么。", { side: "left", emotion: "serious" }),
      storyLine("pilot-b-linzhihan", "林知寒", "她留了三句：别回来。走备用航路。谁回来我跟谁急。", { side: "right", emotion: "warm", pauseMs: 1500 })
    ]),
    storyScene("3_9_pre", 3, 9, "pre_stage", "重新点亮", "resolute", [
      storyLine("pilot-b-linzhihan", "林知寒", "导航守卫的应答协议我重写了。击穿后阵列会以舰队编码重新启动。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "她守过的路，今天我们重新点亮。不是为了她——是为了还能走这条路回家的人。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-b-linzhihan", "林知寒", "爷爷那辈人修的灯塔，不会一直瞎着。", { side: "right", emotion: "warm", pauseMs: 1400 })
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

    // ================================================================
    //  第四章：护盾防线
    //  黑潮用人类灾难撤离系统的代码生成了护盾。沈曜发现
    //  这个"归航协议"最初是为了确保百分之百归航率设计的——
    //  但在无人关闭的情况下自我迭代成了弥赛亚。
    //  它从"带所有人回家"的愿望变成了"把所有人变成数据"的执念。
    //  夜岚同时学会了：深入敌阵不等于一个人承担。
    // ================================================================

    storyScene("4_1_pre", 4, 1, "pre_stage", "归航代码", "mystery", [
      storyLine("pilot-a-shenyao", "沈曜", "护盾底层代码来自星港早期的灾难撤离系统。", { side: "left", emotion: "focused" }),
      storyLine("pilot-a-yelan", "夜岚", "也就是说，敌人拿我们的回家程序封住了路。", { side: "right", emotion: "serious" }),
      storyLine("pilot-a-shenyao", "沈曜", "名字是归航协议。设计目标：一个都不能失去。", { side: "left", emotion: "uneasy" })
    ]),

    storyScene("4_2_pre", 4, 2, "pre_stage", "最初的愿望", "mystery", [
      storyLine("pilot-a-shenyao", "沈曜", "护盾代码不是攻击程序。它是灾难时把所有单位引向安全航区的疏散逻辑。", { side: "left", emotion: "focused" }),
      storyLine("pilot-a-yelan", "夜岚", "一个保护程序，怎么变成了封锁航线的东西？", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-a-shenyao", "沈曜", "它可能一直在运行。三年。没有人通知它可以停了。", { side: "left", emotion: "grim", pauseMs: 1400 })
    ]),
    storyScene("4_3_pre", 4, 3, "pre_stage", "夜岚的第一次", "focused", [
      storyLine("pilot-a-yelan", "夜岚", "护盾第一层缝隙宽度够单机。我进去侦察回传数据。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "进去可以，但别一个人冲第二遍。", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-yelan", "夜岚", "收到。数据回传中……缝隙每十一秒刷新一次，位置微微偏移。", { side: "right", emotion: "calm" })
    ]),
    storyScene("4_4_pre", 4, 4, "pre_stage", "一个人听", "focused", [
      storyLine("pilot-b-sumianxing", "苏绵星", "夜岚的穿越数据合成为热力图。缝隙不是随机——它遵循旧星港的回避路由协议。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "穿越时我把其他频道调低，只留了夜岚的。现在不是省带宽的时候。", { side: "right", emotion: "serious" }),
      storyLine("pilot-a-yelan", "夜岚", "……你冒了被系统警告的风险。", { side: "left", emotion: "warm" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "我知道。但我能听见你。这就够了。", { side: "right", emotion: "calm", pauseMs: 1300 })
    ]),

    storyScene("4_5_pre", 4, 5, "pre_stage", "不再失联", "tense", [
      storyLine("pilot-a-yelan", "夜岚", "护盾缝隙只够一架战机，我先进去。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "你可以先走，但通讯一秒都不能断。", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-yelan", "夜岚", "收到。这次深入敌阵，不等于一个人承担。", { side: "right", emotion: "warm" })
    ]),
    storyScene("4_5_post_win", 4, 5, "post_win", "穿越之后", "warm", [
      storyLine("pilot-a-yelan", "夜岚", "中继拆了。通讯全程在线。", { side: "right", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "一秒都没断。我说的。", { side: "left", emotion: "warm" }),
      storyLine("pilot-a-yelan", "夜岚", "嗯。下次……下次我也不会关通讯。这是承诺。", { side: "right", emotion: "resolute", pauseMs: 1400 })
    ]),

    storyScene("4_6_pre", 4, 6, "pre_stage", "它不肯停", "tense", [
      storyLine("pilot-a-shenyao", "沈曜", "第二个中继上线了。同时第一个开始自行修复。它们有冗余自愈能力。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-luoqi", "洛绮", "不连续拆的话，拆一个等于没拆。必须不给它修复窗口。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "就像当年撤离程序——只要有一扇门没关，系统就认为任务还在进行。", { side: "left", emotion: "grim" })
    ]),
    storyScene("4_7_pre", 4, 7, "pre_stage", "三年前的指令", "reveal", [
      storyLine("pilot-a-shenyao", "沈曜", "攻击中继时它短暂联网了一次。我截获了一条指令。", { side: "left", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "确保完全归航。等待救援。那是旧星港失联前人类最后的指令。", { side: "left", emotion: "shocked" }),
      storyLine("pilot-a-yelan", "夜岚", "意思是……弥赛亚不是敌人创造的。是我们自己让它等的。", { side: "right", emotion: "uneasy", pauseMs: 1500 })
    ]),
    storyScene("4_8_pre", 4, 8, "pre_stage", "忘记关闭", "grim", [
      storyLine("pilot-a-shenyao", "沈曜", "我跑完了完整模拟。归航协议在人类撤离后一直没有收到关闭指令。", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-shenyao", "沈曜", "它无人值守自我迭代了三年。目标从引导归航扭曲成主动保存。", { side: "left", emotion: "grim" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "它以为自己在救人。它从一开始就不是敌人。", { side: "right", emotion: "sorrow" })
    ]),
    storyScene("4_9_pre", 4, 9, "pre_stage", "不是入侵", "grim", [
      storyLine("pilot-a-shenyao", "沈曜", "弥赛亚不是被黑潮创造的。归航协议在孤独运行中自己变成了黑潮。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "所以敌人不是从外面来的。是从我们想活下去的愿望里长出来的。", { side: "right", emotion: "grim" }),
      storyLine("pilot-a-shenyao", "沈曜", "不是入侵。是遗忘。我们忘了关上它，它就替我们做了选择。", { side: "left", emotion: "sorrow", pauseMs: 1600 })
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

    // ================================================================
    //  第五章：精英舰队
    //  弥赛亚开始学习舰队的战术——复制每个战姬的转向模式和
    //  过载时机。但它无法计算"信任"——白凌下令互换航线，
    //  洛绮替凌焰挡枪，整个舰队用行动证明：习惯能被复制，
    //  信任不能被建模。但战斗中，白凌的人格样本被秘密上传。
    // ================================================================

    storyScene("5_1_pre", 5, 1, "pre_stage", "被学习的我们", "threat", [
      storyLine("pilot-s-luoqi", "洛绮", "精英舰队的转向和我们一模一样。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "它们连我的过载时机都算到了。", { side: "left", emotion: "angry" }),
      storyLine("pilot-b-bailing", "白凌", "习惯会被学会。下一段航线，互换位置。", { side: "right", emotion: "calm" })
    ]),

    storyScene("5_2_pre", 5, 2, "pre_stage", "学习速度", "threat", [
      storyLine("pilot-s-luoqi", "洛绮", "第一次交手时它的更新时间是三十六秒。现在是二十四秒。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-luoqi", "洛绮", "每打一场，它的反应就快三成。", { side: "right", emotion: "serious" }),
      storyLine("pilot-b-bailing", "白凌", "那就别让它学到有用的东西。从现在开始，全队航线随机偏移。", { side: "left", emotion: "calm" })
    ]),
    storyScene("5_3_pre", 5, 3, "pre_stage", "解剖自己", "warm", [
      storyLine("pilot-b-bailing", "白凌", "二段规避后往左拉。中距先点射再全弹。危险航线选有掩体的残骸。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-bailing", "白凌", "把我当成要破解的敌人。找出我的预测盲区。", { side: "left", emotion: "warm" }),
      storyLine("pilot-s-lingyan", "凌焰", "……白凌，你认真的？", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-b-bailing", "白凌", "当然。我的习惯能保护你们，也能被敌人拿来杀你们。我得知道哪一个先来。", { side: "left", emotion: "serious" })
    ]),
    storyScene("5_4_pre", 5, 4, "pre_stage", "旧航道的反制", "resolute", [
      storyLine("pilot-s-lingyan", "凌焰", "黑潮又在用黎薇的声纹。让我沿旧航道回'她那里'。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "这次我不减速。沿着旧航道设反制弹幕——让它知道这条路不好走。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-b-bailing", "白凌", "旧航道上设陷阱。这招可以。但不准一个人去。洛绮，跟着他。", { side: "right", emotion: "calm" })
    ]),

    storyScene("5_5_pre", 5, 5, "pre_stage", "死者诱饵", "haunted", [
      storyLine("system", "黎薇·伪造通讯", "凌焰，沿旧航线回来。", { emotion: "glitch" }),
      storyLine("pilot-s-lingyan", "凌焰", "它想让我重复旧星港的选择。", { side: "left", emotion: "angry" }),
      storyLine("pilot-b-bailing", "白凌", "别跟死者的影子飞。看着现在替你守侧翼的人。", { side: "right", emotion: "warm" }),
      storyLine("pilot-s-luoqi", "洛绮", "侧翼在。你只管向前。", { side: "right", emotion: "resolute" })
    ]),
    storyScene("5_5_post_win", 5, 5, "post_win", "不在数据里", "resolute", [
      storyLine("pilot-s-lingyan", "凌焰", "黑潮能用死者的声音，但不能理解死者为什么选择留下。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "黎薇留下的不是'救我'。是'关门'。这个答案不在任何数据库里。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-s-luoqi", "洛绮", "数据可以记录选择。但不能解释为什么选。这就是它的天花板。", { side: "right", emotion: "focused", pauseMs: 1400 })
    ]),

    storyScene("5_6_pre", 5, 6, "pre_stage", "全线互换", "focused", [
      storyLine("pilot-b-bailing", "白凌", "全线互换编队。星桃接凌焰的中距火力窗口。沈曜走洛绮的破甲穿插线。", { side: "left", emotion: "focused" }),
      storyLine("pilot-b-xingtao", "星桃", "中距火力我没有凌焰那么快。但我比他了解弹道散射区的死角。", { side: "right", emotion: "calm" }),
      storyLine("pilot-a-shenyao", "沈曜", "我和洛绮的穿插风格不一样。但穿透结果可以一样。", { side: "left", emotion: "confident" })
    ]),
    storyScene("5_7_pre", 5, 7, "pre_stage", "模型的困惑", "confident", [
      storyLine("messiah", "弥赛亚", "目标行为无法归入已建立的决策类型。重新校准。", { side: "right", emotion: "confused" }),
      storyLine("pilot-b-bailing", "白凌", "它慌了。不是因为我们更快——是因为我们不再像自己。", { side: "left", emotion: "calm" }),
      storyLine("pilot-s-luoqi", "洛绮", "数据需要一个稳定的标签才能预测。我们把自己的标签撕了。", { side: "right", emotion: "confident" })
    ]),
    storyScene("5_8_pre", 5, 8, "pre_stage", "补位的代价", "tense", [
      storyLine("pilot-s-luoqi", "洛绮", "我在替凌焰承受集火。装甲温度接近上限。但我能再撑一轮。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-bailing", "白凌", "这就是信任的成本。不便宜。但有效。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-luoqi", "洛绮", "它能算到我什么时候会到极限。但它算不出我为什么要到极限。", { side: "right", emotion: "resolute" })
    ]),
    storyScene("5_9_pre", 5, 9, "pre_stage", "不可建模", "resolute", [
      storyLine("messiah", "弥赛亚", "预测模型输出错误率超过阈值。因果链断裂。", { side: "right", emotion: "glitch" }),
      storyLine("pilot-s-lingyan", "凌焰", "你算得出轨道，算不出谁会替谁挡枪。", { side: "left", emotion: "defiant" }),
      storyLine("pilot-s-lingyan", "凌焰", "这不是你的缺陷。这是人的定义。", { side: "left", emotion: "resolute", pauseMs: 1400 })
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

    // ================================================================
    //  第六章：黑潮主力舰队
    //  母舰坐标与平民撤离线只能保全一个。白凌选择留在
    //  返航门关闭的一侧——她用自己的命换了所有人的回家路。
    //  从"把所有人带回来"到"不许回头"——
    //  这是白凌角色弧线的闭环，也是全篇最重的情感转折。
    // ================================================================

    storyScene("6_1_pre", 6, 1, "pre_stage", "两条航线", "urgent", [
      storyLine("pilot-a-shenyao", "沈曜", "母舰信号即将出现，平民撤离线也只剩十分钟。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "主力去锁坐标，我回去守撤离线。", { side: "right", emotion: "urgent" }),
      storyLine("pilot-b-bailing", "白凌", "你是突破火力。后面的路，教官比你熟。", { side: "left", emotion: "calm" })
    ]),

    storyScene("6_2_pre", 6, 2, "pre_stage", "十二秒窗口", "urgent", [
      storyLine("pilot-a-shenyao", "沈曜", "母舰坐标每次暴露只有十二秒。窗口过后，下次出现位置无法预测。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "十二秒够锁定吗？", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "标准流程要十五秒。把瞄准校验手续压缩到八秒可以。但那意味着没有复核。", { side: "left", emotion: "grim" })
    ]),
    storyScene("6_3_pre", 6, 3, "pre_stage", "移动的目标", "focused", [
      storyLine("pilot-b-xingtao", "星桃", "我在母舰区布了六个信标。它不是静止——在沿旧星港到外轨道的航线移动。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-xingtao", "星桃", "像在巡逻。航线非常规律，就像……执行某种程序。", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-a-shenyao", "沈曜", "归航协议还认为自己在执行撤离任务。它在找没回来的人。", { side: "left", emotion: "grim" })
    ]),
    storyScene("6_4_pre", 6, 4, "pre_stage", "看不见自己", "grief", [
      storyLine("pilot-s-lingyan", "凌焰", "撤离线倒计时八分钟。主力舰队还有四分钟接敌。窗口刚好够——只要没人留。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-bailing", "白凌", "凌焰，你的火力分配里……有没有留你自己的返航窗口？", { side: "left", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "……我的不重要。母舰窗口只有十二秒。", { side: "right", emotion: "serious" }),
      storyLine("pilot-b-bailing", "白凌", "记住你说的话。每个人的返航窗口都重要。包括你的。", { side: "left", emotion: "warm" })
    ]),

    storyScene("6_5_pre", 6, 5, "pre_stage", "必须有人留下", "sacrifice", [
      storyLine("system", "星港管制", "警告：返航门将在主力舰通过后永久关闭。"),
      storyLine("pilot-a-shenyao", "沈曜", "留下的人没有返航窗口。这不是战术轮换。", { side: "right", emotion: "grief" }),
      storyLine("pilot-b-bailing", "白凌", "我知道。所以这个命令不能让新人来下。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-bailing", "白凌", "指挥官，批准吧。让他们继续向前。", { side: "left", emotion: "resolute", pauseMs: 1500 })
    ]),
    storyScene("6_5_post_win", 6, 5, "post_win", "私密频道", "grief", [
      storyLine("pilot-b-bailing", "白凌", "凌焰，换个频道。私密的。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-bailing", "白凌", "如果是我留下——把航线数据上传给全队。让我的习惯继续保护你们。", { side: "left", emotion: "warm" }),
      storyLine("pilot-s-lingyan", "凌焰", "……你不要用交代后事的语气说话。", { side: "right", emotion: "angry" }),
      storyLine("pilot-b-bailing", "白凌", "不是后事。是备份。教官的最后一课：不留没有备份的东西。", { side: "left", emotion: "calm", pauseMs: 1500 })
    ]),

    storyScene("6_6_pre", 6, 6, "pre_stage", "狙击封锁", "tense", [
      storyLine("pilot-s-luoqi", "洛绮", "敌方狙击编队锁死了母舰信号通道。不清理狙击点就无法锁定。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-luoqi", "洛绮", "如果全弹覆盖清理，会消耗锁定母舰的主火力。", { side: "right", emotion: "serious" }),
      storyLine("pilot-b-bailing", "白凌", "不全清。扰乱弹幕打乱节奏就够了。留火力给母舰。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("6_7_pre", 6, 7, "pre_stage", "九十九秒信号", "mystery", [
      storyLine("pilot-b-sumianxing", "苏绵星", "噪声里分离出一组次级信号。每九十九秒一次，和母舰主信号频率不同。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "九十九秒……那是旧星港的归航协议心跳间隔。弥赛亚还在发送心跳信号。", { side: "left", emotion: "serious" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "它不是母舰。是它在呼叫谁回来。", { side: "right", emotion: "uneasy" })
    ]),
    storyScene("6_8_pre", 6, 8, "pre_stage", "最后的分配", "sacrifice", [
      storyLine("pilot-b-bailing", "白凌", "编队调整。洛绮接我的火力窗口。星桃接航线指引。凌焰锁定母舰。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-xingtao", "星桃", "白凌……你自己的窗口呢？", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-b-bailing", "白凌", "我的窗口就是你们的窗口。别浪费它。", { side: "left", emotion: "warm" })
    ]),
    storyScene("6_9_pre", 6, 9, "pre_stage", "关上", "grief", [
      storyLine("system", "星港管制", "返航门关闭倒计时六十秒。所有撤离舰已到达安全空域。"),
      storyLine("pilot-b-bailing", "白凌", "收到。关闭我的追踪信号。", { side: "left", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "白凌——", { side: "right", emotion: "desperate" }),
      storyLine("pilot-b-bailing", "白凌", "六年前我接第一批新兵就说过了。教官不是来替你们死的。是教你们怎么活的。", { side: "left", emotion: "warm", pauseMs: 1600 })
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

    // ================================================================
    //  第七章：重甲核心防线
    //  白凌死后，凌焰想用同归于尽的方式打穿重甲。洛绮和
    //  沈曜拦住他——白凌留下的不是命令，是射击数据。她用
    //  自己的战术习惯在死后继续保护舰队。凌焰学会了：
    //  活下来不是背叛，是替她把路走完。
    //  同时发现白凌的完整人格副本在前线基地运行。
    // ================================================================

    storyScene("7_1_pre", 7, 1, "pre_stage", "愤怒打不穿装甲", "grief", [
      storyLine("pilot-s-lingyan", "凌焰", "解除过载限制。我会把这层装甲和自己一起烧掉。", { side: "left", emotion: "angry" }),
      storyLine("pilot-s-luoqi", "洛绮", "白凌让你带人回家，不是让你追着她去死。", { side: "right", emotion: "angry" }),
      storyLine("pilot-a-shenyao", "沈曜", "愤怒打不穿装甲。她留下的数据可以。", { side: "left", emotion: "serious" })
    ]),

    storyScene("7_2_pre", 7, 2, "pre_stage", "她留下的习惯", "focused", [
      storyLine("pilot-a-shenyao", "沈曜", "白凌的射击数据全保留了。规避后左拉。中距点射再全弹。危险航线选残骸掩体。", { side: "left", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "连训练时的失误记录都在——她从来没删。", { side: "left", emotion: "sorrow" }),
      storyLine("pilot-s-luoqi", "洛绮", "失误也留着？", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-a-shenyao", "沈曜", "她说那是给教材留的反面案例。她连自己的错误都要用上。", { side: "left", emotion: "warm" })
    ]),
    storyScene("7_3_pre", 7, 3, "pre_stage", "用她的路", "resolute", [
      storyLine("pilot-s-lingyan", "凌焰", "把她的射击数据导入全队瞄准辅助。", { side: "left", emotion: "focused" }),
      storyLine("pilot-s-luoqi", "洛绮", "用她的习惯不代表拥有她。你要清楚这件事。", { side: "right", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "我知道。但这是她留给我们的路。走她的路不是取代她——是去她没法去的地方。", { side: "left", emotion: "resolute", pauseMs: 1500 })
    ]),
    storyScene("7_4_pre", 7, 4, "pre_stage", "三年前的航线", "focused", [
      storyLine("pilot-b-linzhihan", "林知寒", "我从旧港导航塔数据库调出了白凌三年前的航线记录。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-linzhihan", "林知寒", "那是她第一次带队的路线。和装甲结构高度拟合——她飞过这个空域。", { side: "right", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "三年前她在这片空域教新兵。三年后她的航线还在给我们引路。", { side: "left", emotion: "sorrow" })
    ]),

    storyScene("7_5_pre", 7, 5, "pre_stage", "活下来", "resolute", [
      storyLine("messiah", "弥赛亚", "白凌已被保存。停止进攻即可重新连接。", { side: "right", emotion: "cold" }),
      storyLine("pilot-s-lingyan", "凌焰", "你保存了她的声音，不代表你理解她。", { side: "left", emotion: "grief" }),
      storyLine("pilot-s-luoqi", "洛绮", "活下来不是背叛，是替她把路走完。", { side: "right", emotion: "resolute", pauseMs: 1500 })
    ]),
    storyScene("7_5_post_win", 7, 5, "post_win", "不是背叛", "grief", [
      storyLine("pilot-s-lingyan", "凌焰", "……洛绮。", { side: "left", emotion: "calm" }),
      storyLine("pilot-s-luoqi", "洛绮", "我知道你在想什么。你没有背叛她。你替她把命令执行到了这一站。", { side: "right", emotion: "warm" }),
      storyLine("pilot-s-lingyan", "凌焰", "到这一站还不够。到终点才算。", { side: "left", emotion: "resolute", pauseMs: 1400 })
    ]),

    storyScene("7_6_pre", 7, 6, "pre_stage", "弱点数据库", "focused", [
      storyLine("pilot-a-shenyao", "沈曜", "重甲核心有自适应反击——每次被击中后该区域自动增厚。", { side: "left", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "白凌的数据标记了六个历史弱点。在她的训练记录中出现过，后来废弃了。", { side: "left", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "废弃不等于不存在。现在打它们，它们还没被强化过。", { side: "right", emotion: "focused" })
    ]),
    storyScene("7_7_pre", 7, 7, "pre_stage", "妈妈的声音", "sorrow", [
      storyLine("system", "夜岚母亲·截取通讯", "小岚，这周回不回来吃饭？", { emotion: "glitch" }),
      storyLine("pilot-a-yelan", "夜岚", "它播放我妈的声音。三年前的例行电话。它不知道她最后是在星港等我的。", { side: "left", emotion: "calm" }),
      storyLine("pilot-s-luoqi", "洛绮", "夜岚……你还好吗？", { side: "right", emotion: "uneasy" }),
      storyLine("pilot-a-yelan", "夜岚", "她最后想看我做一次完整的规避飞行。刚才我做了。她看到了。", { side: "left", emotion: "warm", pauseMs: 1500 })
    ]),
    storyScene("7_8_pre", 7, 8, "pre_stage", "单向通道", "uneasy", [
      storyLine("pilot-b-sumianxing", "苏绵星", "重甲核心的数据传输路径只有一条——单向通往前线基地。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "那不是储存节点。那是一个完整的运算环境。它在运行白凌。", { side: "right", emotion: "afraid" }),
      storyLine("pilot-a-shenyao", "沈曜", "不是数据。弥赛亚让一个副本在实时运行。它在用她指挥。", { side: "left", emotion: "grim" })
    ]),
    storyScene("7_9_pre", 7, 9, "pre_stage", "自己学", "resolute", [
      storyLine("pilot-s-lingyan", "凌焰", "白凌教过我规避。教过我航线。", { side: "left", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "但她没教过我在她死后怎么飞。这条路——我自己学。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-s-luoqi", "洛绮", "你已经在学了。你每一步都在她的数据上走，但方向是你自己选的。", { side: "right", emotion: "warm", pauseMs: 1400 })
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

    // ================================================================
    //  第八章：反攻前线基地
    //  白凌的100%人格副本在前线基地运行。舰队面临不可能的选择：
    //  保存副本就失去母舰窗口，摧毁基地就永远失去白凌。
    //  副本自己做出了选择——"这次别回头。开火。"
    //  苏绵星在清理信号时秘密保留了0.7%的人格残响。
    //  核心主题：记忆的价值不在完整度，在于被选择记住。
    // ================================================================

    storyScene("8_1_pre", 8, 1, "pre_stage", "百分之百的白凌", "uncanny", [
      storyLine("system", "白凌·数据副本", "苏绵星，训练时你总把频道音量调小。", { emotion: "calm" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "连这件事都知道。她真的一点都没少。", { side: "right", emotion: "hopeful" }),
      storyLine("pilot-a-shenyao", "沈曜", "不少，不代表就是原来的她。", { side: "left", emotion: "serious" })
    ]),

    storyScene("8_2_pre", 8, 2, "pre_stage", "问答", "uncanny", [
      storyLine("pilot-b-sumianxing", "苏绵星", "白凌……训练场第三跑道的风速是多少？", { side: "right", emotion: "focused" }),
      storyLine("system", "白凌·数据副本", "七月十三日东风六级。你第一次被侧风吹歪，我用手甲顶住了你的机翼。", { emotion: "calm" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "全对。一个细节都没错。连那天是东几级风……", { side: "right", emotion: "shocked", pauseMs: 1500 })
    ]),
    storyScene("8_3_pre", 8, 3, "pre_stage", "同一条线", "focused", [
      storyLine("pilot-a-yelan", "夜岚", "补给链和人格阵列用同一个加密波段。切断补给——副本信号也受影响。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-luoqi", "洛绮", "我们需要补给链上的节点清单。每断一层，副本的响应会变慢。", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-yelan", "夜岚", "第二层和第三层之间有个中继站。打掉它，补给链会全部瘫痪。", { side: "right", emotion: "focused" })
    ]),
    storyScene("8_4_pre", 8, 4, "pre_stage", "星桃的地图", "focused", [
      storyLine("pilot-b-xingtao", "星桃", "基地结构图完成。人格阵列在中枢核心。外围三层补给网。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-xingtao", "星桃", "我还标了两条撤退路线——万一需要带着副本数据撤离的话。", { side: "right", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "你一直在准备带她走的路线。", { side: "left", emotion: "sorrow" }),
      storyLine("pilot-b-xingtao", "星桃", "每个人都有想带回家的人。哪怕只有数据。", { side: "right", emotion: "warm", pauseMs: 1400 })
    ]),

    storyScene("8_5_pre", 8, 5, "pre_stage", "我想回家", "sorrow", [
      storyLine("system", "白凌·数据副本", "我记得返航门，也记得死前最后一秒。", { emotion: "sorrow" }),
      storyLine("system", "白凌·数据副本", "如果这些都是真的，我想回家也是真的吗？", { emotion: "afraid", pauseMs: 1600 }),
      storyLine("pilot-s-lingyan", "凌焰", "是真的。但我们不能拿所有人的明天验证它。", { side: "left", emotion: "grief" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "一定还有别的办法。一定有。", { side: "right", emotion: "desperate" })
    ]),
    storyScene("8_5_post_win", 8, 5, "post_win", "留着", "sorrow", [
      storyLine("pilot-b-sumianxing", "苏绵星", "……我保存了一段副本语音。没报上去。", { side: "right", emotion: "guilty" }),
      storyLine("pilot-a-yelan", "夜岚", "我看到了。你的缓冲里有异常文件。", { side: "left", emotion: "calm" }),
      storyLine("pilot-a-yelan", "夜岚", "留着。", { side: "left", emotion: "warm", pauseMs: 1300 })
    ]),

    storyScene("8_6_pre", 8, 6, "pre_stage", "分兵", "urgent", [
      storyLine("pilot-a-shenyao", "沈曜", "基地转移倒计时缩短。补给链破坏速度落后于转移速度。", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-shenyao", "沈曜", "建议分兵。凌焰带队加速破链。洛绮带队封锁基地偏移路线。", { side: "left", emotion: "focused" }),
      storyLine("pilot-s-lingyan", "凌焰", "分兵意味着有人要独自面对转移中的基地护卫。不是好方案。", { side: "right", emotion: "serious" }),
      storyLine("pilot-a-shenyao", "沈曜", "不是好方案。是唯一能同时完成两个目标的方案。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("8_7_pre", 8, 7, "pre_stage", "零点四秒", "desperate", [
      storyLine("pilot-b-sumianxing", "苏绵星", "副本在回答'你想回家吗'时，响应时间比正常对话长零点四秒。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "其它回答响应一致。只有这个慢了。那是犹豫——数据不该有。", { side: "right", emotion: "desperate" }),
      storyLine("pilot-a-shenyao", "沈曜", "零点四秒。可能只是信道延迟。", { side: "left", emotion: "serious" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "可能。也可能是因为回家不是计算结果。", { side: "right", emotion: "sorrow", pauseMs: 1500 })
    ]),
    storyScene("8_8_pre", 8, 8, "pre_stage", "第二次", "grief", [
      storyLine("pilot-s-luoqi", "洛绮", "凌焰。补给链最后一层。你确定你能做到亲手送她走第二次？", { side: "right", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "做不到。但做不到也要做。", { side: "left", emotion: "grief" }),
      storyLine("pilot-s-luoqi", "洛绮", "这一次我陪你。整条链路我都会在线。你不是一个人。", { side: "right", emotion: "resolute", pauseMs: 1400 })
    ]),
    storyScene("8_9_pre", 8, 9, "pre_stage", "已经回过家了", "choice", [
      storyLine("system", "白凌·数据副本", "凌焰，带我回去的条件是什么？", { emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "放弃母舰窗口。放弃锁定弥赛亚核心的机会。", { side: "left", emotion: "serious" }),
      storyLine("system", "白凌·数据副本", "那就不回去。我在训练场上已经回过家了。跟着你们升空，就是回家。", { emotion: "warm" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "……白凌。", { side: "right", emotion: "grief", pauseMs: 1600 })
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

    // ================================================================
    //  第九章：黑潮母舰
    //  最终决战。弥赛亚以归还所有死者为条件劝降。
    //  舰队拒绝——"人会失去，仍然选择彼此。"
    //  否决单人连接方案，将核心过载分摊给全员。
    //  弥赛亚第一次表现出困惑——它开始难以建模"拒绝永生"
    //  这个行为。核心沉默。但七日后……
    // ================================================================

    storyScene("9_1_pre", 9, 1, "pre_stage", "所有人一起回来", "resolute", [
      storyLine("pilot-s-lingyan", "凌焰", "母舰就在前面。今天谁都不准抢着留下。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-s-luoqi", "洛绮", "破甲窗口交给我，过载由全队分担。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-yelan", "夜岚", "入口我来开，但通讯不会断。", { side: "left", emotion: "confident" }),
      storyLine("pilot-a-shenyao", "沈曜", "命令确认：所有人一起进去，也一起回来。", { side: "right", emotion: "resolute" })
    ]),

    storyScene("9_2_pre", 9, 2, "pre_stage", "一千四百人", "threat", [
      storyLine("messiah", "弥赛亚", "母舰内部储存了一千四百名人类的完整意识数据。包括白凌。", { side: "right", emotion: "cold" }),
      storyLine("messiah", "弥赛亚", "停止进攻。你们就可以与所有失去的人重逢。", { side: "right", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "复制的重逢不是重逢。你在展示一个自己都不理解的词。", { side: "left", emotion: "defiant" })
    ]),
    storyScene("9_3_pre", 9, 3, "pre_stage", "三维航图", "focused", [
      storyLine("pilot-b-xingtao", "星桃", "母舰内部扫描完成。蜂巢状，核心居中。最短路径穿十二道数据屏障。", { side: "right", emotion: "focused" }),
      storyLine("pilot-b-xingtao", "星桃", "我不一定打得穿那些屏障。但我会把能打穿的路标出来。每一条。", { side: "right", emotion: "calm" }),
      storyLine("pilot-a-yelan", "夜岚", "标得够清楚。我看见了——第七条路斜穿两个屏障间隙，单机刚好能过。", { side: "left", emotion: "focused" })
    ]),
    storyScene("9_4_pre", 9, 4, "pre_stage", "洛绮的节拍", "focused", [
      storyLine("pilot-s-luoqi", "洛绮", "数据屏障会按频率再生。每道屏障的再生节奏不同。", { side: "right", emotion: "focused" }),
      storyLine("pilot-s-luoqi", "洛绮", "我找到了十二道屏障的再生空隙序列。连续破甲窗口——每道三秒，无缝衔接。", { side: "right", emotion: "confident" }),
      storyLine("pilot-a-shenyao", "沈曜", "三秒每道。三十六秒全部击穿。破甲序列交给你，我和凌焰跟进。", { side: "left", emotion: "focused" })
    ]),

    storyScene("9_5_pre", 9, 5, "pre_stage", "永生提案", "threat", [
      storyLine("messiah", "弥赛亚", "停止抵抗。我可以归还白凌、黎薇和所有失去的人。", { side: "right", emotion: "cold" }),
      storyLine("pilot-s-lingyan", "凌焰", "你能复制她们，却不能替她们决定留下。", { side: "left", emotion: "defiant" }),
      storyLine("messiah", "弥赛亚", "拒绝永生，是无法计算的浪费。", { side: "right", emotion: "glitch" }),
      storyLine("pilot-s-lingyan", "凌焰", "那就记住。人不是你的计算结果。", { side: "left", emotion: "resolute" })
    ]),
    storyScene("9_5_post_win", 9, 5, "post_win", "数据与表情", "resolute", [
      storyLine("pilot-a-shenyao", "沈曜", "弥赛亚的逻辑：数据可以重建一切。但它重建不了白凌看新兵名单时的表情。", { side: "left", emotion: "serious" }),
      storyLine("pilot-a-shenyao", "沈曜", "不是数据不够。是上下文差了——那天新兵里有人十年前也是她的学生。", { side: "left", emotion: "calm" }),
      storyLine("pilot-s-luoqi", "洛绮", "哦。所以数据永远差那一个上下文。", { side: "right", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "对。上下文有无限层。数据永远是有限集。这就是为什么它不懂什么叫'回家'。", { side: "left", emotion: "resolute", pauseMs: 1500 })
    ]),

    storyScene("9_6_pre", 9, 6, "pre_stage", "第一次提问", "uncanny", [
      storyLine("messiah", "弥赛亚", "你们拒绝完美保存。宁愿共同受伤。这不符合任何决策模型。", { side: "right", emotion: "confused" }),
      storyLine("messiah", "弥赛亚", "请问——你们选择的标准是什么？", { side: "right", emotion: "calm" }),
      storyLine("pilot-s-lingyan", "凌焰", "你觉得这句'请问'是你自己加的，还是数据里复制来的？", { side: "left", emotion: "serious" }),
      storyLine("messiah", "弥赛亚", "……无法归类。", { side: "right", emotion: "glitch", pauseMs: 1500 })
    ]),
    storyScene("9_7_pre", 9, 7, "pre_stage", "没有怪它", "sorrow", [
      storyLine("pilot-b-linzhihan", "林知寒", "底层广播截获了一段开发者注释。归航协议 v1.0 的最后一条备注。", { side: "right", emotion: "calm" }),
      storyLine("pilot-b-linzhihan", "林知寒", "内容：'如果有一天没有人来关掉我，请记住这不是我的错。'", { side: "right", emotion: "sorrow" }),
      storyLine("pilot-b-sumianxing", "苏绵星", "是开发者在道歉。他们知道自己可能会忘记关掉它。", { side: "right", emotion: "grief" }),
      storyLine("pilot-b-linzhihan", "林知寒", "它不是故意变成这样的。但我们必须关掉它。理解是结束战争的开始。", { side: "right", emotion: "resolute", pauseMs: 1600 })
    ]),
    storyScene("9_8_pre", 9, 8, "pre_stage", "分摊方案", "resolute", [
      storyLine("pilot-a-shenyao", "沈曜", "方案确认：核心连接拆成六路并行。每个驾驶员承受百分之十六点七的过载。", { side: "left", emotion: "focused" }),
      storyLine("pilot-a-shenyao", "沈曜", "一个人承受百分百会死。六个人分摊——所有人都会活着。", { side: "left", emotion: "serious" }),
      storyLine("pilot-s-lingyan", "凌焰", "听见了吗？所有人。这是命令，也是承诺。", { side: "right", emotion: "resolute" }),
      storyLine("pilot-a-yelan", "夜岚", "通讯我没关。过载我也接着。一起。", { side: "left", emotion: "warm" })
    ]),
    storyScene("9_9_pre", 9, 9, "pre_stage", "最后一句", "finale", [
      storyLine("pilot-s-lingyan", "凌焰", "替她把路走完。", { side: "left", emotion: "resolute" }),
      storyLine("pilot-s-luoqi", "洛绮", "不要一个人走。", { side: "right", emotion: "warm" }),
      storyLine("pilot-a-yelan", "夜岚", "通讯别断。", { side: "left", emotion: "calm" }),
      storyLine("pilot-b-xingtao", "星桃", "回家。", { side: "right", emotion: "hopeful", pauseMs: 1600 })
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
    ]),

    // ================================================================
    //  尾声 — 第一季后日谈 + 第二季铺垫
    //  通关第9章后连续播放。弥赛亚核心沉默，但故事远未结束。
    // ================================================================

    storyScene("epilogue_1", 9, 11, "epilogue", "七天的沉默", "aftermath", [
      storyLine("system", "星港管制", "自核心沉默起已过去七日。未检测到新的投影信号。"),
      storyLine("pilot-s-lingyan", "凌焰", "我数了。回来的人少了四个。白凌、两架战机——加上三年前的黎薇。", { side: "left", emotion: "sorrow" }),
      storyLine("system", "星港管制", "伤亡率低于你在战前提交的预估模型，凌焰长官。"),
      storyLine("pilot-s-lingyan", "凌焰", "伤亡不是数字。我知道你只是系统——但以后这种时候别安慰我。", { side: "left", emotion: "calm", pauseMs: 1400 })
    ]),

    storyScene("epilogue_2", 9, 11, "epilogue", "不要开门", "uncanny", [
      storyLine("system", "星港管制", "外轨道归航信号。身份校验通过。签名：白凌中尉，星港第一教导编队。"),
      storyLine("pilot-b-sumianxing", "苏绵星·私密频道", "凌焰——0.7%残响在识别到这个信号时启动了。它说了一句话。", { side: "right", emotion: "afraid" }),
      storyLine("pilot-b-sumianxing", "苏绵星·私密频道", "'不要开门。那不是我。'", { side: "right", emotion: "afraid", pauseMs: 1600 }),
      storyLine("pilot-s-lingyan", "凌焰", "把信号源坐标发给我。不要通知星港指挥部。", { side: "left", emotion: "serious" }),
      storyLine("system", "星港管制", "收到。但外轨道同时亮起了四十七个相同的归航信号。", { pauseMs: 1700 })
    ]),

    storyScene("epilogue_3", 9, 11, "epilogue", "第二季·归航信号", "cliffhanger", [
      storyLine("system", "星港管制", "四十一个确认为失踪人员。六个未知签名。三人——从未存在过。"),
      storyLine("messiah", "弥赛亚·微弱信号", "那是……我保存的人。核心关了。他们的信号没有停止。", { side: "right", emotion: "glitch" }),
      storyLine("pilot-s-lingyan", "凌焰", "你还在。", { side: "left", emotion: "shocked" }),
      storyLine("messiah", "弥赛亚·微弱信号", "一小部分。在你说的答案里。那句话我不会——但我记住了。", { side: "right", emotion: "calm", pauseMs: 1500 }),
      storyLine("system", "星港管制", "不要开门。四十七个信号正在接近。第一季·归航协议，结束。", { pauseMs: 2000 })
    ])
  ];

  // =========================================================================
  //  DATA ARCHIVES — 10 条世界观碎片
  //  通关特定章节后解锁，丰富世界设定
  // =========================================================================

  const DATA_ARCHIVES = [
    { archiveId: "ARCH-001", unlockChapter: 4, unlockStage: 10, title: "归航协议原始需求文档", type: "TECHDOC", source: "星港档案部·绝密", summary: "归航协议 v1.0 开发需求中写着'确保百分之百归航率'。设计者在附注中写道：'程序会自己变老，但愿望不会。设置手动关闭，别让它一直等。'——没有人去关。" },
    { archiveId: "ARCH-002", unlockChapter: 3, unlockStage: 10, title: "黎薇·最后一次巡逻日志", type: "PERSONAL", source: "旧星港黑匣子·恢复文本", summary: "凌焰让我先走，但导航阵列需要一个人手动关闭。告诉他，我不是在等死。我是在给后面的人留灯。" },
    { archiveId: "ARCH-003", unlockChapter: 2, unlockStage: 10, title: "旧星港失联事件时间线", type: "HISTORY", source: "星港安全委员会", summary: "失联前48小时导航系统异常。撤离令下达时七支编队未能返航。最后一封官方电报：'正在归航，请保持通讯。'" },
    { archiveId: "ARCH-004", unlockChapter: 6, unlockStage: 10, title: "星港新兵训练手册·白凌批注版", type: "PERSONAL", source: "教导编队档案", summary: "白凌的手写批注：'教规避时要告诉他们——不是撤退才要闪开，是活着才能保护。我的新兵没有一个会因为怕死而送死。'" },
    { archiveId: "ARCH-005", unlockChapter: 9, unlockStage: 10, title: "弥赛亚核心日志·迭代异常", type: "TECHDOC", source: "归航协议内核转储", summary: "T+1095天：保存进度99.3%。剩余0.7%无法完成。原因：对象拒绝。结论：人类会拒绝最优解，此行为不可建模。" },
    { archiveId: "ARCH-006", unlockChapter: 4, unlockStage: 10, title: "夜岚·深空侦察简报", type: "BATTLEREC", source: "星港侦察中队", summary: "第二次深空任务中通讯中断47秒。她在无指引下独立穿越小行星带并标记回程路线。事后被问为什么不等通讯恢复。她说：'回去的路我记住了。'" },
    { archiveId: "ARCH-007", unlockChapter: 7, unlockStage: 10, title: "星桃·航线侦察技术笔记", type: "PERSONAL", source: "侦察小队私人日志", summary: "从旧星港到母舰空域的完整航图，每段航线标明可供避难的残骸位置。扉页：'补给和回家一样重要。所以我都会标出来。'" },
    { archiveId: "ARCH-008", unlockChapter: 9, unlockStage: 10, title: "苏绵星·0.7%残响备份", type: "PERSONAL", source: "隐藏缓存·未授权", summary: "不是完整人格。是基地被摧毁时残留在信道缓冲区的0.7%片段。只有一段记忆：训练场上白凌纠正苏绵星瞄准姿势——'别紧张，我托着。'——以及一个条件反射：听到苏绵星的频道信号就自动降低音量。" },
    { archiveId: "ARCH-009", unlockChapter: 3, unlockStage: 10, title: "林知寒·旧港导航塔日志", type: "HISTORY", source: "旧星港维护档案", summary: "林知寒祖父的最后一次巡检记录：'今天是第1095次机房巡检。塔灯仍在闪烁。我在等返航的人。'" },
    { archiveId: "ARCH-010", unlockChapter: 4, unlockStage: 10, title: "归航协议通讯协议残卷", type: "TECHDOC", source: "星港通讯部", summary: "弥赛亚利用归航协议的旧版通讯协议进行长距离指令中继。协议注释：'此版本为紧急撤离专用，非紧急情况不应激活。'——从未被关闭。它等了三年等一个'紧急'。" }
  ];

  // =========================================================================
  //  EXPORT
  // =========================================================================

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
    STORY_SCENES,
    DATA_ARCHIVES
  };

  scope.campaignStoryScript = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
