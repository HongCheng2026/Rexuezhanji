/**
 * 图鉴模块数值常量 (codexBalance.js) — 单位激活 + 羁绊激活
 *
 * 加成只来自两层：
 *   1) 激活单个单位（UNIT_ACTIVATION_BONUS_BY_RANK，按原生品阶）
 *   2) 组合羁绊（BONDS，覆盖全部 21 名成员）
 *
 * 破甲唯一来源：2 个 SS（黑月 / 凌光）
 *   - 激活每个 SS 各 +2% 破甲
 *   - 二者互为羁绊（bond_ultimate_starlink）再 +1% 破甲
 *   - 合计 5% 破甲，其它任何激活 / 羁绊均不给破甲。
 *
 * 全激活 + 全羁绊总额：攻击 +50 / 破甲 +5% / 金币 +10%。
 *
 * 所有数值均为设计假设 [PLACEHOLDER]，待 playtest 验证后锁定。
 *
 * @module codexBalance
 * @version 3.0
 */
(function registerCodexBalance(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  // 激活：拥有并手动激活单个单位后的基础收藏奖励。
  // 只读取单位的原生品阶；后续养成升品不会放大这份收藏奖励。
  // 仅 SS 激活附带破甲（每个 +2%）。
  var UNIT_ACTIVATION_BONUS_BY_RANK = Object.freeze({
    B: Object.freeze({ attackFlat: 1 }),
    A: Object.freeze({ attackFlat: 2 }),
    S: Object.freeze({ attackFlat: 2 }),
    SS: Object.freeze({ attackFlat: 2, armorPenetrationFlat: 0.02 })
  });

  // 组合羁绊：覆盖全部 21 名成员（蓝隼在 新手编队 / 绵星护航 中重复出现 1 次）。
  // 攻击数值随编队品阶升高而增大（合理梯度）；
  // 只有「终极星链」给破甲（2 个 SS 互为羁绊），「绵星护航」给金币获取。
  var BONDS = Object.freeze([
    {
      id: "bond_starter",
      name: "新手编队",
      desc: "白凌与蓝隼的基础编队，稳扎稳打开局。",
      requires: { pilots: ["pilot-b-bailing"], ships: ["ship-b-01"] },
      bonus: Object.freeze({ attackFlat: 1 })
    },
    {
      id: "bond_fire_duo",
      name: "烈火双星",
      desc: "凌焰与苍穹的火力核心，适合高压 BOSS 战与后期核心突破。",
      requires: { pilots: ["pilot-s-lingyan"], ships: ["ship-s-09"] },
      bonus: Object.freeze({ attackFlat: 3 })
    },
    {
      id: "bond_azure_pact",
      name: "苍蓝协约",
      desc: "夜岚与银翼的穿透协约，撕裂高护甲防线。",
      requires: { pilots: ["pilot-a-yelan"], ships: ["ship-a-06"] },
      bonus: Object.freeze({ attackFlat: 2 })
    },
    {
      id: "bond_shadow_strike",
      name: "暗影突袭",
      desc: "洛琪与黑曜幽影的深空突袭，机动压制。",
      requires: { pilots: ["pilot-s-luoqi"], ships: ["ship-s-08"] },
      bonus: Object.freeze({ attackFlat: 3 })
    },
    {
      id: "bond_royal_phalanx",
      name: "王室方阵",
      desc: "沈曜与白昼指挥的指挥方阵，稳定推进。",
      requires: { pilots: ["pilot-a-shenyao"], ships: ["ship-a-07"] },
      bonus: Object.freeze({ attackFlat: 1 })
    },
    {
      id: "bond_crimson_verdict",
      name: "绯羽裁决",
      desc: "洛绯音为金矢裁决标记突击窗口，以高速压制换取干净利落的火力裁决。",
      requires: { pilots: ["pilot-a-luofeiyin"], ships: ["ship-b-04"] },
      bonus: Object.freeze({ attackFlat: 1 })
    },
    {
      id: "bond_coldmoon_lance",
      name: "冷月赤枪",
      desc: "沈清曜与赤枪保持严密的推进节拍，压缩敌方机动空间。",
      requires: { pilots: ["pilot-b-shenqingyao"], ships: ["ship-b-02"] },
      bonus: Object.freeze({ attackFlat: 1 })
    },
    {
      id: "bond_bluebird_bastion",
      name: "蓝鸢壁垒",
      desc: "林知寒借助绿堡构筑移动防线，以稳定防守换取反击窗口。",
      requires: { pilots: ["pilot-b-linzhihan"], ships: ["ship-b-03"] },
      bonus: Object.freeze({ attackFlat: 1 })
    },
    {
      id: "bond_peach_shadow",
      name: "桃星潜影",
      desc: "星桃与紫影共享侦察航线，在弹幕间隙完成快速穿插与补给回收。",
      requires: { pilots: ["pilot-b-xingtao"], ships: ["ship-b-05"] },
      bonus: Object.freeze({ attackFlat: 1 })
    },
    {
      id: "bond_starlight_escort",
      name: "绵星护航",
      desc: "苏绵星接入蓝隼的高速航路，提升战斗金币获取效率。",
      requires: { pilots: ["pilot-b-sumianxing"], ships: ["ship-b-01"] },
      bonus: Object.freeze({ attackFlat: 1, coinBonusMultiplier: 0.10 })
    },
    {
      id: "bond_ultimate_starlink",
      name: "终极星链",
      desc: "黑月与凌光的终极羁绊，星链贯星，破甲质变。",
      requires: { pilots: ["pilot-ss-heiyue"], ships: ["ship-ss-lingguang"] },
      bonus: Object.freeze({ armorPenetrationFlat: 0.01 })
    }
  ]);

  // 全激活 + 全羁绊上限（用于校验 / 展示）。
  var MAX_BONUSES = Object.freeze({
    attackFlat: 50,
    armorPenetrationFlat: 0.05,
    coinBonusMultiplier: 0.10
  });

  var api = {
    UNIT_ACTIVATION_BONUS_BY_RANK: UNIT_ACTIVATION_BONUS_BY_RANK,
    BONDS: BONDS,
    MAX_BONUSES: MAX_BONUSES
  };

  scope.codexBalance = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
