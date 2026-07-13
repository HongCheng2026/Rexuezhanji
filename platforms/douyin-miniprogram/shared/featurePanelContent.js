(function registerFeaturePanelContent(root) {
  "use strict";

  const scope = root.RXGame || (root.RXGame = {});

  const DAILY_TASKS = [
    { id: "daily_sortie_1", bucket: "daily", category: "每日", title: "每日出击", desc: "完成任意关卡 1 次，维持今日作战节奏。", condition: { type: "clear_count", target: 1, label: "通关 1 次" }, rewards: [{ type: "gold", amount: 2000 }], activity: 10 },
    { id: "daily_sortie_3", bucket: "daily", category: "每日", title: "连续作战", desc: "累计通关 3 次，完成基础巡航。", condition: { type: "clear_count", target: 3, label: "通关 3 次" }, rewards: [{ type: "gold", amount: 5000 }], activity: 20 },
    { id: "daily_upgrade_once", bucket: "daily", category: "强化", title: "火力校准", desc: "完成任意 1 次战机强化。", condition: { type: "fighter_upgrade_any", target: 1, label: "强化 1 次" }, rewards: [{ type: "gold", amount: 3000 }], activity: 15 },
    { id: "daily_perfect_1", bucket: "daily", category: "技巧", title: "精准规避", desc: "获得 1 次完美通关。", condition: { type: "perfect_count", target: 1, label: "完美通关 1 次" }, rewards: [{ type: "gold", amount: 8000 }], activity: 25 },
    { id: "daily_boss_1", bucket: "daily", category: "作战", title: "Boss 压制", desc: "击败任意 Boss 1 次。", condition: { type: "clear_count", target: 1, label: "击败 Boss 1 次" }, rewards: [{ type: "gold", amount: 5000 }], activity: 20 },
    { id: "daily_gold_10000", bucket: "daily", category: "回收", title: "补给回收", desc: "累计获得金币 10,000。", condition: { type: "earned_gold", target: 10000, label: "获得金币 10,000" }, rewards: [{ type: "energy", amount: 20 }], activity: 15 },
    { id: "daily_dossier_check", bucket: "daily", category: "整备", title: "战姬整备", desc: "完成今日机库巡检。", condition: { type: "login", target: 1, label: "完成今日巡检" }, rewards: [{ type: "gold", amount: 1000 }], activity: 5 },
    { id: "daily_supply_check", bucket: "daily", category: "补给", title: "商店巡检", desc: "检查今日补给站库存。", condition: { type: "login", target: 1, label: "进入补给站" }, rewards: [{ type: "gold", amount: 1000 }], activity: 5 }
  ];

  const GROWTH_TASKS = [
    { id: "task_first_sortie", bucket: "growth", category: "成长", title: "首次出击", desc: "完成任意一次实战出击，建立基础作战记录。", condition: { type: "clear_count", target: 1, label: "累计通关 1 次" }, rewards: [{ type: "gold", amount: 2000 }] },
    { id: "task_prologue_1", bucket: "growth", category: "成长", title: "序章校准", desc: "通关序章 1，确认基础火控和移动手感。", condition: { type: "clear_stage", stageId: "prologue_1", target: 1, label: "通关序章 1" }, rewards: [{ type: "gold", amount: 3000 }] },
    { id: "task_prologue_3", bucket: "growth", category: "成长", title: "黑潮警报", desc: "通关序章 3，完成新兵航线第一轮压测。", condition: { type: "clear_stage", stageId: "prologue_3", target: 1, label: "通关序章 3" }, rewards: [{ type: "gold", amount: 5000 }] },
    { id: "task_stage_1_1", bucket: "growth", category: "成长", title: "星港外围", desc: "突破 1-1 星港外围，打开第一章主航道。", condition: { type: "clear_stage", stageId: "1_1", target: 1, label: "通关 1-1 星港外围" }, rewards: [{ type: "gold", amount: 6000 }] },
    { id: "task_stage_1_2", bucket: "growth", category: "成长", title: "碎星航道", desc: "突破 1-2 碎星航道，熟悉更密集的敌机编队。", condition: { type: "clear_stage", stageId: "1_2", target: 1, label: "通关 1-2 碎星航道" }, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "task_stage_1_3", bucket: "growth", category: "成长", title: "核心闸门", desc: "突破 1-3 核心闸门，完成第一章关键防线。", condition: { type: "clear_stage", stageId: "1_3", target: 1, label: "通关 1-3 核心闸门" }, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "task_attack_3", bucket: "growth", category: "强化", title: "火力核心 Lv.3", desc: "将战机攻击强化到 3 级，提升清场效率。", condition: { type: "fighter_upgrade", stat: "attack", target: 3, label: "火力核心达到 Lv.3" }, rewards: [{ type: "gold", amount: 4000 }] },
    { id: "task_hp_3", bucket: "growth", category: "强化", title: "装甲舱 Lv.3", desc: "将战机生命强化到 3 级，提高容错空间。", condition: { type: "fighter_upgrade", stat: "hp", target: 3, label: "装甲舱达到 Lv.3" }, rewards: [{ type: "gold", amount: 4000 }] },
    { id: "task_pen_3", bucket: "growth", category: "强化", title: "推进器 Lv.3", desc: "将破甲推进强化到 3 级，压制高护甲目标。", condition: { type: "fighter_upgrade", stat: "armorPenetration", target: 3, label: "推进器达到 Lv.3" }, rewards: [{ type: "gold", amount: 4000 }] },
    { id: "task_upgrade_total_10", bucket: "growth", category: "强化", title: "整备总检", desc: "战机三项强化总等级达到 10，形成稳定养成基础。", condition: { type: "fighter_upgrade_total", target: 10, label: "强化总等级达到 10" }, rewards: [{ type: "gold", amount: 10000 }] },
    { id: "task_clear_3", bucket: "growth", category: "作战", title: "连续出击", desc: "累计通关 3 次，建立稳定的出击节奏。", condition: { type: "clear_count", target: 3, label: "累计通关 3 次" }, rewards: [{ type: "gold", amount: 5000 }] },
    { id: "task_clear_10", bucket: "growth", category: "作战", title: "星港巡航", desc: "累计通关 10 次，熟悉主要敌机和 Boss 节奏。", condition: { type: "clear_count", target: 10, label: "累计通关 10 次" }, rewards: [{ type: "gold", amount: 12000 }] },
    { id: "task_clear_20", bucket: "growth", category: "作战", title: "航线守备", desc: "累计通关 20 次，完成稳定守备轮值。", condition: { type: "clear_count", target: 20, label: "累计通关 20 次" }, rewards: [{ type: "gold", amount: 24000 }] },
    { id: "task_perfect_1", bucket: "growth", category: "作战", title: "完美作战", desc: "获得 1 次完美通关，证明路线和输出节奏达标。", condition: { type: "perfect_count", target: 1, label: "完美通关 1 次" }, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "task_perfect_5", bucket: "growth", category: "作战", title: "无漏航线", desc: "获得 5 次完美通关，掌握关键弹幕空隙。", condition: { type: "perfect_count", target: 5, label: "完美通关 5 次" }, rewards: [{ type: "gold", amount: 18000 }] },
    { id: "task_boss_no_damage_1", bucket: "growth", category: "作战", title: "王牌规避", desc: "完成 1 次无伤 Boss 战，验证高压规避能力。", condition: { type: "no_damage_boss_count", target: 1, label: "无伤 Boss 1 次" }, rewards: [{ type: "gold", amount: 10000 }] },
    { id: "task_roster_2", bucket: "growth", category: "收集", title: "战姬集结", desc: "拥有 2 名战姬，准备多风格作战阵容。", condition: { type: "owned_pilots", target: 2, label: "拥有 2 名战姬" }, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "task_hangar_2", bucket: "growth", category: "收集", title: "双机整备", desc: "拥有 2 架战机，完成基础机库扩编。", condition: { type: "owned_ships", target: 2, label: "拥有 2 架战机" }, rewards: [{ type: "gold", amount: 8000 }] },
    { id: "task_rank_ship", bucket: "growth", category: "收集", title: "高阶机体展示", desc: "当前出战 A 级或 S 级战机，展示主力机体整备状态。", condition: { type: "selected_ship_rank", ranks: ["A", "S"], target: 1, label: "出战 A/S 级战机" }, rewards: [{ type: "gold", amount: 6000 }] }
  ];

  const TASK_ACTIVITY_REWARDS = [
    { points: 20, rewards: [{ type: "gold", amount: 3000 }] },
    { points: 40, rewards: [{ type: "energy", amount: 30 }] },
    { points: 60, rewards: [{ type: "gold", amount: 8000 }] },
    { points: 80, rewards: [{ type: "diamonds", amount: 5 }] },
    { points: 100, rewards: [{ type: "gold", amount: 15000 }, { type: "energy", amount: 50 }] }
  ];

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

  const SHOP_CONTENT = [
    { id: "daily_free_supply", category: "每日", title: "每日免费补给", price: "免费", reward: "体力 20 / 金币 1,000", desc: "每日一次的基础出击补给。", image: "daily_free_supply", status: "可领取", rewards: [{ type: "energy", amount: 20 }, { type: "gold", amount: 1000 }] },
    { id: "energy_small", category: "资源", title: "小体力包", price: "钻石 3", reward: "体力 50", desc: "补足短线出击体力。", image: "energy_small", status: "展示", priceCurrency: "diamonds", priceAmount: 3, rewards: [{ type: "energy", amount: 50 }] },
    { id: "energy_large", category: "资源", title: "大体力包", price: "钻石 8", reward: "体力 150 / 金币 2,000", desc: "适合连续挑战章节节点。", image: "energy_large", status: "展示", priceCurrency: "diamonds", priceAmount: 8, rewards: [{ type: "energy", amount: 150 }, { type: "gold", amount: 2000 }] },
    { id: "gold_small", category: "资源", title: "金币小包", price: "钻石 5", reward: "金币 1,200", desc: "快速补足早期强化差额。", image: "gold_small", status: "展示", priceCurrency: "diamonds", priceAmount: 5, rewards: [{ type: "gold", amount: 1200 }] },
    { id: "gold_medium", category: "资源", title: "金币中包", price: "钻石 20", reward: "金币 5,500", desc: "适合连续强化主力机体。", image: "gold_medium", status: "展示", priceCurrency: "diamonds", priceAmount: 20, rewards: [{ type: "gold", amount: 5500 }] },
    { id: "gold_large", category: "资源", title: "金币大包", price: "钻石 60", reward: "金币 18,000", desc: "中期整备储备包。", image: "gold_large", status: "展示", priceCurrency: "diamonds", priceAmount: 60, rewards: [{ type: "gold", amount: 18000 }] },
    { id: "attack_pack", category: "强化", title: "火力校准包", price: "金币 6,000", reward: "攻击强化素材 1", desc: "面向攻击强化的调试素材。", image: "attack_pack", status: "展示", priceCurrency: "gold", priceAmount: 6000, rewards: [{ type: "item", itemId: "attack_core", amount: 1 }] },
    { id: "armor_pack", category: "强化", title: "装甲维护包", price: "金币 6,000", reward: "生命强化素材 1", desc: "面向生命强化的维护素材。", image: "armor_pack", status: "展示", priceCurrency: "gold", priceAmount: 6000, rewards: [{ type: "item", itemId: "armor_core", amount: 1 }] },
    { id: "pierce_pack", category: "强化", title: "推进器调试包", price: "金币 8,000", reward: "破甲强化素材 1", desc: "面向破甲强化的推进素材。", image: "pierce_pack", status: "展示", priceCurrency: "gold", priceAmount: 8000, rewards: [{ type: "item", itemId: "pierce_core", amount: 1 }] },
    { id: "upgrade_bundle", category: "强化", title: "整备综合包", price: "钻石 18", reward: "三类强化素材各 1 / 金币 5,000", desc: "主力机体的综合整备包。", image: "upgrade_bundle", status: "展示", priceCurrency: "diamonds", priceAmount: 18, rewards: [{ type: "item", itemId: "attack_core", amount: 1 }, { type: "item", itemId: "armor_core", amount: 1 }, { type: "item", itemId: "pierce_core", amount: 1 }, { type: "gold", amount: 5000 }] },
    { id: "starlink_ticket", category: "战机/抽取", title: "星链研究券", price: "钻石 12", reward: "研究券 1", desc: "星穹之翼抽取关联道具。", image: "starlink_ticket", status: "展示", priceCurrency: "diamonds", priceAmount: 12, rewards: [{ type: "item", itemId: "starlink_ticket", amount: 1 }] },
    { id: "starlink_ten", category: "战机/抽取", title: "星链十连包", price: "钻石 108", reward: "研究券 10", desc: "适合集中研究星穹之翼。", image: "starlink_ten", status: "展示", priceCurrency: "diamonds", priceAmount: 108, rewards: [{ type: "item", itemId: "starlink_ticket", amount: 10 }] },
    { id: "silver_wing_box", category: "战机/抽取", title: "银翼整备箱", price: "钻石 30", reward: "A 级战机碎片 / 材料", desc: "主力均衡战机的整备补给。", image: "silver_wing_box", status: "展示", priceCurrency: "diamonds", priceAmount: 30, rewards: [{ type: "item", itemId: "silver_wing_part", amount: 1 }] },
    { id: "s_pilot_token", category: "战机/抽取", title: "S 级战姬直购", price: "金币 900,000", reward: "S 级战姬档案", desc: "沿用现有 S 级战姬价格。", image: "s_pilot_token", status: "展示", priceCurrency: "gold", priceAmount: 900000, rewards: [{ type: "item", itemId: "s_pilot_token", amount: 1 }] },
    { id: "s_fighter_token", category: "战机/抽取", title: "S 级战机直购", price: "金币 1,300,000", reward: "S 级战机档案", desc: "沿用现有 S 级战机价格。", image: "s_fighter_token", status: "展示", priceCurrency: "gold", priceAmount: 1300000, rewards: [{ type: "item", itemId: "s_fighter_token", amount: 1 }] }
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
    { type: "活动", title: "星穹之翼抽取预览", time: "本周", text: "苍穹零式与星链研究券已移至独立抽取入口展示。", reward: "研究券预览", status: "预告" }
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
    DAILY_TASKS,
    GROWTH_TASKS,
    TASK_ACTIVITY_REWARDS,
    EVENT_CONTENT,
    ACHIEVEMENT_CONTENT,
    SHOP_CONTENT,
    FRIEND_CONTENT,
    RANKING_CONTENT,
    CHAT_CONTENT,
    MAIL_CONTENT,
    SIGNIN_CONTENT
  };

  scope.featurePanelContent = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
