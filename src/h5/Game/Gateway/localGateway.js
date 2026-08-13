(function registerLocalGateway(root) {
  "use strict";
  // 本地存档网关适配器（从 gameApp 的 createLocalGatewayAdapter 抽取而来）。
  // 通过 deps 注入 boot() 的闭包变量与辅助函数，保持对 profile 的读写行为与原版逐字节一致。
  function create(deps) {
    var shared = deps.shared;
    var levelsConfig = deps.levelsConfig;
    var getProfile = deps.getProfile;
    var setProfile = deps.setProfile;
    var spendEnergy = deps.spendEnergy;
    var addGold = deps.addGold;
    var getGold = deps.getGold;
    var setGold = deps.setGold;
    var refundBattleEnergy = deps.refundBattleEnergy;
    var getLevelById = deps.getLevelById;
    var saveProfile = deps.saveProfile;
    var applyBattleExperience = deps.applyBattleExperience;
    var upgrades = deps.upgrades;
    var lobbyController = deps.lobbyController;
    var ENERGY_COST = deps.ENERGY_COST;

    function getFighterStatLevel(statType) {
      var levels = shared.fighterUpgradeApi && shared.fighterUpgradeApi.getLevels ? shared.fighterUpgradeApi.getLevels(getProfile()) : {};
      return Math.max(1, Math.floor(Number(levels[statType]) || 1));
    }

    // 与战机强化房间的结果契约保持一致；主路径始终走 battleRules.getFighterUpgradeResult。
    function getFallbackFighterUpgradeResult(statType) {
      var profile = getProfile();
      var targetLevel = getFighterStatLevel(statType) + 1;
      var cost = levelsConfig.getFighterUpgradeCost ? levelsConfig.getFighterUpgradeCost(statType, targetLevel) : 0;
      var maxLevel = levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60;
      var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
      if (!cost || targetLevel > maxLevel) return { canUpgrade: false, reason: "MAX_LEVEL", targetLevel: targetLevel, cost: cost };
      if (targetLevel > commanderLevel) return { canUpgrade: false, reason: "COMMANDER_LEVEL_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
      if (getGold() < cost) return { canUpgrade: false, reason: "GOLD_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
      return { canUpgrade: true, reason: "", targetLevel: targetLevel, cost: cost };
    }

    return {
      bootstrap: function bootstrapLocal() {
        return {
          profile: getProfile(),
          worldTime: { unixMs: Date.now(), timeZone: "Asia/Shanghai", source: "device" }
        };
      },
      syncProfile: function syncLocalProfile() {
        return { profile: getProfile() };
      },
      identity: function identityLocal() {
        var p = getProfile();
        return { uid: p.player && p.player.uid || "" };
      },
      startBattle: function startLocalBattle() {
        if (!spendEnergy(ENERGY_COST)) {
          var error = new Error("当前体力不足，进入战斗需要 " + ENERGY_COST + " 点体力。");
          error.code = "NO_ENERGY";
          throw error;
        }
        return { profile: getProfile(), ticket: "" };
      },
      finishBattle: function finishLocalBattle(ticket, levelId, rating, details) {
        details = details || {};
        var result = details.result || {};
        var level = getLevelById(levelId);
        if (details.isWin && shared.progressionSystem && shared.progressionSystem.completeLevel) {
          setProfile(shared.progressionSystem.completeLevel(getProfile(), level, rating || { stars: 1 }));
        }
        addGold(Math.max(0, Math.floor(result.coinsEarned || 0)));
        result.levelProgress = applyBattleExperience(getProfile(), Math.max(0, Math.floor(result.expEarned || 0)));
        saveProfile();
        return {
          profile: getProfile(),
          settlement: {
            gold: Math.max(0, Math.floor(result.coinsEarned || 0)),
            experience: Math.max(0, Math.floor(result.expEarned || 0)),
            rating: rating
          }
        };
      },
      abandonBattle: function abandonLocalBattle() {
        return { profile: getProfile(), refundedEnergy: refundBattleEnergy() };
      },
      sweep: function sweepLocal(levelId, count) {
        var level = getLevelById(levelId);
        var result = shared.progressionSystem && shared.progressionSystem.sweepLevel
          ? shared.progressionSystem.sweepLevel(getProfile(), level, count)
          : { success: false, reason: "UNAVAILABLE" };
        if (!result.success) {
          var sweepErrorMessages = {
            NO_ENERGY: "体力不足。",
            NOT_COMPLETED: "该关卡尚未通关。",
            NOT_THREE_STAR: "只有三星及以上关卡才能扫荡。"
          };
          var error = new Error(sweepErrorMessages[result.reason] || "当前无法扫荡。");
          error.code = result.reason;
          throw error;
        }
        setProfile(result.profile);
        saveProfile();
        return {
          profile: getProfile(),
          settlement: {
            count: result.count,
            energySpent: result.energySpent,
            gold: result.goldEarned,
            experience: result.expEarned,
            energyGained: result.levelProgress && result.levelProgress.energyGained || 0
          }
        };
      },
      upgrade: function upgradeLocal(key) {
        var upgrade = upgrades[key];
        var cost = lobbyController.getUpgradeCost(key);
        var p = getProfile();
        p.upgrades = p.upgrades || {};
        if (!upgrade || p.upgrades[key] >= upgrade.max || getGold() < cost) throw new Error("当前无法升级。");
        setGold(getGold() - cost);
        p.upgrades[key] = (p.upgrades[key] || 0) + 1;
        saveProfile();
        return { profile: getProfile(), cost: cost, key: key, level: p.upgrades[key] };
      },
      upgradeFighter: function upgradeFighterLocal(statType) {
        var check = shared.fighterUpgradeApi && shared.fighterUpgradeApi.getUpgradeResult
          ? shared.fighterUpgradeApi.getUpgradeResult(getProfile(), statType)
          : getFallbackFighterUpgradeResult(statType);
        if (!check || !check.canUpgrade) {
          var messages = {
            MAX_LEVEL: "该项强化已满级。",
            COMMANDER_LEVEL_NOT_ENOUGH: "指挥官等级不足。",
            GOLD_NOT_ENOUGH: "金币不足。"
          };
          var fighterUpgradeError = new Error(messages[check && check.reason] || "当前无法强化战机。");
          fighterUpgradeError.code = check && check.reason || "UPGRADE_UNAVAILABLE";
          throw fighterUpgradeError;
        }
        var p = getProfile();
        setGold(getGold() - check.cost);
        shared.fighterUpgradeApi.applyUpgrade(p, statType, check.targetLevel);
        saveProfile();
        return { profile: getProfile(), cost: check.cost, statType: statType, level: check.targetLevel };
      },
      buyPilot: function buyPilotLocal(pilotId) {
        var result = shared.rosterEconomy.purchase(getProfile(), "pilot", pilotId);
        saveProfile();
        return result;
      },
      buyShip: function buyShipLocal(shipId) {
        var result = shared.rosterEconomy.purchase(getProfile(), "ship", shipId);
        saveProfile();
        return result;
      },
      redeem: function redeemLocal(rawCode) {
        var result = shared.redeemCodeSystem.redeemCode({ rawCode: rawCode, profile: getProfile() });
        var messages = {
          EMPTY_CODE: "请输入兑换码。",
          CODE_NOT_FOUND: "兑换码不存在。",
          CODE_ALREADY_USED: "该兑换码已经使用。",
          PLAYER_LEVEL_NOT_ENOUGH: "指挥官等级不足。"
        };
        if (!result || !result.success) {
          var error = new Error(messages[result && result.status] || "兑换失败。");
          error.code = result && result.status || "REDEEM_FAILED";
          throw error;
        }
        setProfile(result.profile);
        saveProfile();
        return { profile: getProfile(), code: result.code, rewards: result.rewards };
      },
      saveFighterSkillLoadout: function saveFighterSkillLoadoutLocal(shipId, loadout) {
        var result = shared.tacticalLoadoutSystem.save(getProfile(), shipId, loadout);
        saveProfile();
        return result;
      },
      upgradeAutoWeapon: function upgradeAutoWeaponLocal(moduleId, operationId) {
        var result = shared.tacticalLoadoutSystem.upgradeAutoWeapon(getProfile(), moduleId, operationId);
        saveProfile();
        return result;
      },
      upgradeAutoWeaponWithComponents: function upgradeAutoWeaponWithComponentsLocal(moduleId, operationId) {
        var result = shared.tacticalLoadoutSystem.upgradeAutoWeaponWithComponents(getProfile(), moduleId, operationId);
        saveProfile();
        return result;
      },
      upgradeActiveSkillGrade: function upgradeActiveSkillGradeLocal(shipId, slotIndex, targetGrade, operationId) {
        var plan = shared.fighterUpgradeApi && shared.fighterUpgradeApi.getActiveGradeUpgradePlan
          ? shared.fighterUpgradeApi.getActiveGradeUpgradePlan(getProfile(), shipId, slotIndex, targetGrade)
          : null;
        if (!plan || !plan.ok) {
          var err = new Error(plan && plan.reason ? plan.reason : "档案令升级校验失败。");
          err.code = plan && plan.reason ? plan.reason : "UPGRADE_UNAVAILABLE";
          throw err;
        }
        var p = getProfile();
        p.tacticalOperationIds = Array.isArray(p.tacticalOperationIds) ? p.tacticalOperationIds : [];
        var opId = String(operationId || "");
        if (opId && p.tacticalOperationIds.indexOf(opId) >= 0) {
          return { profile: p, shipId: shipId, slotIndex: Math.floor(Number(slotIndex) || 0), targetGrade: p.activeSkillGrades && p.activeSkillGrades[plan.skillId], duplicate: true };
        }
        p.resources = p.resources || {};
        p.resources.inventory = p.resources.inventory || {};
        p.resources.inventory[plan.tokenId] = Math.max(0, Math.floor(Number(p.resources.inventory[plan.tokenId]) || 0) - 1);
        p.activeSkillGrades = plan.nextActiveSkillGrades;
        if (opId) {
          p.tacticalOperationIds.push(opId);
          p.tacticalOperationIds = p.tacticalOperationIds.slice(-64);
        }
        saveProfile();
        return { profile: getProfile(), shipId: shipId, slotIndex: Math.floor(Number(slotIndex) || 0), skillId: plan.skillId, targetGrade: targetGrade, tokenId: plan.tokenId };
      },
      upgradePassiveSkill: function upgradePassiveSkillLocal(skillId, operationId) {
        var result = shared.tacticalLoadoutSystem.upgradePassiveSkill(getProfile(), skillId, operationId);
        saveProfile();
        return result;
      },
      promoteUnit: function promoteUnitLocal(kind, itemId, tokenId) {
        var result = shared.rosterEconomy.promoteWithToken(getProfile(), kind, itemId, tokenId);
        if (!result || !result.ok) {
          var err = new Error(result && result.reason ? result.reason : "晋升校验失败。");
          err.code = result && result.reason ? result.reason : "PROMOTE_UNAVAILABLE";
          throw err;
        }
        saveProfile();
        return { profile: getProfile(), kind: kind, id: itemId, tokenId: tokenId, toRank: result.toRank };
      },
      starUpPilot: function starUpPilotLocal(pilotId) {
        var result = shared.rosterEconomy.starUpPilot(getProfile(), pilotId);
        if (!result || !result.ok) {
          var err = new Error(result && result.reason ? result.reason : "升星校验失败。");
          err.code = result && result.reason ? result.reason : "STAR_UP_UNAVAILABLE";
          throw err;
        }
        saveProfile();
        return { profile: getProfile(), pilotId: pilotId, toStars: result.toStars, copiesUsed: result.copiesUsed };
      },
      starUpFighter: function starUpFighterLocal(shipId) {
        var result = shared.rosterEconomy.starUpFighter(getProfile(), shipId);
        if (!result || !result.ok) {
          var err = new Error(result && result.reason ? result.reason : "战机升星校验失败。");
          err.code = result && result.reason ? result.reason : "FIGHTER_STAR_UP_UNAVAILABLE";
          throw err;
        }
        saveProfile();
        return { profile: getProfile(), shipId: shipId, toStars: result.toStars, copiesUsed: result.copiesUsed, modulesUsed: result.modulesUsed, attackGained: result.attackGained };
      },
      activateCodexEntry: function activateCodexEntryLocal(kind, entryId) {
        var profile = getProfile();
        var system = shared.codexSystem;
        if (!system || (!system.canActivate(profile, kind, entryId) &&
          !((kind === "unit" && system.isUnitActivated(profile, entryId)) ||
            (kind === "bond" && system.getActivationState(profile).activatedBonds.indexOf(String(entryId)) >= 0)))) {
          var activationError = new Error("当前图鉴条目不可激活。");
          activationError.code = "CODEX_ACTIVATION_UNAVAILABLE";
          throw activationError;
        }
        system.activateEntry(profile, kind, entryId);
        saveProfile();
        return { profile: getProfile(), kind: kind, entryId: entryId };
      },
      saveCosmetics: function saveLocalCosmetics(nextProfile) {
        setProfile(shared.profile.normalizeProfile(nextProfile || getProfile()));
        saveProfile();
        return { profile: getProfile() };
      },
      startEndless: function startLocalEndless() {
        return { ticket: "local-endless-" + Date.now(), record: getProfile().endlessRecord || { bestKills: 0, bestSurvivalSeconds: 0 } };
      },
      finishEndless: function finishLocalEndless(_ticket, kills, survivalSeconds) {
        var p = getProfile();
        var previous = p.endlessRecord || {};
        p.endlessRecord = {
          bestKills: Math.max(Number(previous.bestKills) || 0, Number(kills) || 0),
          bestSurvivalSeconds: Math.max(Number(previous.bestSurvivalSeconds) || 0, Number(survivalSeconds) || 0)
        };
        saveProfile();
        return { record: p.endlessRecord, kills: kills, survivalSeconds: survivalSeconds };
      },
      getEndlessRecord: function getLocalEndlessRecord() {
        return { record: getProfile().endlessRecord || { bestKills: 0, bestSurvivalSeconds: 0 } };
      }
    };
  }

  var scope = root.RXGame || (root.RXGame = {});
  scope.localGateway = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.localGateway;
})(typeof globalThis !== "undefined" ? globalThis : window);
