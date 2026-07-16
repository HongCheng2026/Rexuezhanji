(function registerFighterUpgradeController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var dom = options.dom || {};
    var levelsConfig = options.levelsConfig || {};
    var getPilotAsset = options.getPilotAsset || function emptyPilot() { return {}; };
    var getShipAsset = options.getShipAsset || function emptyShip() { return {}; };
    var gatewayActionLock = options.gatewayActionLock || { busy: false };
    var selectedSlot = { type: "active", index: 0 };
    var libraryTab = "active";
    var pendingAction = "";
    var notice = "";

    function escapeHtml(value) {
      return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
    }

    function formatResource(value) {
      var number = Math.max(0, Number(value) || 0);
      if (number >= 1000000) return (number / 1000000).toFixed(number >= 10000000 ? 0 : 1) + "M";
      if (number >= 10000) return (number / 1000).toFixed(number >= 100000 ? 0 : 1) + "K";
      return String(Math.floor(number));
    }

    function formatPercent(value) {
      return (Math.round((Number(value) || 0) * 1000) / 10).toFixed(1).replace(/\.0$/, "");
    }

    function getProfile() {
      return options.getProfile();
    }

    function getGold(profile) {
      return shared.profile && shared.profile.getGold
        ? shared.profile.getGold(profile)
        : Math.max(0, Number(profile.resources && profile.resources.gold) || 0);
    }

    function render() {
      var profile = getProfile();
      var loadout = shared.combatStats && shared.combatStats.generateBattleLoadout
        ? shared.combatStats.generateBattleLoadout(profile)
        : null;
      var pilot = loadout && loadout.pilot ? loadout.pilot : getPilotAsset();
      var ship = loadout && loadout.ship ? loadout.ship : getShipAsset();
      var tactical = shared.tacticalLoadoutSystem;
      var shipLoadout = tactical && tactical.getLoadout
        ? tactical.getLoadout(profile, ship.id)
        : { activeSlots: [null, null, null, null], autoWeaponIds: [null, null, null] };
      var breakdown = buildFighterLoadoutBreakdown(loadout);
      var combatPower = calculateFighterPower({ attack: breakdown.attack.total, maxHp: breakdown.hp.total, armorPenetration: breakdown.armorPenetration.total });
      var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
      var maxLevel = levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60;
      var levelCap = Math.min(commanderLevel, maxLevel);

      dom.featurePanelKicker.textContent = "TACTICAL DOCK / 07";
      dom.featurePanelTitle.textContent = "量子战术坞";
      dom.featurePanelBody.textContent = notice || "战机强化、独立配装与武装数据在同一终端中完成同步。";
      options.setFeaturePanelMode("fighter-upgrade-panel");
      dom.featurePanelSlots.className = "fighter-upgrade-ui";
      dom.featurePanelSlots.innerHTML =
        '<div class="tactical-dock-grid">' +
          renderCorePanel(profile, pilot, ship, breakdown, combatPower, levelCap, maxLevel) +
          renderMatrixPanel(profile, ship, loadout, shipLoadout) +
          renderLibraryPanel(profile, shipLoadout) +
        '</div>' +
        '<footer class="tactical-dock-footer">' +
          '<button type="button" class="tactical-dock-back" data-feature-back="lobby"><span aria-hidden="true">‹</span><em>返回机库</em><small>BACK TO HANGAR</small></button>' +
          '<div><span class="dock-status-light"></span><strong>' + (pendingAction ? '正在同步战术配置' : '战术链路已就绪') + '</strong><em>' + escapeHtml(ship.name || "-") + ' · ' + escapeHtml(ship.id || "-") + '</em></div>' +
        '</footer>';
      options.openFeaturePanelShell("fighter-upgrade-panel");
    }

    function renderCorePanel(profile, pilot, ship, breakdown, combatPower, levelCap, maxLevel) {
      return '<section class="dock-panel dock-core-panel">' +
        renderPanelHead("FIGHTER CORE", "战机核心", '<span class="dock-gold">金币 ' + formatResource(getGold(profile)) + '</span>') +
        '<div class="dock-core-score"><div><span>COMBAT INDEX</span><strong>' + formatResource(combatPower) + '</strong><em>已按当前战姬与战机实时计算</em></div><i aria-hidden="true"></i></div>' +
        '<div class="dock-roster">' +
          renderRosterUnit("战姬", pilot) +
          renderRosterUnit("战机", ship) +
        '</div>' +
        '<div class="dock-stat-strip">' +
          renderStatSummary(breakdown.attack) +
          renderStatSummary(breakdown.hp) +
          renderStatSummary(breakdown.armorPenetration) +
        '</div>' +
        '<div class="dock-upgrade-stack">' + buildUpgradeRows(levelCap, maxLevel) + '</div>' +
      '</section>';
    }

    function renderRosterUnit(label, asset) {
      return '<div class="dock-roster-unit"><span class="asset-rank rank-' + escapeHtml(asset.rank || "B") + '">' + escapeHtml(asset.rank || "B") + '</span><div><em>' + label + '</em><strong>' + escapeHtml(asset.name || "-") + '</strong></div></div>';
    }

    function renderStatSummary(item) {
      var value = item.key === "armorPenetration" ? formatPercent(item.total) + "%" : formatResource(item.total);
      return '<div><span>' + item.label + '</span><strong>' + value + '</strong></div>';
    }

    function renderMatrixPanel(profile, ship, loadout, shipLoadout) {
      var fixed = loadout && loadout.autoWeapons && Array.isArray(loadout.autoWeapons.fixed) ? loadout.autoWeapons.fixed : [];
      return '<section class="dock-panel dock-matrix-panel">' +
        renderPanelHead("TACTICAL MATRIX", "战术矩阵", '<span class="dock-save-state">配装随战机独立保存</span>') +
        '<div class="tactical-matrix-stage">' +
          renderActiveSlot(shipLoadout, 0) + renderActiveSlot(shipLoadout, 1) +
          '<div class="matrix-ship-core"><span class="matrix-ring ring-a"></span><span class="matrix-ring ring-b"></span><img src="' + escapeHtml(ship.src || "") + '" alt="' + escapeHtml(ship.name || "当前战机") + '"><strong>' + escapeHtml(ship.name || "-") + '</strong><em>' + escapeHtml(ship.codeName || ship.id || "") + '</em></div>' +
          renderActiveSlot(shipLoadout, 2) + renderActiveSlot(shipLoadout, 3) +
        '</div>' +
        '<div class="auto-weapon-bus">' +
          '<div class="weapon-bus-head"><span>AUTO WEAPON BUS</span><strong>六路自动武装总线</strong></div>' +
          '<div class="weapon-bus-slots">' + fixed.map(renderFixedWeapon).join("") + [0, 1, 2].map(function renderExtension(index) { return renderAutoWeaponSlot(profile, shipLoadout, index); }).join("") + '</div>' +
        '</div>' +
      '</section>';
    }

    function renderActiveSlot(shipLoadout, index) {
      var slot = shipLoadout.activeSlots[index];
      var skill = slot && shared.shipSkills && shared.shipSkills.getActiveSkill ? shared.shipSkills.getActiveSkill(slot.skillId) : null;
      var selected = selectedSlot.type === "active" && selectedSlot.index === index;
      return '<button type="button" class="matrix-active-slot slot-' + (index + 1) + (selected ? ' is-selected' : '') + (skill ? ' is-equipped' : ' is-empty') + '" data-dock-slot-type="active" data-dock-slot-index="' + index + '">' +
        '<span class="slot-index">0' + (index + 1) + '</span>' +
        '<span class="slot-glyph">' + renderTechIcon(skill ? skill.id : "empty") + '</span>' +
        '<span class="slot-copy"><strong>' + escapeHtml(skill ? skill.name : "空战术槽") + '</strong><em>' + (skill ? '冷却 ' + formatSeconds(skill.cooldown) : '点击配置') + '</em></span>' +
        (skill ? '<span class="slot-auto" data-dock-auto-toggle="' + index + '"><i class="' + (slot.autoEnabled ? 'is-on' : '') + '"></i>AUTO</span>' : '') +
      '</button>';
    }

    function renderFixedWeapon(definition) {
      return '<div class="weapon-bus-slot is-fixed"><span class="bus-index">' + escapeHtml(definition.id || "-").slice(-2) + '</span><span class="bus-icon">' + renderTechIcon(definition.id || definition.weaponType || "fixed") + '</span><strong>' + escapeHtml(definition.name || definition.weaponType || "-") + '</strong><em>Lv.' + (Number(definition.level) || 0) + '</em><small>IN-BATTLE</small></div>';
    }

    function renderAutoWeaponSlot(profile, shipLoadout, index) {
      var config = shared.tacticalLoadoutConfig || {};
      var id = shipLoadout.autoWeaponIds[index];
      var definition = id && config.AUTO_WEAPONS ? config.AUTO_WEAPONS[id] : null;
      var level = definition ? Number(profile.autoWeaponLevels && profile.autoWeaponLevels[id]) || 0 : 0;
      var selected = selectedSlot.type === "auto" && selectedSlot.index === index;
      return '<button type="button" class="weapon-bus-slot is-extension ' + (definition ? 'is-equipped' : 'is-empty') + (selected ? ' is-selected' : '') + '" data-dock-slot-type="auto" data-dock-slot-index="' + index + '">' +
        '<span class="bus-index">0' + (index + 4) + '</span><span class="bus-icon">' + renderTechIcon(definition ? definition.id : "empty") + '</span>' +
        '<strong>' + escapeHtml(definition ? definition.name : "扩展槽") + '</strong><em>' + (definition ? (level >= definition.maxLevel ? 'MAX' : 'Lv.' + level) : '点击配置') + '</em><small>EXT</small>' +
      '</button>';
    }

    function renderLibraryPanel(profile, shipLoadout) {
      return '<section class="dock-panel dock-library-panel">' +
        renderPanelHead("TACTICAL LIBRARY", "技能库", '<span class="library-slot-readout">' + getSelectedSlotLabel() + '</span>') +
        '<div class="library-tabs" role="tablist"><button type="button" data-dock-tab="active" class="' + (libraryTab === "active" ? 'is-active' : '') + '">主动技能</button><button type="button" data-dock-tab="auto" class="' + (libraryTab === "auto" ? 'is-active' : '') + '">自动武装</button></div>' +
        '<div class="library-list ' + (libraryTab === "active" ? 'is-active-library' : 'is-auto-library') + '">' + (libraryTab === "active" ? renderActiveLibrary(profile, shipLoadout) : renderAutoLibrary(profile, shipLoadout)) + '</div>' +
      '</section>';
    }

    function renderActiveLibrary(profile, shipLoadout) {
      var ids = Object.keys(shared.shipSkills && shared.shipSkills.ACTIVE_SKILLS || {});
      var unlocked = shared.tacticalLoadoutSystem.getUnlockedActiveSkillIds(profile);
      return ids.map(function renderSkillCard(id) {
        var skill = shared.shipSkills.getActiveSkill(id);
        var isUnlocked = unlocked.has(id);
        var equippedIndex = shipLoadout.activeSlots.findIndex(function findSlot(slot) { return slot && slot.skillId === id; });
        var selectedEquipped = selectedSlot.type === "active" && equippedIndex === selectedSlot.index;
        var canEquip = selectedSlot.type === "active" && isUnlocked && (equippedIndex < 0 || selectedEquipped);
        var button = selectedEquipped
          ? '<button type="button" data-dock-unequip="active">卸下</button>'
          : '<button type="button" data-dock-equip-active="' + escapeHtml(id) + '"' + (!canEquip ? ' disabled' : '') + '>' + (!isUnlocked ? '未解锁' : equippedIndex >= 0 ? '已在 0' + (equippedIndex + 1) : '装备') + '</button>';
        return '<article class="library-card ' + (!isUnlocked ? 'is-locked' : '') + (equippedIndex >= 0 ? ' is-equipped' : '') + '"><span class="library-card-icon">' + renderTechIcon(id) + '</span><div><span>' + (isUnlocked ? 'ACTIVE PROTOCOL' : 'LOCKED PROTOCOL') + '</span><strong>' + escapeHtml(skill.name) + '</strong><p>' + escapeHtml(skill.description) + '</p><em>冷却 ' + formatSeconds(skill.cooldown) + (skill.duration ? ' · 持续 ' + formatSeconds(skill.duration) : '') + '</em></div>' + button + '</article>';
      }).join("");
    }

    function renderAutoLibrary(profile, shipLoadout) {
      var config = shared.tacticalLoadoutConfig || {};
      var levels = config.normalizeAutoWeaponLevels ? config.normalizeAutoWeaponLevels(profile.autoWeaponLevels) : profile.autoWeaponLevels || {};
      return Object.keys(config.AUTO_WEAPONS || {}).map(function renderWeaponCard(id) {
        var definition = config.AUTO_WEAPONS[id];
        var level = Number(levels[id]) || 0;
        var unlocked = level > 0;
        var equippedIndex = shipLoadout.autoWeaponIds.indexOf(id);
        var selectedEquipped = selectedSlot.type === "auto" && equippedIndex === selectedSlot.index;
        var canEquip = selectedSlot.type === "auto" && unlocked && (equippedIndex < 0 || selectedEquipped);
        var stats = config.getAutoWeaponLevelStats ? config.getAutoWeaponLevelStats(id, level) : null;
        var upgrade = config.getAutoWeaponUpgrade ? config.getAutoWeaponUpgrade(id, level) : { ok: false };
        var details = stats ? formatAutoWeaponStats(id, stats) : definition.description;
        var nextDetails = upgrade.ok && upgrade.stats ? formatAutoWeaponDelta(id, stats, upgrade.stats) : '已完成全部局外升级';
        var equipButton = selectedEquipped
          ? '<button type="button" data-dock-unequip="auto">卸下</button>'
          : '<button type="button" data-dock-equip-auto="' + id + '"' + (!canEquip ? ' disabled' : '') + '>' + (!unlocked ? '待解锁' : equippedIndex >= 0 ? '已在 0' + (equippedIndex + 4) : '装备') + '</button>';
        var upgradeButton = upgrade.ok
          ? '<button type="button" class="library-upgrade" data-dock-upgrade-auto="' + id + '">' + (level === 0 ? '购买' : '升级') + ' ' + formatResource(upgrade.cost) + '</button>'
          : '';
        return '<article class="library-card weapon-card ' + (!unlocked ? 'is-locked' : '') + (equippedIndex >= 0 ? ' is-equipped' : '') + '"><span class="library-card-icon">' + renderTechIcon(id) + '</span><div><span>AUTO MODULE / 0' + id.slice(-1) + '</span><strong>' + escapeHtml(definition.name) + '<b>' + (level >= definition.maxLevel && level > 0 ? 'MAX' : 'Lv.' + level) + '</b></strong><p>' + escapeHtml(details) + '</p><em>' + escapeHtml(nextDetails) + '</em></div><footer>' + equipButton + upgradeButton + '</footer></article>';
      }).join("");
    }

    function formatAutoWeaponStats(id, stats) {
      var damage = Math.round((Number(stats.damageMultiplier) || 0) * 1000) / 10;
      var interval = Number(stats.fireInterval) || 0;
      if (id === "weapon_module_04") return '单轨 ' + damage + '% · ' + stats.trajectoryCount + ' 轨 · ' + stats.coverageAngle + '° · ' + interval.toFixed(2) + 'S';
      if (id === "weapon_module_05") return '单发 ' + damage + '% · 贯穿 ' + stats.pierceTargets + ' · ' + interval.toFixed(2) + 'S';
      return '单枚 ' + damage + '% · ' + stats.projectileCount + ' 枚 · ' + stats.targetCount + ' 目标 · ' + interval.toFixed(2) + 'S';
    }

    function formatAutoWeaponDelta(id, current, next) {
      if (!next) return '';
      if (!current) return '解锁后写入独立战斗快照';
      var damage = Math.round((Number(next.damageMultiplier) || 0) * 1000) / 10;
      if (id === "weapon_module_04") return '下级 ' + damage + '% · ' + next.trajectoryCount + ' 轨 · ' + next.coverageAngle + '°';
      if (id === "weapon_module_05") return '下级 ' + damage + '% · 间隔 ' + Number(next.fireInterval).toFixed(2) + 'S';
      return '下级 ' + damage + '% · ' + next.projectileCount + ' 枚 · ' + next.targetCount + ' 目标';
    }

    function renderPanelHead(kicker, title, aside) {
      return '<header class="dock-panel-head"><div><span>' + kicker + '</span><strong>' + title + '</strong></div>' + (aside || '') + '</header>';
    }

    function buildUpgradeRows(levelCap, maxLevel) {
      return [
        { key: "attack", title: "攻击", level: getFighterStatLevel("attack") },
        { key: "armorPenetration", title: "破甲", level: getFighterStatLevel("armorPenetration") },
        { key: "hp", title: "生命", level: getFighterStatLevel("hp") }
      ].map(function renderUpgradeRow(item) {
        var profile = getProfile();
        var check = shared.battleRules && shared.battleRules.getFighterUpgradeResult
          ? shared.battleRules.getFighterUpgradeResult(profile, item.key)
          : getFallbackFighterUpgradeResult(item.key);
        var targetLevel = item.level + 1;
        var status = getFighterUpgradeStatus(item.level, levelCap, maxLevel, check);
        if (pendingAction === "upgrade:" + item.key) status = { disabled: true, label: "同步中" };
        return '<article class="dock-upgrade-row ' + (status.disabled ? 'is-disabled' : '') + '"><span class="upgrade-tech-icon">' + renderTechIcon(item.key) + '</span><div class="upgrade-name"><strong>' + item.title + '</strong><em>Lv.' + item.level + '/' + levelCap + '</em></div><div class="upgrade-value"><span>当前</span><strong>+' + formatFighterStatValue(item.key, item.level) + '</strong></div><div class="upgrade-delta"><span>下级</span><strong>+' + (targetLevel <= maxLevel ? formatFighterStatDelta(item.key, item.level, targetLevel) : '0') + '</strong></div><button type="button" data-fighter-upgrade="' + item.key + '"' + (status.disabled ? ' disabled' : '') + '><span>' + status.label + '</span><em>' + (check && check.cost ? formatResource(check.cost) : '-') + '</em></button></article>';
      }).join("");
    }

    function renderTechIcon(type) {
      var key = String(type || "");
      if (shared.tacticalDockArt && shared.tacticalDockArt.render) {
        return shared.tacticalDockArt.render(key);
      }
      if (key === "attack" || key === "sky-lock-beam" || key === "laser") {
        return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="27" cy="32" r="18"/><circle cx="27" cy="32" r="9"/><path d="M4 32h46M27 9v46M38 26l22 6-22 6"/></svg>';
      }
      if (key === "armorPenetration" || key === "gold-judgement-buff" || key === "weapon_module_04") {
        return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 4 54 16v24L32 60 10 40V16z"/><path d="M32 13 45 20v16L32 49 19 36V20zM4 32h56"/></svg>';
      }
      if (key === "hp" || key === "phase-shield") {
        return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="25"/><path d="M32 12 48 21v15c0 10-7 16-16 20-9-4-16-10-16-20V21zM23 32h18M32 23v18"/></svg>';
      }
      if (key === "obsidian-gravity-well") {
        return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="8"/><path d="M8 32c8-20 40-20 48 0-8 20-40 20-48 0Z"/><path d="M16 12c20 2 34 26 21 46M48 12C28 14 14 38 27 58"/></svg>';
      }
      if (key === "weapon_module_05") {
        return '<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="10"/><ellipse cx="32" cy="32" rx="27" ry="15"/><path d="M9 19c10 5 36 5 46 0M9 45c10-5 36-5 46 0"/></svg>';
      }
      if (key === "weapon_module_06" || key === "missile") {
        return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="m13 45 22-28 12 2 4 11-28 22z"/><path d="m24 42-11 9 2-14M38 22l10-9 2 13M28 29l8 8"/></svg>';
      }
      if (key === "spread") {
        return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M8 32h18M25 32l28-20M25 32l34-8M25 32l34 8M25 32l28 20"/></svg>';
      }
      return '<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M11 21 32 8l21 13v22L32 56 11 43z"/><path d="M22 32h20M32 22v20"/></svg>';
    }

    function handleClick(event) {
      var target = event.target && event.target.closest ? event.target.closest("[data-dock-slot-type],[data-dock-tab],[data-dock-equip-active],[data-dock-equip-auto],[data-dock-unequip],[data-dock-auto-toggle],[data-dock-upgrade-auto],[data-fighter-upgrade]") : null;
      if (!target || target.disabled) return false;
      if (target.dataset.dockSlotType) {
        selectedSlot = { type: target.dataset.dockSlotType, index: Math.max(0, Math.floor(Number(target.dataset.dockSlotIndex) || 0)) };
        libraryTab = selectedSlot.type;
        notice = "";
        render();
        return true;
      }
      if (target.dataset.dockTab) {
        libraryTab = target.dataset.dockTab === "auto" ? "auto" : "active";
        render();
        return true;
      }
      if (target.dataset.dockUpgradeAuto) {
        upgradeAutoWeapon(target.dataset.dockUpgradeAuto);
        return true;
      }
      if (target.dataset.fighterUpgrade) {
        upgradeFighterStat(target.dataset.fighterUpgrade);
        return true;
      }
      var profile = getProfile();
      var ship = getShipAsset();
      var current = shared.tacticalLoadoutSystem.getLoadout(profile, ship.id);
      var next = cloneLoadout(current);
      if (target.dataset.dockEquipActive) next.activeSlots[selectedSlot.index] = { skillId: target.dataset.dockEquipActive, autoEnabled: false };
      else if (target.dataset.dockEquipAuto) next.autoWeaponIds[selectedSlot.index] = target.dataset.dockEquipAuto;
      else if (target.dataset.dockUnequip === "active") next.activeSlots[selectedSlot.index] = null;
      else if (target.dataset.dockUnequip === "auto") next.autoWeaponIds[selectedSlot.index] = null;
      else if (target.dataset.dockAutoToggle != null) {
        var toggleIndex = Math.max(0, Math.floor(Number(target.dataset.dockAutoToggle) || 0));
        if (next.activeSlots[toggleIndex]) next.activeSlots[toggleIndex].autoEnabled = !next.activeSlots[toggleIndex].autoEnabled;
      } else return false;
      saveLoadout(ship.id, next);
      return true;
    }

    function cloneLoadout(loadout) {
      return {
        activeSlots: loadout.activeSlots.map(function cloneSlot(slot) { return slot ? { skillId: slot.skillId, autoEnabled: Boolean(slot.autoEnabled) } : null; }),
        autoWeaponIds: loadout.autoWeaponIds.map(function cloneId(id) { return id || null; })
      };
    }

    function saveLoadout(shipId, loadout) {
      if (gatewayActionLock.busy) return Promise.resolve(null);
      gatewayActionLock.busy = true;
      pendingAction = "loadout";
      notice = "正在校验并同步战机配装…";
      render();
      return options.ensureGameGateway().then(function saveThroughGateway() {
        return options.getGameGateway().saveFighterSkillLoadout(shipId, loadout);
      }).then(function onSaved(response) {
        if (response && response.profile) options.applyGatewayProfile(response.profile);
        options.saveProfile();
        notice = "配装已同步到当前战机。";
        options.renderLobby();
        options.renderChapterSelect();
        options.updateHud();
        return response;
      }).catch(function onSaveError(error) {
        notice = error && error.message ? error.message : "配装保存失败，已恢复最后一次有效配置。";
        return null;
      }).finally(function finishSave() {
        pendingAction = "";
        gatewayActionLock.busy = false;
        render();
      });
    }

    function upgradeAutoWeapon(moduleId) {
      if (gatewayActionLock.busy) return Promise.resolve(null);
      gatewayActionLock.busy = true;
      pendingAction = "auto:" + moduleId;
      notice = "正在提交自动武装升级…";
      render();
      var operationId = root.crypto && root.crypto.randomUUID ? root.crypto.randomUUID() : "local-" + Date.now() + "-" + Math.random().toString(16).slice(2);
      return options.ensureGameGateway().then(function upgradeThroughGateway() {
        return options.getGameGateway().upgradeAutoWeapon(moduleId, operationId);
      }).then(function onUpgraded(response) {
        if (response && response.profile) options.applyGatewayProfile(response.profile);
        options.saveProfile();
        notice = "自动武装已完成升级。";
        options.renderLobby();
        options.updateHud();
        return response;
      }).catch(function onUpgradeError(error) {
        notice = error && error.message ? error.message : "自动武装升级失败。";
        return null;
      }).finally(function finishUpgrade() {
        pendingAction = "";
        gatewayActionLock.busy = false;
        render();
      });
    }

    function upgradeFighterStat(statType) {
      if (gatewayActionLock.busy) return Promise.resolve(null);
      gatewayActionLock.busy = true;
      pendingAction = "upgrade:" + statType;
      notice = "强化请求已发出，正在同步资源…";
      render();
      return options.ensureGameGateway().then(function upgradeThroughGateway() {
        return options.getGameGateway().upgradeFighter(statType);
      }).then(function onComplete(response) {
        if (response && response.profile) options.applyGatewayProfile(response.profile);
        options.saveProfile();
        options.updateHud(true);
        notice = "战机强化完成。";
        return response;
      }).catch(function onError(error) {
        notice = error && error.message ? error.message : "强化失败，请稍后重试。";
        return null;
      }).finally(function finishUpgrade() {
        pendingAction = "";
        gatewayActionLock.busy = false;
        render();
      });
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
      var pilotHp = Math.max(0, Math.round(Number(pilot.hp) || 0));
      var shipHp = Math.max(0, Math.round(Number(ship.hp) || 0));
      var pilotPen = Math.max(0, Number(pilot.armorPenetration) || 0);
      var shipPen = Math.max(0, Number(ship.armorPenetration) || 0);
      return {
        attack: { key: "attack", label: "攻击", total: pilotAttack + shipAttack + getFighterAttackBonus(attackLevel) },
        hp: { key: "hp", label: "生命", total: 100 + pilotHp + shipHp + getFighterHpBonus(hpLevel) },
        armorPenetration: { key: "armorPenetration", label: "破甲", total: pilotPen + shipPen + getFighterArmorPenetrationBonus(penLevel) }
      };
    }

    function getFighterStatLevel(statType) {
      var fighter = getProfile().fighterUpgrades || {};
      return Math.max(1, Math.floor(Number(fighter[statType]) || 1));
    }

    function getFallbackFighterUpgradeResult(statType) {
      var targetLevel = getFighterStatLevel(statType) + 1;
      var cost = levelsConfig.getFighterUpgradeCost ? levelsConfig.getFighterUpgradeCost(statType, targetLevel) : 0;
      return { ok: targetLevel <= (levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL || 60), targetLevel: targetLevel, cost: cost };
    }

    function getFighterUpgradeStatus(level, levelCap, maxLevel, check) {
      if (level >= maxLevel) return { disabled: true, label: "MAX" };
      if (level >= levelCap) return { disabled: true, label: "等级限制" };
      if (check && check.ok === false) return { disabled: true, label: check.message || "不可升级" };
      return { disabled: false, label: "强化" };
    }

    function formatFighterStatValue(statType, level) {
      if (statType === "attack") return formatResource(getFighterAttackBonus(level));
      if (statType === "hp") return formatResource(getFighterHpBonus(level));
      return formatPercent(getFighterArmorPenetrationBonus(level)) + "%";
    }

    function formatFighterStatDelta(statType, fromLevel, toLevel) {
      var delta = getFighterStatRawValue(statType, toLevel) - getFighterStatRawValue(statType, fromLevel);
      if (statType === "armorPenetration") return formatPercent(delta) + "%";
      return formatResource(delta);
    }

    function getFighterStatRawValue(statType, level) {
      if (statType === "attack") return getFighterAttackBonus(level);
      if (statType === "hp") return getFighterHpBonus(level);
      return getFighterArmorPenetrationBonus(level);
    }

    function getFighterAttackBonus(level) {
      var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
      return Math.max(0, (Math.max(1, Number(level) || 1) - 1) * (Number(gain.attackPerLevel) || 1));
    }

    function getFighterHpBonus(level) {
      var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
      return Math.max(0, (Math.max(1, Number(level) || 1) - 1) * (Number(gain.hpPerLevel) || 10));
    }

    function getFighterArmorPenetrationBonus(level) {
      var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
      return Math.max(0, Math.max(1, Number(level) || 1) * (Number(gain.armorPenetrationPerLevel) || 0.001));
    }

    function calculateFighterPower(stats) {
      return Math.max(0, Math.round((Number(stats.attack) || 0) * 10 + (Number(stats.maxHp) || 0) * 1.4 + (Number(stats.armorPenetration) || 0) * 1800));
    }

    function getSelectedSlotLabel() {
      return (selectedSlot.type === "active" ? '主动槽 0' + (selectedSlot.index + 1) : '扩展槽 0' + (selectedSlot.index + 4));
    }

    function formatSeconds(value) {
      var number = Math.max(0, Number(value) || 0);
      return (Number.isInteger(number) ? String(number) : number.toFixed(1)) + "S";
    }

    return {
      render: render,
      handleClick: handleClick,
      upgrade: upgradeFighterStat,
      saveLoadout: saveLoadout,
      upgradeAutoWeapon: upgradeAutoWeapon
    };
  }

  scope.fighterUpgradeController = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.fighterUpgradeController;
})(typeof globalThis !== "undefined" ? globalThis : this);
