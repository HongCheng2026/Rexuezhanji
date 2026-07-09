(function registerMainFeaturePanelsView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  var TASK_CONTENT = [
    { id: "task_first_sortie", category: "成长", title: "首次出击", desc: "完成任意一次实战出击，建立基础作战记录。", condition: { type: "clear_count", target: 1, label: "累计通关 1 次" }, rewards: [{ type: "gold", amount: 2000 }] },
    { id: "task_prologue_1", category: "成长", title: "序章校准", desc: "通关序章 1，确认基础火控和移动手感。", condition: { type: "clear_stage", stageId: "prologue_1", label: "通关序章 1" }, rewards: [{ type: "gold", amount: 3000 }] },
    { id: "task_prologue_3", category: "成长", title: "黑潮警报", desc: "通关序章 3，完成新兵航线第一轮压测。", condition: { type: "clear_stage", stageId: "prologue_3", label: "通关序章 3" }, rewards: [{ type: "gold", amount: 5000 }] },
    { id: "task_stage_1_1", category: "成长", title: "星港外围", desc: "突破 1-1 星港外围，打开第一章主航道。", condition: { type: "clear_stage", stageId: "1_1", label: "通关 1-1 星港外围" }, rewards: [{ type: "gold", amount: 6000 }] },
    { id: "task_stage_1_2", category: "成长", title: "碎星航道", desc: "突破 1-2 碎星航道，熟悉更密集的敌机编队。", condition: { type: "clear_stage", stageId: "1_2", label: "通关 1-2 碎星航道" }, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "task_stage_1_3", category: "成长", title: "核心闸门", desc: "突破 1-3 核心闸门，完成第一章关键防线。", condition: { type: "clear_stage", stageId: "1_3", label: "通关 1-3 核心闸门" }, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "task_attack_3", category: "强化", title: "火力核心 Lv.3", desc: "将战机攻击强化到 3 级，提升清场效率。", condition: { type: "fighter_upgrade", stat: "attack", target: 3, label: "火力核心达到 Lv.3" }, rewards: [{ type: "gold", amount: 4000 }] },
    { id: "task_hp_3", category: "强化", title: "装甲舱 Lv.3", desc: "将战机生命强化到 3 级，提高容错空间。", condition: { type: "fighter_upgrade", stat: "hp", target: 3, label: "装甲舱达到 Lv.3" }, rewards: [{ type: "gold", amount: 4000 }] },
    { id: "task_pen_3", category: "强化", title: "推进器 Lv.3", desc: "将破甲推进强化到 3 级，压制高护甲目标。", condition: { type: "fighter_upgrade", stat: "armorPenetration", target: 3, label: "推进器达到 Lv.3" }, rewards: [{ type: "gold", amount: 4000 }] },
    { id: "task_upgrade_total_10", category: "强化", title: "整备总检", desc: "战机三项强化总等级达到 10，形成稳定养成基础。", condition: { type: "fighter_upgrade_total", target: 10, label: "强化总等级达到 10" }, rewards: [{ type: "gold", amount: 10000 }] },
    { id: "task_clear_3", category: "作战", title: "连续出击", desc: "累计通关 3 次，建立稳定的出击节奏。", condition: { type: "clear_count", target: 3, label: "累计通关 3 次" }, rewards: [{ type: "gold", amount: 5000 }] },
    { id: "task_clear_10", category: "作战", title: "星港巡航", desc: "累计通关 10 次，熟悉主要敌机和 Boss 节奏。", condition: { type: "clear_count", target: 10, label: "累计通关 10 次" }, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "task_clear_20", category: "作战", title: "航线守备", desc: "累计通关 20 次，完成稳定守备轮值。", condition: { type: "clear_count", target: 20, label: "累计通关 20 次" }, rewards: [{ type: "gold", amount: 24000 }] },
    { id: "task_perfect_1", category: "作战", title: "完美作战", desc: "获得 1 次完美通关，证明路线和输出节奏达标。", condition: { type: "perfect_count", target: 1, label: "完美通关 1 次" }, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "task_perfect_5", category: "作战", title: "无漏航线", desc: "获得 5 次完美通关，掌握关键弹幕空隙。", condition: { type: "perfect_count", target: 5, label: "完美通关 5 次" }, rewards: [{ type: "gold", amount: 18000 }] },
    { id: "task_boss_no_damage_1", category: "作战", title: "王牌规避", desc: "完成 1 次无伤 Boss 战，验证高压规避能力。", condition: { type: "no_damage_boss_count", target: 1, label: "无伤 Boss 1 次" }, rewards: [{ type: "gold", amount: 10000 }] },
    { id: "task_roster_2", category: "收集", title: "战姬集结", desc: "拥有 2 名战姬，准备多风格作战阵容。", condition: { type: "owned_pilots", target: 2, label: "拥有 2 名战姬" }, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "task_hangar_2", category: "收集", title: "双机整备", desc: "拥有 2 架战机，完成基础机库扩编。", condition: { type: "owned_ships", target: 2, label: "拥有 2 架战机" }, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "task_rank_ship", category: "收集", title: "高阶机体展示", desc: "当前出战 A 级或 S 级战机，展示主力机体整备状态。", condition: { type: "selected_ship_rank", ranks: ["A", "S"], target: 1, label: "出战 A/S 级战机" }, rewards: [{ type: "gold", amount: 6000 }] }
  ];

  var EVENT_CONTENT = [
    { tag: "概率提升", title: "星穹之翼", time: "预热中 / 限时机库", condition: "完成序章 3 后可查看活动池。", reward: "苍穹零式 / 星链研究券 / 钻石补给", status: "预告", text: "苍穹零式进入星港试飞序列，激光与贯穿流派获得专题展示。" },
    { tag: "突防试炼", title: "黑曜突防", time: "本周轮换 / 深空航线", condition: "通关 1-2 碎星航道后开放。", reward: "黑曜幽影试验券 / 导弹强化素材", status: "待接入", text: "暗核袭击机适合处理高压编队，活动展示导弹流清场路线。" },
    { tag: "破甲挑战", title: "金矢裁决", time: "本周轮换 / 高护甲目标", condition: "任意战机破甲强化达到 Lv.3。", reward: "金矢碎片 / 穿透模块 / 金币", status: "待接入", text: "金矢裁决强调短爆发和额外穿透，适合压制精英护盾目标。" },
    { tag: "每日补给", title: "每日出击补给", time: "每日刷新 / 05:00", condition: "今日完成任意关卡 1 次。", reward: "体力 30 / 金币 3000", status: "展示", text: "给日常出击准备的轻量补给，正式领取会在任务系统接入后开放。" },
    { tag: "章节推进", title: "星港突破", time: "长期开放", condition: "通关第一章关键节点。", reward: "金币 / 荣誉经验 / 机库展示位", status: "进行中", text: "根据章节推进展示阶段奖励，帮助玩家明确下一条主线航路。" },
    { tag: "七日成长", title: "新兵七日航线", time: "新账号前 7 日", condition: "完成登录、强化、通关、收集目标。", reward: "银翼整备箱 / 战姬招募券 / 钻石", status: "预告", text: "面向新手的七日目标板，当前先展示内容结构，不触发真实奖励。" }
  ];

  var ACHIEVEMENT_CONTENT = [
    { id: "ach_first_clear", category: "通关", title: "初战告捷", badge: "初战告捷", desc: "完成第一次通关。", metric: "clearCount", target: 1, rewards: [{ type: "gold", amount: 2000 }] },
    { id: "ach_outer_clear", category: "通关", title: "星港外围清剿", badge: "外围清剿", desc: "通关 1-1 星港外围。", metric: "stage:1_1", target: 1, rewards: [{ type: "gold", amount: 5000 }] },
    { id: "ach_gate_clear", category: "通关", title: "核心闸门突破", badge: "闸门突破", desc: "通关 1-3 核心闸门。", metric: "stage:1_3", target: 1, rewards: [{ type: "gold", amount: 9000 }] },
    { id: "ach_chapter_runner", category: "通关", title: "章节推进者", badge: "推进者", desc: "累计通关 10 次。", metric: "clearCount", target: 10, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "ach_perfect_1", category: "技巧", title: "完美作战", badge: "完美作战", desc: "获得 1 次完美通关。", metric: "perfectClearCount", target: 1, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "ach_perfect_20", category: "技巧", title: "无漏之翼", badge: "无漏之翼", desc: "获得 20 次完美通关。", metric: "perfectClearCount", target: 20, rewards: [{ type: "gold", amount: 30000 }] },
    { id: "ach_boss_no_damage", category: "技巧", title: "无伤 Boss", badge: "王牌规避", desc: "累计无伤 Boss 5 次。", metric: "noDamageBossClearCount", target: 5, rewards: [{ type: "gold", amount: 20000 }] },
    { id: "ach_bullet_dance", category: "技巧", title: "弹幕穿梭", badge: "弹幕穿梭", desc: "以完美通关记录证明规避路线。", metric: "perfectClearCount", target: 5, rewards: [{ type: "gold", amount: 16000 }] },
    { id: "ach_limit_recycle", category: "技巧", title: "极限回收", badge: "补给猎手", desc: "累计通关 20 次，形成稳定回收节奏。", metric: "clearCount", target: 20, rewards: [{ type: "gold", amount: 22000 }] },
    { id: "ach_attack_5", category: "养成", title: "火力校准", badge: "火力校准", desc: "攻击强化达到 Lv.5。", metric: "upgrade:attack", target: 5, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "ach_hp_5", category: "养成", title: "装甲成型", badge: "装甲成型", desc: "生命强化达到 Lv.5。", metric: "upgrade:hp", target: 5, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "ach_pen_5", category: "养成", title: "推进稳定", badge: "推进稳定", desc: "破甲强化达到 Lv.5。", metric: "upgrade:armorPenetration", target: 5, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "ach_upgrade_total", category: "养成", title: "王牌机库", badge: "王牌机库", desc: "三项战机强化总等级达到 15。", metric: "upgradeTotal", target: 15, rewards: [{ type: "gold", amount: 24000 }] },
    { id: "ach_pilot_roster", category: "收集", title: "战姬集结", badge: "战姬集结", desc: "拥有 3 名战姬。", metric: "ownedPilots", target: 3, rewards: [{ type: "gold", amount: 15000 }] },
    { id: "ach_ship_roster", category: "收集", title: "银翼整备", badge: "银翼整备", desc: "拥有 3 架战机。", metric: "ownedShips", target: 3, rewards: [{ type: "gold", amount: 15000 }] },
    { id: "ach_s_rank_file", category: "收集", title: "S 级档案", badge: "S 级档案", desc: "拥有任意 S 级战姬或战机。", metric: "ownedSRank", target: 1, rewards: [{ type: "gold", amount: 20000 }] },
    { id: "ach_honor_record", category: "收集", title: "星港荣誉", badge: "星港荣誉", desc: "任意关卡荣誉达到 Tier 3。", metric: "bestHonor", target: 3, rewards: [{ type: "gold", amount: 18000 }] }
  ];

  var SHOP_CONTENT = [
    { category: "资源补给", title: "每日免费补给", price: "免费 / 每日一次", reward: "体力 20 / 金币 1000", desc: "日常出击前的轻量补给，正式领取待接入。", status: "展示" },
    { category: "资源补给", title: "金币包", price: "钻石 1", reward: "金币 200", desc: "现有云端商品 gold_200 的展示入口。", status: "云存档购买" },
    { category: "资源补给", title: "小体力包", price: "钻石 3", reward: "体力 50", desc: "补足短线出击体力，当前不执行扣费。", status: "待接入" },
    { category: "资源补给", title: "大体力包", price: "钻石 8", reward: "体力 150 / 金币 2000", desc: "适合连续挑战章节节点。", status: "待接入" },
    { category: "强化补给", title: "火力校准包", price: "金币 6000", reward: "火力核心调试素材", desc: "面向攻击强化的素材补给展示。", status: "展示" },
    { category: "强化补给", title: "装甲维护包", price: "金币 6000", reward: "装甲舱维护素材", desc: "面向生命强化的素材补给展示。", status: "展示" },
    { category: "强化补给", title: "推进器调试包", price: "金币 6000", reward: "破甲 / 推进调试素材", desc: "面向破甲强化的素材补给展示。", status: "展示" },
    { category: "战机补给", title: "银翼整备箱", price: "钻石 12", reward: "银翼 06 整备零件", desc: "主力均衡战机的整备补给。", status: "待接入" },
    { category: "战机补给", title: "星链研究券", price: "活动代币", reward: "苍穹零式研究进度", desc: "星穹之翼活动关联道具。", status: "预告" },
    { category: "活动礼包", title: "星港支援礼包", price: "钻石 18", reward: "金币 18000 / 体力 120", desc: "章节推进期的综合支援礼包。", status: "待接入" }
  ];

  var FRIEND_CONTENT = [
    { tag: "在线", title: "凌焰", role: "重火力助战", power: 16800, text: "最近在核心闸门压制 Boss，适合高压输出支援。", action: "申请助战" },
    { tag: "在线", title: "洛绮", role: "精英压制", power: 16100, text: "试飞金羽航线，擅长短窗口击穿精英目标。", action: "查看档案" },
    { tag: "忙碌", title: "夜岚", role: "高速突袭", power: 15400, text: "正在深空侦察队执行穿插训练。", action: "留言" },
    { tag: "在线", title: "沈曜", role: "火控指挥", power: 14300, text: "提供火控校准建议，适合强化前查看。", action: "请求建议" },
    { tag: "离线", title: "白凌", role: "精准训练", power: 9800, text: "保留了序章弹道训练记录，适合新手复盘。", action: "查看记录" },
    { tag: "离线", title: "林知寒", role: "防御反击", power: 9200, text: "标记了护盾机与狙击机的规避路线。", action: "同步情报" },
    { tag: "值班", title: "星港工程师", role: "机库维护", power: 7600, text: "建议优先把攻击、生命、破甲都提升到 Lv.3。", action: "查看建议" },
    { tag: "小队", title: "银翼小队", role: "编队助战", power: 12800, text: "第一章巡航编队，适合章节推进时借位助战。", action: "邀请编队" }
  ];

  var RANKING_CONTENT = {
    power: [
      { title: "夜航指挥官", name: "深空十七", score: 28600, tag: "NPC" },
      { title: "星港王牌", name: "凌焰", score: 26800, tag: "NPC" },
      { title: "金羽试飞组", name: "洛绮", score: 25400, tag: "NPC" },
      { title: "暗核突防队", name: "黑曜队长", score: 23100, tag: "NPC" },
      { title: "银翼训练营", name: "白凌", score: 17600, tag: "NPC" },
      { title: "星港后勤", name: "工程师 K", score: 13200, tag: "NPC" }
    ],
    clear: [
      { title: "航线守备", name: "星港王牌", score: 42, tag: "NPC" },
      { title: "碎星巡航", name: "银翼小队", score: 35, tag: "NPC" },
      { title: "核心突防", name: "夜岚", score: 31, tag: "NPC" },
      { title: "训练教官", name: "白凌", score: 24, tag: "NPC" },
      { title: "新兵领航", name: "苏绛星", score: 18, tag: "NPC" }
    ],
    honor: [
      { title: "无漏之翼", name: "洛绮", score: 8, tag: "NPC" },
      { title: "王牌规避", name: "夜岚", score: 7, tag: "NPC" },
      { title: "火力核心", name: "凌焰", score: 6, tag: "NPC" },
      { title: "稳定推进", name: "沈曜", score: 5, tag: "NPC" },
      { title: "冷月防线", name: "沈清歌", score: 4, tag: "NPC" }
    ]
  };

  var CHAT_CONTENT = {
    system: [
      "[系统] 今日出击补给已刷新，完成任意关卡可查看补给状态。",
      "[系统] 任务面板已同步本地通关、强化与收集记录。",
      "[系统] 商店当前为展示模式，真实购买仍需要云存档校验。",
      "[系统] 星穹之翼活动处于预热展示阶段。",
      "[系统] 排行榜为本地模拟榜，不上传玩家数据。",
      "[系统] 好友助战与聊天发送功能待接入。"
    ],
    world: [
      "[世界] 银翼小队：1-3 核心闸门建议先把攻击强化到 Lv.3。",
      "[世界] 夜岚：冲锋机出现前会有航道压力，别贴边硬躲。",
      "[世界] 洛绮：金矢裁决适合打护甲高的精英目标。",
      "[世界] 星港工程师：金币不够时先刷已通关节点。",
      "[世界] 白凌：序章训练别急着追掉落，先熟悉弹道。",
      "[世界] 凌焰：Boss 出场后保留主动技能更稳。"
    ],
    guild: [
      "[公会] 银翼训练营开放新兵复盘席位。",
      "[公会] 深空侦察队正在整理碎星航道路线。",
      "[公会] 星港后勤提示：强化材料展示清单已更新。",
      "[公会] 火控组建议优先提升主力战机三项基础等级。",
      "[公会] 机库维护班预告：助战位后续接入。",
      "[公会] 指挥频道当前为预览模式。"
    ],
    friend: [
      "[好友] 凌焰：需要火力支援时先叫我。",
      "[好友] 洛绮：等金羽试飞开放，一起看穿透表现。",
      "[好友] 夜岚：深空航线不适合贪输出。",
      "[好友] 沈曜：强化前先看成本，不要散点。",
      "[好友] 星港工程师：设置里可以单独调音乐和音效。",
      "[好友] 银翼小队：助战邀请功能待接入。"
    ]
  };

  var CHAT_PREVIEW_MESSAGES = [
    "[世界] 银翼小队：1-3 建议先把火力核心强化到 Lv.3。",
    "[系统] 星穹之翼活动处于预热展示阶段。",
    "[好友] 凌焰：需要火力支援时先叫我。",
    "[公会] 星港后勤：每日出击补给已刷新。",
    "[世界] 夜岚：深空航线不适合贪输出。",
    "[系统] 排行榜当前为本地模拟榜。",
    "[好友] 星港工程师：音乐和音效可在设置里单独调整。",
    "[世界] 洛绮：金矢裁决适合打高护甲目标。"
  ];

  var MAIL_CONTENT = [
    { type: "公告", title: "星港大厅系统改修完成", time: "今日", text: "大厅入口与子面板已切换为战术终端样式。", reward: "金币 3000", status: "附件待接入" },
    { type: "补给", title: "每日出击补给提醒", time: "05:00", text: "完成任意关卡后可在任务与活动面板查看补给说明。", reward: "体力 30", status: "展示" },
    { type: "活动", title: "星穹之翼预热", time: "本周", text: "苍穹零式与星链研究券将在活动系统接入后开放。", reward: "研究券预览", status: "预告" },
    { type: "维护", title: "音频设置升级", time: "今日", text: "音乐、音效开关和音量已拆分控制，并保存到本地。", reward: "无", status: "已读" },
    { type: "情报", title: "黑曜突防侦察记录", time: "昨日", text: "暗核突防队建议优先准备导弹流与破甲强化。", reward: "情报档案", status: "展示" }
  ];

  var SIGNIN_CONTENT = [
    { day: 1, title: "出击整备", reward: "金币 3000", status: "今日展示" },
    { day: 2, title: "火力校准", reward: "火力素材包", status: "预告" },
    { day: 3, title: "体力补给", reward: "体力 60", status: "预告" },
    { day: 4, title: "装甲维护", reward: "装甲素材包", status: "预告" },
    { day: 5, title: "银翼整备", reward: "银翼整备箱", status: "预告" },
    { day: 6, title: "星链研究", reward: "星链研究券", status: "预告" },
    { day: 7, title: "新兵大礼", reward: "钻石 30 / 金币 20000", status: "大奖展示" }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function clampNumber(value, min, max) {
    var number = Number(value);
    if (!isFinite(number)) number = min;
    return Math.max(min, Math.min(max, number));
  }

  function formatNumber(value) {
    var number = Math.max(0, Math.floor(Number(value) || 0));
    return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function progressPercent(current, target) {
    return clampNumber(Math.round((Math.max(0, current) / Math.max(1, target)) * 100), 0, 100);
  }

  function renderRewardList(rewards) {
    if (!rewards || !rewards.length) return "奖励待定";
    var names = { gold: "金币", diamonds: "钻石", energy: "体力" };
    return rewards.map(function (item) {
      return (names[item.type] || item.type || "奖励") + " " + formatNumber(item.amount || 0);
    }).join(" / ");
  }

  function getProgressRoot(profile) {
    return (profile && profile.progress) || {};
  }

  function getClearCount(profile) {
    return Math.max(0, Math.floor(Number(getProgressRoot(profile).clearCount) || 0));
  }

  function getPerfectCount(profile) {
    return Math.max(0, Math.floor(Number(getProgressRoot(profile).perfectClearCount) || 0));
  }

  function normalizeStageId(stageId) {
    return String(stageId || "").replace(/-/g, "_");
  }

  function isStageCleared(stageId, profile, levels) {
    var progress = getProgressRoot(profile);
    var ids = Array.isArray(progress.clearedStageIds) ? progress.clearedStageIds : [];
    var normalized = normalizeStageId(stageId);
    for (var i = 0; i < ids.length; i++) {
      if (normalizeStageId(ids[i]) === normalized) return true;
    }
    var ratings = (profile && profile.ratings) || {};
    if (ratings[stageId] || ratings[normalized] || ratings[String(stageId).replace(/_/g, "-")]) return true;
    levels = levels || [];
    for (var j = 0; j < levels.length; j++) {
      var level = levels[j];
      if (!level) continue;
      if (normalizeStageId(level.code) === normalized || normalizeStageId(level.id) === normalized) {
        return !!(ratings[level.id] || ratings[level.code]);
      }
    }
    return false;
  }

  function hasOwnedSRank(profile) {
    var owned = (profile && profile.owned) || {};
    var list = []
      .concat(Array.isArray(owned.pilots) ? owned.pilots : [])
      .concat(Array.isArray(owned.ships) ? owned.ships : []);
    for (var i = 0; i < list.length; i++) {
      if (String(list[i]).toUpperCase().indexOf("S") >= 0) return true;
    }
    return false;
  }

  function getBestHonor(profile) {
    var honors = getProgressRoot(profile).stageHonors || {};
    var best = 0;
    Object.keys(honors).forEach(function (key) {
      best = Math.max(best, Math.floor(Number(honors[key]) || 0));
    });
    return best;
  }

  function getTaskProgress(task, profile, levels) {
    var condition = task.condition || {};
    var owned = (profile && profile.owned) || {};
    var fighter = (profile && profile.fighterUpgrades) || {};
    var current = 0;
    var target = Math.max(1, Number(condition.target) || 1);
    if (condition.type === "clear_count") current = getClearCount(profile);
    if (condition.type === "clear_stage") current = isStageCleared(condition.stageId, profile, levels) ? 1 : 0;
    if (condition.type === "clear_chapter") {
      var chapters = getProgressRoot(profile).clearedChapterIds || [];
      current = chapters.indexOf(condition.chapterIndex) >= 0 ? 1 : 0;
    }
    if (condition.type === "fighter_upgrade") current = Math.max(1, Math.floor(Number(fighter[condition.stat]) || 1));
    if (condition.type === "fighter_upgrade_total") current = Math.max(0, Math.floor(Number(fighter.attack) || 1) + Math.floor(Number(fighter.hp) || 1) + Math.floor(Number(fighter.armorPenetration) || 1));
    if (condition.type === "perfect_count") current = getPerfectCount(profile);
    if (condition.type === "no_damage_boss_count") current = Math.max(0, Math.floor(Number(getProgressRoot(profile).noDamageBossClearCount) || 0));
    if (condition.type === "owned_pilots") current = Array.isArray(owned.pilots) ? owned.pilots.length : 0;
    if (condition.type === "owned_ships") current = Array.isArray(owned.ships) ? owned.ships.length : 0;
    if (condition.type === "selected_ship_rank") current = hasOwnedSRank(profile) ? 1 : 0;
    return { current: Math.min(current, target), rawCurrent: current, target: target, label: condition.label || task.title, done: current >= target };
  }

  function getAchievementMetric(item, profile, levels) {
    var metric = item.metric || "";
    var fighter = (profile && profile.fighterUpgrades) || {};
    var owned = (profile && profile.owned) || {};
    if (metric === "clearCount") return getClearCount(profile);
    if (metric === "perfectClearCount") return getPerfectCount(profile);
    if (metric === "noDamageBossClearCount") return Math.max(0, Number(getProgressRoot(profile).noDamageBossClearCount) || 0);
    if (metric.indexOf("stage:") === 0) return isStageCleared(metric.slice(6), profile, levels) ? 1 : 0;
    if (metric.indexOf("upgrade:") === 0) return Math.max(1, Math.floor(Number(fighter[metric.slice(8)]) || 1));
    if (metric === "upgradeTotal") return Math.max(0, Math.floor(Number(fighter.attack) || 1) + Math.floor(Number(fighter.hp) || 1) + Math.floor(Number(fighter.armorPenetration) || 1));
    if (metric === "ownedPilots") return Array.isArray(owned.pilots) ? owned.pilots.length : 0;
    if (metric === "ownedShips") return Array.isArray(owned.ships) ? owned.ships.length : 0;
    if (metric === "ownedSRank") return hasOwnedSRank(profile) ? 1 : 0;
    if (metric === "bestHonor") return getBestHonor(profile);
    return 0;
  }

  function statusText(done, claimed) {
    if (claimed) return "已完成";
    return done ? "待接入领取" : "进行中";
  }

  function decorateItems(items, categories, getProgress, claimedIds) {
    var doneCount = 0;
    var decorated = items.map(function (item) {
      var progress = getProgress(item);
      var claimed = claimedIds && claimedIds.indexOf(item.id) >= 0;
      if (progress.done) doneCount += 1;
      return { item: item, progress: progress, claimed: claimed };
    });
    decorated.sort(function (a, b) {
      var aw = a.claimed ? 0 : a.progress.done ? 2 : 1;
      var bw = b.claimed ? 0 : b.progress.done ? 2 : 1;
      return bw - aw;
    });
    return { rows: decorated, doneCount: doneCount, categories: categories };
  }

  function renderProgressBar(current, target) {
    return '<div class="terminal-progress" aria-hidden="true"><span style="width:' + progressPercent(current, target) + '%"></span></div>';
  }

  function renderStatusSummary(items) {
    var html = '<div class="terminal-summary">';
    for (var i = 0; i < items.length; i++) {
      html += '<article><span>' + escapeHtml(items[i].label) + '</span><strong>' + escapeHtml(items[i].value) + '</strong></article>';
    }
    return html + '</div>';
  }

  function renderRail(categories, active, note) {
    var html = '<aside class="terminal-rail">';
    for (var i = 0; i < categories.length; i++) {
      html += '<button type="button" class="' + (categories[i] === active ? "active" : "") + '" disabled data-terminal-tab="' + escapeHtml(categories[i]) + '">' + escapeHtml(categories[i]) + '</button>';
    }
    if (note) html += '<p>' + escapeHtml(note) + '</p>';
    return html + '</aside>';
  }

  function renderActionCard(data) {
    var progress = data.progress;
    var statusClass = data.statusClass || (progress && progress.done ? "is-ready" : "");
    var html = '<article class="terminal-focus-card">' +
      '<div class="terminal-focus-top"><span>' + escapeHtml(data.tag || "重点目标") + '</span><em class="' + statusClass + '">' + escapeHtml(data.status || "") + '</em></div>' +
      '<strong>' + escapeHtml(data.title) + '</strong>' +
      '<p>' + escapeHtml(data.desc || "") + '</p>';
    if (data.meta) html += '<dl>' + data.meta.map(function (row) { return '<div><dt>' + escapeHtml(row[0]) + '</dt><dd>' + escapeHtml(row[1]) + '</dd></div>'; }).join("") + '</dl>';
    if (progress) {
      html += '<div class="terminal-focus-progress"><span>' + escapeHtml(progress.label) + '</span><b>' + progress.current + '/' + progress.target + '</b></div>' +
        renderProgressBar(progress.current, progress.target);
    }
    html += '<footer><em>' + escapeHtml(data.reward || "") + '</em><button type="button" disabled>' + escapeHtml(data.action || "查看详情") + '</button></footer></article>';
    return html;
  }

  function renderListRow(data) {
    var progress = data.progress;
    var statusClass = data.statusClass || (progress && progress.done ? "is-ready" : "");
    var html = '<article class="terminal-list-row">' +
      '<span class="terminal-row-tag">' + escapeHtml(data.tag || "") + '</span>' +
      '<div><strong>' + escapeHtml(data.title || "") + '</strong><p>' + escapeHtml(data.desc || "") + '</p>';
    if (progress) html += '<small>' + escapeHtml(progress.label) + ' / ' + progress.current + '/' + progress.target + '</small>' + renderProgressBar(progress.current, progress.target);
    html += '</div><em class="' + statusClass + '">' + escapeHtml(data.status || "") + '</em></article>';
    return html;
  }

  function renderTerminalShell(config) {
    var html = '<section class="terminal-panel terminal-panel-' + escapeHtml(config.key || "default") + '">' +
      '<header class="terminal-header">' +
      '<div><span>' + escapeHtml(config.kicker || "STARPORT") + '</span><strong>' + escapeHtml(config.title || "") + '</strong></div>' +
      '<p>' + escapeHtml(config.desc || "") + '</p>' +
      '</header>' +
      '<section class="terminal-body">' +
      (config.rail || "") +
      '<section class="terminal-content">' +
      (config.summary || "") +
      (config.focus || "") +
      (config.list || "") +
      (config.footer || "") +
      '</section></section></section>';
    return html;
  }

  function renderTaskPanel(profile, levels) {
    var categories = ["成长", "强化", "作战", "收集"];
    var claimed = Array.isArray(profile && profile.claimedTasks) ? profile.claimedTasks : [];
    var model = decorateItems(TASK_CONTENT, categories, function (task) { return getTaskProgress(task, profile, levels); }, claimed);
    var focus = model.rows[0];
    var list = '<div class="terminal-list">';
    for (var i = 1; i < model.rows.length; i++) {
      var row = model.rows[i];
      list += renderListRow({
        tag: row.item.category,
        title: row.item.title,
        desc: row.item.desc,
        progress: row.progress,
        status: statusText(row.progress.done, row.claimed),
        statusClass: row.claimed ? "is-claimed" : row.progress.done ? "is-ready" : ""
      });
    }
    list += '</div>';
    return renderTerminalShell({
      key: "task",
      kicker: "TASK BOARD",
      title: "今日战术目标",
      desc: "优先显示可领取或最近目标，其他任务按分类压缩展示。",
      rail: renderRail(categories, focus.item.category, "领取字段尚未接入，按钮只展示状态。"),
      summary: renderStatusSummary([
        { label: "任务总数", value: TASK_CONTENT.length },
        { label: "已达成", value: model.doneCount },
        { label: "累计通关", value: getClearCount(profile) }
      ]),
      focus: renderActionCard({
        tag: focus.item.category,
        title: focus.item.title,
        desc: focus.item.desc,
        progress: focus.progress,
        status: statusText(focus.progress.done, focus.claimed),
        statusClass: focus.claimed ? "is-claimed" : focus.progress.done ? "is-ready" : "",
        reward: renderRewardList(focus.item.rewards),
        action: focus.progress.done ? "领取待接入" : "继续推进"
      }),
      list: list
    });
  }

  function renderAchievementPanel(profile, levels) {
    var categories = ["通关", "技巧", "养成", "收集"];
    var claimed = Array.isArray(profile && profile.claimedAchievements) ? profile.claimedAchievements : [];
    var model = decorateItems(ACHIEVEMENT_CONTENT, categories, function (item) {
      var current = getAchievementMetric(item, profile, levels);
      return { current: Math.min(current, item.target), rawCurrent: current, target: item.target, label: "铭牌 " + item.badge, done: current >= item.target };
    }, claimed);
    var focus = model.rows[0];
    var list = '<div class="terminal-list">';
    for (var i = 1; i < model.rows.length; i++) {
      var row = model.rows[i];
      list += renderListRow({
        tag: row.item.category,
        title: row.item.title,
        desc: row.item.desc,
        progress: row.progress,
        status: statusText(row.progress.done, row.claimed),
        statusClass: row.claimed ? "is-claimed" : row.progress.done ? "is-ready" : ""
      });
    }
    list += '</div>';
    return renderTerminalShell({
      key: "achievement",
      kicker: "HONOR ARCHIVE",
      title: "星港荣誉档案",
      desc: "成就根据本地通关、无伤、强化和收集记录计算。",
      rail: renderRail(categories, focus.item.category, "铭牌奖励为展示态。"),
      summary: renderStatusSummary([
        { label: "成就总数", value: ACHIEVEMENT_CONTENT.length },
        { label: "已达成", value: model.doneCount },
        { label: "最高荣誉", value: getBestHonor(profile) ? "Tier " + getBestHonor(profile) : "未记录" }
      ]),
      focus: renderActionCard({
        tag: focus.item.category,
        title: focus.item.title,
        desc: focus.item.desc,
        progress: focus.progress,
        status: statusText(focus.progress.done, focus.claimed),
        statusClass: focus.claimed ? "is-claimed" : focus.progress.done ? "is-ready" : "",
        reward: renderRewardList(focus.item.rewards),
        action: "成就铭牌"
      }),
      list: list
    });
  }

  function renderEventPanel(profile) {
    var focus = EVENT_CONTENT[0];
    var list = '<div class="terminal-list">';
    for (var i = 1; i < EVENT_CONTENT.length; i++) {
      list += renderListRow({ tag: EVENT_CONTENT[i].tag, title: EVENT_CONTENT[i].title, desc: EVENT_CONTENT[i].text, status: EVENT_CONTENT[i].status });
    }
    list += '</div>';
    return renderTerminalShell({
      key: "event",
      kicker: "EVENT OPS",
      title: "星港活动排程",
      desc: "突出当前活动，其余活动以航线条目展示。",
      rail: renderRail(["推荐", "试炼", "日常", "成长"], "推荐", "活动结算与倒计时尚未接入。"),
      summary: renderStatusSummary([
        { label: "活动条目", value: EVENT_CONTENT.length },
        { label: "当前通关", value: getClearCount(profile) },
        { label: "结算状态", value: "展示" }
      ]),
      focus: renderActionCard({
        tag: focus.tag,
        title: focus.title,
        desc: focus.text,
        status: focus.status,
        reward: focus.reward,
        action: "查看活动",
        meta: [["时间", focus.time], ["条件", focus.condition]]
      }),
      list: list
    });
  }

  function renderShopPanel(profile) {
    var resources = (profile && profile.resources) || {};
    var focus = SHOP_CONTENT[0];
    var list = '<div class="terminal-list">';
    for (var i = 1; i < SHOP_CONTENT.length; i++) {
      list += renderListRow({ tag: SHOP_CONTENT[i].category, title: SHOP_CONTENT[i].title, desc: SHOP_CONTENT[i].desc + " / " + SHOP_CONTENT[i].price, status: SHOP_CONTENT[i].status });
    }
    list += '</div>';
    return renderTerminalShell({
      key: "shop",
      kicker: "SUPPLY DEPOT",
      title: "星港补给仓",
      desc: "商品先作为展示补给，不执行本地扣费。",
      rail: renderRail(["推荐", "资源", "强化", "战机", "礼包"], "推荐", "真实购买仍由云存档校验。"),
      summary: renderStatusSummary([
        { label: "金币", value: formatNumber(resources.gold != null ? resources.gold : profile && profile.coins || 0) },
        { label: "钻石", value: formatNumber(resources.diamonds || 0) },
        { label: "补给条目", value: SHOP_CONTENT.length }
      ]),
      focus: renderActionCard({
        tag: focus.category,
        title: focus.title,
        desc: focus.desc,
        status: focus.status,
        reward: focus.reward,
        action: "购买待接入",
        meta: [["价格", focus.price], ["规则", "展示态，不扣费"]]
      }),
      list: list
    });
  }

  function renderFriendPanel() {
    var focus = FRIEND_CONTENT[0];
    var list = '<div class="terminal-list">';
    for (var i = 1; i < FRIEND_CONTENT.length; i++) {
      list += renderListRow({ tag: FRIEND_CONTENT[i].tag, title: FRIEND_CONTENT[i].title, desc: FRIEND_CONTENT[i].role + " / 战力 " + formatNumber(FRIEND_CONTENT[i].power) + " / " + FRIEND_CONTENT[i].text, status: FRIEND_CONTENT[i].action });
    }
    list += '</div>';
    return renderTerminalShell({
      key: "friend",
      kicker: "ALLY LINK",
      title: "助战通讯录",
      desc: "好友、邀请和助战为本地预告态，尚未接入真实社交服务。",
      rail: renderRail(["在线", "助战", "小队", "情报"], "在线", "不会显示真实在线状态。"),
      summary: renderStatusSummary([
        { label: "模拟好友", value: FRIEND_CONTENT.length },
        { label: "在线展示", value: "3" },
        { label: "助战状态", value: "待接入" }
      ]),
      focus: renderActionCard({
        tag: focus.tag,
        title: focus.title,
        desc: focus.text,
        status: focus.action,
        reward: focus.role + " / 战力 " + formatNumber(focus.power),
        action: "助战待接入"
      }),
      list: list
    });
  }

  function buildRankingRows(rows, selfRow, formatter) {
    var list = rows.slice();
    list.push(selfRow);
    list.sort(function (a, b) { return b.score - a.score; });
    var html = '<div class="terminal-ranking-list">';
    for (var i = 0; i < list.length; i++) {
      html += '<article class="' + (list[i].tag === "我的" ? "is-self" : "") + '">' +
        '<b>' + (i + 1) + '</b><div><strong>' + escapeHtml(list[i].title) + '</strong><p>' + escapeHtml(list[i].name) + '</p></div>' +
        '<span>' + escapeHtml(list[i].tag) + '</span><em>' + escapeHtml(formatter(list[i].score)) + '</em></article>';
    }
    return html + '</div>';
  }

  function renderRankingPanel(profile, combatPower) {
    var playerName = profile && profile.player && profile.player.name || "本地指挥官";
    var clearCount = getClearCount(profile);
    var bestHonor = getBestHonor(profile);
    var focusProgress = { label: "本地战力", current: combatPower, target: Math.max(combatPower, 30000), done: false };
    var list = '<div class="terminal-rank-groups">' +
      '<h3>战力榜</h3>' + buildRankingRows(RANKING_CONTENT.power, { title: "本地指挥官", name: playerName, score: combatPower, tag: "我的" }, formatNumber) +
      '<h3>通关榜</h3>' + buildRankingRows(RANKING_CONTENT.clear, { title: "本地指挥官", name: playerName, score: clearCount, tag: "我的" }, function (value) { return formatNumber(value) + " 关"; }) +
      '<h3>荣誉榜</h3>' + buildRankingRows(RANKING_CONTENT.honor, { title: "本地指挥官", name: playerName, score: bestHonor, tag: "我的" }, function (value) { return value ? "Tier " + value : "未记录"; }) +
      '</div>';
    return renderTerminalShell({
      key: "ranking",
      kicker: "LOCAL RANK",
      title: "星港模拟榜",
      desc: "榜单插入本地玩家数据，不上传分数，也不拉取云端排名。",
      rail: renderRail(["战力榜", "通关榜", "荣誉榜"], "战力榜", "榜单为本地模拟数据。"),
      summary: renderStatusSummary([
        { label: "我的战力", value: formatNumber(combatPower) },
        { label: "通关数", value: formatNumber(clearCount) },
        { label: "最高荣誉", value: bestHonor ? "Tier " + bestHonor : "未记录" }
      ]),
      focus: renderActionCard({
        tag: "我的排名",
        title: playerName,
        desc: "固定展示本地记录，方便和模拟星港榜单对照。",
        progress: focusProgress,
        status: "本地",
        reward: "战力 " + formatNumber(combatPower) + " / 通关 " + clearCount,
        action: "上传待接入"
      }),
      list: list
    });
  }

  function getChannelLabel(key) {
    if (key === "system") return "系统";
    if (key === "world") return "世界";
    if (key === "guild") return "公会";
    if (key === "friend") return "好友";
    return key;
  }

  function renderChatPanel() {
    var keys = ["world", "system", "guild", "friend"];
    var rail = renderRail(["世界", "系统", "公会", "好友"], "世界", "频道为本地预览，发送待接入。");
    var list = '<div class="terminal-chat-flow">';
    for (var i = 0; i < keys.length; i++) {
      var channel = CHAT_CONTENT[keys[i]] || [];
      list += '<section><h3>' + escapeHtml(getChannelLabel(keys[i])) + '频道</h3>';
      for (var j = 0; j < channel.length; j++) {
        var splitAt = channel[j].indexOf("]");
        list += '<article><span>' + escapeHtml(channel[j].slice(0, splitAt + 1)) + '</span><p>' + escapeHtml(channel[j].slice(splitAt + 1).trim()) + '</p></article>';
      }
      list += '</section>';
    }
    list += '</div><footer class="terminal-chat-input"><input type="text" disabled value="频道预览，发送待接入" /><button type="button" disabled>发送</button></footer>';
    return renderTerminalShell({
      key: "chat",
      kicker: "CHANNEL PREVIEW",
      title: "星港通讯频道",
      desc: "频道消息围绕活动、关卡建议、战机讨论和助战预告。",
      rail: rail,
      summary: renderStatusSummary([
        { label: "频道", value: keys.length },
        { label: "消息", value: Object.keys(CHAT_CONTENT).reduce(function (sum, key) { return sum + CHAT_CONTENT[key].length; }, 0) },
        { label: "发送", value: "待接入" }
      ]),
      list: list
    });
  }

  function renderMailPanel() {
    var focus = MAIL_CONTENT[0];
    var list = '<div class="terminal-list">';
    for (var i = 1; i < MAIL_CONTENT.length; i++) {
      list += renderListRow({ tag: MAIL_CONTENT[i].type, title: MAIL_CONTENT[i].title, desc: MAIL_CONTENT[i].text + " / " + MAIL_CONTENT[i].time, status: MAIL_CONTENT[i].status });
    }
    list += '</div>';
    return renderTerminalShell({
      key: "mail",
      kicker: "MAIL RELAY",
      title: "星港邮件",
      desc: "系统公告、补给通知、活动预告和维护说明集中展示。",
      rail: renderRail(["公告", "补给", "活动", "维护"], focus.type, "邮件附件不发放真实奖励。"),
      summary: renderStatusSummary([
        { label: "邮件总数", value: MAIL_CONTENT.length },
        { label: "附件邮件", value: "2" },
        { label: "领取状态", value: "展示" }
      ]),
      focus: renderActionCard({
        tag: focus.type,
        title: focus.title,
        desc: focus.text,
        status: focus.status,
        reward: focus.time + " / " + focus.reward,
        action: "附件待接入"
      }),
      list: list
    });
  }

  function renderSigninPanel() {
    var focus = SIGNIN_CONTENT[0];
    var list = '<div class="terminal-signin-grid">';
    for (var i = 0; i < SIGNIN_CONTENT.length; i++) {
      list += '<article class="' + (i === 0 ? "is-today" : "") + '"><span>DAY ' + SIGNIN_CONTENT[i].day + '</span><strong>' + escapeHtml(SIGNIN_CONTENT[i].title) + '</strong><p>' + escapeHtml(SIGNIN_CONTENT[i].reward) + '</p><em>' + escapeHtml(SIGNIN_CONTENT[i].status) + '</em></article>';
    }
    list += '</div>';
    return renderTerminalShell({
      key: "signin",
      kicker: "7-DAY ROUTE",
      title: "新兵七日航线",
      desc: "签到当前为 7 日奖励展示，正式领取逻辑后续接入。",
      rail: renderRail(["今日", "明日", "大奖"], "今日", "展示态，不写入存档。"),
      summary: renderStatusSummary([
        { label: "签到周期", value: "7 日" },
        { label: "今日状态", value: "展示" },
        { label: "大奖", value: "第 7 日" }
      ]),
      focus: renderActionCard({
        tag: "DAY " + focus.day,
        title: focus.title,
        desc: "今日航线整备奖励用于提示签到系统结构。",
        status: focus.status,
        reward: focus.reward,
        action: "签到待接入"
      }),
      list: list
    });
  }

  function renderSettingPanel(audioSettings) {
    audioSettings = audioSettings || {};
    var musicVolume = Math.round(Number(audioSettings.musicVolume == null ? 0.32 : audioSettings.musicVolume) * 100);
    var sfxVolume = Math.round(Number(audioSettings.sfxVolume == null ? 0.42 : audioSettings.sfxVolume) * 100);
    var musicOn = !audioSettings.musicMuted;
    var sfxOn = !audioSettings.sfxMuted;
    var controls = '<div class="settings-console terminal-settings">' +
      '<section class="settings-control-row"><div><strong>大厅音乐</strong><p>控制星港大厅 BGM 播放。</p></div><button type="button" class="' + (musicOn ? "active" : "") + '" data-audio-toggle="music">' + (musicOn ? "音乐开" : "音乐关") + '</button></section>' +
      '<section class="settings-control-row"><div><strong>音乐音量</strong><p>当前 ' + musicVolume + '%，拖动后即时生效。</p></div><input type="range" min="0" max="100" value="' + musicVolume + '" data-audio-volume="music" /></section>' +
      '<section class="settings-control-row"><div><strong>战斗音效</strong><p>控制按钮、射击、拾取、技能和结算音效。</p></div><button type="button" class="' + (sfxOn ? "active" : "") + '" data-audio-toggle="sfx">' + (sfxOn ? "音效开" : "音效关") + '</button></section>' +
      '<section class="settings-control-row"><div><strong>音效音量</strong><p>当前 ' + sfxVolume + '%，影响所有 SFX。</p></div><input type="range" min="0" max="100" value="' + sfxVolume + '" data-audio-volume="sfx" /></section>' +
      '<section class="settings-control-row"><div><strong>BGM 试听</strong><p>重启大厅音乐，用于确认音量和循环。</p></div><button type="button" data-setting-action="restart-bgm">试听 / 重启</button></section>' +
      '<section class="settings-control-row muted-row"><div><strong>画面表现</strong><p>星港玻璃 UI、扫描线、能量边框已启用；性能档位后续接入。</p></div><button type="button" disabled>展示态</button></section>' +
      '</div>';
    return renderTerminalShell({
      key: "setting",
      kicker: "AUDIO CONFIG",
      title: "系统设置",
      desc: "音乐和音效设置会立即生效，并保存到 localStorage。",
      rail: renderRail(["音频", "画面", "性能"], "音频", "音乐 / 音效为真实可操作。"),
      summary: renderStatusSummary([
        { label: "音乐", value: musicOn ? "开启" : "关闭" },
        { label: "音效", value: sfxOn ? "开启" : "关闭" },
        { label: "保存", value: "本地" }
      ]),
      list: controls
    });
  }

  function setPanel(dom, kicker, title, body, className, html) {
    dom.featurePanelKicker.textContent = kicker;
    dom.featurePanelTitle.textContent = title;
    dom.featurePanelBody.textContent = body;
    dom.featurePanelSlots.className = className;
    dom.featurePanelSlots.innerHTML = html;
  }

  function renderPanel(key, dom, options) {
    options = options || {};
    var profile = options.profile || {};
    var levels = options.levels || [];
    var combatPower = clampNumber(options.combatPower, 0, 9999999);
    var audioSettings = options.audioSettings || {};
    if (key === "mail") return setAndReport(dom, "MAIL", "邮件", "星港邮件中继，展示公告、补给、活动和维护信息。", "terminal-panel-content mail-panel-content", renderMailPanel());
    if (key === "signin") return setAndReport(dom, "SIGN IN", "签到", "新兵七日航线奖励展示，正式领取后续接入。", "terminal-panel-content signin-panel-content", renderSigninPanel());
    if (key === "setting") return setAndReport(dom, "SETTING", "设置", "音乐和音效设置会立即生效并保存到本地。", "terminal-panel-content setting-panel-content", renderSettingPanel(audioSettings));
    if (key === "task") return setAndReport(dom, "TASK", "任务", "成长、强化、作战和收集目标会读取本地存档进度。", "terminal-panel-content task-panel-content", renderTaskPanel(profile, levels));
    if (key === "event") return setAndReport(dom, "EVENT", "活动", "活动以本地展示态呈现，不做真实倒计时结算。", "terminal-panel-content event-panel-content", renderEventPanel(profile));
    if (key === "achievement") return setAndReport(dom, "ACHIEVEMENT", "成就", "成就会根据本地通关、无伤、强化和收集记录显示进度。", "terminal-panel-content achievement-panel-content", renderAchievementPanel(profile, levels));
    if (key === "shop") return setAndReport(dom, "SHOP", "商店", "资源、强化、战机和活动礼包为展示补给列表，不执行本地扣费。", "terminal-panel-content shop-panel-content", renderShopPanel(profile));
    if (key === "friend") return setAndReport(dom, "FRIEND", "好友", "模拟好友和助战角色已填充，真实社交服务后续接入。", "terminal-panel-content friend-panel-content", renderFriendPanel());
    if (key === "ranking") return setAndReport(dom, "RANKING", "排行榜", "战力榜、通关榜和荣誉榜会插入本地玩家记录。", "terminal-panel-content ranking-panel-content", renderRankingPanel(profile, combatPower));
    if (key === "chat") return setAndReport(dom, "CHAT", "世界频道", "系统、世界、公会和好友频道均为本地预览，真实发送待接入。", "terminal-panel-content chat-panel-content", renderChatPanel());
    return false;
  }

  function setAndReport(dom, kicker, title, body, className, html) {
    setPanel(dom, kicker, title, body, className, html);
    return true;
  }

  scope.mainFeaturePanelsView = {
    CHAT_PREVIEW_MESSAGES: CHAT_PREVIEW_MESSAGES,
    renderPanel: renderPanel
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
