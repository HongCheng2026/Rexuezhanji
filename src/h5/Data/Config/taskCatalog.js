(function registerTaskCatalog(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  var TRACKS = Object.freeze([
    Object.freeze({
      id: "daily",
      label: "每日战备",
      kicker: "DAILY READINESS",
      description: "资格达成后每日复核，05:00 刷新领取状态。",
      resetLabel: "每日 05:00 刷新"
    }),
    Object.freeze({
      id: "growth",
      label: "成长航线",
      kicker: "CAMPAIGN ROUTE",
      description: "沿主线、强化、技巧与收集四条路径推进长期目标。",
      resetLabel: "永久记录"
    })
  ]);

  var TASKS = Object.freeze([
    { id: "daily_dossier_check", track: "daily", category: "战备", title: "指挥官点名", desc: "完成今日登录与身份校验。", condition: { type: "login", target: 1, label: "今日登录" }, rewards: [{ type: "gold", amount: 1000 }, { type: "diamonds", amount: 10 }], activity: 5, priority: 10 },
    { id: "daily_supply_check", track: "daily", category: "补给", title: "补给链校验", desc: "确认星港补给链处于可用状态。", condition: { type: "login", target: 1, label: "完成校验" }, rewards: [{ type: "gold", amount: 1000 }, { type: "diamonds", amount: 10 }], activity: 5, priority: 20 },
    { id: "daily_sortie_1", track: "daily", category: "作战", title: "首航资格复核", desc: "拥有至少一次通关记录后，每日开放该项补给。", condition: { type: "clear_count", target: 1, label: "累计通关" }, rewards: [{ type: "gold", amount: 2000 }, { type: "diamonds", amount: 10 }], activity: 10, priority: 30 },
    { id: "daily_sortie_3", track: "daily", category: "作战", title: "巡航资格复核", desc: "累计完成三次通关，取得稳定巡航资格。", condition: { type: "clear_count", target: 3, label: "累计通关" }, rewards: [{ type: "gold", amount: 5000 }, { type: "diamonds", amount: 15 }], activity: 20, priority: 40 },
    { id: "daily_upgrade_once", track: "daily", category: "整备", title: "机体校准复核", desc: "完成任意一次战机强化，解锁每日整备补给。", condition: { type: "fighter_upgrade_any", target: 1, label: "累计强化" }, rewards: [{ type: "gold", amount: 3000 }, { type: "diamonds", amount: 15 }], activity: 15, priority: 50 },
    { id: "daily_boss_1", track: "daily", category: "战果", title: "战果档案复核", desc: "拥有正式通关战果后，每日归档一次作战记录。", condition: { type: "clear_count", target: 1, label: "有效战果" }, rewards: [{ type: "gold", amount: 5000 }, { type: "diamonds", amount: 15 }], activity: 20, priority: 60 },
    { id: "daily_perfect_1", track: "daily", category: "技巧", title: "王牌资格复核", desc: "取得一次完美通关，解锁王牌每日津贴。", condition: { type: "perfect_count", target: 1, label: "完美通关" }, rewards: [{ type: "gold", amount: 8000 }, { type: "diamonds", amount: 20 }], activity: 25, priority: 70 },
    { id: "daily_gold_10000", track: "daily", category: "回收", title: "回收额度复核", desc: "累计回收一万金币，取得补给调度资格。", condition: { type: "earned_gold", target: 10000, label: "累计回收" }, rewards: [{ type: "energy", amount: 20 }, { type: "diamonds", amount: 20 }], activity: 15, priority: 80 },

    { id: "task_first_sortie", track: "growth", category: "启航", title: "第一份战报", desc: "完成首次实战出击，建立你的航线档案。", condition: { type: "clear_count", target: 1, label: "累计通关" }, rewards: [{ type: "gold", amount: 2000 }], priority: 10 },
    { id: "task_prologue_1", track: "growth", category: "主线", title: "火控校准", desc: "突破序章 1，掌握移动与基础火控。", condition: { type: "clear_stage", stageId: "prologue_1", target: 1, label: "通关序章 1" }, rewards: [{ type: "gold", amount: 3000 }], priority: 20 },
    { id: "task_prologue_3", track: "growth", category: "主线", title: "黑潮警报", desc: "突破序章 3，完成新兵航线认证。", condition: { type: "clear_stage", stageId: "prologue_3", target: 1, label: "通关序章 3" }, rewards: [{ type: "gold", amount: 5000 }], priority: 30 },
    { id: "task_stage_1_1", track: "growth", category: "主线", title: "星港外围", desc: "突破 1-1，打开第一章主航道。", condition: { type: "clear_stage", stageId: "1_1", target: 1, label: "通关 1-1" }, rewards: [{ type: "gold", amount: 6000 }], priority: 40 },
    { id: "task_stage_1_2", track: "growth", category: "主线", title: "碎星航道", desc: "突破 1-2，适应高密度敌机编队。", condition: { type: "clear_stage", stageId: "1_2", target: 1, label: "通关 1-2" }, rewards: [{ type: "gold", amount: 8000 }], priority: 50 },
    { id: "task_stage_1_3", track: "growth", category: "主线", title: "核心闸门", desc: "突破 1-3，击穿第一章关键防线。", condition: { type: "clear_stage", stageId: "1_3", target: 1, label: "通关 1-3" }, rewards: [{ type: "gold", amount: 12000 }], priority: 60 },
    { id: "task_attack_3", track: "growth", category: "强化", title: "火力模块 Lv.3", desc: "将战机攻击强化到 3 级。", condition: { type: "fighter_upgrade", stat: "attack", target: 3, label: "攻击等级" }, rewards: [{ type: "gold", amount: 4000 }], priority: 70 },
    { id: "task_hp_3", track: "growth", category: "强化", title: "装甲模块 Lv.3", desc: "将战机生命强化到 3 级。", condition: { type: "fighter_upgrade", stat: "hp", target: 3, label: "装甲等级" }, rewards: [{ type: "gold", amount: 4000 }], priority: 80 },
    { id: "task_pen_3", track: "growth", category: "强化", title: "推进模块 Lv.3", desc: "将破甲推进强化到 3 级。", condition: { type: "fighter_upgrade", stat: "armorPenetration", target: 3, label: "推进等级" }, rewards: [{ type: "gold", amount: 4000 }], priority: 90 },
    { id: "task_upgrade_total_10", track: "growth", category: "强化", title: "整备总检", desc: "三项战机强化总等级达到 10。", condition: { type: "fighter_upgrade_total", target: 10, label: "强化总等级" }, rewards: [{ type: "gold", amount: 10000 }], priority: 100 },
    { id: "task_clear_3", track: "growth", category: "作战", title: "稳定出击", desc: "累计通关 3 次，建立稳定作战节奏。", condition: { type: "clear_count", target: 3, label: "累计通关" }, rewards: [{ type: "gold", amount: 5000 }], priority: 110 },
    { id: "task_clear_10", track: "growth", category: "作战", title: "星港巡航", desc: "累计通关 10 次，熟悉主要敌机编队。", condition: { type: "clear_count", target: 10, label: "累计通关" }, rewards: [{ type: "gold", amount: 12000 }], priority: 120 },
    { id: "task_clear_20", track: "growth", category: "作战", title: "航线守备", desc: "累计通关 20 次，完成长期守备轮值。", condition: { type: "clear_count", target: 20, label: "累计通关" }, rewards: [{ type: "gold", amount: 24000 }], priority: 130 },
    { id: "task_perfect_1", track: "growth", category: "技巧", title: "完美作战", desc: "取得首次完美通关。", condition: { type: "perfect_count", target: 1, label: "完美通关" }, rewards: [{ type: "gold", amount: 8000 }], priority: 140 },
    { id: "task_perfect_5", track: "growth", category: "技巧", title: "无漏航线", desc: "累计取得 5 次完美通关。", condition: { type: "perfect_count", target: 5, label: "完美通关" }, rewards: [{ type: "gold", amount: 18000 }], priority: 150 },
    { id: "task_boss_no_damage_1", track: "growth", category: "技巧", title: "王牌规避", desc: "完成首次无伤 Boss 作战。", condition: { type: "no_damage_boss_count", target: 1, label: "无伤 Boss" }, rewards: [{ type: "gold", amount: 10000 }], priority: 160 },
    { id: "task_roster_2", track: "growth", category: "收集", title: "战姬集结", desc: "拥有 2 名战姬，建立双人轮换阵容。", condition: { type: "owned_pilots", target: 2, label: "拥有战姬" }, rewards: [{ type: "gold", amount: 8000 }], priority: 170 },
    { id: "task_hangar_2", track: "growth", category: "收集", title: "双机整备", desc: "拥有 2 架战机，完成基础机库扩编。", condition: { type: "owned_ships", target: 2, label: "拥有战机" }, rewards: [{ type: "gold", amount: 8000 }], priority: 180 },
    { id: "task_rank_ship", track: "growth", category: "收集", title: "高阶机体", desc: "当前出战 A 级或 S 级战机。", condition: { type: "selected_ship_rank", ranks: ["A", "S"], target: 1, label: "A/S 级出战" }, rewards: [{ type: "gold", amount: 6000 }], priority: 190 }
  ].map(Object.freeze));

  var ACTIVITY_REWARDS = Object.freeze([
    Object.freeze({ points: 20, rewards: [{ type: "gold", amount: 3000 }] }),
    Object.freeze({ points: 40, rewards: [{ type: "energy", amount: 30 }] }),
    Object.freeze({ points: 60, rewards: [{ type: "gold", amount: 8000 }] }),
    Object.freeze({ points: 80, rewards: [{ type: "diamonds", amount: 5 }] }),
    Object.freeze({ points: 100, rewards: [{ type: "gold", amount: 15000 }, { type: "energy", amount: 50 }] })
  ]);

  scope.taskCatalog = Object.freeze({
    tracks: TRACKS,
    tasks: TASKS,
    activityRewards: ACTIVITY_REWARDS
  });

  if (typeof module !== "undefined" && module.exports) module.exports = scope.taskCatalog;
})(typeof globalThis !== "undefined" ? globalThis : this);
