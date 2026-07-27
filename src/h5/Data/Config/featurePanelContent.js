(function registerFeaturePanelContent(root) {
  "use strict";

  const scope = root.RXGame || (root.RXGame = {});

  const EVENT_CONTENT = [
    { id: "daily_supply", tag: "每日补给", title: "每日出击补给", time: "每日 05:00", condition: "完成任意关卡 1 次", reward: "体力 30 / 金币 3,000", status: "开放", text: "给日常出击准备的轻量补给，适合上线后第一时间完成。" },
    { id: "chapter_push", tag: "章节推进", title: "星港突破", time: "长期开放", condition: "通关序章 3", reward: "金币 6,000-30,000", status: "进行中", text: "围绕第一章关键节点发放推进奖励，帮助玩家明确下一条主线航路。" },
    { id: "obsidian_break", tag: "突防试炼", title: "黑曜突防", time: "每周轮换", condition: "通关 1-2 碎星航道", reward: "活动币 / 金币 12,000", status: "开放", text: "高密度敌机挑战，适合导弹流和清场强化路线。" },
    { id: "golden_judgement", tag: "破甲挑战", title: "金矢裁决", time: "每周轮换", condition: "破甲强化达到 Lv.3", reward: "金矢碎片 / 金币 15,000", status: "开放", text: "高护甲 Boss 挑战，强调短爆发和额外穿透。" },
    { id: "rookie_7day", tag: "七日成长", title: "新兵七日航线", time: "新账号前 7 日", condition: "登录、强化、通关、收集目标", reward: "钻石 30 / 金币 20,000", status: "预告", text: "面向新手的七日目标板，集中展示早期成长路径。" }
  ];

    const ACHIEVEMENT_CONTENT = [
    { id: "ach_first_clear", category: "通关", title: "初战告捷", badge: "初战告捷", desc: "完成第一次通关。", metric: "clearCount", target: 1, rewards: [{ type: "gold", amount: 2000 }] },
    { id: "ach_outer_clear", category: "通关", title: "星港外围清剿", badge: "外围清剿", desc: "通关 1-1 星港外围。", metric: "stage:1_1", target: 1, rewards: [{ type: "gold", amount: 5000 }] },
    { id: "ach_gate_clear", category: "通关", title: "核心闸门突破", badge: "闸门突破", desc: "通关 1-3 核心闸门。", metric: "stage:1_3", target: 1, rewards: [{ type: "gold", amount: 9000 }] },
    { id: "ach_chapter_runner", category: "通关", title: "章节推进者", badge: "推进者", desc: "累计通关 10 次。", metric: "clearCount", target: 10, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "ach_perfect_1", category: "技巧", title: "完美作战", badge: "完美作战", desc: "获得 1 次完美通关。", metric: "perfectClearCount", target: 1, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "ach_bullet_dance", category: "技巧", title: "弹幕穿梭", badge: "弹幕穿梭", desc: "获得 5 次完美通关。", metric: "perfectClearCount", target: 5, rewards: [{ type: "gold", amount: 16000 }] },
    { id: "ach_perfect_20", category: "技巧", title: "无漏之翼", badge: "无漏之翼", desc: "获得 20 次完美通关。", metric: "perfectClearCount", target: 20, rewards: [{ type: "gold", amount: 30000 }] },
    { id: "ach_boss_no_damage", category: "技巧", title: "无伤 Boss", badge: "王牌规避", desc: "累计无伤 Boss 5 次。", metric: "noDamageBossClearCount", target: 5, rewards: [{ type: "gold", amount: 20000 }] },
    { id: "ach_attack_5", category: "养成", title: "火力校准", badge: "火力校准", desc: "攻击强化达到 Lv.5。", metric: "upgrade:attack", target: 5, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "ach_hp_5", category: "养成", title: "装甲成型", badge: "装甲成型", desc: "生命强化达到 Lv.5。", metric: "upgrade:hp", target: 5, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "ach_pen_5", category: "养成", title: "推进稳定", badge: "推进稳定", desc: "破甲强化达到 Lv.5。", metric: "upgrade:armorPenetration", target: 5, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "ach_upgrade_total", category: "养成", title: "王牌机库", badge: "王牌机库", desc: "三项战机强化总等级达到 15。", metric: "upgradeTotal", target: 15, rewards: [{ type: "gold", amount: 24000 }] },
    { id: "ach_pilot_roster", category: "收集", title: "战姬集结", badge: "战姬集结", desc: "拥有 3 名战姬。", metric: "ownedPilots", target: 3, rewards: [{ type: "gold", amount: 15000 }] },
    { id: "ach_ship_roster", category: "收集", title: "银翼整备", badge: "银翼整备", desc: "拥有 3 架战机。", metric: "ownedShips", target: 3, rewards: [{ type: "gold", amount: 15000 }] },
    { id: "ach_s_rank_file", category: "收集", title: "S 级档案", badge: "S 级档案", desc: "拥有任意 S 级战姬或战机。", metric: "ownedSRank", target: 1, rewards: [{ type: "diamonds", amount: 20 }] },
    { id: "ach_honor_record", category: "荣誉", title: "星港荣誉", badge: "星港荣誉", desc: "任意关卡荣誉达到 Tier 3。", metric: "bestHonor", target: 3, rewards: [{ type: "gold", amount: 18000 }] }
  ];

  const FRIEND_CONTENT = [
    { tag: "在线", title: "凌焰", role: "重火力助战", power: 16800, text: "最近在核心闸门压制 Boss，适合高压输出支援。", action: "申请助战" },
    { tag: "在线", title: "洛绮", role: "精英压制", power: 16100, text: "试飞金羽航线，擅长短窗口击穿精英目标。", action: "查看档案" },
    { tag: "忙碌", title: "夜岚", role: "高速突袭", power: 15400, text: "正在深空侦察队执行穿插训练。", action: "留言" },
    { tag: "在线", title: "沈曜", role: "火控指挥", power: 14300, text: "提供火控校准建议，适合强化前查看。", action: "请求建议" },
    { tag: "离线", title: "白凌", role: "精准训练", power: 9800, text: "保留了序章弹道训练记录，适合新手复盘。", action: "查看记录" },
    { tag: "值班", title: "星港工程师", role: "机库维护", power: 7600, text: "建议优先把攻击、生命、破甲都提升到 Lv.3。", action: "查看建议" }
  ];

  const RANKING_CONTENT = {
    power: [
      { title: "夜航指挥官", name: "深空十七", score: 28600, tag: "NPC" },
      { title: "星港王牌", name: "凌焰", score: 26800, tag: "NPC" },
      { title: "金羽试飞组", name: "洛绮", score: 25400, tag: "NPC" },
      { title: "暗核突防队", name: "黑曜队长", score: 23100, tag: "NPC" },
      { title: "银翼训练营", name: "白凌", score: 17600, tag: "NPC" }
    ],
    clear: [
      { title: "航线守备", name: "星港王牌", score: 42, tag: "NPC" },
      { title: "碎星巡航", name: "银翼小星", score: 35, tag: "NPC" },
      { title: "核心突防", name: "夜岚", score: 31, tag: "NPC" },
      { title: "训练教官", name: "白凌", score: 24, tag: "NPC" },
      { title: "新兵领航", name: "苏绵星", score: 18, tag: "NPC" }
    ],
    honor: [
      { title: "无漏之翼", name: "洛绮", score: 8, tag: "NPC" },
      { title: "王牌规避", name: "夜岚", score: 7, tag: "NPC" },
      { title: "火力核心", name: "凌焰", score: 6, tag: "NPC" },
      { title: "稳定推进", name: "沈曜", score: 5, tag: "NPC" },
      { title: "冷月防线", name: "沈清曜", score: 4, tag: "NPC" }
    ]
  };

  const CHAT_CONTENT = {
    system: ["[系统] 今日出击补给已刷新，完成任意关卡可查看补给状态。", "[系统] 任务面板已同步本地通关、强化与收集记录。"],
    world: ["[世界] 银翼小星：1-3 核心闸门建议先把火力核心强化到 Lv.3。", "[世界] 夜岚：深空航线不要贪输出。"],
    guild: ["[公会] 星港后勤提示：强化材料展示清单已更新。", "[公会] 火控组建议优先提升主力战机三项基础等级。"],
    friend: ["[好友] 凌焰：需要火力支援时先叫我。", "[好友] 星港工程师：音乐和音效可在设置里单独调整。"]
  };

  const MAIL_CONTENT = [
    { type: "公告", title: "星港大厅系统改修完成", time: "今日", text: "大厅入口与子面板已切换为战术终端样式。", reward: "金币 3,000", status: "已读" },
    { type: "补给", title: "每日出击补给提醒", time: "05:00", text: "完成任意关卡后可在任务与活动面板查看补给说明。", reward: "体力 30", status: "可查看" },
    { type: "活动", title: "星穹之翼抽取预览", time: "本周", text: "苍穹与星链研究券已移至独立抽取入口展示。", reward: "研究券预览", status: "预告" }
  ];

  const SIGNIN_CONTENT = [
    { day: 1, title: "出击整备", reward: "金币 3,000", status: "今日" },
    { day: 2, title: "火力校准", reward: "火力素材包", status: "预告" },
    { day: 3, title: "体力补给", reward: "体力 60", status: "预告" },
    { day: 4, title: "装甲维护", reward: "装甲素材包", status: "预告" },
    { day: 5, title: "银翼整备", reward: "银翼整备箱", status: "预告" },
    { day: 6, title: "星链研究", reward: "星链研究券", status: "预告" },
    { day: 7, title: "新兵大礼", reward: "钻石 30 / 金币 20,000", status: "大奖" }
  ];

  const api = {
    EVENT_CONTENT,
    ACHIEVEMENT_CONTENT,
    FRIEND_CONTENT,
    RANKING_CONTENT,
    CHAT_CONTENT,
    MAIL_CONTENT,
    SIGNIN_CONTENT
  };

  scope.featurePanelContent = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
