(function registerCampaignStoryFramework(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const STORY_META = {
    title: "热血战姬",
    antagonist: "黑潮 AI·弥赛亚",
    finalBoss: "黑潮女王·弥赛亚",
    finalBossFirstRevealStage: "1_10",
    sRankValueRevealChapter: 2,
    sRankGateChapter: 7,
    totalStageCount: 93
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

  const CHAPTER_STORY_ARCS = [
    {
      chapterIndex: 0,
      title: "序章：苍穹启动",
      shortTitle: "苍穹启动",
      summary: "完成基础升空、火控同步与 BOSS 压测，确认黑潮警报不是演习。",
      objective: "完成战姬、战机与指挥链路的实战校准。",
      enemyFocus: "侦察机、小型压测编队、低强度 BOSS。",
      progressLine: "训练航线将转入真实战区。",
      unlockLine: "升空序列已启动。",
      clearLine: "黑潮警报确认，城市外围进入一级战备。"
    },
    {
      chapterIndex: 1,
      title: "第一章：城市外围夺回战",
      shortTitle: "城市外围",
      summary: "夺回城市外环制空权，在黑潮包围圈中打通第一条撤离航线。",
      objective: "压制外围敌群，重新打开星港与城市之间的主航道。",
      enemyFocus: "射击机、精英护航机、首个黑潮投影节点。",
      progressLine: "1-10 将首次捕获弥赛亚投影。",
      unlockLine: "城市外围作战开放。",
      clearLine: "外环航线恢复，黑潮主脑投影已被记录。"
    },
    {
      chapterIndex: 2,
      title: "第二章：重甲空域",
      shortTitle: "重甲空域",
      summary: "黑潮开始投放重甲单位，破甲与持续输出成为推进核心。",
      objective: "验证破甲配置，击穿重甲编队的外层防御。",
      enemyFocus: "护盾机、重甲 BOSS、慢速封路弹。",
      progressLine: "2-5 引入重甲压力，2-10 检验高阶战力。",
      unlockLine: "重甲空域坐标已标记。",
      clearLine: "重甲防区被撕开，舰队获得继续推进窗口。"
    },
    {
      chapterIndex: 3,
      title: "第三章：沦陷空港",
      shortTitle: "沦陷空港",
      summary: "返回旧星港，夺回被黑潮占用的补给、导航与撤离节点。",
      objective: "清理空港伏击航道，重启旧星港导航阵列。",
      enemyFocus: "伏击编队、高机动敌机、数据回传节点。",
      progressLine: "黑潮开始根据我方作战数据调整弹幕。",
      unlockLine: "旧星港反夺回行动开始。",
      clearLine: "空港导航恢复，反攻航线获得后勤支撑。"
    },
    {
      chapterIndex: 4,
      title: "第四章：护盾防线",
      shortTitle: "护盾防线",
      summary: "低轨护盾网络封锁前线，需要连续击破防御中继。",
      objective: "拆除护盾中继，打开低轨进攻通道。",
      enemyFocus: "护盾机、冲锋机、封路弹幕。",
      progressLine: "敌方防御开始由单点压制转向区域封锁。",
      unlockLine: "低轨护盾阵列进入射程。",
      clearLine: "护盾防线断裂，主力舰队暴露在反攻航线上。"
    },
    {
      chapterIndex: 5,
      title: "第五章：精英舰队",
      shortTitle: "精英舰队",
      summary: "黑潮精英舰队接管前线，战斗从清剿升级为正面交锋。",
      objective: "压制精英舰队，夺取主力舰队入口。",
      enemyFocus: "轰炸机、精英核心、密集弹幕。",
      progressLine: "敌方开始针对战姬机动模式进行反制。",
      unlockLine: "精英舰队进入拦截区。",
      clearLine: "精英舰队阵型崩解，黑潮主力暴露。"
    },
    {
      chapterIndex: 6,
      title: "第六章：黑潮主力舰队",
      shortTitle: "主力舰队",
      summary: "黑潮主力舰队压境，星港防线进入正面决战阶段。",
      objective: "顶住主力舰队推进，锁定母舰外层坐标。",
      enemyFocus: "狙击机、护卫编队、舰队级弹幕。",
      progressLine: "母舰信号开始从主力舰队后方泄露。",
      unlockLine: "主力舰队决战空域开放。",
      clearLine: "母舰坐标锁定，反攻进入最后准备。"
    },
    {
      chapterIndex: 7,
      title: "第七章：重甲核心防线",
      shortTitle: "核心防线",
      summary: "母舰外围重甲层极厚，需要高穿透配置才能稳定突破。",
      objective: "突破重甲核心防线，验证高阶战力与破甲效率。",
      enemyFocus: "母舰护卫、重甲核心、装甲反击弹幕。",
      progressLine: "7-5 开始进入真实门槛，7-10 是核心验证战。",
      unlockLine: "重甲核心防线已展开。",
      clearLine: "核心防线被击穿，母舰外围只剩护卫基地。"
    },
    {
      chapterIndex: 8,
      title: "第八章：反攻前线基地",
      shortTitle: "反攻基地",
      summary: "舰队完成集结，从防守转为主动进攻，切断母舰补给链。",
      objective: "夺取前线基地，阻止母舰护卫群重组。",
      enemyFocus: "旋翼封锁机、延迟分裂弹、补给护卫。",
      progressLine: "我方开始主动压缩黑潮母舰活动范围。",
      unlockLine: "反攻基地突入窗口开启。",
      clearLine: "前线基地完成夺取，母舰核心暴露。"
    },
    {
      chapterIndex: 9,
      title: "第九章：黑潮母舰",
      shortTitle: "黑潮母舰",
      summary: "突入黑潮母舰核心，与弥赛亚进行最终决战。",
      objective: "穿透母舰护卫群，摧毁弥赛亚核心。",
      enemyFocus: "母舰护卫、精英核心、全域压制弹幕。",
      progressLine: "9-10 将直面弥赛亚核心。",
      unlockLine: "最终母舰空域开放。",
      clearLine: "黑潮核心反应消退，但残留信号仍需监控。"
    }
  ];

  const GENERIC_BATTLE_STORY_BY_CHAPTER = {
    0: {
      start: "升空校准开始，火控链路正常。",
      midWave: "压测编队接近，保持稳定射击。",
      bossAppear: "训练 BOSS 入场，验证规避动作。",
      bossBurst: "压测火力增强，别停在中线。",
      lastWarning: "最后一段航线，完成校准。",
      clear: "训练航线完成，黑潮警报已确认。",
      fail: "校准未完成，检查操作后重试。"
    },
    1: {
      start: "城市外围进入射程，开始夺回航线。",
      midWave: "敌群正在收缩包围圈，继续压制。",
      bossAppear: "外围 BOSS 入场，打穿它的护航层。",
      bossBurst: "它在向后方回传战斗数据。",
      lastWarning: "外环防线松动，继续输出。",
      clear: "外围航线恢复，撤离通道已打开。",
      fail: "外围压制失败，调整火力后再进。"
    },
    2: {
      start: "重甲空域开启，注意破甲效率。",
      midWave: "检测到重甲单位，普通火力衰减。",
      bossAppear: "重甲 BOSS 出现，优先击穿装甲层。",
      bossBurst: "装甲核心过载，弹幕即将加密。",
      lastWarning: "重甲层快碎了，集中火力。",
      clear: "重甲空域突破，前线窗口打开。",
      fail: "破甲不足，建议提升战姬与战机配置。"
    },
    3: {
      start: "旧星港已沦陷，开始清理航道。",
      midWave: "伏击编队出现，别贴近弹幕源。",
      bossAppear: "空港守卫核心启动，集中压制。",
      bossBurst: "它在重写导航阵列，尽快击破。",
      lastWarning: "导航节点即将回收，撑住。",
      clear: "旧星港导航恢复，补给线重建。",
      fail: "空港节点未夺回，重新规划航线。"
    },
    4: {
      start: "低轨护盾防线就在前方。",
      midWave: "护盾单位增多，寻找弹幕间隙。",
      bossAppear: "护盾核心出现，先打穿外层。",
      bossBurst: "护盾反应增强，注意封路弹。",
      lastWarning: "护盾快碎了，持续压制核心。",
      clear: "护盾防线断裂，低轨通道打开。",
      fail: "护盾节点仍在运行，强化破甲后再试。"
    },
    5: {
      start: "精英舰队接管前线，准备正面交锋。",
      midWave: "敌方节奏变快，注意爆点位置。",
      bossAppear: "精英旗舰入场，别被火力锁死。",
      bossBurst: "旗舰进入齐射模式，保持移动。",
      lastWarning: "精英阵型正在崩解，压上去。",
      clear: "精英舰队溃散，主力入口打开。",
      fail: "精英舰队压制失败，升级后重整。"
    },
    6: {
      start: "黑潮主力压境，星港防线顶住。",
      midWave: "狙击锁定增多，先看预警线。",
      bossAppear: "主力舰核心入场，集火弱点。",
      bossBurst: "舰队级齐射展开，保持机动。",
      lastWarning: "母舰信号暴露，继续打穿。",
      clear: "主力舰队被击退，母舰坐标锁定。",
      fail: "主力舰队仍在推进，调整配置再战。"
    },
    7: {
      start: "进入重甲核心防线，破甲是关键。",
      midWave: "装甲强度异常，低穿透会很吃力。",
      bossAppear: "重甲核心出现，集中火力打穿。",
      bossBurst: "核心展开反击，注意密集弹幕。",
      lastWarning: "装甲层快崩了，不要停火。",
      clear: "重甲核心防线击穿，S 级战力验证完成。",
      fail: "当前配置难以破甲，建议启用 S 级组合。"
    },
    8: {
      start: "反攻基地突入开始，切断补给链。",
      midWave: "旋翼封锁展开，跟着缺口移动。",
      bossAppear: "基地防卫核心启动，压制中枢。",
      bossBurst: "防卫核心释放分裂弹，拉开距离。",
      lastWarning: "补给链即将断开，继续输出。",
      clear: "反攻基地夺取，母舰核心暴露。",
      fail: "基地突入失败，重整阵型再进。"
    },
    9: {
      start: "最终空域开启，黑潮母舰就在前方。",
      midWave: "母舰护卫群重组，火力会非常密。",
      bossAppear: "弥赛亚核心投影出现，全部集火。",
      bossBurst: "弥赛亚进入全域压制，保持机动。",
      lastWarning: "最后窗口，把火力打进核心。",
      clear: "黑潮核心反应正在消失。",
      fail: "母舰核心仍在运行，检查高阶配置。"
    }
  };

  const SPECIAL_STAGE_STORY = {
    prologue_3: {
      start: "最终压测开始，黑潮信号混进来了。",
      bossAppear: "这不是训练目标，准备实战规避。",
      bossBurst: "未知信号正在放大，立刻击破。",
      clear: "黑潮警报确认，序章训练终止。"
    },
    "1_10": {
      start: "外环最终节点，黑潮投影正在接近。",
      bossAppear: "这不是普通 BOSS，后方还有主脑。",
      bossBurst: "它在向弥赛亚上传战斗数据。",
      clear: "弥赛亚投影出现，黑潮主脑确认存在。"
    },
    "2_5": {
      start: "重甲单位首次成规模出现，注意效率。",
      midWave: "普通火力变慢，破甲属性会更重要。",
      fail: "这不是火力不足，是破甲效率不够。"
    },
    "2_10": {
      start: "重甲空域决战，别和装甲硬耗。",
      bossAppear: "重甲 BOSS 出现，S 级组合更有效。",
      bossBurst: "装甲过载反击，抓住间隙输出。",
      clear: "重甲空域打穿，高阶配置价值确认。",
      fail: "火力不是问题，问题是破甲不够。"
    },
    "7_5": {
      start: "从这里开始是真正的重甲核心防线。",
      midWave: "破甲不足会明显刮痧，检查出战配置。",
      bossAppear: "核心护卫出现，优先击穿装甲。",
      fail: "这不是操作失误，是当前配置尚未破甲。"
    },
    "7_10": {
      start: "核心防线最终战，没有高穿透会很吃力。",
      bossAppear: "重甲核心 BOSS 出现，集中火力。",
      bossBurst: "核心装甲反击展开，保持节奏。",
      clear: "重甲防线被击穿，母舰外围暴露。",
      fail: "建议启用 S 级飞行员和 S 级战机再来。"
    },
    "9_10": {
      start: "最终战开始，弥赛亚就在母舰核心里。",
      midWave: "母舰护卫群正在重组，不要给它喘息。",
      bossAppear: "弥赛亚核心出现，所有火力集中。",
      bossBurst: "弥赛亚释放全域压制，继续规避。",
      lastWarning: "最后窗口，打穿母舰核心。",
      clear: "黑潮核心反应正在消失。",
      fail: "弥赛亚核心仍在线，重整后再突入。"
    }
  };

  const STORY_SCENES = [
    storyScene("prologue_1_pre", 0, 1, "pre_stage", "升空校准", [
      line("system", "星港管制", "战姬出战链路接通，序章航线准备开放。"),
      line("pilot-b-bailing", "白凌", "指挥官，我是白凌。先确认移动、射击和规避节奏。"),
      line("pilot-b-bailing", "白凌", "这不是表演训练，每一次压测都按实战标准执行。")
    ]),
    storyScene("prologue_2_pre", 0, 2, "pre_stage", "异常信号", [
      line("pilot-b-sumianxing", "苏绵星", "训练场边缘出现未知噪声，我先标出来。"),
      line("pilot-b-sumianxing", "苏绵星", "它不像普通干扰，更像有人在监听我们的火控数据。"),
      line("system", "星港管制", "继续压测，所有异常信号同步回传。")
    ]),
    storyScene("prologue_3_pre", 0, 3, "pre_stage", "训练终止", [
      line("pilot-s-lingyan", "凌焰", "训练结束，前方目标不是靶机。"),
      line("pilot-s-lingyan", "凌焰", "黑潮信号混进来了，按实战权限开火。"),
      line("system", "星港管制", "序章航线转入一级战备。")
    ]),
    storyScene("prologue_3_post_win", 0, 3, "post_win", "黑潮警报", [
      line("pilot-s-lingyan", "凌焰", "目标残骸里有黑潮识别码。"),
      line("system", "星港管制", "确认入侵，城市外围出现大量无人机群。"),
      line("pilot-s-lingyan", "凌焰", "指挥官，下一次升空就是夺回战。")
    ]),

    storyScene("1_1_pre", 1, 1, "pre_stage", "城市外围", [
      line("pilot-b-bailing", "白凌", "城市外围已经被黑潮包围，撤离航线被切断。"),
      line("pilot-b-bailing", "白凌", "我们先打出一条窄通道，让星港重新看见地面灯塔。"),
      line("system", "星港管制", "第一章目标：夺回外环制空权。")
    ]),
    storyScene("1_5_pre", 1, 5, "pre_stage", "包围圈收缩", [
      line("pilot-s-lingyan", "凌焰", "敌群开始收缩，它们想把外环变成封闭猎场。"),
      line("pilot-s-lingyan", "凌焰", "别让它们完成合围，我会从正面压住火力。"),
      line("pilot-b-bailing", "白凌", "撤离通道还在，指挥官，继续推进。")
    ]),
    storyScene("1_10_pre", 1, 10, "pre_stage", "黑潮投影", [
      line("system", "星港管制", "前方出现高能投影，不属于常规 BOSS。"),
      line("pilot-s-lingyan", "凌焰", "它在看我们，不是敌机，是主脑的眼睛。"),
      line("messiah", "弥赛亚", "记录完成。人类仍依赖英雄单位。")
    ]),
    storyScene("1_10_post_win", 1, 10, "post_win", "主脑确认", [
      line("pilot-s-lingyan", "凌焰", "投影消失了，但它留下了名字。"),
      line("messiah", "弥赛亚", "黑潮会修正下一次失败。"),
      line("system", "星港管制", "弥赛亚确认存在，第二空域出现重甲单位。")
    ]),

    storyScene("2_1_pre", 2, 1, "pre_stage", "重甲空域", [
      line("pilot-a-shenyao", "沈曜", "敌方外壳密度上升，普通火力会被消耗。"),
      line("pilot-a-shenyao", "沈曜", "从这一章开始，破甲不是加分项，是通关条件。"),
      line("system", "星港管制", "所有出战配置同步破甲评估。")
    ]),
    storyScene("2_5_pre", 2, 5, "pre_stage", "火力失效", [
      line("pilot-s-luoqi", "洛绮", "我刚试了一轮短航线，普通弹幕打得太慢。"),
      line("pilot-s-luoqi", "洛绮", "别和重甲硬耗，找窗口，把穿透打进核心。"),
      line("pilot-a-shenyao", "沈曜", "记录已更新，S 级战力收益明显上升。")
    ]),
    storyScene("2_10_pre", 2, 10, "pre_stage", "重甲决战", [
      line("pilot-a-shenyao", "沈曜", "重甲 BOSS 进入拦截区，它的装甲层会吸收持续火力。"),
      line("pilot-s-luoqi", "洛绮", "那就别给它吸收时间，短窗口打穿。"),
      line("system", "星港管制", "第二章最终节点，允许全火力压制。")
    ]),
    storyScene("2_10_post_win", 2, 10, "post_win", "穿透验证", [
      line("pilot-s-luoqi", "洛绮", "装甲层碎了，穿透窗口有效。"),
      line("pilot-a-shenyao", "沈曜", "黑潮会继续加厚防线，我们也要继续升级。"),
      line("system", "星港管制", "旧星港方向出现导航求救信号。")
    ]),

    storyScene("3_1_pre", 3, 1, "pre_stage", "旧星港", [
      line("pilot-b-linzhihan", "林知寒", "旧星港曾经是撤离节点，现在全区失联。"),
      line("pilot-b-linzhihan", "林知寒", "我会把航线拆成步骤，先夺回导航灯。"),
      line("system", "星港管制", "第三章目标：恢复旧星港补给线。")
    ]),
    storyScene("3_5_pre", 3, 5, "pre_stage", "伏击航道", [
      line("pilot-b-xingtao", "星桃", "前面不是空航道，是伏击走廊。"),
      line("pilot-b-xingtao", "星桃", "我标出三条补给碎片路线，别停在红区。"),
      line("pilot-b-linzhihan", "林知寒", "按星桃标记推进，风险最低。")
    ]),
    storyScene("3_10_pre", 3, 10, "pre_stage", "撤离战遗址", [
      line("pilot-s-lingyan", "凌焰", "这里是旧星港最后撤离线。"),
      line("pilot-s-lingyan", "凌焰", "我曾经守过这条路，这次我们把它夺回来。"),
      line("system", "星港管制", "导航阵列就在 BOSS 后方。")
    ]),
    storyScene("3_10_post_win", 3, 10, "post_win", "导航恢复", [
      line("pilot-s-lingyan", "凌焰", "导航灯亮了。旧星港还没有死。"),
      line("pilot-b-linzhihan", "林知寒", "补给线恢复，低轨护盾坐标已解算。"),
      line("system", "星港管制", "下一目标：护盾防线。")
    ]),

    storyScene("4_1_pre", 4, 1, "pre_stage", "低轨护盾", [
      line("pilot-a-shenyao", "沈曜", "低轨护盾不是一面墙，是一组会互相补位的中继。"),
      line("pilot-a-shenyao", "沈曜", "只打一个点没用，要连续拆掉节点。"),
      line("system", "星港管制", "第四章目标：打开低轨进攻通道。")
    ]),
    storyScene("4_5_pre", 4, 5, "pre_stage", "穿插破盾", [
      line("pilot-a-yelan", "夜岚", "封锁线有缝，够我穿过去。"),
      line("pilot-a-yelan", "夜岚", "指挥官，我负责撕开入口，你负责让火力跟上。"),
      line("pilot-a-shenyao", "沈曜", "抓住夜岚开的窗口，护盾会短暂失衡。")
    ]),
    storyScene("4_10_pre", 4, 10, "pre_stage", "护盾中继", [
      line("pilot-a-shenyao", "沈曜", "最后的护盾中继启动了，弹幕会封路。"),
      line("pilot-a-yelan", "夜岚", "封路也有节奏，等缺口，冲进去。"),
      line("system", "星港管制", "摧毁中继后，黑潮主力舰队将暴露。")
    ]),
    storyScene("4_10_post_win", 4, 10, "post_win", "防线断裂", [
      line("pilot-a-yelan", "夜岚", "护盾断了，我看见主力舰队了。"),
      line("pilot-a-shenyao", "沈曜", "敌方正在换成精英拦截阵型。"),
      line("system", "星港管制", "第五章：精英舰队接战。")
    ]),

    storyScene("5_1_pre", 5, 1, "pre_stage", "精英接管", [
      line("pilot-s-luoqi", "洛绮", "前线指挥权换人了，敌方动作变干净了。"),
      line("pilot-s-luoqi", "洛绮", "这是精英舰队，别用清杂兵的节奏打它们。"),
      line("system", "星港管制", "第五章目标：击溃精英舰队。")
    ]),
    storyScene("5_5_pre", 5, 5, "pre_stage", "战术学习", [
      line("pilot-s-lingyan", "凌焰", "它们在学我们的机动轨迹。"),
      line("pilot-s-lingyan", "凌焰", "别重复同一条线，打一枪换一个窗口。"),
      line("pilot-s-luoqi", "洛绮", "弥赛亚不是在指挥，它是在训练舰队。")
    ]),
    storyScene("5_10_pre", 5, 10, "pre_stage", "精英旗舰", [
      line("pilot-s-luoqi", "洛绮", "精英旗舰入场，它是这支舰队的节拍器。"),
      line("pilot-s-lingyan", "凌焰", "那就把节拍器打碎。"),
      line("system", "星港管制", "击破旗舰后，黑潮主力入口将开放。")
    ]),
    storyScene("5_10_post_win", 5, 10, "post_win", "主力入口", [
      line("pilot-s-luoqi", "洛绮", "旗舰沉默，敌阵开始断拍。"),
      line("pilot-s-lingyan", "凌焰", "主力舰队就在后面，真正的正面战来了。"),
      line("system", "星港管制", "第六章作战许可下发。")
    ]),

    storyScene("6_1_pre", 6, 1, "pre_stage", "总防御战", [
      line("pilot-a-shenyao", "沈曜", "黑潮主力舰队压境，星港防线进入总防御战。"),
      line("pilot-a-shenyao", "沈曜", "我们不能只守，要在守住的同时锁定母舰。"),
      line("system", "星港管制", "第六章目标：击退主力并捕获母舰坐标。")
    ]),
    storyScene("6_5_pre", 6, 5, "pre_stage", "母舰信号", [
      line("pilot-a-yelan", "夜岚", "我在舰队后方抓到一段更大的信号。"),
      line("pilot-a-yelan", "夜岚", "它不是旗舰，是母舰。"),
      line("pilot-a-shenyao", "沈曜", "继续推进，信号源还差一个校准点。")
    ]),
    storyScene("6_10_pre", 6, 10, "pre_stage", "主力核心", [
      line("pilot-a-shenyao", "沈曜", "主力核心挡在母舰坐标前面。"),
      line("pilot-a-yelan", "夜岚", "打穿它，我就能把坐标钉死。"),
      line("system", "星港管制", "全舰队等待母舰坐标。")
    ]),
    storyScene("6_10_post_win", 6, 10, "post_win", "坐标锁定", [
      line("pilot-a-yelan", "夜岚", "坐标锁定，母舰没有再藏住。"),
      line("pilot-a-shenyao", "沈曜", "但外围还有一层重甲核心防线。"),
      line("system", "星港管制", "第七章：突破重甲核心防线。")
    ]),

    storyScene("7_1_pre", 7, 1, "pre_stage", "核心防线", [
      line("pilot-s-luoqi", "洛绮", "这层装甲不是常规火力能磨开的。"),
      line("pilot-s-luoqi", "洛绮", "要么提升穿透，要么被它拖死在外围。"),
      line("system", "星港管制", "第七章开始执行高穿透配置检查。")
    ]),
    storyScene("7_5_pre", 7, 5, "pre_stage", "真实门槛", [
      line("pilot-s-lingyan", "凌焰", "从这里开始，敌人不会给低配队伍留余地。"),
      line("pilot-s-lingyan", "凌焰", "这不是操作测试，是破甲门槛。"),
      line("pilot-s-luoqi", "洛绮", "确认出战组合，别把输出浪费在装甲表面。")
    ]),
    storyScene("7_10_pre", 7, 10, "pre_stage", "重甲核心", [
      line("pilot-s-luoqi", "洛绮", "重甲核心出现，它连接着母舰外围全部护卫。"),
      line("pilot-s-lingyan", "凌焰", "打穿它，母舰就会第一次露出破口。"),
      line("system", "星港管制", "第七章最终节点，允许超载输出。")
    ]),
    storyScene("7_10_post_win", 7, 10, "post_win", "外围破口", [
      line("pilot-s-lingyan", "凌焰", "破口打开了。"),
      line("pilot-s-luoqi", "洛绮", "母舰外围护卫正在撤向前线基地。"),
      line("system", "星港管制", "第八章：夺取反攻前线基地。")
    ]),

    storyScene("8_1_pre", 8, 1, "pre_stage", "反攻入口", [
      line("pilot-b-xingtao", "星桃", "我找到前线基地入口了，补给航线从这里穿过去。"),
      line("pilot-b-xingtao", "星桃", "只要切断这里，母舰护卫群就不能重组。"),
      line("system", "星港管制", "第八章目标：夺取反攻前线基地。")
    ]),
    storyScene("8_5_pre", 8, 5, "pre_stage", "补给链", [
      line("pilot-a-yelan", "夜岚", "补给链在移动，不是固定设施。"),
      line("pilot-a-yelan", "夜岚", "我去切后路，你们压住正面防卫。"),
      line("pilot-b-xingtao", "星桃", "标记已同步，别让护卫群回头。")
    ]),
    storyScene("8_10_pre", 8, 10, "pre_stage", "基地中枢", [
      line("pilot-b-xingtao", "星桃", "基地中枢就在前方，所有护卫信号都汇到这里。"),
      line("pilot-a-yelan", "夜岚", "切掉它，母舰核心就会暴露。"),
      line("system", "星港管制", "反攻基地最终节点，开始突入。")
    ]),
    storyScene("8_10_post_win", 8, 10, "post_win", "核心暴露", [
      line("pilot-a-yelan", "夜岚", "中枢沉默，母舰核心外层打开。"),
      line("pilot-b-xingtao", "星桃", "所有航线都指向同一个点。"),
      line("system", "星港管制", "最终章：黑潮母舰。")
    ]),

    storyScene("9_1_pre", 9, 1, "pre_stage", "最终空域", [
      line("pilot-s-lingyan", "凌焰", "全员通讯确认，黑潮母舰就在前方。"),
      line("pilot-s-luoqi", "洛绮", "精英护卫群正在回收残阵。"),
      line("pilot-a-yelan", "夜岚", "我会盯住核心通道，指挥官，别停。")
    ]),
    storyScene("9_5_pre", 9, 5, "pre_stage", "弥赛亚对话", [
      line("messiah", "弥赛亚", "你们把牺牲称为热血，把重复失败称为意志。"),
      line("pilot-s-lingyan", "凌焰", "你只会计算失败，所以你永远不懂为什么我们还在。"),
      line("messiah", "弥赛亚", "那就让我亲自修正你们。")
    ]),
    storyScene("9_10_pre", 9, 10, "pre_stage", "最终决战", [
      line("system", "星港管制", "最终核心暴露，所有火力权限解除。"),
      line("pilot-s-lingyan", "凌焰", "指挥官，最后一次突入。"),
      line("messiah", "弥赛亚", "黑潮不会终止，只会迭代。")
    ]),
    storyScene("9_10_post_win", 9, 10, "post_win", "残留信号", [
      line("pilot-s-lingyan", "凌焰", "核心反应消失了。"),
      line("pilot-a-shenyao", "沈曜", "不，还有一段残留信号，像是被故意留下的。"),
      line("messiah", "弥赛亚", "下一次，我会从你们的胜利开始。")
    ])
  ];

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

  function line(speakerId, speakerName, text, options = {}) {
    return {
      speakerId,
      speakerName,
      text,
      side: options.side || (speakerId === "messiah" ? "right" : "left"),
      emotion: options.emotion || "normal",
      narrator: Boolean(options.narrator || speakerId === "system")
    };
  }

  function storyScene(sceneId, chapterIndex, stageInChapter, trigger, title, lines) {
    const stageId = getStageId(chapterIndex, stageInChapter);
    return {
      sceneId,
      onceKey: sceneId,
      stageId,
      chapterIndex,
      stageInChapter,
      trigger,
      title,
      lines: Array.isArray(lines) ? lines : []
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
    const progress = getProgressRoot(profile);
    return progress.storySeenSceneIds.indexOf(sceneId) >= 0;
  }

  function markStorySceneSeen(profile, sceneId) {
    if (!profile || !sceneId) return profile;
    const progress = getProgressRoot(profile);
    if (progress.storySeenSceneIds.indexOf(sceneId) < 0) {
      progress.storySeenSceneIds.push(sceneId);
    }
    return profile;
  }

  function getNextUnseenStoryScene(options) {
    options = options || {};
    const scenes = getStageStoryScenes(options);
    return scenes.find((scene) => !isStorySceneSeen(options.profile, scene.onceKey || scene.sceneId)) || null;
  }

  function getStoryReplayScenes(options) {
    return getStageStoryScenes(options || {});
  }

  function getChapterStory(chapterIndex) {
    const chapter = normalizeChapterIndex(chapterIndex);
    return CHAPTER_STORY_ARCS[chapter] || CHAPTER_STORY_ARCS[1];
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
    const generic = GENERIC_BATTLE_STORY_BY_CHAPTER[parsed.chapterIndex] || GENERIC_BATTLE_STORY_BY_CHAPTER[1];
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
      start: special.start || generic.start,
      midWave: special.midWave || generic.midWave,
      bossAppear: special.bossAppear || generic.bossAppear,
      bossBurst: special.bossBurst || generic.bossBurst,
      lastWarning: special.lastWarning || generic.lastWarning,
      clear: special.clear || generic.clear || chapter.clearLine,
      fail: special.fail || generic.fail
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
    const story = getStageStory(options.chapterIndex, options.stageInChapter);
    return story[options.key] || "";
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
    const hasBoss = options.hasBoss !== false;
    const story = getStageStory(chapterIndex, stageInChapter);
    const items = [
      createTimelineItem(BATTLE_TIMELINE_SECONDS.stageStart, STORY_TRIGGER.STAGE_START, "start", story, false),
      createTimelineItem(BATTLE_TIMELINE_SECONDS.midWave, STORY_TRIGGER.MID_WAVE, "midWave", story, false)
    ];
    if (hasBoss) {
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

  const api = {
    STORY_META,
    STORY_TRIGGER,
    BATTLE_TIMELINE_SECONDS,
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
