(function registerShipSkills(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  // 主动技能的唯一清单。旧的贯星炮、引力井、裁决强化与相位护盾
  // 已迁入 tacticalLoadoutConfig.AUTO_PROTOCOL_SKILLS，不得再在这里注册。
  var ACTIVE_SKILLS = Object.freeze({
    "active-summon-wingman": Object.freeze({
      id: "active-summon-wingman",
      name: "召唤僚机",
      description: "每次消耗 1 次充能部署 1 架可见 AI 僚机；僚机在前向扇区和有效射程内独立索敌，满编后继续储存充能，生命耗尽时被击落。",
      iconText: "僚",
      cooldown: 25,
      duration: 0,
      visualId: "active-summon-wingman"
    }),
    "active-decoy": Object.freeze({
      id: "active-decoy",
      name: "幻影装甲",
      description: "展开三层量子幻影装甲；被装甲吸收的攻击不计为战机受击。",
      iconText: "幻",
      cooldown: 20,
      duration: 1,
      visualId: "active-decoy"
    }),
    "active-chain-lightning": Object.freeze({
      id: "active-chain-lightning",
      name: "连锁闪电",
      description: "释放高压电弧，在多个目标之间连续跳跃并造成衰减伤害。",
      iconText: "雷",
      cooldown: 20,
      duration: 0,
      visualId: "active-chain-lightning"
    }),
    "active-black-hole": Object.freeze({
      id: "active-black-hole",
      name: "黑洞",
      description: "制造短暂黑洞，持续吸附并灼烧范围内敌机、吞没范围内非首领敌弹，结束时发生坍缩爆发。",
      minimumFighterRank: "SS",
      iconText: "洞",
      cooldown: 20,
      duration: 2,
      visualId: "active-black-hole"
    })
  });

  function getActiveSkill(id) {
    return ACTIVE_SKILLS[String(id || "")] || null;
  }

  var api = {
    ACTIVE_SKILLS: ACTIVE_SKILLS,
    ACTIVE_SKILL_IDS: Object.freeze(Object.keys(ACTIVE_SKILLS)),
    getActiveSkill: getActiveSkill
  };

  scope.shipSkills = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
