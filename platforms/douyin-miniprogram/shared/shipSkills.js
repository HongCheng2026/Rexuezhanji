(function registerShipSkills(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  var ACTIVE_SKILLS = Object.freeze({
    "sky-lock-beam": Object.freeze({
      id: "sky-lock-beam",
      name: "锁敌贯星炮",
      description: "持续锁定高威胁目标并发射贯穿光束。",
      iconText: "贯",
      cooldown: 10,
      duration: 3,
      shotCount: 5,
      shotInterval: 0.6,
      referenceLevel: 8,
      damageBudget: 12.5
    }),
    "obsidian-gravity-well": Object.freeze({
      id: "obsidian-gravity-well",
      name: "暗域引力井",
      description: "召唤持续吸附敌机并造成伤害的暗域核心。",
      iconText: "域",
      cooldown: 15,
      duration: 5,
      tickInterval: 0.5,
      radius: 140,
      pullRadius: 180,
      pullStrength: 120,
      referenceLevel: 8,
      damageBudget: 18.75
    }),
    "gold-judgement-buff": Object.freeze({
      id: "gold-judgement-buff",
      name: "裁决强化",
      description: "短时间强化三种基础武器的伤害与护甲穿透。",
      iconText: "裁",
      cooldown: 13,
      duration: 4,
      damageMultiplier: 1.3,
      armorPierceBonus: 0.25
    }),
    "phase-shield": Object.freeze({
      id: "phase-shield",
      name: "相位护盾",
      description: "展开相位防护层，持续 3 秒；自动模式仅在生命不高于 50% 时触发。",
      iconText: "相",
      cooldown: 18,
      duration: 3,
      autoCondition: Object.freeze({ type: "hpRatioAtMost", value: 0.5 })
    })
  });

  function getActiveSkill(id) {
    return ACTIVE_SKILLS[String(id || "")] || null;
  }

  var api = {
    ACTIVE_SKILLS: ACTIVE_SKILLS,
    getActiveSkill: getActiveSkill
  };

  scope.shipSkills = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
