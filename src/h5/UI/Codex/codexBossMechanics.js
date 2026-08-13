/**
 * 图鉴 · BOSS 技能机制文案 (codexBossMechanics.js)
 *
 * 把《热血战姬》9 章 BOSS 的核心机制与签名技能整理为「技能说明」形式，
 * 供图鉴模块（UI/Codex）在 BOSS 分页下展示。
 *
 * 数据来源：
 *   - 章节机制 key / 签名技能列表来自 enemyStageBalance.BOSS_THEME_CONFIG
 *   - 弹幕中文名与 enemyAI.getPatternNotice 对齐
 * 本文件只负责「人类可读说明」的整合，不依赖运行时逻辑。
 *
 * @module codexBossMechanics
 */
(function registerCodexBossMechanics(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  // 弹幕模式中文名（与 enemyAI.getPatternNotice 对齐）
  var PATTERN_LABEL = {
    boss_lanes: "封锁波",
    boss_burst_spread: "火力爆发",
    boss_sniper: "狙击锁定",
    boss_charge_lane: "冲锋航道",
    boss_cross: "交叉火力",
    boss_rotating_fan: "旋翼弹幕",
    boss_summon: "护卫召集",
    boss_wall: "弹幕墙壁",
    boss_ring_expand: "环形弹幕",
    boss_ring_recall: "铆钉回收",
    boss_homing_orb: "追踪能量弹",
    boss_fragment_volley: "碎片急射",
    boss_rotor_overdrive: "旋翼超载",
    boss_grid_explosion: "全屏炮击",
    boss_split_nest: "分裂巢弹",
    boss_laser_sweep: "扫射光束",
    boss_shockwave_ring: "冲击波",
    boss_armor_pulse: "装甲脉冲",
    boss_shield_pulse: "装甲脉冲",
    boss_spread: "扇形弹幕"
  };

  // 章节核心机制说明（key 对应 BOSS_THEME_CONFIG.chapterMechanic）
  var CHAPTER_MECHANICS = {
    tutorial: {
      name: "训练靶舰协议",
      desc: "序章靶舰仅做基础直线弹与扇形弹，用于熟悉操作与闪避节奏，无特殊机制。",
      phases: ["全程：基础直线弹 + 宽角扇形弹，弹幕压力低。"]
    },
    densityModulation: {
      name: "密度调制",
      desc: "BOSS 监测战场残存敌机数量：敌机越多弹幕越密。清场可降低弹幕压力，保留杂兵则会陷入弹海。",
      phases: [
        "一阶段（100%-70%）：常规扇形弹与封锁波。",
        "二阶段（70%-40%）：灰眼凝视启动，追踪能量弹开始点名玩家。",
        "三阶段（40%-0%）：暴风墙封锁全屏，配合哨塔标记覆盖射击。"
      ]
    },
    layeredPlating: {
      name: "多层护盾",
      desc: "BOSS 拥有可再生的多层护盾，破盾后短暂暴露核心；护盾过载时会释放高威胁爆发弹幕。",
      phases: [
        "一阶段（100%-70%）：单层层甲，铆钉风暴扩散为主。",
        "二阶段（70%-40%）：层甲叠加，要塞壁垒封锁移动空间。",
        "三阶段（40%-0%）：装甲过载，护盾破碎瞬间爆发密集散射。"
      ]
    },
    crossLockGrid: {
      name: "交叉锁定网",
      desc: "BOSS 在战场布设交叉锁定网格，死锁十字激光与轨道猎杀者形成持续封锁。",
      phases: [
        "一阶段（100%-70%）：常规交叉火力。",
        "二阶段（70%-40%）：死锁十字激光扫射，预警线后开火。",
        "三阶段（40%-0%）：轨道猎杀者多弹追踪，岔路绞杀封死走位。"
      ]
    },
    rageSystem: {
      name: "怒气系统",
      desc: "BOSS 被攻击会积累怒气，怒气满后进入狂暴，突进与冲击波频率大幅提升。",
      phases: [
        "一阶段（100%-70%）：裂空三段突试探。",
        "二阶段（70%-40%）：怒气过半，冲击波连震压制。",
        "三阶段（40%-0%）：满怒狂暴，突击阵列连续冲锋。"
      ]
    },
    tacticalOrders: {
      name: "战术指令",
      desc: "BOSS 发布战术指令调度全场，共鸣链接召唤增援，铁拍列阵随节奏封锁。",
      phases: [
        "一阶段（100%-70%）：镜像战术复制狙击弹。",
        "二阶段（70%-40%）：铁拍列阵按节拍筑墙。",
        "三阶段（40%-0%）：共鸣链接召唤增援单位协同进攻。"
      ]
    },
    lockStack: {
      name: "锁定堆叠",
      desc: "BOSS 对玩家叠加多重锁定，千眼锁定同时标记多个目标，穿甲裁决撕裂护盾。",
      phases: [
        "一阶段（100%-70%）：阻断炮击多弹道封锁。",
        "二阶段（70%-40%）：千眼锁定多目标狙击。",
        "三阶段（40%-0%）：穿甲裁决激光高穿透扫射。"
      ]
    },
    heatCycle: {
      name: "过热冷却",
      desc: "BOSS 持续射击积累热量，过热时强制冷却并进入易伤；深度防御矩阵在冷却期布防。",
      phases: [
        "一阶段（100%-70%）：外壳碎甲碎片急射。",
        "二阶段（70%-40%）：核心脉冲冲击波。",
        "三阶段（40%-0%）：过热冷却触发深度防御矩阵网格爆裂。"
      ]
    },
    rotorPhase: {
      name: "旋翼相位",
      desc: "BOSS 旋翼按相位高速旋转，旋翼绞杀形成旋转弹幕，旋翼转速决定封锁密度。",
      phases: [
        "一阶段（100%-70%）：分裂弹巢投放。",
        "二阶段（70%-40%）：旋翼绞杀旋转弹幕。",
        "三阶段（40%-0%）：迁徙冲锋大规模突进。"
      ]
    },
    mothershipForms: {
      name: "形态切换",
      desc: "终章母舰在多种形态间切换，弥赛亚裁决、重力奇点、虫群出击、全弹发射轮番上演。",
      phases: [
        "一阶段（100%-70%）：虫群出击召唤。",
        "二阶段（70%-40%）：重力奇点牵引追踪。",
        "三阶段（40%-0%）：全弹发射覆盖全屏，弥赛亚裁决网格审判。"
      ]
    }
  };

  // 签名技能详细说明（id 对应 BOSS_THEME_CONFIG.signatureSkills[].id）
  var SIGNATURE_SKILL_DESC = {
    greyEyeGaze: "灰眼凝视：发射缓慢追踪的能量弹，自动锁定玩家当前位置并逐步转向。",
    stormWall: "暴风墙：在战场生成横向弹幕墙，仅留少数移动空隙，逼迫玩家贴边闪避。",
    watchtowerMark: "哨塔标记：广角扇形弹幕覆盖，落地前用标记预示覆盖区域。",
    rivetStormExpand: "铆钉风暴·扩散：自中心向外扩散的环形弹幕，留中心安全区。",
    rivetStormRecall: "铆钉风暴·回收：扩散后向内回收的环形弹幕，双向夹击封锁走位。",
    fortressRampart: "要塞壁垒：厚重弹幕墙，需绕行或破甲才能穿过。",
    armorOverload: "装甲过载：护盾破碎瞬间释放高威胁散射弹幕，是破盾后的危险窗口。",
    deadlockCross: "死锁十字：十字激光扫射，预警线后开火，需离开交叉点。",
    orbitalHunter: "轨道猎杀者：多枚轨道追踪弹环绕后扑向玩家，考验持续机动。",
    forkStrangle: "岔路绞杀：交叉火力封锁所有走位通道，逼迫玩家贴墙。",
    tripleRush: "裂空三段突：连续三道冲锋航道，预警后高速突进。",
    shockwaveCascade: "冲击波连震：连续扩散的冲击波环，层层逼近。",
    assaultFormation: "突击阵列：编队式多线突进，覆盖更大宽度。",
    resonanceLink: "共鸣链接：召唤增援敌机协同进攻，优先清理召唤单位。",
    ironBeatPhalanx: "铁拍列阵：随节拍生成弹幕墙，节奏感强。",
    mirrorTactics: "镜像战术：复制玩家弹道镜像反击，需预判反弹。",
    thousandEyeLock: "千眼锁定：多目标同时锁定狙击，预警线密集。",
    interdictionBarrage: "阻断炮击：多弹道封锁关键区域，压制移动。",
    armorPiercingJudgment: "穿甲裁决：高穿透激光扫射，无视部分护盾。",
    hullBreaker: "外壳碎甲：外壳碎片高速急射，近距离极危险。",
    corePulse: "核心脉冲：核心释放冲击波动，中距离需保持间距。",
    deepDefenseMatrix: "深度防御矩阵：网格爆裂封锁战场，冷却期布防。",
    rotorGuillotine: "旋翼绞杀：旋翼高速旋转弹幕，形成持续封锁圈。",
    splitNest: "分裂巢弹：投放弹巢，孵化后分裂为多发子弹。",
    migrationCharge: "迁徙冲锋：大规模突进，宽度覆盖整个航道。",
    messiahJudgment: "弥赛亚裁决：网格审判弹幕，全屏覆盖的高潮技能。",
    gravitySingularity: "重力奇点：引力牵引追踪弹，扭曲玩家走位。",
    swarmLaunch: "虫群出击：召唤虫群单位，数量压制。",
    fullArsenal: "全弹发射：倾泻所有弹幕模式的终极覆盖。"
  };

  scope.codexBossMechanics = {
    PATTERN_LABEL: PATTERN_LABEL,
    CHAPTER_MECHANICS: CHAPTER_MECHANICS,
    SIGNATURE_SKILL_DESC: SIGNATURE_SKILL_DESC
  };

  if (typeof module !== "undefined" && module.exports) module.exports = scope.codexBossMechanics;
})(typeof globalThis !== "undefined" ? globalThis : this);
