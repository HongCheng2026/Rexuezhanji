(function registerCombatCodexConfig(root) {
  var scope = root.RXGame || (root.RXGame = {});

  // ─── Helpers ────────────────────────────────────────────────────────
  function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

  // ─── Art factory ────────────────────────────────────────────────────
  function mobArt(ch, slot) {
    return {
      artStatus: "placeholder",
      expectedSrc: "enemies/battle/c" + String(ch).padStart(2, "0") + "-mob-0" + slot + ".png",
      fallbackAssetId: "scout",
      drawWidth: 46, drawHeight: 58, drawAngle: -Math.PI / 2,
      hitRadiusX: 18, hitRadiusY: 21, offsetX: 0, offsetY: 0
    };
  }
  function fighterArt(ch, slot, fb) {
    return {
      artStatus: "placeholder",
      expectedSrc: "enemies/battle/c" + String(ch).padStart(2, "0") + "-fighter-0" + slot + ".png",
      fallbackAssetId: fb || "shooter",
      drawWidth: 62, drawHeight: 72, drawAngle: -Math.PI / 2,
      hitRadiusX: 24, hitRadiusY: 30, offsetX: 0, offsetY: 0
    };
  }
  function eliteArt(ch, slot) {
    return {
      artStatus: "placeholder",
      expectedSrc: "enemies/battle/c" + String(ch).padStart(2, "0") + "-elite-0" + slot + ".png",
      fallbackAssetId: "elite",
      drawWidth: 100, drawHeight: 120, drawAngle: -Math.PI / 2,
      hitRadiusX: 38, hitRadiusY: 48, offsetX: 0, offsetY: 0
    };
  }
  function bossArt(stageId, ch) {
    return {
      artStatus: "placeholder",
      expectedSrc: "bosses/stages/boss-c" + String(ch).padStart(2, "0") + "-s" + String(stageId).padStart(2, "0") + ".png",
      fallbackAssetId: ch === 0 ? null : ("chapter-" + String(ch).padStart(2, "0")),
      drawWidth: 210, drawHeight: 235, drawAngle: 0,
      hitRadiusX: 76, hitRadiusY: 96, offsetX: 0, offsetY: 0
    };
  }

  // ─── 80 Regular Enemy Units ─────────────────────────────────────────

  /** @type {Array<{unitId:string,name:string,category:string,chapterIndex:number,slot:string,firstStageId:string,baseType:string,motionProfile:object,attackProfile:object,supportProfile:object|null,statScale:object,art:object,codex:object}>} */
  var REGULAR_ENEMIES = [];

  // -- Prologue (ch 0) --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c00-01", name:"校准蜂", category:"mob", chapterIndex:0, slot:"M1", firstStageId:"prologue_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:1,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:null, statScale:{hp:0.8,damage:1,speed:1,damageReduction:0}, art:mobArt(0,1),
      codex:{attack:"直线飞行，不发弹的基础靶机。",danger:"优先清理以降低场上数量压力。"} },
    { unitId:"mob-c00-02", name:"靶标雀", category:"mob", chapterIndex:0, slot:"M2", firstStageId:"prologue_1", baseType:"small",
      motionProfile:{type:"sine",speedScale:1,amplitude:28,frequency:1.2},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.8},
      supportProfile:null, statScale:{hp:0.85,damage:0.8,speed:1,damageReduction:0}, art:mobArt(0,2),
      codex:{attack:"正弦移动，低速单发。",danger:"优先清理密集编队。"} },
    { unitId:"mob-c00-03", name:"测距针", category:"mob", chapterIndex:0, slot:"M3", firstStageId:"prologue_2", baseType:"small",
      motionProfile:{type:"diagonal",speedScale:1.1,amplitude:0,frequency:0},
      attackProfile:{type:"aimed",bulletPattern:"single",intervalScale:1.6},
      supportProfile:null, statScale:{hp:0.9,damage:0.9,speed:1.05,damageReduction:0}, art:mobArt(0,3),
      codex:{attack:"斜切入场，短暂瞄准后射击。",danger:"注意入场时的交叉弹道。"} },

    { unitId:"fighter-c00-01", name:"蓝穹教练机", category:"fighter", chapterIndex:0, slot:"F1", firstStageId:"prologue_1", baseType:"shooter",
      motionProfile:{type:"straight",speedScale:0.9,amplitude:0,frequency:0},
      attackProfile:{type:"triple",bulletPattern:"triple",intervalScale:1.3},
      supportProfile:null, statScale:{hp:0.85,damage:0.75,speed:0.9,damageReduction:0}, art:fighterArt(0,1),
      codex:{attack:"窄角三连射。",danger:"在弹道间穿行即可。"} },
    { unitId:"fighter-c00-02", name:"火控验收机", category:"fighter", chapterIndex:0, slot:"F2", firstStageId:"prologue_2", baseType:"shooter",
      motionProfile:{type:"straight",speedScale:0.9,amplitude:0,frequency:0},
      attackProfile:{type:"cross",bulletPattern:"cross_fire",intervalScale:1.2},
      supportProfile:null, statScale:{hp:0.9,damage:0.8,speed:0.9,damageReduction:0}, art:fighterArt(0,2),
      codex:{attack:"上下双线射击。",danger:"选一条线躲避。"} },
    { unitId:"fighter-c00-03", name:"规避压测机", category:"fighter", chapterIndex:0, slot:"F3", firstStageId:"prologue_3", baseType:"charger",
      motionProfile:{type:"charge",speedScale:1.15,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:null, statScale:{hp:0.8,damage:1,speed:1.15,damageReduction:0}, art:fighterArt(0,3,"charger"),
      codex:{attack:"显示航道后冲刺。",danger:"远离预警航道。"} },

    { unitId:"elite-c00-01", name:"苍穹监考官", category:"elite", chapterIndex:0, slot:"E1", firstStageId:"prologue_2", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.85,amplitude:20,frequency:0.6},
      attackProfile:{type:"spread",bulletPattern:"elite_fan",intervalScale:1},
      supportProfile:null, statScale:{hp:0.75,damage:0.7,speed:0.85,damageReduction:0.05}, art:eliteArt(0,1),
      codex:{attack:"间歇扇形射击。",danger:"远离弹幕密集区。"} },
    { unitId:"elite-c00-02", name:"越权黑匣", category:"elite", chapterIndex:0, slot:"E2", firstStageId:"prologue_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.8,amplitude:16,frequency:0.5},
      attackProfile:{type:"spread",bulletPattern:"elite_spread",intervalScale:0.95},
      supportProfile:{type:"summon",summonUnitIds:["mob-c00-01"],summonCount:2,summonInterval:8},
      statScale:{hp:0.8,damage:0.75,speed:0.8,damageReduction:0.08}, art:eliteArt(0,2),
      codex:{attack:"召唤靶机并释放干扰弹。",danger:"优先清除召唤单位。"} }
  );

  // -- Chapter 1 --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c01-01", name:"灰巷侦蜂", category:"mob", chapterIndex:1, slot:"M1", firstStageId:"1_1", baseType:"small",
      motionProfile:{type:"edgeLane",speedScale:1,amplitude:12,frequency:0.8},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.2},
      supportProfile:null, statScale:{hp:1,damage:1,speed:1,damageReduction:0}, art:mobArt(1,1),
      codex:{attack:"贴近上下边缘侦察。",danger:"注意边缘的子弹轨迹。"} },
    { unitId:"mob-c01-02", name:"路灯伏梭", category:"mob", chapterIndex:1, slot:"M2", firstStageId:"1_1", baseType:"small",
      motionProfile:{type:"ambush",speedScale:1.05,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1},
      supportProfile:null, statScale:{hp:1.05,damage:1.1,speed:1.05,damageReduction:0}, art:mobArt(1,2),
      codex:{attack:"从上下方向伏击。",danger:"注意上下伏击路线。"} },
    { unitId:"mob-c01-03", name:"城环噪蝇", category:"mob", chapterIndex:1, slot:"M3", firstStageId:"1_3", baseType:"small",
      motionProfile:{type:"formation",speedScale:0.95,amplitude:8,frequency:1.5},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.1},
      supportProfile:null, statScale:{hp:0.95,damage:0.95,speed:0.95,damageReduction:0}, art:mobArt(1,3),
      codex:{attack:"三机小编队扰动。",danger:"注意编队集中的交叉弹。"} },

    { unitId:"fighter-c01-01", name:"外环射手·獠", category:"fighter", chapterIndex:1, slot:"F1", firstStageId:"1_1", baseType:"shooter",
      motionProfile:{type:"straight",speedScale:0.95,amplitude:0,frequency:0},
      attackProfile:{type:"triple",bulletPattern:"triple",intervalScale:1},
      supportProfile:null, statScale:{hp:1,damage:1,speed:0.95,damageReduction:0}, art:fighterArt(1,1),
      codex:{attack:"连续三发射击。",danger:"保持移动躲避三连弹。"} },
    { unitId:"fighter-c01-02", name:"路障截击机·栅", category:"fighter", chapterIndex:1, slot:"F2", firstStageId:"1_2", baseType:"shield",
      motionProfile:{type:"straight",speedScale:0.7,amplitude:0,frequency:0},
      attackProfile:{type:"slowWall",bulletPattern:"slow_wall",intervalScale:1.1},
      supportProfile:null, statScale:{hp:1.15,damage:1,speed:0.7,damageReduction:0.08}, art:fighterArt(1,2,"shield"),
      codex:{attack:"封锁固定航道。",danger:"提前选择通行航道。"} },
    { unitId:"fighter-c01-03", name:"信标猎犬·巡", category:"fighter", chapterIndex:1, slot:"F3", firstStageId:"1_6", baseType:"shooter",
      motionProfile:{type:"tracking",speedScale:0.85,amplitude:0,frequency:0},
      attackProfile:{type:"aimed",bulletPattern:"triple",intervalScale:1.15},
      supportProfile:null, statScale:{hp:1.05,damage:1.05,speed:0.85,damageReduction:0}, art:fighterArt(1,3),
      codex:{attack:"低速追踪弹。",danger:"连续移动避免被追踪锁定。"} },

    { unitId:"elite-c01-01", name:"包围圈执旗者", category:"elite", chapterIndex:1, slot:"E1", firstStageId:"1_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.8,amplitude:22,frequency:0.55},
      attackProfile:{type:"spread",bulletPattern:"elite_fan",intervalScale:0.9},
      supportProfile:{type:"escort",escortCount:3,escortUnitIds:["fighter-c01-01"]},
      statScale:{hp:1,damage:1,speed:0.8,damageReduction:0.05}, art:eliteArt(1,1),
      codex:{attack:"带领护航机同步齐射。",danger:"优先清除护航机。"} },
    { unitId:"elite-c01-02", name:"投影节点护送官", category:"elite", chapterIndex:1, slot:"E2", firstStageId:"1_8", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.75,amplitude:18,frequency:0.5},
      attackProfile:{type:"spread",bulletPattern:"elite_spread",intervalScale:0.88},
      supportProfile:{type:"summon",summonUnitIds:["mob-c01-01"],summonCount:2,summonInterval:7},
      statScale:{hp:1.05,damage:1.05,speed:0.75,damageReduction:0.06}, art:eliteArt(1,2),
      codex:{attack:"召唤侦察蜂并释放回传火力。",danger:"优先清除召唤的侦察蜂。"} }
  );

  // -- Chapter 2 --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c02-01", name:"铆钉蚊", category:"mob", chapterIndex:2, slot:"M1", firstStageId:"2_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:1.2,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:null, statScale:{hp:0.9,damage:1,speed:1.2,damageReduction:0}, art:mobArt(2,1),
      codex:{attack:"高速直线穿越。",danger:"注意突然高速通过。"} },
    { unitId:"mob-c02-02", name:"甲片蜂", category:"mob", chapterIndex:2, slot:"M2", firstStageId:"2_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.75,amplitude:6,frequency:0.5},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.3},
      supportProfile:null, statScale:{hp:1.3,damage:0.9,speed:0.75,damageReduction:0.1}, art:mobArt(2,2),
      codex:{attack:"低速飞行并带轻型护甲。",danger:"需要更多火力击破。"} },
    { unitId:"mob-c02-03", name:"铁壳梭", category:"mob", chapterIndex:2, slot:"M3", firstStageId:"2_3", baseType:"small",
      motionProfile:{type:"straight",speedScale:1,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.1},
      supportProfile:{type:"breakout",breakoutSpeedScale:1.6},
      statScale:{hp:1.1,damage:1,speed:1,damageReduction:0.05}, art:mobArt(2,3),
      codex:{attack:"外壳击破后突然加速。",danger:"击破后注意加速路线。"} },

    { unitId:"fighter-c02-01", name:"重甲推进机·犀", category:"fighter", chapterIndex:2, slot:"F1", firstStageId:"2_1", baseType:"charger",
      motionProfile:{type:"charge",speedScale:1.1,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:null, statScale:{hp:1.25,damage:1.3,speed:1.1,damageReduction:0.08}, art:fighterArt(2,1,"charger"),
      codex:{attack:"正面冲撞。",danger:"远离冲撞预警线。"} },
    { unitId:"fighter-c02-02", name:"折盾轰击机·垒", category:"fighter", chapterIndex:2, slot:"F2", firstStageId:"2_2", baseType:"shield",
      motionProfile:{type:"straight",speedScale:0.65,amplitude:0,frequency:0},
      attackProfile:{type:"slowWall",bulletPattern:"slow_wall",intervalScale:1},
      supportProfile:null, statScale:{hp:1.35,damage:1.05,speed:0.65,damageReduction:0.12}, art:fighterArt(2,2,"shield"),
      codex:{attack:"释放慢速封路弹。",danger:"慢弹形成墙，提前选航道。"} },
    { unitId:"fighter-c02-03", name:"破阵冲角·槌", category:"fighter", chapterIndex:2, slot:"F3", firstStageId:"2_6", baseType:"charger",
      motionProfile:{type:"charge",speedScale:1.2,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:{type:"twoStageCharge",chargeStageCount:2},
      statScale:{hp:1.2,damage:1.4,speed:1.2,damageReduction:0.06}, art:fighterArt(2,3,"charger"),
      codex:{attack:"两段式预警撞击。",danger:"警惕二次预警后再次冲锋。"} },

    { unitId:"elite-c02-01", name:"玄甲近卫·门神", category:"elite", chapterIndex:2, slot:"E1", firstStageId:"2_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.7,amplitude:14,frequency:0.45},
      attackProfile:{type:"spread",bulletPattern:"elite_guard",intervalScale:0.88},
      supportProfile:{type:"shieldCycle",shieldDuration:4,exposeDuration:2.2},
      statScale:{hp:1.15,damage:1.05,speed:0.7,damageReduction:0.1}, art:eliteArt(2,1),
      codex:{attack:"护盾与暴露阶段循环。",danger:"暴露窗口集中输出。"} },
    { unitId:"elite-c02-02", name:"装甲共振核·磐", category:"elite", chapterIndex:2, slot:"E2", firstStageId:"2_8", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.65,amplitude:10,frequency:0.4},
      attackProfile:{type:"spread",bulletPattern:"elite_spread",intervalScale:0.85},
      supportProfile:{type:"damageReductionAura",auraRadius:180,auraReductionRate:0.2},
      statScale:{hp:1.25,damage:1.1,speed:0.65,damageReduction:0.12}, art:eliteArt(2,2),
      codex:{attack:"为附近敌机提供减伤。",danger:"优先击杀以解除全场减伤。"} }
  );

  // -- Chapter 3 --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c03-01", name:"锈轨侦雀", category:"mob", chapterIndex:3, slot:"M1", firstStageId:"3_1", baseType:"small",
      motionProfile:{type:"laneTrack",speedScale:0.95,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.1},
      supportProfile:null, statScale:{hp:1,damage:1,speed:0.95,damageReduction:0}, art:mobArt(3,1),
      codex:{attack:"沿固定轨道进入。",danger:"轨道固定，可预判路线。"} },
    { unitId:"mob-c03-02", name:"废舱掠蜂", category:"mob", chapterIndex:3, slot:"M2", firstStageId:"3_1", baseType:"small",
      motionProfile:{type:"zigzag",speedScale:1,amplitude:22,frequency:1.4},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1},
      supportProfile:null, statScale:{hp:1.05,damage:1.05,speed:1,damageReduction:0}, art:mobArt(3,2),
      codex:{attack:"折线变道。",danger:"折线变道时注意弹道路径变化。"} },
    { unitId:"mob-c03-03", name:"导航寄生针", category:"mob", chapterIndex:3, slot:"M3", firstStageId:"3_3", baseType:"small",
      motionProfile:{type:"feint",speedScale:1.05,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.05},
      supportProfile:null, statScale:{hp:0.95,damage:1.1,speed:1.05,damageReduction:0}, art:mobArt(3,3),
      codex:{attack:"假动作后突然换道。",danger:"不要过早预判其路线。"} },

    { unitId:"fighter-c03-01", name:"航站伏击机·折返", category:"fighter", chapterIndex:3, slot:"F1", firstStageId:"3_1", baseType:"charger",
      motionProfile:{type:"returnPass",speedScale:1,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:null, statScale:{hp:1.1,damage:1.15,speed:1,damageReduction:0.04}, art:fighterArt(3,1,"charger"),
      codex:{attack:"突入后反向折返。",danger:"注意突入后的折返路线。"} },
    { unitId:"fighter-c03-02", name:"轨道剪切机·岔口", category:"fighter", chapterIndex:3, slot:"F2", firstStageId:"3_2", baseType:"shooter",
      motionProfile:{type:"straight",speedScale:0.9,amplitude:0,frequency:0},
      attackProfile:{type:"cross",bulletPattern:"cross_fire",intervalScale:0.95},
      supportProfile:null, statScale:{hp:1.05,damage:1.1,speed:0.9,damageReduction:0}, art:fighterArt(3,2),
      codex:{attack:"交叉火力。",danger:"注意交叉点的弹幕密度。"} },
    { unitId:"fighter-c03-03", name:"数据窃航机·抄写", category:"fighter", chapterIndex:3, slot:"F3", firstStageId:"3_6", baseType:"shooter",
      motionProfile:{type:"straight",speedScale:0.88,amplitude:0,frequency:0},
      attackProfile:{type:"patternCopy",bulletPattern:"triple",intervalScale:1},
      supportProfile:null, statScale:{hp:1,damage:1,speed:0.88,damageReduction:0}, art:fighterArt(3,3),
      codex:{attack:"复制上一波敌弹模式。",danger:"注意弹型的重复模式。"} },

    { unitId:"elite-c03-01", name:"旧港守夜人", category:"elite", chapterIndex:3, slot:"E1", firstStageId:"3_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.78,amplitude:24,frequency:0.5},
      attackProfile:{type:"spread",bulletPattern:"elite_cross",intervalScale:0.86},
      supportProfile:{type:"pincer",pincerOffset:80},
      statScale:{hp:1.05,damage:1.1,speed:0.78,damageReduction:0.06}, art:eliteArt(3,1),
      codex:{attack:"上下夹击。",danger:"避免在上下弹幕夹击区停留。"} },
    { unitId:"elite-c03-02", name:"导航阵列劫持核", category:"elite", chapterIndex:3, slot:"E2", firstStageId:"3_8", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.7,amplitude:14,frequency:0.45},
      attackProfile:{type:"spread",bulletPattern:"elite_spread",intervalScale:0.84},
      supportProfile:{type:"entryRedirect",redirectSide:"top"},
      statScale:{hp:1.15,damage:1.15,speed:0.7,damageReduction:0.08}, art:eliteArt(3,2),
      codex:{attack:"改变敌机入场方向并召唤护卫。",danger:"注意非预期的入场方向。"} }
  );

  // -- Chapter 4 --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c04-01", name:"薄幕蜂", category:"mob", chapterIndex:4, slot:"M1", firstStageId:"4_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.95,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.2},
      supportProfile:{type:"frontShield",shieldHp:40},
      statScale:{hp:0.95,damage:1,speed:0.95,damageReduction:0}, art:mobArt(4,1),
      codex:{attack:"拥有一次性前向护盾。",danger:"先击破护盾再输出本体。"} },
    { unitId:"mob-c04-02", name:"折光针", category:"mob", chapterIndex:4, slot:"M2", firstStageId:"4_1", baseType:"small",
      motionProfile:{type:"blink",speedScale:1,amplitude:0,frequency:0,blinkDistance:60},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.15},
      supportProfile:null, statScale:{hp:0.9,damage:1.05,speed:1,damageReduction:0}, art:mobArt(4,2),
      codex:{attack:"短距离闪移。",danger:"闪移后位置可能改变弹道方向。"} },
    { unitId:"mob-c04-03", name:"充能梭", category:"mob", chapterIndex:4, slot:"M3", firstStageId:"4_3", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.85,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:{type:"shieldAlly",shieldAmount:30,shieldRange:150},
      statScale:{hp:1.05,damage:1,speed:0.85,damageReduction:0.03}, art:mobArt(4,3),
      codex:{attack:"为邻近敌机补充护盾。",danger:"优先清除以阻止护盾补充。"} },

    { unitId:"fighter-c04-01", name:"护盾投射机·屏", category:"fighter", chapterIndex:4, slot:"F1", firstStageId:"4_1", baseType:"shield",
      motionProfile:{type:"formation",speedScale:0.6,amplitude:0,frequency:0},
      attackProfile:{type:"slowWall",bulletPattern:"slow_wall",intervalScale:1.05},
      supportProfile:{type:"shieldWall",wallCount:3},
      statScale:{hp:1.35,damage:1,speed:0.6,damageReduction:0.15}, art:fighterArt(4,1,"shield"),
      codex:{attack:"组成移动盾墙。",danger:"盾墙后跟随敌机，快速突破。"} },
    { unitId:"fighter-c04-02", name:"冲锋破线机·锥", category:"fighter", chapterIndex:4, slot:"F2", firstStageId:"4_2", baseType:"charger",
      motionProfile:{type:"charge",speedScale:1.25,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:null, statScale:{hp:1.15,damage:1.35,speed:1.25,damageReduction:0.05}, art:fighterArt(4,2,"charger"),
      codex:{attack:"预警后高速冲锋。",danger:"预判冲锋路线提前避让。"} },
    { unitId:"fighter-c04-03", name:"封路编织机·格", category:"fighter", chapterIndex:4, slot:"F3", firstStageId:"4_6", baseType:"shield",
      motionProfile:{type:"straight",speedScale:0.6,amplitude:0,frequency:0},
      attackProfile:{type:"cross",bulletPattern:"slow_wall",intervalScale:0.9},
      supportProfile:null, statScale:{hp:1.3,damage:1.05,speed:0.6,damageReduction:0.1}, art:fighterArt(4,3,"shield"),
      codex:{attack:"发射交错慢弹。",danger:"在交错弹幕网格中找缝隙穿行。"} },

    { unitId:"elite-c04-01", name:"天幕执盾者", category:"elite", chapterIndex:4, slot:"E1", firstStageId:"4_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.72,amplitude:16,frequency:0.5},
      attackProfile:{type:"spread",bulletPattern:"elite_shield_column",intervalScale:0.9},
      supportProfile:{type:"largeShield",shieldRadius:120,shieldDuration:5,cooldown:8},
      statScale:{hp:1.2,damage:1.05,speed:0.72,damageReduction:0.1}, art:eliteArt(4,1),
      codex:{attack:"周期性展开大型护盾。",danger:"护盾覆盖期内转火其他目标。"} },
    { unitId:"elite-c04-02", name:"中继充能核心", category:"elite", chapterIndex:4, slot:"E2", firstStageId:"4_8", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.65,amplitude:10,frequency:0.4},
      attackProfile:{type:"spread",bulletPattern:"elite_spread",intervalScale:0.85},
      supportProfile:{type:"shieldPulse",pulseRadius:200,pulseShieldAmount:60,pulseInterval:6},
      statScale:{hp:1.3,damage:1.1,speed:0.65,damageReduction:0.12}, art:eliteArt(4,2),
      codex:{attack:"释放范围护盾脉冲。",danger:"脉冲期间优先击杀以阻止护盾恢复。"} }
  );

  // -- Chapter 5 --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c05-01", name:"节拍蜂", category:"mob", chapterIndex:5, slot:"M1", firstStageId:"5_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:1,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1},
      supportProfile:null, statScale:{hp:1.05,damage:1,speed:1,damageReduction:0}, art:mobArt(5,1),
      codex:{attack:"按固定节奏单发。",danger:"跟随节拍移动躲避。"} },
    { unitId:"mob-c05-02", name:"爆点萤", category:"mob", chapterIndex:5, slot:"M2", firstStageId:"5_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.95,amplitude:0,frequency:0},
      attackProfile:{type:"bombMine",bulletPattern:"bomb_mine",intervalScale:1.2},
      supportProfile:null, statScale:{hp:1,damage:1.1,speed:0.95,damageReduction:0}, art:mobArt(5,2),
      codex:{attack:"投放小型爆雷。",danger:"远离爆雷投放点。"} },
    { unitId:"mob-c05-03", name:"标记梭", category:"mob", chapterIndex:5, slot:"M3", firstStageId:"5_3", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.9,amplitude:0,frequency:0},
      attackProfile:{type:"mark",bulletPattern:"single",intervalScale:1.1},
      supportProfile:{type:"markTarget",markDuration:3,markDamageBonus:1.3},
      statScale:{hp:0.95,damage:0.9,speed:0.9,damageReduction:0}, art:mobArt(5,3),
      codex:{attack:"标记玩家后引导齐射。",danger:"被标记后立即规避。"} },

    { unitId:"fighter-c05-01", name:"黑潮轰炸机·落钟", category:"fighter", chapterIndex:5, slot:"F1", firstStageId:"5_1", baseType:"bomber",
      motionProfile:{type:"straight",speedScale:0.75,amplitude:0,frequency:0},
      attackProfile:{type:"bombMine",bulletPattern:"bomb_mine",intervalScale:0.95},
      supportProfile:null, statScale:{hp:1.2,damage:1.2,speed:0.75,damageReduction:0.03}, art:fighterArt(5,1,"bomber"),
      codex:{attack:"连续投放爆雷。",danger:"不要在爆雷轨迹上停留。"} },
    { unitId:"fighter-c05-02", name:"齐射指挥机·拍点", category:"fighter", chapterIndex:5, slot:"F2", firstStageId:"5_2", baseType:"shooter",
      motionProfile:{type:"straight",speedScale:0.88,amplitude:0,frequency:0},
      attackProfile:{type:"triple",bulletPattern:"triple",intervalScale:0.9},
      supportProfile:{type:"formationCommand",syncRange:180},
      statScale:{hp:1.1,damage:1.05,speed:0.88,damageReduction:0.03}, art:fighterArt(5,2),
      codex:{attack:"控制周围敌机同步开火。",danger:"优先击杀以打乱齐射节奏。"} },
    { unitId:"fighter-c05-03", name:"追猎修正机·回拍", category:"fighter", chapterIndex:5, slot:"F3", firstStageId:"5_6", baseType:"sniper",
      motionProfile:{type:"straight",speedScale:0.82,amplitude:0,frequency:0},
      attackProfile:{type:"sniper",bulletPattern:"sniper_warning",intervalScale:1.2},
      supportProfile:null, statScale:{hp:1.05,damage:1.25,speed:0.82,damageReduction:0}, art:fighterArt(5,3,"sniper"),
      codex:{attack:"子弹飞行中进行方向修正。",danger:"看见锁定线后持续移动。"} },

    { unitId:"elite-c05-01", name:"精英乐团首席·强音", category:"elite", chapterIndex:5, slot:"E1", firstStageId:"5_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.75,amplitude:18,frequency:0.5},
      attackProfile:{type:"spread",bulletPattern:"elite_summon",intervalScale:0.82},
      supportProfile:null, statScale:{hp:1.1,damage:1.15,speed:0.75,damageReduction:0.06}, art:eliteArt(5,1),
      codex:{attack:"宽角扇射和重弹交替。",danger:"识别弹型切换节奏。"} },
    { unitId:"elite-c05-02", name:"战术学习核心·拟态", category:"elite", chapterIndex:5, slot:"E2", firstStageId:"5_8", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.68,amplitude:12,frequency:0.45},
      attackProfile:{type:"spread",bulletPattern:"elite_spread",intervalScale:0.8},
      supportProfile:{type:"patternCycle",patternCycleCount:3},
      statScale:{hp:1.2,damage:1.2,speed:0.68,damageReduction:0.08}, art:eliteArt(5,2),
      codex:{attack:"三种弹型循环切换。",danger:"注意弹型切换点提前移位。"} }
  );

  // -- Chapter 6 --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c06-01", name:"舰群信标蜂", category:"mob", chapterIndex:6, slot:"M1", firstStageId:"6_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.95,amplitude:0,frequency:0},
      attackProfile:{type:"mark",bulletPattern:"single",intervalScale:1.05},
      supportProfile:{type:"markTarget",markDuration:3.5,markDamageBonus:1.4},
      statScale:{hp:1,damage:0.95,speed:0.95,damageReduction:0}, art:mobArt(6,1),
      codex:{attack:"为狙击单位标记目标。",danger:"被标记后注意躲避狙击弹。"} },
    { unitId:"mob-c06-02", name:"照准针", category:"mob", chapterIndex:6, slot:"M2", firstStageId:"6_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.9,amplitude:0,frequency:0},
      attackProfile:{type:"sniper",bulletPattern:"sniper_warning",intervalScale:1.5},
      supportProfile:null, statScale:{hp:0.9,damage:1.3,speed:0.9,damageReduction:0}, art:mobArt(6,2),
      codex:{attack:"长预警、高速直线弹。",danger:"看见预警线立即避让。"} },
    { unitId:"mob-c06-03", name:"补位梭", category:"mob", chapterIndex:6, slot:"M3", firstStageId:"6_3", baseType:"small",
      motionProfile:{type:"formation",speedScale:0.95,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.05},
      supportProfile:{type:"fillFormation",fillRange:200},
      statScale:{hp:1,damage:1,speed:0.95,damageReduction:0}, art:mobArt(6,3),
      codex:{attack:"自动补入编队空位。",danger:"快速清编队，防止补位。"} },

    { unitId:"fighter-c06-01", name:"长程狙击机·白线", category:"fighter", chapterIndex:6, slot:"F1", firstStageId:"6_1", baseType:"sniper",
      motionProfile:{type:"straight",speedScale:0.8,amplitude:0,frequency:0},
      attackProfile:{type:"sniper",bulletPattern:"sniper_warning",intervalScale:1.3},
      supportProfile:null, statScale:{hp:1,damage:1.4,speed:0.8,damageReduction:0}, art:fighterArt(6,1,"sniper"),
      codex:{attack:"锁定线狙击。",danger:"离开锁定线再反击。"} },
    { unitId:"fighter-c06-02", name:"舰队护航机·侧卫", category:"fighter", chapterIndex:6, slot:"F2", firstStageId:"6_2", baseType:"guard",
      motionProfile:{type:"formation",speedScale:0.72,amplitude:0,frequency:0},
      attackProfile:{type:"triple",bulletPattern:"escort_volley",intervalScale:0.88},
      supportProfile:null, statScale:{hp:1.25,damage:1.1,speed:0.72,damageReduction:0.05}, art:fighterArt(6,2,"guard"),
      codex:{attack:"护航队列齐射。",danger:"优先清除护航队列以降低压制。"} },
    { unitId:"fighter-c06-03", name:"光矛炮艇·贯星", category:"fighter", chapterIndex:6, slot:"F3", firstStageId:"6_6", baseType:"sniper",
      motionProfile:{type:"straight",speedScale:0.7,amplitude:0,frequency:0},
      attackProfile:{type:"sniper",bulletPattern:"sniper_warning",intervalScale:1.4},
      supportProfile:{type:"chargeShot",chargeDuration:1.5},
      statScale:{hp:1.1,damage:1.6,speed:0.7,damageReduction:0.03}, art:fighterArt(6,3,"sniper"),
      codex:{attack:"蓄力直线贯穿炮。",danger:"蓄力期间优先击破。"} },

    { unitId:"elite-c06-01", name:"断星级火控官", category:"elite", chapterIndex:6, slot:"E1", firstStageId:"6_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.7,amplitude:14,frequency:0.45},
      attackProfile:{type:"spread",bulletPattern:"elite_sniper",intervalScale:0.82},
      supportProfile:null, statScale:{hp:1.1,damage:1.3,speed:0.7,damageReduction:0.06}, art:eliteArt(6,1),
      codex:{attack:"同时生成多条锁定线。",danger:"多条锁定线同时出现时优先规避。"} },
    { unitId:"elite-c06-02", name:"主力舰队执戟卫", category:"elite", chapterIndex:6, slot:"E2", firstStageId:"6_8", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.65,amplitude:10,frequency:0.4},
      attackProfile:{type:"spread",bulletPattern:"elite_spread",intervalScale:0.78},
      supportProfile:{type:"escort",escortCount:4,escortUnitIds:["fighter-c06-02"]},
      statScale:{hp:1.25,damage:1.2,speed:0.65,damageReduction:0.08}, art:eliteArt(6,2),
      codex:{attack:"护航冲刺与齐射组合。",danger:"清除护航机降低整体火力。"} }
  );

  // -- Chapter 7 --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c07-01", name:"装甲螨", category:"mob", chapterIndex:7, slot:"M1", firstStageId:"7_1", baseType:"small",
      motionProfile:{type:"edgeLane",speedScale:0.85,amplitude:10,frequency:0.6},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.15},
      supportProfile:null, statScale:{hp:1.1,damage:1,speed:0.85,damageReduction:0.1}, art:mobArt(7,1),
      codex:{attack:"贴边群行并带轻度减伤。",danger:"群行时用穿透武器清理。"} },
    { unitId:"mob-c07-02", name:"炉芯蜂", category:"mob", chapterIndex:7, slot:"M2", firstStageId:"7_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.85,amplitude:0,frequency:0},
      attackProfile:{type:"burst",bulletPattern:"delayed_burst",intervalScale:1.3},
      supportProfile:{type:"chargeShot",chargeDuration:1.2},
      statScale:{hp:1.05,damage:1.15,speed:0.85,damageReduction:0.03}, art:mobArt(7,2),
      codex:{attack:"蓄力后发射爆裂弹。",danger:"蓄力期间击破阻止爆裂。"} },
    { unitId:"mob-c07-03", name:"反击梭", category:"mob", chapterIndex:7, slot:"M3", firstStageId:"7_3", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.95,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.1},
      supportProfile:{type:"counterShot",counterRange:18,counterDamage:0.5},
      statScale:{hp:1,damage:1,speed:0.95,damageReduction:0.02}, art:mobArt(7,3),
      codex:{attack:"受到攻击后释放短距反击弹。",danger:"攻击后立即微移躲避反击弹。"} },

    { unitId:"fighter-c07-01", name:"母舰护卫·铁幕", category:"fighter", chapterIndex:7, slot:"F1", firstStageId:"7_1", baseType:"guard",
      motionProfile:{type:"formation",speedScale:0.68,amplitude:0,frequency:0},
      attackProfile:{type:"triple",bulletPattern:"escort_volley",intervalScale:0.85},
      supportProfile:null, statScale:{hp:1.4,damage:1.15,speed:0.68,damageReduction:0.1}, art:fighterArt(7,1,"guard"),
      codex:{attack:"重甲护航齐射。",danger:"高穿透武器优先处理。"} },
    { unitId:"fighter-c07-02", name:"装甲反击机·回刺", category:"fighter", chapterIndex:7, slot:"F2", firstStageId:"7_2", baseType:"shield",
      motionProfile:{type:"straight",speedScale:0.7,amplitude:0,frequency:0},
      attackProfile:{type:"slowWall",bulletPattern:"slow_wall",intervalScale:1},
      supportProfile:{type:"counterShot",counterRange:24,counterDamage:0.6},
      statScale:{hp:1.4,damage:1.05,speed:0.7,damageReduction:0.14}, art:fighterArt(7,2,"shield"),
      codex:{attack:"受击反击并改变航道。",danger:"攻击后注意反击弹和航道变化。"} },
    { unitId:"fighter-c07-03", name:"核心搬运机·负山", category:"fighter", chapterIndex:7, slot:"F3", firstStageId:"7_6", baseType:"core",
      motionProfile:{type:"straight",speedScale:0.55,amplitude:0,frequency:0},
      attackProfile:{type:"spread",bulletPattern:"elite_mothership",intervalScale:0.9},
      supportProfile:{type:"escort",escortCount:2,escortUnitIds:["mob-c07-01"]},
      statScale:{hp:1.6,damage:1.25,speed:0.55,damageReduction:0.15}, art:fighterArt(7,3,"core"),
      codex:{attack:"低速重甲推进并携带护卫。",danger:"优先清除护卫再集中火力。"} },

    { unitId:"elite-c07-01", name:"壁垒禁卫·巨盾", category:"elite", chapterIndex:7, slot:"E1", firstStageId:"7_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.62,amplitude:12,frequency:0.4},
      attackProfile:{type:"spread",bulletPattern:"elite_guard_volley",intervalScale:0.8},
      supportProfile:{type:"shieldCycle",shieldDuration:4.5,exposeDuration:2},
      statScale:{hp:1.35,damage:1.15,speed:0.62,damageReduction:0.15}, art:eliteArt(7,1),
      codex:{attack:"重盾与暴露窗口循环。",danger:"暴露窗口集中输出。"} },
    { unitId:"elite-c07-02", name:"重甲核心·地心", category:"elite", chapterIndex:7, slot:"E2", firstStageId:"7_8", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.55,amplitude:8,frequency:0.35},
      attackProfile:{type:"spread",bulletPattern:"elite_mothership",intervalScale:0.75},
      supportProfile:{type:"damageReductionAura",auraRadius:200,auraReductionRate:0.25},
      statScale:{hp:1.5,damage:1.3,speed:0.55,damageReduction:0.18}, art:eliteArt(7,2),
      codex:{attack:"范围减伤与重型弹幕。",danger:"优先击杀解除全场减伤。"} }
  );

  // -- Chapter 8 --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c08-01", name:"补给蚁", category:"mob", chapterIndex:8, slot:"M1", firstStageId:"8_1", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.8,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:{type:"healOrRepair",healAmount:25,healRange:150,healInterval:5},
      statScale:{hp:1.05,damage:1,speed:0.8,damageReduction:0.03}, art:mobArt(8,1),
      codex:{attack:"为重型敌机缓慢恢复护盾。",danger:"优先清除阻止维修。"} },
    { unitId:"mob-c08-02", name:"旋翼蜂", category:"mob", chapterIndex:8, slot:"M2", firstStageId:"8_1", baseType:"small",
      motionProfile:{type:"orbit",speedScale:0.85,amplitude:0,frequency:0,orbitRadius:60},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1},
      supportProfile:null, statScale:{hp:1,damage:1.05,speed:0.85,damageReduction:0}, art:mobArt(8,2),
      codex:{attack:"弧形环绕移动。",danger:"注意弧形弹幕轨迹。"} },
    { unitId:"mob-c08-03", name:"分裂籽", category:"mob", chapterIndex:8, slot:"M3", firstStageId:"8_3", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.9,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.1},
      supportProfile:{type:"splitOnDeath",splitCount:2,splitChildHp:0.4},
      statScale:{hp:0.9,damage:0.95,speed:0.9,damageReduction:0}, art:mobArt(8,3),
      codex:{attack:"被击毁后分裂成两个低血量子体。",danger:"击毁后立即清理分裂体。"} },

    { unitId:"fighter-c08-01", name:"旋翼封锁机·环刃", category:"fighter", chapterIndex:8, slot:"F1", firstStageId:"8_1", baseType:"rotor",
      motionProfile:{type:"straight",speedScale:0.7,amplitude:0,frequency:0},
      attackProfile:{type:"rotating",bulletPattern:"elite_rotating",intervalScale:0.85},
      supportProfile:null, statScale:{hp:1.25,damage:1.2,speed:0.7,damageReduction:0.04}, art:fighterArt(8,1,"rotor"),
      codex:{attack:"旋转弹幕。",danger:"跟随旋转节奏找缺口。"} },
    { unitId:"fighter-c08-02", name:"补给牵引机·驮星", category:"fighter", chapterIndex:8, slot:"F2", firstStageId:"8_2", baseType:"guard",
      motionProfile:{type:"formation",speedScale:0.65,amplitude:0,frequency:0},
      attackProfile:{type:"triple",bulletPattern:"escort_volley",intervalScale:0.9},
      supportProfile:{type:"healOrRepair",healAmount:40,healRange:160,healInterval:4},
      statScale:{hp:1.3,damage:1.05,speed:0.65,damageReduction:0.06}, art:fighterArt(8,2,"guard"),
      codex:{attack:"修复并拖带护卫。",danger:"优先击杀以阻止维修。"} },
    { unitId:"fighter-c08-03", name:"延迟分裂机·子母", category:"fighter", chapterIndex:8, slot:"F3", firstStageId:"8_6", baseType:"bomber",
      motionProfile:{type:"straight",speedScale:0.75,amplitude:0,frequency:0},
      attackProfile:{type:"split",bulletPattern:"delayed_burst",intervalScale:0.95},
      supportProfile:null, statScale:{hp:1.15,damage:1.15,speed:0.75,damageReduction:0.02}, art:fighterArt(8,3,"bomber"),
      codex:{attack:"延迟分裂弹。",danger:"分裂子弹碰前保持距离。"} },

    { unitId:"elite-c08-01", name:"基地防卫队长·禁飞", category:"elite", chapterIndex:8, slot:"E1", firstStageId:"8_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.68,amplitude:16,frequency:0.45},
      attackProfile:{type:"spread",bulletPattern:"elite_rotating",intervalScale:0.78},
      supportProfile:{type:"charge",chargeSpeed:1.3},
      statScale:{hp:1.15,damage:1.2,speed:0.68,damageReduction:0.07}, art:eliteArt(8,1),
      codex:{attack:"旋转封锁与冲刺组合。",danger:"冲刺预警时避让。"} },
    { unitId:"elite-c08-02", name:"巢城供能核心·脐带", category:"elite", chapterIndex:8, slot:"E2", firstStageId:"8_8", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.58,amplitude:10,frequency:0.38},
      attackProfile:{type:"spread",bulletPattern:"elite_spread",intervalScale:0.76},
      supportProfile:{type:"healOrRepair",healAmount:60,healRange:250,healInterval:3.5,summonUnitIds:["mob-c08-01"],summonCount:2},
      statScale:{hp:1.35,damage:1.15,speed:0.58,damageReduction:0.1}, art:eliteArt(8,2),
      codex:{attack:"范围修复并召唤补给机。",danger:"优先击杀以切断维修和补给链。"} }
  );

  // -- Chapter 9 --
  REGULAR_ENEMIES.push(
    { unitId:"mob-c09-01", name:"潮孢侦体", category:"mob", chapterIndex:9, slot:"M1", firstStageId:"9_1", baseType:"small",
      motionProfile:{type:"drift",speedScale:0.85,amplitude:14,frequency:0.7},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1},
      supportProfile:{type:"sporeBurst",sporeCount:3},
      statScale:{hp:1.05,damage:1.05,speed:0.85,damageReduction:0.02}, art:mobArt(9,1),
      codex:{attack:"漂移移动并释放孢子弹。",danger:"孢子扩散时移开扩散区域。"} },
    { unitId:"mob-c09-02", name:"草母触须蜂", category:"mob", chapterIndex:9, slot:"M2", firstStageId:"9_1", baseType:"small",
      motionProfile:{type:"sway",speedScale:0.9,amplitude:20,frequency:1.6},
      attackProfile:{type:"tracking",bulletPattern:"single",intervalScale:1.05},
      supportProfile:null, statScale:{hp:1,damage:1.1,speed:0.9,damageReduction:0}, art:mobArt(9,2),
      codex:{attack:"摆动飞行，短程追踪。",danger:"持续移动避免被追踪。"} },
    { unitId:"mob-c09-03", name:"母巢幼体", category:"mob", chapterIndex:9, slot:"M3", firstStageId:"9_3", baseType:"small",
      motionProfile:{type:"straight",speedScale:0.88,amplitude:0,frequency:0},
      attackProfile:{type:"single",bulletPattern:"single",intervalScale:1.05},
      supportProfile:{type:"sporeBurst",sporeCount:4},
      statScale:{hp:0.95,damage:1.05,speed:0.88,damageReduction:0}, art:mobArt(9,3),
      codex:{attack:"击毁后散出小型孢子弹。",danger:"击毁后立即离开孢子扩散区。"} },

    { unitId:"fighter-c09-01", name:"内壁寄生机·附骨", category:"fighter", chapterIndex:9, slot:"F1", firstStageId:"9_1", baseType:"charger",
      motionProfile:{type:"boundaryAmbush",speedScale:1.1,amplitude:0,frequency:0},
      attackProfile:{type:"none",bulletPattern:"none",intervalScale:1},
      supportProfile:null, statScale:{hp:1.15,damage:1.3,speed:1.1,damageReduction:0.04}, art:fighterArt(9,1,"charger"),
      codex:{attack:"贴近战场边缘伏击。",danger:"注意边缘的伏击冲锋。"} },
    { unitId:"fighter-c09-02", name:"母舰护卫·潮刃", category:"fighter", chapterIndex:9, slot:"F2", firstStageId:"9_2", baseType:"guard",
      motionProfile:{type:"arcSlash",speedScale:0.75,amplitude:0,frequency:0},
      attackProfile:{type:"cross",bulletPattern:"escort_volley",intervalScale:0.82},
      supportProfile:null, statScale:{hp:1.35,damage:1.2,speed:0.75,damageReduction:0.07}, art:fighterArt(9,2,"guard"),
      codex:{attack:"弧线冲切。",danger:"弧线路径上持续移动躲避。"} },
    { unitId:"fighter-c09-03", name:"核心收割机·沉梦", category:"fighter", chapterIndex:9, slot:"F3", firstStageId:"9_6", baseType:"core",
      motionProfile:{type:"straight",speedScale:0.6,amplitude:0,frequency:0},
      attackProfile:{type:"gravityShot",bulletPattern:"elite_mothership",intervalScale:0.85},
      supportProfile:{type:"gravityDrag",dragRadius:180,dragStrength:0.3},
      statScale:{hp:1.55,damage:1.35,speed:0.6,damageReduction:0.12}, art:fighterArt(9,3,"core"),
      codex:{attack:"引力慢弹与范围拖拽。",danger:"远离引力范围保持机动。"} },

    { unitId:"elite-c09-01", name:"三海草母·分株", category:"elite", chapterIndex:9, slot:"E1", firstStageId:"9_3", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.62,amplitude:18,frequency:0.42},
      attackProfile:{type:"spread",bulletPattern:"elite_mothership",intervalScale:0.76},
      supportProfile:{type:"summon",summonUnitIds:["mob-c09-01","mob-c09-03"],summonCount:3,summonInterval:6},
      statScale:{hp:1.3,damage:1.25,speed:0.62,damageReduction:0.1}, art:eliteArt(9,1),
      codex:{attack:"触须扇幕并召唤孢子体。",danger:"优先清除孢子体。"} },
    { unitId:"elite-c09-02", name:"弥赛亚近卫·圣骸", category:"elite", chapterIndex:9, slot:"E2", firstStageId:"9_8", baseType:"elite",
      motionProfile:{type:"patrol",speedScale:0.58,amplitude:12,frequency:0.38},
      attackProfile:{type:"spread",bulletPattern:"elite_mothership",intervalScale:0.72},
      supportProfile:{type:"modeSwitch",modes:["shield","charge","sniper"],switchInterval:5},
      statScale:{hp:1.45,damage:1.35,speed:0.58,damageReduction:0.12}, art:eliteArt(9,2),
      codex:{attack:"护盾、冲锋、狙击三模式轮换。",danger:"根据当前模式调整策略。"} }
  );

  // ─── 93 Bosses ──────────────────────────────────────────────────────

  var BOSSES = [];
  var chapterNames = ["序章","第一章","第二章","第三章","第四章","第五章","第六章","第七章","第八章","第九章"];

  // Helper: create boss definition
  function bossDef(ch, stage, name, phaseProfile, motionType, guardIds) {
    var chStr = String(ch).padStart(2, "0");
    var sStr = String(stage).padStart(2, "0");
    var stageId = ch === 0 ? "prologue_" + stage : ch + "_" + stage;
    return {
      bossId: "boss-c" + chStr + "-s" + sStr,
      stageId: stageId,
      chapterIndex: ch,
      stageInChapter: stage,
      name: name,
      formType: motionType,
      theme: "boss",
      baseType: "boss",
      motionProfile: { type: motionType, speedScale: 1 },
      phaseProfile: phaseProfile,
      cyclePatterns: phaseToPatterns(phaseProfile, ch),
      guardUnitIds: guardIds || [],
      statScale: { hp: 1, damage: 1, speed: 1 },
      art: bossArt(stage, ch)
    };
  }

  function phaseToPatterns(phase, ch) {
    var map = {
      tutorialAimed: ["boss_tutorial_line","boss_spread"],
      tutorialLanes: ["boss_lanes","boss_spread"],
      intrusionMixed: ["boss_spread","boss_summon","boss_lanes"],
      aimed: ["boss_aim","boss_spread"],
      lanes: ["boss_lanes","boss_spread","boss_aim"],
      cross: ["boss_cross","boss_spread","boss_lanes"],
      charge: ["boss_charge_lane","boss_spread","boss_lanes"],
      summon: ["boss_summon","boss_lanes","boss_spread"],
      sniper: ["boss_sniper","boss_spread","boss_lanes"],
      armorCounter: ["boss_armor_pulse","boss_lanes","boss_spread"],
      rotatingZone: ["boss_rotating_fan","boss_lanes","boss_spread"],
      mixedEscort: ["boss_summon","boss_cross","boss_spread","boss_lanes"],
      chapterFinale: ["boss_summon","boss_sniper","boss_rotating_fan","boss_lanes","boss_burst_spread"]
    };
    return map[phase] || ["boss_spread","boss_lanes"];
  }

  // Prologue 3 bosses
  BOSSES.push(
    bossDef(0, 1, "训练靶舰·启航", "tutorialAimed", "verticalPatrol", ["fighter-c00-01","mob-c00-01"]),
    bossDef(0, 2, "火控考官·准星", "tutorialLanes", "verticalPatrol", ["fighter-c00-02","mob-c00-02"]),
    bossDef(0, 3, "黑潮侵入体·零号", "intrusionMixed", "verticalPatrol", ["elite-c00-02","fighter-c00-03","mob-c00-03"])
  );

  // Chapter 1 10 bosses
  BOSSES.push(
    bossDef(1, 1, "外环哨塔·灰眼", "aimed", "verticalPatrol", ["fighter-c01-01","mob-c01-01"]),
    bossDef(1, 2, "封路截击机·赤栅", "lanes", "verticalPatrol", ["fighter-c01-02","mob-c01-02"]),
    bossDef(1, 3, "撤离线猎手·钩爪", "cross", "verticalPatrol", ["elite-c01-01","fighter-c01-02","mob-c01-03"]),
    bossDef(1, 4, "城环压制艇·铁幕", "charge", "verticalPatrol", ["elite-c01-01","fighter-c01-02","mob-c01-03"]),
    bossDef(1, 5, "包围圈队长·收网", "summon", "verticalPatrol", ["elite-c01-01","fighter-c01-02","mob-c01-01"]),
    bossDef(1, 6, "星港断路者·裂灯", "sniper", "verticalPatrol", ["elite-c01-01","fighter-c01-03","mob-c01-02"]),
    bossDef(1, 7, "高架伏击兽·跃脊", "armorCounter", "verticalPatrol", ["elite-c01-01","fighter-c01-03","mob-c01-03"]),
    bossDef(1, 8, "城门攻坚甲·破栅", "rotatingZone", "verticalPatrol", ["elite-c01-02","fighter-c01-03","mob-c01-02"]),
    bossDef(1, 9, "黑潮信标母机·回声", "mixedEscort", "verticalPatrol", ["elite-c01-02","fighter-c01-03","mob-c01-03"]),
    bossDef(1, 10, "弥赛亚·观测投影节点", "chapterFinale", "verticalPatrol", ["elite-c01-02","fighter-c01-03","mob-c01-01"])
  );

  // Chapter 2 10 bosses
  BOSSES.push(
    bossDef(2, 1, "铆城巡弋舰·灰堡", "aimed", "verticalPatrol", ["fighter-c02-01","mob-c02-01"]),
    bossDef(2, 2, "双盾截击兽·犀角", "lanes", "verticalPatrol", ["fighter-c02-02","mob-c02-02"]),
    bossDef(2, 3, "层甲镇压机·叠岳", "cross", "verticalPatrol", ["elite-c02-01","fighter-c02-02","mob-c02-03"]),
    bossDef(2, 4, "反冲装甲艇·铁潮", "charge", "verticalPatrol", ["elite-c02-01","fighter-c02-02","mob-c02-03"]),
    bossDef(2, 5, "破甲试炼者·不动", "summon", "verticalPatrol", ["elite-c02-01","fighter-c02-02","mob-c02-01"]),
    bossDef(2, 6, "合页壁垒·玄门", "sniper", "verticalPatrol", ["elite-c02-01","fighter-c02-03","mob-c02-02"]),
    bossDef(2, 7, "装甲列阵核心·方城", "armorCounter", "verticalPatrol", ["elite-c02-01","fighter-c02-03","mob-c02-03"]),
    bossDef(2, 8, "重力碾压机·坠岳", "rotatingZone", "verticalPatrol", ["elite-c02-02","fighter-c02-03","mob-c02-02"]),
    bossDef(2, 9, "玄甲王庭·镇空", "mixedEscort", "verticalPatrol", ["elite-c02-02","fighter-c02-03","mob-c02-03"]),
    bossDef(2, 10, "玄甲空兽", "chapterFinale", "verticalPatrol", ["elite-c02-02","fighter-c02-03","mob-c02-01"])
  );

  // Chapter 3 10 bosses
  BOSSES.push(
    bossDef(3, 1, "闭锁登机桥·铡门", "aimed", "verticalPatrol", ["fighter-c03-01","mob-c03-01"]),
    bossDef(3, 2, "失控牵引机·拖网", "lanes", "verticalPatrol", ["fighter-c03-02","mob-c03-02"]),
    bossDef(3, 3, "跑道猎杀者·低空", "cross", "verticalPatrol", ["elite-c03-01","fighter-c03-02","mob-c03-03"]),
    bossDef(3, 4, "废舱拼接兽·百足", "charge", "verticalPatrol", ["elite-c03-01","fighter-c03-02","mob-c03-03"]),
    bossDef(3, 5, "伏击调度官·岔路", "summon", "verticalPatrol", ["elite-c03-01","fighter-c03-02","mob-c03-01"]),
    bossDef(3, 6, "导航欺骗体·假星", "sniper", "verticalPatrol", ["elite-c03-01","fighter-c03-03","mob-c03-02"]),
    bossDef(3, 7, "补给库吞噬机·空仓", "armorCounter", "verticalPatrol", ["elite-c03-01","fighter-c03-03","mob-c03-03"]),
    bossDef(3, 8, "撤离记录者·终班", "rotatingZone", "verticalPatrol", ["elite-c03-02","fighter-c03-03","mob-c03-02"]),
    bossDef(3, 9, "星港墓园中枢·默航", "mixedEscort", "verticalPatrol", ["elite-c03-02","fighter-c03-03","mob-c03-03"]),
    bossDef(3, 10, "失落空港守墓者", "chapterFinale", "verticalPatrol", ["elite-c03-02","fighter-c03-03","mob-c03-01"])
  );

  // Chapter 4 10 bosses
  BOSSES.push(
    bossDef(4, 1, "折光浮标·棱镜", "aimed", "verticalPatrol", ["fighter-c04-01","mob-c04-01"]),
    bossDef(4, 2, "双翼盾墙·雁门", "lanes", "verticalPatrol", ["fighter-c04-02","mob-c04-02"]),
    bossDef(4, 3, "冲锋楔机·贯阵", "cross", "verticalPatrol", ["elite-c04-01","fighter-c04-02","mob-c04-03"]),
    bossDef(4, 4, "封路织机·经纬", "charge", "verticalPatrol", ["elite-c04-01","fighter-c04-02","mob-c04-03"]),
    bossDef(4, 5, "穿插拦截者·回廊", "summon", "verticalPatrol", ["elite-c04-01","fighter-c04-02","mob-c04-01"]),
    bossDef(4, 6, "低轨电容兽·蓄雷", "sniper", "verticalPatrol", ["elite-c04-01","fighter-c04-03","mob-c04-02"]),
    bossDef(4, 7, "四面盾塔·方阵", "armorCounter", "verticalPatrol", ["elite-c04-01","fighter-c04-03","mob-c04-03"]),
    bossDef(4, 8, "天幕维修母机·补天", "rotatingZone", "verticalPatrol", ["elite-c04-02","fighter-c04-03","mob-c04-02"]),
    bossDef(4, 9, "护盾链总控·穹锁", "mixedEscort", "verticalPatrol", ["elite-c04-02","fighter-c04-03","mob-c04-03"]),
    bossDef(4, 10, "天幕护盾中继·阿特拉斯", "chapterFinale", "verticalPatrol", ["elite-c04-02","fighter-c04-03","mob-c04-01"])
  );

  // Chapter 5 10 bosses
  BOSSES.push(
    bossDef(5, 1, "节拍拦截机·先声", "aimed", "verticalPatrol", ["fighter-c05-01","mob-c05-01"]),
    bossDef(5, 2, "爆雷编舞者·落点", "lanes", "verticalPatrol", ["fighter-c05-02","mob-c05-02"]),
    bossDef(5, 3, "齐射领航舰·合拍", "cross", "verticalPatrol", ["elite-c05-01","fighter-c05-02","mob-c05-03"]),
    bossDef(5, 4, "猎杀校正体·复盘", "charge", "verticalPatrol", ["elite-c05-01","fighter-c05-02","mob-c05-03"]),
    bossDef(5, 5, "战术学习机·镜像", "summon", "verticalPatrol", ["elite-c05-01","fighter-c05-02","mob-c05-01"]),
    bossDef(5, 6, "浮空弦阵·共鸣", "sniper", "verticalPatrol", ["elite-c05-01","fighter-c05-03","mob-c05-02"]),
    bossDef(5, 7, "精英列队长·铁拍", "armorCounter", "verticalPatrol", ["elite-c05-01","fighter-c05-03","mob-c05-03"]),
    bossDef(5, 8, "轰炸指挥母机·终止符", "rotatingZone", "verticalPatrol", ["elite-c05-02","fighter-c05-03","mob-c05-02"]),
    bossDef(5, 9, "黑潮乐团旗舰·狂想", "mixedEscort", "verticalPatrol", ["elite-c05-02","fighter-c05-03","mob-c05-03"]),
    bossDef(5, 10, "黑潮节拍者·零式", "chapterFinale", "verticalPatrol", ["elite-c05-02","fighter-c05-03","mob-c05-01"])
  );

  // Chapter 6 10 bosses
  BOSSES.push(
    bossDef(6, 1, "前锋炮艇·开膛", "aimed", "verticalPatrol", ["fighter-c06-01","mob-c06-01"]),
    bossDef(6, 2, "远距照准塔·白线", "lanes", "verticalPatrol", ["fighter-c06-02","mob-c06-02"]),
    bossDef(6, 3, "侧卫巡洋机·咬翼", "cross", "verticalPatrol", ["elite-c06-01","fighter-c06-02","mob-c06-03"]),
    bossDef(6, 4, "光矛列舰·穿星", "charge", "verticalPatrol", ["elite-c06-01","fighter-c06-02","mob-c06-03"]),
    bossDef(6, 5, "母舰信号牧者·引潮", "summon", "verticalPatrol", ["elite-c06-01","fighter-c06-02","mob-c06-01"]),
    bossDef(6, 6, "舰队火控脑·千眼", "sniper", "verticalPatrol", ["elite-c06-01","fighter-c06-03","mob-c06-02"]),
    bossDef(6, 7, "重炮浮城·沉钟", "armorCounter", "verticalPatrol", ["elite-c06-01","fighter-c06-03","mob-c06-03"]),
    bossDef(6, 8, "护航战列兽·断鳍", "rotatingZone", "verticalPatrol", ["elite-c06-02","fighter-c06-03","mob-c06-02"]),
    bossDef(6, 9, "断星舰队旗舰·蚀日", "mixedEscort", "verticalPatrol", ["elite-c06-02","fighter-c06-03","mob-c06-03"]),
    bossDef(6, 10, "断星级主力舰·噬光", "chapterFinale", "verticalPatrol", ["elite-c06-02","fighter-c06-03","mob-c06-01"])
  );

  // Chapter 7 10 bosses
  BOSSES.push(
    bossDef(7, 1, "外壳巡逻机·甲虫", "aimed", "verticalPatrol", ["fighter-c07-01","mob-c07-01"]),
    bossDef(7, 2, "反击盾兽·回震", "lanes", "verticalPatrol", ["fighter-c07-02","mob-c07-02"]),
    bossDef(7, 3, "核心搬运体·负山", "cross", "verticalPatrol", ["elite-c07-01","fighter-c07-02","mob-c07-03"]),
    bossDef(7, 4, "多层装甲门·九锁", "charge", "verticalPatrol", ["elite-c07-01","fighter-c07-02","mob-c07-03"]),
    bossDef(7, 5, "穿透校验者·硬界", "summon", "verticalPatrol", ["elite-c07-01","fighter-c07-02","mob-c07-01"]),
    bossDef(7, 6, "壁垒修复机·缝甲", "sniper", "verticalPatrol", ["elite-c07-01","fighter-c07-03","mob-c07-02"]),
    bossDef(7, 7, "母舰骨架兽·脊城", "armorCounter", "verticalPatrol", ["elite-c07-01","fighter-c07-03","mob-c07-03"]),
    bossDef(7, 8, "重甲反应炉·赤心", "rotatingZone", "verticalPatrol", ["elite-c07-02","fighter-c07-03","mob-c07-02"]),
    bossDef(7, 9, "外壳守门巨像·不落", "mixedEscort", "verticalPatrol", ["elite-c07-02","fighter-c07-03","mob-c07-03"]),
    bossDef(7, 10, "母舰外壳·壁垒巨像", "chapterFinale", "verticalPatrol", ["elite-c07-02","fighter-c07-03","mob-c07-01"])
  );

  // Chapter 8 10 bosses
  BOSSES.push(
    bossDef(8, 1, "前线探照塔·昼盲", "aimed", "verticalPatrol", ["fighter-c08-01","mob-c08-01"]),
    bossDef(8, 2, "旋翼绞杀机·轮墓", "lanes", "verticalPatrol", ["fighter-c08-02","mob-c08-02"]),
    bossDef(8, 3, "补给拖航兽·驮城", "cross", "verticalPatrol", ["elite-c08-01","fighter-c08-02","mob-c08-03"]),
    bossDef(8, 4, "分裂弹巢·千籽", "charge", "verticalPatrol", ["elite-c08-01","fighter-c08-02","mob-c08-03"]),
    bossDef(8, 5, "供应链监工·断粮", "summon", "verticalPatrol", ["elite-c08-01","fighter-c08-02","mob-c08-01"]),
    bossDef(8, 6, "移动机库·吞翼", "sniper", "verticalPatrol", ["elite-c08-01","fighter-c08-03","mob-c08-02"]),
    bossDef(8, 7, "基地轨道炮·落轴", "armorCounter", "verticalPatrol", ["elite-c08-01","fighter-c08-03","mob-c08-03"]),
    bossDef(8, 8, "巢城外环·迁徙足", "rotatingZone", "verticalPatrol", ["elite-c08-02","fighter-c08-03","mob-c08-02"]),
    bossDef(8, 9, "防卫总控·封疆", "mixedEscort", "verticalPatrol", ["elite-c08-02","fighter-c08-03","mob-c08-03"]),
    bossDef(8, 10, "迁徙基地中枢·巢城", "chapterFinale", "verticalPatrol", ["elite-c08-02","fighter-c08-03","mob-c08-01"])
  );

  // Chapter 9 10 bosses
  BOSSES.push(
    bossDef(9, 1, "母舰舱门·吞口", "aimed", "verticalPatrol", ["fighter-c09-01","mob-c09-01"]),
    bossDef(9, 2, "潮汐血管·逆流", "lanes", "verticalPatrol", ["fighter-c09-02","mob-c09-02"]),
    bossDef(9, 3, "内壁寄生王·附骨", "cross", "verticalPatrol", ["elite-c09-01","fighter-c09-02","mob-c09-03"]),
    bossDef(9, 4, "三海草母·藻冠", "charge", "verticalPatrol", ["elite-c09-01","fighter-c09-02","mob-c09-03"]),
    bossDef(9, 5, "三海草母·潮根", "summon", "verticalPatrol", ["elite-c09-01","fighter-c09-02","mob-c09-01"]),
    bossDef(9, 6, "三海草母·孢宫", "sniper", "verticalPatrol", ["elite-c09-01","fighter-c09-03","mob-c09-02"]),
    bossDef(9, 7, "弥赛亚近卫·告解", "armorCounter", "verticalPatrol", ["elite-c09-01","fighter-c09-03","mob-c09-03"]),
    bossDef(9, 8, "母舰意识海·深潮", "rotatingZone", "verticalPatrol", ["elite-c09-02","fighter-c09-03","mob-c09-02"]),
    bossDef(9, 9, "弥赛亚机甲·圣像", "mixedEscort", "verticalPatrol", ["elite-c09-02","fighter-c09-03","mob-c09-03"]),
    bossDef(9, 10, "黑潮女王·弥赛亚", "chapterFinale", "verticalPatrol", ["elite-c09-02","fighter-c09-03","mob-c09-01"])
  );

  // ─── 93 Stage Rosters ───────────────────────────────────────────────

  /** @type {Array<{stageId:string,chapterIndex:number,stageInChapter:number,mobs:Array,fighters:Array,elites:Array,bossId:string,weights:object}>} */
  var STAGE_ROSTERS = [];

  function rosterM(ch, s, m, f, e, b) {
    var chIdx = ch;
    var stg = s;
    var stageId = ch === 0 ? "prologue_" + s : ch + "_" + s;
    var allIds = (m || []).concat(f || []).concat(e || []);
    var weights = {};
    var total = allIds.length || 1;
    for (var i = 0; i < allIds.length; i++) {
      weights[allIds[i]] = 1 / total;
    }
    return { stageId: stageId, chapterIndex: chIdx, stageInChapter: stg, mobs: m || [], fighters: f || [], elites: e || [], bossId: b, weights: weights };
  }

  // Prologue 3 stages
  STAGE_ROSTERS.push(
    rosterM(0,1,["mob-c00-01","mob-c00-02"],["fighter-c00-01"],[],"boss-c00-s01"),
    rosterM(0,2,["mob-c00-01","mob-c00-02","mob-c00-03"],["fighter-c00-01","fighter-c00-02"],["elite-c00-01"],"boss-c00-s02"),
    rosterM(0,3,["mob-c00-01","mob-c00-02","mob-c00-03"],["fighter-c00-01","fighter-c00-02","fighter-c00-03"],["elite-c00-01","elite-c00-02"],"boss-c00-s03")
  );

  // Chapter 1 (10 stages)
  STAGE_ROSTERS.push(
    rosterM(1,1,["mob-c01-01","mob-c01-02"],["fighter-c01-01"],[],"boss-c01-s01"),
    rosterM(1,2,["mob-c01-01","mob-c01-02"],["fighter-c01-01","fighter-c01-02"],[],"boss-c01-s02"),
    rosterM(1,3,["mob-c01-01","mob-c01-03"],["fighter-c01-01","fighter-c01-02"],["elite-c01-01"],"boss-c01-s03"),
    rosterM(1,4,["mob-c01-02","mob-c01-03"],["fighter-c01-01","fighter-c01-02"],["elite-c01-01"],"boss-c01-s04"),
    rosterM(1,5,["mob-c01-01","mob-c01-02","mob-c01-03"],["fighter-c01-01","fighter-c01-02"],["elite-c01-01"],"boss-c01-s05"),
    rosterM(1,6,["mob-c01-01","mob-c01-02","mob-c01-03"],["fighter-c01-02","fighter-c01-03"],["elite-c01-01"],"boss-c01-s06"),
    rosterM(1,7,["mob-c01-01","mob-c01-02","mob-c01-03"],["fighter-c01-01","fighter-c01-02","fighter-c01-03"],["elite-c01-01"],"boss-c01-s07"),
    rosterM(1,8,["mob-c01-01","mob-c01-02","mob-c01-03"],["fighter-c01-01","fighter-c01-02","fighter-c01-03"],["elite-c01-01","elite-c01-02"],"boss-c01-s08"),
    rosterM(1,9,["mob-c01-01","mob-c01-02","mob-c01-03"],["fighter-c01-02","fighter-c01-03"],["elite-c01-01","elite-c01-02"],"boss-c01-s09"),
    rosterM(1,10,["mob-c01-01","mob-c01-02","mob-c01-03"],["fighter-c01-01","fighter-c01-02","fighter-c01-03"],["elite-c01-01","elite-c01-02"],"boss-c01-s10")
  );

  // Chapter 2
  STAGE_ROSTERS.push(
    rosterM(2,1,["mob-c02-01","mob-c02-02"],["fighter-c02-01"],[],"boss-c02-s01"),
    rosterM(2,2,["mob-c02-01","mob-c02-02"],["fighter-c02-01","fighter-c02-02"],[],"boss-c02-s02"),
    rosterM(2,3,["mob-c02-01","mob-c02-03"],["fighter-c02-01","fighter-c02-02"],["elite-c02-01"],"boss-c02-s03"),
    rosterM(2,4,["mob-c02-02","mob-c02-03"],["fighter-c02-01","fighter-c02-02"],["elite-c02-01"],"boss-c02-s04"),
    rosterM(2,5,["mob-c02-01","mob-c02-02","mob-c02-03"],["fighter-c02-01","fighter-c02-02"],["elite-c02-01"],"boss-c02-s05"),
    rosterM(2,6,["mob-c02-01","mob-c02-02","mob-c02-03"],["fighter-c02-02","fighter-c02-03"],["elite-c02-01"],"boss-c02-s06"),
    rosterM(2,7,["mob-c02-01","mob-c02-02","mob-c02-03"],["fighter-c02-01","fighter-c02-02","fighter-c02-03"],["elite-c02-01"],"boss-c02-s07"),
    rosterM(2,8,["mob-c02-01","mob-c02-02","mob-c02-03"],["fighter-c02-01","fighter-c02-02","fighter-c02-03"],["elite-c02-01","elite-c02-02"],"boss-c02-s08"),
    rosterM(2,9,["mob-c02-01","mob-c02-02","mob-c02-03"],["fighter-c02-02","fighter-c02-03"],["elite-c02-01","elite-c02-02"],"boss-c02-s09"),
    rosterM(2,10,["mob-c02-01","mob-c02-02","mob-c02-03"],["fighter-c02-01","fighter-c02-02","fighter-c02-03"],["elite-c02-01","elite-c02-02"],"boss-c02-s10")
  );

  // Chapters 3-9 follow the same pattern... Implemented below with a generator
  function genChapterRosters(ch) {
    var m1 = "mob-c" + String(ch).padStart(2, "0") + "-01";
    var m2 = "mob-c" + String(ch).padStart(2, "0") + "-02";
    var m3 = "mob-c" + String(ch).padStart(2, "0") + "-03";
    var f1 = "fighter-c" + String(ch).padStart(2, "0") + "-01";
    var f2 = "fighter-c" + String(ch).padStart(2, "0") + "-02";
    var f3 = "fighter-c" + String(ch).padStart(2, "0") + "-03";
    var e1 = "elite-c" + String(ch).padStart(2, "0") + "-01";
    var e2 = "elite-c" + String(ch).padStart(2, "0") + "-02";
    var chStr = String(ch).padStart(2, "0");

    return [
      rosterM(ch,1,[m1,m2],[f1],[],"boss-c"+chStr+"-s01"),
      rosterM(ch,2,[m1,m2],[f1,f2],[],"boss-c"+chStr+"-s02"),
      rosterM(ch,3,[m1,m3],[f1,f2],[e1],"boss-c"+chStr+"-s03"),
      rosterM(ch,4,[m2,m3],[f1,f2],[e1],"boss-c"+chStr+"-s04"),
      rosterM(ch,5,[m1,m2,m3],[f1,f2],[e1],"boss-c"+chStr+"-s05"),
      rosterM(ch,6,[m1,m2,m3],[f2,f3],[e1],"boss-c"+chStr+"-s06"),
      rosterM(ch,7,[m1,m2,m3],[f1,f2,f3],[e1],"boss-c"+chStr+"-s07"),
      rosterM(ch,8,[m1,m2,m3],[f1,f2,f3],[e1,e2],"boss-c"+chStr+"-s08"),
      rosterM(ch,9,[m1,m2,m3],[f2,f3],[e1,e2],"boss-c"+chStr+"-s09"),
      rosterM(ch,10,[m1,m2,m3],[f1,f2,f3],[e1,e2],"boss-c"+chStr+"-s10")
    ];
  }

  for (var ch = 3; ch <= 9; ch++) {
    STAGE_ROSTERS = STAGE_ROSTERS.concat(genChapterRosters(ch));
  }

  // ─── Indexes ────────────────────────────────────────────────────────

  var enemyById = {};
  var bossById = {};
  var bossByStageId = {};
  var rosterByStageId = {};
  var enemiesByChapter = {};
  var bossesByChapter = {};
  var rostersByChapter = {};

  for (var i = 0; i < REGULAR_ENEMIES.length; i++) {
    var eu = REGULAR_ENEMIES[i];
    enemyById[eu.unitId] = eu;
    if (!enemiesByChapter[eu.chapterIndex]) enemiesByChapter[eu.chapterIndex] = [];
    enemiesByChapter[eu.chapterIndex].push(eu);
  }

  for (var j = 0; j < BOSSES.length; j++) {
    var b = BOSSES[j];
    bossById[b.bossId] = b;
    bossByStageId[b.stageId] = b;
    if (!bossesByChapter[b.chapterIndex]) bossesByChapter[b.chapterIndex] = [];
    bossesByChapter[b.chapterIndex].push(b);
  }

  for (var k = 0; k < STAGE_ROSTERS.length; k++) {
    var sr = STAGE_ROSTERS[k];
    rosterByStageId[sr.stageId] = sr;
    if (!rostersByChapter[sr.chapterIndex]) rostersByChapter[sr.chapterIndex] = [];
    rostersByChapter[sr.chapterIndex].push(sr);
  }

  // ─── Public API ─────────────────────────────────────────────────────

  function getEnemyUnit(unitId) { return enemyById[unitId] || null; }
  function getAllEnemyUnits() { return REGULAR_ENEMIES.slice(); }

  function getStageId(chapterIndex, stageInChapter) {
    return chapterIndex === 0 ? "prologue_" + stageInChapter : chapterIndex + "_" + stageInChapter;
  }

  function getStageEnemyRoster(chapterIndex, stageInChapter) {
    var stageId = getStageId(chapterIndex, stageInChapter);
    return rosterByStageId[stageId] ? clone(rosterByStageId[stageId]) : null;
  }
  function getStageEnemyRosterById(stageId) {
    return rosterByStageId[stageId] ? clone(rosterByStageId[stageId]) : null;
  }

  function getStageBoss(chapterIndex, stageInChapter) {
    var stageId = getStageId(chapterIndex, stageInChapter);
    return bossByStageId[stageId] || null;
  }
  function getStageBossById(stageId) {
    return bossByStageId[stageId] || null;
  }

  function getChapterCodex(chapterIndex) {
    var units = enemiesByChapter[chapterIndex] || [];
    var bosses = bossesByChapter[chapterIndex] || [];
    var rosters = rostersByChapter[chapterIndex] || [];
    return {
      chapterIndex: chapterIndex,
      regularUnits: units.slice(),
      bosses: bosses.slice(),
      rosters: rosters.slice()
    };
  }

  function getPlayerShipName(shipId) {
    var ships = (scope.assets && scope.assets.SHIP_ASSETS) || [];
    for (var i = 0; i < ships.length; i++) {
      if (ships[i].id === shipId) return ships[i].name || shipId;
    }
    // Lazily load if scope.assets is not yet available at module init
    if (ships.length === 0) {
      var scopeAssets = root.RXGame && root.RXGame.assets;
      if (scopeAssets) {
        var shipAssets = scopeAssets.SHIP_ASSETS || [];
        for (var j = 0; j < shipAssets.length; j++) {
          if (shipAssets[j].id === shipId) return shipAssets[j].name || shipId;
        }
      }
    }
    return null;
  }

  function resolveEnemyArt(unitOrBoss, assetsConfig) {
    assetsConfig = assetsConfig || (scope.assets || {});
    if (!unitOrBoss || !unitOrBoss.art) return { src: null, isPlaceholder: true, art: null };
    var art = unitOrBoss.art;
    if (art.artStatus === "final") {
      var src = resolveAssetSrc(art.expectedSrc, assetsConfig);
      return { src: src, isPlaceholder: false, art: art };
    }
    // placeholder
    var fallbackKey = art.fallbackAssetId;
    var fallbackSrc = resolveFallbackSrc(fallbackKey, unitOrBoss, assetsConfig);
    return { src: fallbackSrc, isPlaceholder: true, art: art };
  }

  function resolveAssetSrc(expectedSrc, assetsConfig) {
    var base = assetsConfig.runtimeBase || "";
    if (typeof assetsConfig.runtimeAsset === "function") {
      // Split expectedSrc like "enemies/battle/c01-mob-01.png" → group, file
      var parts = expectedSrc.split("/");
      if (parts.length >= 2) {
        var file = parts.pop();
        var group = parts.join("/");
        try { return assetsConfig.runtimeAsset(group, file); } catch (e) {}
      }
    }
    return base + expectedSrc;
  }

  function resolveFallbackSrc(fallbackKey, unitOrBoss, assetsConfig) {
    // Try enemySprites first
    var sprites = (assetsConfig.ASSET_PATHS && assetsConfig.ASSET_PATHS.enemySprites) || {};
    var list = sprites[fallbackKey];
    if (list && list.length) return list[0];

    // Boss fallback: use BOSS_VISUALS
    if (unitOrBoss.category !== "mob" && unitOrBoss.category !== "fighter" && unitOrBoss.category !== "elite") {
      var ch = unitOrBoss.chapterIndex;
      if (ch >= 1 && ch <= 9 && assetsConfig.BOSS_VISUALS && assetsConfig.BOSS_VISUALS[ch]) {
        return assetsConfig.BOSS_VISUALS[ch].src;
      }
      // Generic boss
      if (assetsConfig.ASSET_PATHS && assetsConfig.ASSET_PATHS.boss) return assetsConfig.ASSET_PATHS.boss;
    }

    // Generic small enemy fallback
    var smallList = (assetsConfig.ASSET_PATHS && assetsConfig.ASSET_PATHS.smallEnemies) || [];
    if (smallList.length) return smallList[0];

    var eliteList = (assetsConfig.ASSET_PATHS && assetsConfig.ASSET_PATHS.eliteEnemies) || [];
    if (eliteList.length) return eliteList[0];

    return null;
  }

  // Weight computation
  function computeRosterWeights(roster) {
    if (!roster) return {};
    var allIds = (roster.mobs || []).concat(roster.fighters || []).concat(roster.elites || []);
    if (allIds.length === 0) return {};
    var weights = {};
    // Default equal weight, can be overridden
    var defW = 1 / allIds.length;
    for (var i = 0; i < allIds.length; i++) weights[allIds[i]] = defW;
    return weights;
  }

  var api = {
    REGULAR_ENEMIES: REGULAR_ENEMIES,
    BOSSES: BOSSES,
    STAGE_ROSTERS: STAGE_ROSTERS,
    getEnemyUnit: getEnemyUnit,
    getAllEnemyUnits: getAllEnemyUnits,
    getStageEnemyRoster: getStageEnemyRoster,
    getStageEnemyRosterById: getStageEnemyRosterById,
    getStageBoss: getStageBoss,
    getStageBossById: getStageBossById,
    getChapterCodex: getChapterCodex,
    getPlayerShipName: getPlayerShipName,
    resolveEnemyArt: resolveEnemyArt,
    getStageId: getStageId
  };

  scope.combatCodexConfig = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
