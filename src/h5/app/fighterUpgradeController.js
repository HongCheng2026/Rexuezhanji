(function registerFighterUpgradeController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var dom = options.dom || {};
    var levelsConfig = options.levelsConfig || {};
    var profile = options.getProfile();
    var getPilotAsset = options.getPilotAsset || function emptyPilot() { return {}; };
    var getShipAsset = options.getShipAsset || function emptyShip() { return {}; };
    var setFeaturePanelMode = options.setFeaturePanelMode || function noopMode() {};
    var openFeaturePanelShell = options.openFeaturePanelShell || function noopOpen() {};
    var ensureGameGateway = options.ensureGameGateway;
    var applyGatewayProfile = options.applyGatewayProfile || function noopProfile() {};
    var saveProfile = options.saveProfile || function noopSave() {};
    var renderLobby = options.renderLobby || function noopLobby() {};
    var renderChapterSelect = options.renderChapterSelect || function noopChapter() {};
    var updateHud = options.updateHud || function noopHud() {};
    var gatewayActionLock = options.gatewayActionLock || { busy: false };
    var pendingStat = "";

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function escapeAttr(value) {
      return escapeHtml(value);
    }

    function formatResource(value) {
      var number = Number(value) || 0;
      if (number >= 1000000) return (number / 1000000).toFixed(1) + "M";
      if (number >= 10000) return (number / 1000).toFixed(1) + "K";
      return String(Math.floor(number));
    }

    function getGold() {
      return shared.profile && shared.profile.getGold
        ? shared.profile.getGold(profile)
        : Math.max(0, Number(profile.resources && profile.resources.gold) || 0);
    }

  function renderFighterUpgradePanel() {
    profile = options.getProfile();
    var loadout = shared.combatStats && shared.combatStats.generateBattleLoadout
      ? shared.combatStats.generateBattleLoadout(profile)
      : null;
    var pilot = loadout && loadout.pilot ? loadout.pilot : (getPilotAsset() || {});
    var ship = loadout && loadout.ship ? loadout.ship : (getShipAsset() || {});
    var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
    var maxLevel = levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60;
    var levelCap = Math.min(commanderLevel, maxLevel);
    var breakdown = buildFighterLoadoutBreakdown(loadout);
    var combatPower = calculateFighterPower({
      attack: breakdown.attack.total,
      maxHp: breakdown.hp.total,
      armorPenetration: breakdown.armorPenetration.total
    });

    dom.featurePanelKicker.textContent = "UPGRADE";
    dom.featurePanelTitle.textContent = "战机升级";
    dom.featurePanelBody.textContent = "强化战机属性，查看开场武器等级，并管理 S 级战机武器模块。";
    setFeaturePanelMode("fighter-upgrade-panel");
    dom.featurePanelSlots.className = "fighter-upgrade-ui";
    dom.featurePanelSlots.innerHTML =
      '<div class="fighter-upgrade-toolbar">' +
        '<button type="button" class="fighter-upgrade-back" data-feature-back="lobby"><span aria-hidden="true">‹</span>返回</button>' +
      '</div>' +
      '<section class="fighter-upgrade-showcase">' +
        '<div class="fighter-loadout-score">' +
          '<span>出战战力评分</span>' +
          '<strong>' + formatResource(combatPower) + '</strong>' +
          '<em>当前战姬 + 战机 + 已生效养成</em>' +
        '</div>' +
        '<div class="fighter-loadout-combo">' +
          '<div class="fighter-loadout-unit">' +
            '<span class="asset-rank rank-' + escapeAttr(pilot && pilot.rank || "A") + '">' + escapeHtml(pilot && pilot.rank || "A") + '</span>' +
            '<div><em>战姬</em><strong>' + escapeHtml(pilot && pilot.name || "出战战姬") + '</strong></div>' +
          '</div>' +
          '<div class="fighter-loadout-unit">' +
            '<span class="asset-rank rank-' + escapeAttr(ship && ship.rank || "A") + '">' + escapeHtml(ship && ship.rank || "A") + '</span>' +
            '<div><em>战机</em><strong>' + escapeHtml(ship && ship.name || "出战战机") + '</strong></div>' +
          '</div>' +
        '</div>' +
        '<div class="fighter-loadout-stats">' +
          renderFighterLoadoutStats(breakdown) +
        '</div>' +
        '<div class="fighter-initial-skills">' +
          renderInitialSkillSummary(loadout) +
        '</div>' +
      '</section>' +
      '<section class="fighter-upgrade-rows">' +
        '<div class="fighter-upgrade-section-head">' +
          '<div><span>强化项目</span><strong>选择优先提升项</strong></div>' +
          '<em>收益与消耗按当前等级实时计算</em>' +
        '</div>' +
        buildFighterUpgradeRows(loadout, levelCap, maxLevel) +
      '</section>' +
      renderWeaponModuleSection(loadout);
    openFeaturePanelShell("fighter-upgrade-panel");
  }

  function renderInitialSkillSummary(loadout) {
    var initial = loadout && loadout.initialWeapons ? loadout.initialWeapons : {};
    var powerups = levelsConfig.POWERUPS || {};
    var fallbackNames = { spread: "散射", laser: "激光", missile: "导弹" };
    var html = '<div class="fighter-initial-skills-head"><span>开局初始技能</span><em>只读展示，不参与战机强化</em></div>';
    html += '<div class="fighter-initial-skill-list">';
    ["spread", "laser", "missile"].forEach(function renderSkill(key) {
      var level = Math.max(0, Math.floor(Number(initial[key]) || 0));
      var config = powerups[key] || {};
      var name = config.name || fallbackNames[key] || key;
      var mark = config.mark || name.slice(0, 1);
      html += '<div class="fighter-initial-skill">' +
        '<span>' + escapeHtml(mark) + '</span>' +
        '<strong>' + escapeHtml(name) + '</strong>' +
        '<em>' + (level > 0 ? "Lv." + level : "未解锁") + '</em>' +
      '</div>';
    });
    html += '</div>';
    return html;
  }

  function buildFighterLoadoutBreakdown(loadout) {
    loadout = loadout || {};
    var pilot = loadout.pilot || {};
    var ship = loadout.ship || {};
    var fighter = loadout.fighterUpgrades || {};
    var attackLevel = Math.max(1, Math.floor(Number(fighter.attack) || getFighterStatLevel("attack")));
    var hpLevel = Math.max(1, Math.floor(Number(fighter.hp) || getFighterStatLevel("hp")));
    var penLevel = Math.max(1, Math.floor(Number(fighter.armorPenetration) || getFighterStatLevel("armorPenetration")));
    var pilotAttack = Math.max(0, Math.round(Number(pilot.damage) || 0));
    var shipAttack = Math.max(0, Math.round(Number(ship.damage) || 0));
    var upgradeAttack = Math.max(0, Math.round(getFighterAttackBonus(attackLevel)));
    var baseHp = 100;
    var pilotHp = Math.max(0, Math.round(Number(pilot.hp) || 0));
    var shipHp = Math.max(0, Math.round(Number(ship.hp) || 0));
    var upgradeHp = Math.max(0, Math.round(getFighterHpBonus(hpLevel)));
    var pilotPen = Math.max(0, Number(pilot.armorPenetration) || 0);
    var shipPen = Math.max(0, Number(ship.armorPenetration) || 0);
    var upgradePen = Math.max(0, Number(getFighterArmorPenetrationBonus(penLevel)) || 0);
    return {
      attack: { key: "attack", label: "攻击", total: pilotAttack + shipAttack + upgradeAttack, parts: [
        { label: "战姬", value: pilotAttack, type: "number" },
        { label: "战机", value: shipAttack, type: "number" },
        { label: "强化", value: upgradeAttack, type: "number" }
      ] },
      hp: { key: "hp", label: "生命", total: baseHp + pilotHp + shipHp + upgradeHp, parts: [
        { label: "基础", value: baseHp, type: "number" },
        { label: "战姬", value: pilotHp, type: "number" },
        { label: "战机", value: shipHp, type: "number" },
        { label: "强化", value: upgradeHp, type: "number" }
      ] },
      armorPenetration: { key: "armorPenetration", label: "破甲", total: pilotPen + shipPen + upgradePen, parts: [
        { label: "战姬", value: pilotPen, type: "percent" },
        { label: "战机", value: shipPen, type: "percent" },
        { label: "强化", value: upgradePen, type: "percent" }
      ] }
    };
  }

  function renderFighterLoadoutStats(breakdown) {
    var rows = [breakdown.attack, breakdown.hp, breakdown.armorPenetration];
    return rows.map(function renderStat(item) {
      return '<div class="fighter-loadout-stat">' +
        '<span>' + item.label + '</span>' +
        '<strong>' + formatFighterBreakdownTotal(item) + '</strong>' +
        '<em>' + renderFighterBreakdownParts(item.parts) + '</em>' +
      '</div>';
    }).join("");
  }

  function formatFighterBreakdownTotal(item) {
    if (!item) return "0";
    if (item.key === "armorPenetration") return formatPercent(item.total) + "%";
    return formatResource(Math.round(Number(item.total) || 0));
  }

  function renderFighterBreakdownParts(parts) {
    return (parts || []).map(function renderPart(part) {
      if (part.type === "percent") return part.label + " " + formatPercent(part.value) + "%";
      return part.label + " " + formatResource(Math.round(Number(part.value) || 0));
    }).join(" + ");
  }

  function buildFighterUpgradeRows(loadout, levelCap, maxLevel) {
    return [
      { key: "attack", icon: "◎", title: "攻击", level: getFighterStatLevel("attack") },
      { key: "armorPenetration", icon: "◇", title: "破甲", level: getFighterStatLevel("armorPenetration") },
      { key: "hp", icon: "♡", title: "生命", level: getFighterStatLevel("hp") }
    ].map(function renderRow(item) {
      var check = shared.battleRules && shared.battleRules.getFighterUpgradeResult
        ? shared.battleRules.getFighterUpgradeResult(profile, item.key)
        : getFallbackFighterUpgradeResult(item.key);
      var targetLevel = item.level + 1;
      var currentText = formatFighterStatValue(item.key, item.level);
      var nextText = targetLevel <= maxLevel
        ? formatFighterStatValue(item.key, targetLevel)
        : currentText;
      var deltaText = targetLevel <= maxLevel
        ? formatFighterStatDelta(item.key, item.level, targetLevel)
        : "0";
      var status = getFighterUpgradeStatus(item.level, levelCap, maxLevel, check);
      if (pendingStat === item.key) status = { disabled: true, label: "强化中…" };
      var costText = check && check.cost ? formatResource(check.cost) + " 金币" : "-";
      return '<article class="fighter-upgrade-row ' + (status.disabled ? "disabled" : "ready") + '">' +
        '<div class="fighter-upgrade-icon" aria-hidden="true">' + item.icon + '</div>' +
        '<div class="fighter-upgrade-stat-name"><strong>' + item.title + '</strong><span>Lv.' + item.level + '/' + levelCap + '</span></div>' +
        '<div class="fighter-upgrade-values"><span>当前加成</span><strong>+' + currentText + '</strong></div>' +
        '<div class="fighter-upgrade-values next"><span>下一加成</span><strong>+' + nextText + '</strong></div>' +
        '<div class="fighter-upgrade-values delta"><span>本次提升</span><strong>+' + deltaText + '</strong></div>' +
        '<div class="fighter-upgrade-cost"><span>升级消耗</span><strong>' + costText + '</strong></div>' +
        '<button type="button" data-fighter-upgrade="' + item.key + '"' + (status.disabled ? " disabled" : "") + '>' + status.label + '</button>' +
      '</article>';
    }).join("");
  }

  function renderWeaponModuleSection(loadout) {
    var modules = shared.balance && shared.balance.WEAPON_MODULES || {};
    var moduleState = profile.weaponModules || { ownedIds: [], equippedId: null };
    var ownedIds = Array.isArray(moduleState.ownedIds) ? moduleState.ownedIds : [];
    var equippedId = moduleState.equippedId || "";
    var isSRank = Boolean(loadout && loadout.ship && loadout.ship.rank === "S");
    var weaponNames = { spread: "散射", laser: "激光", missile: "追踪弹" };
    var cards = Object.keys(modules).map(function renderModuleCard(moduleId) {
      var module = modules[moduleId];
      var owned = ownedIds.indexOf(moduleId) >= 0;
      var equipped = equippedId === moduleId;
      var button = "";
      if (!isSRank) {
        button = '<button type="button" disabled>S级战机专用</button>';
      } else if (!owned) {
        button = '<button type="button" data-module-buy="' + escapeAttr(moduleId) + '">购买 ' + formatResource(module.price) + '</button>';
      } else if (equipped) {
        button = '<button type="button" class="equipped" data-module-unequip="1">卸下</button>';
      } else {
        button = '<button type="button" data-module-equip="' + escapeAttr(moduleId) + '">装备</button>';
      }
      return '<article class="weapon-module-card' + (equipped ? " is-equipped" : "") + '">' +
        '<div class="weapon-module-card-head"><span>' + escapeHtml(weaponNames[module.weaponType] || module.weaponType) + '</span><em>' + (equipped ? "已装备" : owned ? "已拥有" : "未购买") + '</em></div>' +
        '<strong>' + escapeHtml(module.name) + '</strong>' +
        '<p>' + escapeHtml(module.description) + '</p>' +
        button +
      '</article>';
    }).join("");
    var equippedName = equippedId && modules[equippedId] ? modules[equippedId].name : "未装备";
    return '<section class="weapon-module-section">' +
      '<div class="weapon-module-section-head"><div><span>S级武器模块</span><strong>当前：' + escapeHtml(equippedName) + '</strong></div><em>' + (isSRank ? "1个全局槽位 · 仅强化对应基础武器" : "当前战机无模块槽") + '</em></div>' +
      '<div class="weapon-module-grid">' + cards + '</div>' +
    '</section>';
  }

  function upgradeFighterStat(statType) {
    profile = options.getProfile();
    if (pendingStat) return;
    pendingStat = statType;
    var pendingButton = dom.featurePanel && dom.featurePanel.querySelector('[data-fighter-upgrade="' + statType + '"]');
    if (pendingButton) {
      pendingButton.disabled = true;
      pendingButton.textContent = "强化中…";
    }
    dom.featurePanelBody.textContent = "强化请求已发出，其他功能仍可正常查看。";
    ensureGameGateway().then(function upgradeFighterThroughGateway() {
      return options.getGameGateway().upgradeFighter(statType);
    }).then(function onFighterUpgradeComplete(response) {
      if (response && response.profile) applyGatewayProfile(response.profile);
      profile = options.getProfile();
      saveProfile();
      updateHud(true);
      pendingStat = "";
      renderFighterUpgradePanel();
      dom.featurePanelBody.textContent = "强化成功，资源和属性已同步到云端。";
    }).catch(function onFighterUpgradeError(error) {
      var message = error && error.message ? error.message : "强化失败，请稍后重试。";
      if (error && error.code === "REQUEST_TIMEOUT" && options.getGameGateway() && options.getGameGateway().bootstrap) {
        return options.getGameGateway().bootstrap().then(function resyncAfterTimeout(response) {
          if (response && response.profile) applyGatewayProfile(response.profile);
          profile = options.getProfile();
          saveProfile();
        }).catch(function ignoreResyncFailure() {}).then(function showTimeout() {
          pendingStat = "";
          renderFighterUpgradePanel();
          dom.featurePanelBody.textContent = message;
        });
      }
      pendingStat = "";
      renderFighterUpgradePanel();
      dom.featurePanelBody.textContent = message;
    }).finally(function releaseFighterUpgrade() {
      if (pendingStat) {
        pendingStat = "";
        renderFighterUpgradePanel();
      }
    });
  }

  function buyWeaponModule(moduleId) {
    runModuleAction("buyWeaponModule", moduleId);
  }

  function equipWeaponModule(moduleId) {
    runModuleAction("equipWeaponModule", moduleId || null);
  }

  function runModuleAction(method, moduleId) {
    profile = options.getProfile();
    if (gatewayActionLock.busy) return;
    gatewayActionLock.busy = true;
    ensureGameGateway().then(function invokeModuleGateway() {
      return options.getGameGateway()[method](moduleId);
    }).then(function onModuleActionComplete(response) {
      if (response && response.profile) applyGatewayProfile(response.profile);
      profile = options.getProfile();
      saveProfile();
      renderLobby();
      renderChapterSelect();
      updateHud();
      renderFighterUpgradePanel();
    }).catch(function onModuleActionError(error) {
      renderFighterUpgradePanel();
      dom.featurePanelBody.textContent = error && error.message ? error.message : "模块操作失败，请稍后重试。";
    }).finally(function releaseModuleAction() {
      gatewayActionLock.busy = false;
    });
  }

  function getFighterStatLevel(statType) {
    profile.fighterUpgrades = profile.fighterUpgrades || {};
    return Math.max(1, Math.floor(Number(profile.fighterUpgrades[statType]) || 1));
  }

  function getFallbackFighterUpgradeResult(statType) {
    var targetLevel = getFighterStatLevel(statType) + 1;
    var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
    var maxLevel = levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60;
    var cost = levelsConfig.getFighterUpgradeCost ? levelsConfig.getFighterUpgradeCost(statType, targetLevel) : null;
    if (targetLevel > maxLevel || cost == null) return { canUpgrade: false, reason: "MAX_LEVEL", targetLevel: targetLevel };
    if (targetLevel > commanderLevel) return { canUpgrade: false, reason: "COMMANDER_LEVEL_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
    if (getGold() < cost) return { canUpgrade: false, reason: "GOLD_NOT_ENOUGH", targetLevel: targetLevel, cost: cost };
    return { canUpgrade: true, targetLevel: targetLevel, cost: cost };
  }

  function getFighterUpgradeStatus(level, levelCap, maxLevel, check) {
    if (level >= maxLevel || (check && check.reason === "MAX_LEVEL")) return { disabled: true, label: "已满级" };
    if (level >= levelCap || (check && check.reason === "COMMANDER_LEVEL_NOT_ENOUGH")) return { disabled: true, label: "等级不足" };
    if (check && check.reason === "GOLD_NOT_ENOUGH") return { disabled: true, label: "金币不足" };
    if (check && check.canUpgrade) return { disabled: false, label: "升级" };
    return { disabled: true, label: "不可升级" };
  }

  function formatFighterStatValue(statType, level) {
    if (statType === "attack") return String(Math.round(getFighterAttackBonus(level)));
    if (statType === "armorPenetration") return formatPercent(getFighterArmorPenetrationBonus(level)) + "%";
    return String(Math.round(getFighterHpBonus(level)));
  }

  function formatFighterStatDelta(statType, currentLevel, targetLevel) {
    var current = getFighterStatNumericValue(statType, currentLevel);
    var next = getFighterStatNumericValue(statType, targetLevel);
    var delta = Math.max(0, next - current);
    if (statType === "armorPenetration") return formatPercent(delta) + "%";
    return formatResource(Math.round(delta));
  }

  function getFighterStatNumericValue(statType, level) {
    if (statType === "attack") return getFighterAttackBonus(level);
    if (statType === "armorPenetration") return getFighterArmorPenetrationBonus(level);
    return getFighterHpBonus(level);
  }

  function getFighterAttackBonus(level) {
    var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
    var perLevel = Number(gain.attackPerLevel) || 1;
    return Math.max(0, level - 1) * perLevel;
  }

  function getFighterArmorPenetrationBonus(level) {
    var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
    var perLevel = Number(gain.armorPenetrationPerLevel) || 0.001;
    return Math.max(1, level) * perLevel;
  }

  function getFighterHpBonus(level) {
    var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
    var perLevel = Number(gain.hpPerLevel) || 10;
    return Math.max(0, level - 1) * perLevel;
  }

  function formatPercent(value) {
    var percent = Math.round((Number(value) || 0) * 1000) / 10;
    return percent % 1 === 0 ? String(percent) : percent.toFixed(1);
  }

  function calculateFighterPower(stats) {
    stats = stats || {};
    return Math.round(
      Math.max(0, Number(stats.attack) || 0) * 10 +
      Math.max(0, Number(stats.maxHp) || 100) * 2 +
      Math.max(0, Number(stats.armorPenetration) || 0) * 100 * 18
    );
  }


    return {
      render: renderFighterUpgradePanel,
      upgrade: upgradeFighterStat,
      buyWeaponModule: buyWeaponModule,
      equipWeaponModule: equipWeaponModule,
      isBusy: function isBusy() { return gatewayActionLock.busy; }
    };
  }

  var api = { create: create };
  scope.fighterUpgradeController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
