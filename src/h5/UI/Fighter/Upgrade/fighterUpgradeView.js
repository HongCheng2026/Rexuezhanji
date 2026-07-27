(function registerFighterUpgradeView(root) {
  "use strict";

  // ── 本轮重构新增的 class / id 清单（供美术 vince 对齐 CSS）──
  // 以下为 spec 允许 class 之外、本次新增的少量节点，请在 CSS 中补齐/接管样式：
  //   #fu-detail-panel      右区详情容器固定 id（patchLibrarySelection 局部替换用，非 class）
  //   .fu-buy-overlay       材料不足→购买确认浮层（当前 JS 内联绝对定位，待美术接管为正式样式）
  //   .fu-buy-panel         浮层内确认面板
  //   .fu-buy-msg           浮层提示文案
  //   .fu-material-line     自动技能材料行（模块/核心各一行，flex 行内并列，内联 display:flex）
  //   .fu-material-short    材料缺口文案「还差 N 个」

  var scope = root.RXGame || (root.RXGame = {});
  var RANK_ORDER = { B: 1, A: 2, S: 3, SS: 4, SSS: 5 };
  var STAT_META = {
    attack: { name: "攻击", art: "attack", suffix: "", description: "提升战机基础火力，同步增强全部武器与技能的最终输出。" },
    armorPenetration: { name: "破甲", art: "armorPenetration", suffix: "%", description: "提升穿透效率，对高装甲目标保持稳定压制。" },
    hp: { name: "生命", art: "hp", suffix: "", description: "提升战机耐久与容错，扩大高强度作战窗口。" }
  };

    function create(options) {
      options = options || {};
      var shared = options.shared || scope;
      var levelsConfig = options.levelsConfig || {};
      var mountedContainer = null;
      var lastData = null;

      function mount(container, data) {
        if (!container) return;
        mountedContainer = container;
        container.className = "fighter-upgrade-mount";
        container.innerHTML = render(data);
      }

      function render(data) {
        lastData = data;
        var assets = shared.assets && shared.assets.TACTICAL_DOCK_ASSETS || {};
      var style = cssAsset("dock-background", assets.dockBackground) +
        cssAsset("panel-frame", assets.panelFrame) +
        cssAsset("panel-frame-selected", assets.panelFrameSelected || assets.panelFrame) +
        cssAsset("matrix-radar", assets.matrixRadar) +
        cssAsset("scroll-track", assets.scrollTrack) +
        cssAsset("resource-tray", assets.resourceTray);
      var page = data.page === "active" || data.page === "auto" ? data.page : "base";
      return '<div class="fu-dock fu-dock--' + page + '" data-fighter-upgrade-root data-dock-current-page="' + page + '" style="' + style + '">' +
        renderNavigation(page) + renderHeader(data, page) +
        '<main class="fu-page-stage">' + (page === "base" ? renderBasePage(data) : page === "active" ? renderActivePage(data) : renderAutoPage(data)) + '</main>' +
        renderFooter(data) +
      '</div>';
    }

    function renderNavigation(page) {
      var tabs = [
        { id: "base", label: "基础强化", code: "CORE", art: "attack" },
        { id: "active", label: "主动技能", code: "ACTIVE", art: "active-summon-wingman" },
        { id: "auto", label: "自动技能", code: "AUTO", art: "passive-shockwave" }
      ];
      return '<nav class="fu-nav" aria-label="战机强化分类"><span class="fu-nav-crest">07</span><div class="fu-nav-tabs">' + tabs.map(function tab(item, index) {
        return '<button type="button" data-dock-page="' + item.id + '" class="fu-nav-tab' + (page === item.id ? ' is-active' : '') + '">' +
          '<span class="fu-nav-index">0' + (index + 1) + '</span><span class="fu-nav-art">' + renderArt(item.art) + '</span>' +
          '<strong>' + item.label + '</strong><small>' + item.code + '</small></button>';
      }).join("") + '</div></nav>';
    }

    function renderHeader(data, page) {
      var title = page === "active" ? "主动技能" : page === "auto" ? "自动技能" : "基础强化";
      var close = shared.assets && shared.assets.TACTICAL_DOCK_ASSETS && shared.assets.TACTICAL_DOCK_ASSETS.closeButton;
      return '<header class="fu-header"><div class="fu-title"><strong>量子战术坞</strong><span>· ' + title + '</span><small>TACTICAL DOCK / ' + title.toUpperCase() + '</small></div>' +
        '<button type="button" class="fu-close" data-upgrade-close aria-label="关闭战机强化">' +
          (close ? '<img src="' + escapeAttr(close) + '" alt="">' : '<span>×</span>') +
        '</button></header>';
    }

    function renderBasePage(data) {
      return '<section class="fu-page fu-page--base">' +
        '<section class="fu-surface fu-base-workbench">' +
          '<div class="fu-fighter-hero"><div class="fu-fighter-visual"><img src="' + escapeAttr(data.ship.src || "") + '" alt="' + escapeAttr(data.ship.name || "当前战机") + '"></div>' +
            '<div class="fu-combat-index"><small>COMBAT INDEX</small><strong>' + formatNumber(data.combatPower) + '</strong><em>' + escapeHtml(data.ship.name || "-") + ' · ' + escapeHtml(data.shipRank || data.ship.rank || "B") + '</em></div>' +
            '<div class="fu-stat-capsules">' + statCapsule("attack", "攻击", formatNumber(data.breakdown.attack)) + statCapsule("hp", "生命", formatNumber(data.breakdown.hp)) + statCapsule("armorPenetration", "破甲", formatPercent(data.breakdown.armorPenetration) + "%") + '</div>' +
          '</div>' +
          '<div class="fu-upgrade-stack">' + ["attack", "armorPenetration", "hp"].map(function (key) { return renderUpgradeRow(data, key); }).join("") + '</div>' +
        '</section>' + renderBaseDetail(data) +
      '</section>';
    }

    function renderUpgradeRow(data, key) {
      var fighter = data.profile.fighterUpgrades || {};
      var level = Math.max(1, Math.floor(Number(fighter[key]) || 1));
      var result = getUpgradeResult(data, key, level);
      var target = Number(result && result.targetLevel) || level + 1;
      var currentBonus = getStatBonus(key, level);
      var nextBonus = getStatBonus(key, Math.min(target, data.maxLevel));
      var disabled = Boolean(data.pendingAction || !result || result.canUpgrade === false);
      var meta = STAT_META[key];
      return '<article class="fu-upgrade-row' + (data.selectedUpgradeStat === key ? ' is-selected' : '') + (disabled ? ' is-disabled' : '') + '" data-dock-select-stat="' + key + '">' +
        '<span class="fu-upgrade-art">' + renderArt(meta.art) + '</span><div class="fu-upgrade-name"><strong>' + meta.name + '</strong><small>Lv.' + level + '/' + data.levelCap + '</small></div>' +
        '<div class="fu-upgrade-metric"><small>当前</small><strong>+' + formatStat(key, currentBonus) + '</strong></div>' +
        '<span class="fu-upgrade-arrow">››</span><div class="fu-upgrade-metric is-next"><small>下一级</small><strong>+' + formatStat(key, nextBonus) + '</strong></div>' +
        '<button type="button" data-fighter-upgrade="' + key + '"' + (disabled ? ' disabled' : '') + '><b>' + upgradeButtonLabel(result) + '</b><span>' + (result && result.cost ? renderGold(result.cost) : '-') + '</span></button>' +
      '</article>';
    }

    function renderBaseDetail(data) {
      var key = STAT_META[data.selectedUpgradeStat] ? data.selectedUpgradeStat : "attack";
      var meta = STAT_META[key];
      var fighter = data.profile.fighterUpgrades || {};
      var level = Math.max(1, Math.floor(Number(fighter[key]) || 1));
      var result = getUpgradeResult(data, key, level);
      var target = Number(result && result.targetLevel) || level + 1;
      var currentBonus = getStatBonus(key, level);
      var nextBonus = getStatBonus(key, Math.min(target, data.maxLevel));
      var disabled = Boolean(data.pendingAction || !result || result.canUpgrade === false);
      var maxed = level >= data.levelCap || (result && result.reason === "MAX_LEVEL");
      var compareBlock = maxed
        ? '<div class="fu-level-compare"><div class="is-next"><small>当前等级</small><strong>Lv.' + data.levelCap + '</strong><em>+' + formatStat(key, getStatBonus(key, data.levelCap)) + '</em></div></div>'
        : '<div class="fu-level-compare"><div><small>当前等级</small><strong>Lv.' + level + '</strong><em>+' + formatStat(key, currentBonus) + '</em></div><b>››</b><div class="is-next"><small>下一级</small><strong>Lv.' + target + '</strong><em>+' + formatStat(key, nextBonus) + '</em></div></div>';
      var linesBlock = maxed
        ? '<div class="fu-detail-lines"><span><b>满级效果</b><em>+' + formatStat(key, getStatBonus(key, data.levelCap)) + '</em></span></div>'
        : '<div class="fu-detail-lines"><span><b>本次提升</b><em>+' + formatStat(key, Math.max(0, nextBonus - currentBonus)) + '</em></span><span><b>强化消耗</b><em>' + (result && result.cost ? formatCompact(result.cost) + ' 金币' : '-') + '</em></span></div>';
      return '<aside id="fu-detail-panel" class="fu-surface fu-detail fu-base-detail"><header><small>ATTRIBUTE DETAIL</small><strong>属性强化详情</strong></header>' +
        '<div class="fu-detail-identity"><span>' + renderArt(meta.art) + '</span><div><strong>' + meta.name + '</strong><p>' + meta.description + '</p></div></div>' +
        compareBlock +
        linesBlock +
        '<footer><button type="button" data-fighter-upgrade="' + key + '"' + (disabled ? ' disabled' : '') + '>' + upgradeButtonLabel(result) + (result && result.cost ? ' · ' + formatCompact(result.cost) : '') + '</button></footer></aside>';
    }

    function renderActivePage(data) {
      return '<section class="fu-page fu-page--active">' +
        '<section class="fu-surface fu-active-workbench"><div class="fu-active-matrix">' +
          [0, 1, 2, 3].map(function (index) { return renderActiveSlot(data, index); }).join("") +
          '<div class="fu-matrix-ship"><img src="' + escapeAttr(data.ship.src || "") + '" alt="' + escapeAttr(data.ship.name || "当前战机") + '"><strong>' + escapeHtml(data.ship.name || "-") + '</strong><small>' + escapeHtml(data.ship.id || "-") + '</small></div>' +
        '</div><section class="fu-skill-library fu-active-library"><header><strong>主动技能库</strong><small>ACTIVE SKILL LIBRARY</small></header><div>' + renderActiveLibrary(data) + '</div></section></section>' +
        renderActiveDetail(data) +
      '</section>';
    }

    function renderActiveSlot(data, index) {
      var slot = data.shipLoadout.activeSlots[index];
      var skill = slot && shared.shipSkills && shared.shipSkills.getActiveSkill ? shared.shipSkills.getActiveSkill(slot.skillId) : null;
      var required = shared.balance && shared.balance.getActiveSkillSlotUnlockRank ? shared.balance.getActiveSkillSlotUnlockRank(index) : (index < 2 ? "S" : "SS");
      var unlocked = rankAtLeast(data.shipRank, required);
      var selected = data.selectedSlot.type === "active" && data.selectedSlot.index === index;
      return '<button type="button" class="fu-active-slot fu-active-slot--' + (index + 1) + (selected ? ' is-selected' : '') + (skill ? ' is-equipped' : ' is-empty') + (!unlocked ? ' is-locked' : '') + '" data-dock-slot-type="active" data-dock-slot-index="' + index + '"' + (!unlocked ? ' disabled' : '') + '>' +
        '<span class="fu-slot-index">0' + (index + 1) + '</span><span class="fu-slot-art">' + renderArt(skill ? skill.id : "empty") + '</span>' +
        '<span class="fu-slot-copy"><strong>' + escapeHtml(skill ? skill.name : (unlocked ? "空技能槽" : required + "级解锁")) + '</strong><em>' + (skill ? effectiveActiveGrade(data, skill.id) : "点击选择") + '</em></span>' +
        (skill ? '<span class="fu-auto-toggle" data-dock-auto-toggle="' + index + '">' + (slot.autoEnabled ? 'AUTO ON' : 'AUTO OFF') + '</span>' : '') + '</button>';
    }

    function renderActiveLibrary(data) {
      var skills = shared.shipSkills && shared.shipSkills.ACTIVE_SKILLS || {};
      return Object.keys(skills).map(function (id) {
        var skill = skills[id];
        var selected = id === (data.selectedActiveSkillId || Object.keys(skills)[0]);
        var equipped = data.shipLoadout.activeSlots.findIndex(function (slot) { return slot && slot.skillId === id; });
        var rankLocked = !rankAtLeast(data.shipRank, skill.minimumFighterRank || "B");
        return '<button type="button" class="fu-skill-card' + (selected ? ' is-selected' : '') + (equipped >= 0 ? ' is-equipped' : '') + (rankLocked ? ' is-locked' : '') + '" data-dock-select-skill="' + escapeAttr(id) + '"><span>' + renderArt(id) + '</span><strong>' + escapeHtml(skill.name) + '</strong><small>' + (rankLocked ? escapeHtml(skill.minimumFighterRank) + ' 战机解锁' : effectiveActiveGrade(data, id) + (equipped >= 0 ? ' · 0' + (equipped + 1) : '')) + '</small></button>';
      }).join("");
    }

    function renderActiveDetail(data) {
      var skills = shared.shipSkills && shared.shipSkills.ACTIVE_SKILLS || {};
      var id = skills[data.selectedActiveSkillId] ? data.selectedActiveSkillId : Object.keys(skills)[0];
      var skill = skills[id];
      if (!skill) return emptyDetail("主动技能详情");
      var selectedIndex = data.selectedSlot.type === "active" ? data.selectedSlot.index : -1;
      var selectedSlot = selectedIndex >= 0 ? data.shipLoadout.activeSlots[selectedIndex] : null;
      var equippedIndex = data.shipLoadout.activeSlots.findIndex(function (slot) { return slot && slot.skillId === id; });
      var selectedEquipped = selectedSlot && selectedSlot.skillId === id;
      var rankLocked = !rankAtLeast(data.shipRank, skill.minimumFighterRank || "B");
      var action = selectedEquipped
        ? '<button type="button" data-dock-unequip="active"' + (data.pendingAction ? ' disabled' : '') + '>卸下</button>'
        : '<button type="button" data-dock-equip-active="' + escapeAttr(id) + '"' + (selectedIndex < 0 || data.pendingAction || rankLocked ? ' disabled' : '') + '>' + (rankLocked ? skill.minimumFighterRank + ' 战机可用' : (equippedIndex >= 0 ? '已装备于 0' + (equippedIndex + 1) : '装备')) + '</button>';
      var plan = selectedEquipped ? data.gradeUpgrade : null;
      var upgrade = plan && plan.nextGrade
        ? '<button type="button" class="is-primary" data-dock-upgrade-grade="' + escapeAttr(plan.nextGrade) + '"' + (!plan.canUpgrade || data.pendingAction ? ' disabled' : '') + '>' + (plan.canUpgrade ? '升级至 ' + plan.nextGrade : '材料不足') + '</button>'
        : '<button type="button" class="is-primary" disabled>' + (selectedEquipped ? '已达当前上限' : '装备后可升级') + '</button>';
      return '<aside id="fu-detail-panel" class="fu-surface fu-detail fu-skill-detail"><header><small>ACTIVE SKILL DETAIL</small><strong>主动技能详情</strong></header><div class="fu-detail-identity"><span>' + renderArt(id) + '</span><div><small>ACTIVE PROTOCOL</small><strong>' + escapeHtml(skill.name) + '</strong><em>' + effectiveActiveGrade(data, id) + '</em></div></div>' +
        '<p class="fu-detail-description">' + escapeHtml(skill.description || "") + '</p>' + (skill.minimumFighterRank ? '<p class="fu-detail-requirement">使用条件：仅限 ' + escapeHtml(skill.minimumFighterRank) + ' 级以上战机</p>' : '') + '<div class="fu-detail-lines">' + activeStatLines(data, id) + '</div>' +
        renderActiveMaterial(plan) + '<footer>' + action + upgrade + '</footer></aside>';
    }

    function renderAutoPage(data) {
      return '<section class="fu-page fu-page--auto"><section class="fu-surface fu-auto-workbench">' +
        '<div class="fu-auto-stage">' +
          '<div class="fu-auto-grid">' + [0, 1, 2, 3, 4, 5].map(function (index) { return renderAutoSlot(data, index); }).join("") + '</div>' +
        '</div>' +
        '<section class="fu-skill-library fu-auto-library"><header><strong>自动技能库</strong><small>AUTO SKILL LIBRARY</small></header><div class="fu-auto-library-track">' + renderAutoLibrary(data) + '</div></section>' +
      '</section>' + renderAutoDetail(data) + '</section>';
    }

    function renderAutoSlot(data, absoluteIndex) {
      var config = shared.tacticalLoadoutConfig || {};
      var isFixed = absoluteIndex < 3;
      var definition;
      var id;
      var level = 0;
      var unlocked = true;
      var replaceable = true;
      var badge = "";
      if (isFixed) {
        var fixed = config.FIXED_AUTO_WEAPONS && config.FIXED_AUTO_WEAPONS[absoluteIndex] || {};
        id = data.shipLoadout.fixedWeaponOverrides[absoluteIndex];
        definition = id && config.ALL_AUTO_SKILLS && config.ALL_AUTO_SKILLS[id];
        var runtime = data.loadout && data.loadout.autoSkills && data.loadout.autoSkills.slots && data.loadout.autoSkills.slots[absoluteIndex];
        level = definition ? data.autoSkillLevels[id] : (runtime && runtime.level || 0);
        var maxOverrides = config.getFixedWeaponOverrideCount ? config.getFixedWeaponOverrideCount(data.shipRank) : 0;
        var currentOverrides = data.shipLoadout.fixedWeaponOverrides.filter(Boolean).length;
        replaceable = Boolean(id || currentOverrides < maxOverrides);
        definition = definition || fixed;
        badge = ["1", "2", "3"][absoluteIndex];
      } else {
        var extensionIndex = absoluteIndex - 3;
        id = data.shipLoadout.autoWeaponIds[extensionIndex];
        definition = id && config.ALL_AUTO_SKILLS && config.ALL_AUTO_SKILLS[id];
        level = definition ? data.autoSkillLevels[id] : 0;
        unlocked = extensionIndex < data.autoSlotCount;
        replaceable = unlocked;
        badge = "0" + (absoluteIndex + 1);
      }
      var selected = data.selectedSlot.type === "auto" && data.selectedSlot.index === absoluteIndex;
      var name = definition && definition.name ? definition.name : (isFixed ? "基础武器" : "空扩展槽");
      var artId = definition && definition.id ? definition.id : "empty";
      var footer = isFixed ? (["S", "SS", "SSS"][absoluteIndex] + ' 可替换 ' + (absoluteIndex + 1)) : (unlocked ? 'META · Lv.' + Math.max(0, Number(level) || 0) : '品级未解锁');
      var locked = !isFixed && !replaceable;
      return '<button type="button" class="fu-auto-slot fu-auto-slot--' + (absoluteIndex + 1) + (selected ? ' is-selected' : '') + (id ? ' is-equipped' : '') + (locked ? ' is-locked' : '') + '" data-dock-slot-type="auto" data-dock-slot-index="' + absoluteIndex + '"' + (locked ? ' disabled' : '') + '>' +
        '<span class="fu-auto-index">' + (isFixed ? '0' + (absoluteIndex + 1) : badge) + '</span><span class="fu-auto-badge">' + (isFixed ? badge : 'EXT') + '</span>' +
        '<span class="fu-auto-art">' + renderArt(artId) + '</span><strong>' + escapeHtml(name) + '</strong><small>' + footer + '</small></button>';
    }

    function renderAutoLibrary(data) {
      var module = shared.autoSkillModule;
      var skills = module && module.getDefinitions
        ? module.getDefinitions(shared)
        : (shared.tacticalLoadoutConfig && shared.tacticalLoadoutConfig.ALL_AUTO_SKILLS) || {};
      return Object.keys(skills).map(function (id) {
        var definition = skills[id];
        var level = Math.max(0, Number(data.autoSkillLevels[id]) || 0);
        var selected = id === (data.selectedAutoSkillId || Object.keys(skills)[0]);
        var location = findAutoLocation(data.shipLoadout, id);
        return '<button type="button" class="fu-skill-card' + (selected ? ' is-selected' : '') + (location >= 0 ? ' is-equipped' : '') + (level <= 0 ? ' is-locked' : '') + '" data-dock-select-skill="' + escapeAttr(id) + '"><span>' + renderArt(id) + '</span><strong>' + escapeHtml(definition.name) + '</strong><small>' + (level ? 'Lv.' + level : '未解锁') + '</small></button>';
      }).join("");
    }

    function renderAutoDetail(data) {
      var config = shared.tacticalLoadoutConfig || {};
      var module = shared.autoSkillModule;
      var skills = module && module.getDefinitions ? module.getDefinitions(shared) : config.ALL_AUTO_SKILLS || {};
      var fixedIndex = findFixedAutoIndex(config, data.selectedAutoSkillId);
      if (fixedIndex >= 0) return renderFixedAutoDetail(data, config.FIXED_AUTO_WEAPONS[fixedIndex], fixedIndex);
      var id = skills[data.selectedAutoSkillId] ? data.selectedAutoSkillId : Object.keys(skills)[0];
      var definition = skills[id];
      if (!definition) return emptyDetail("自动技能详情");
      var level = Math.max(0, Number(data.autoSkillLevels[id]) || 0);
      var selectedIndex = data.selectedSlot.type === "auto" ? data.selectedSlot.index : -1;
      var location = findAutoLocation(data.shipLoadout, id);
      var selectedEquipped = selectedIndex === location;
      var canEquipSelectedSlot = canEquipAutoAt(data, selectedIndex);
      var equip = selectedEquipped
        ? '<button type="button" data-dock-unequip="auto"' + (data.pendingAction ? ' disabled' : '') + '>卸下</button>'
        : '<button type="button" data-dock-equip-auto="' + escapeAttr(id) + '"' + (level <= 0 || !canEquipSelectedSlot || data.pendingAction ? ' disabled' : '') + '>' + (location >= 0 ? '移动到 0' + (selectedIndex + 1) : '装备') + '</button>';
      return '<aside id="fu-detail-panel" class="fu-surface fu-detail fu-skill-detail"><header><small>AUTO SKILL DETAIL</small><strong>自动技能详情</strong></header><div class="fu-detail-identity"><span>' + renderArt(id) + '</span><div><small>' + autoCategoryLabel(definition.category) + '</small><strong>' + escapeHtml(definition.name) + '</strong><em>Lv.' + level + '</em></div></div>' +
        '<p class="fu-detail-description">' + escapeHtml(definition.description || "") + '</p><div class="fu-detail-lines">' + autoStatLines(config, id, level) + '</div>' +
        renderAutoMaterial(data, definition, level) + '<footer>' + equip + autoUpgradeAction(data, definition, level) + '</footer></aside>';
    }

    function renderFixedAutoDetail(data, definition, index) {
      var runtime = data.loadout && data.loadout.autoSkills && data.loadout.autoSkills.slots
        ? data.loadout.autoSkills.slots[index]
        : data.loadout && data.loadout.autoWeapons && data.loadout.autoWeapons.fixed
          ? data.loadout.autoWeapons.fixed[index]
          : null;
      runtime = runtime || {};
      var level = Math.max(0, Math.floor(Number(runtime.level) || 0));
      return '<aside id="fu-detail-panel" class="fu-surface fu-detail fu-skill-detail"><header><small>FIXED WEAPON DETAIL</small><strong>基础武器详情</strong></header><div class="fu-detail-identity"><span>' + renderArt(definition.id) + '</span><div><small>BATTLE WEAPON</small><strong>' + escapeHtml(definition.name) + '</strong><em>' + (level > 0 ? 'Lv.' + level : '本局未激活') + '</em></div></div>' +
        '<p class="fu-detail-description">' + escapeHtml(fixedAutoDescription(definition.weaponType)) + '</p><div class="fu-detail-lines">' + fixedAutoStatLines(definition, runtime) + '</div>' +
        '<section class="fu-material"><small>升级方式</small><strong>战斗内拾取同类武器，仅提升本局等级</strong></section>' +
        '<footer><button type="button" disabled>固定基础武器</button><button type="button" class="is-primary" disabled>战斗内升级</button></footer></aside>';
    }

    function fixedAutoStatLines(definition, runtime) {
      var stats = runtime && runtime.resolvedStats || {};
      var level = Math.max(0, Math.floor(Number(runtime && runtime.level) || 0));
      var rows = [
        detailLine("当前等级", level > 0 ? "Lv." + level : "未激活"),
        stats.damageMultiplier != null ? detailLine("单发伤害", trimNumber(Number(stats.damageMultiplier) * 100) + "% 攻击") : ""
      ];
      if (definition.weaponType === "laser") {
        var beams = Array.isArray(stats.offsets) ? stats.offsets.length : Math.max(1, Math.floor(Number(stats.projectileCount) || 1));
        rows.push(detailLine("同步光束", beams));
        if (stats.fireIntervalMultiplier != null) rows.push(detailLine("射击间隔倍率", trimNumber(Number(stats.fireIntervalMultiplier) * 100) + "%"));
      } else if (definition.weaponType === "spread") {
        var count = Math.max(1, Math.floor(Number(stats.projectileCount) || 1));
        rows.push(detailLine("弹体数量", count));
        if (stats.angleStep != null) rows.push(detailLine("覆盖角度", trimNumber(Number(stats.angleStep) * Math.max(0, count - 1) * 180 / Math.PI) + "°"));
      } else if (definition.weaponType === "missile") {
        rows.push(detailLine("导弹数量", Math.max(1, Math.floor(Number(stats.projectileCount) || 1))));
        rows.push(detailLine("最大目标", Math.max(1, Math.floor(Number(stats.targetCount) || 1))));
      }
      return '<div class="fu-detail-grade-bar"><span>局内快照</span><b>实战参数</b><span>独立成长</span></div>' + rows.join("");
    }

    function fixedAutoDescription(weaponType) {
      if (weaponType === "laser") return "持续向前发射脉冲光束；等级提升会增加单发伤害、同步光束数量并缩短射击间隔。";
      if (weaponType === "spread") return "持续发射正面扇形弹幕；等级提升会增加单发伤害、弹体数量与覆盖角度。";
      if (weaponType === "missile") return "持续发射自动追踪导弹；等级提升会增加单发伤害、导弹数量与可锁定目标数。";
      return "固定基础武器在战斗内独立升级，并按本局实时等级计算参数。";
    }

    function findFixedAutoIndex(config, id) {
      var fixed = config && config.FIXED_AUTO_WEAPONS || [];
      for (var i = 0; i < fixed.length; i += 1) {
        if (fixed[i] && fixed[i].id === id) return i;
      }
      return -1;
    }

    function activeStatLines(data, id) {
      var config = shared.skillGradeConfig || {};
      var currentGrade = effectiveActiveGrade(data, id);
      var skill = shared.shipSkills && shared.shipSkills.ACTIVE_SKILLS && shared.shipSkills.ACTIVE_SKILLS[id] || {};
      var current = config.getSkillGradeStats ? config.getSkillGradeStats(id, currentGrade) || {} : {};
      var order = config.ACTIVE_GRADES || ["D", "C", "B", "A", "S", "SS", "SSS"];
      var maxGrade = config.getMaxActiveGradeForTier ? config.getMaxActiveGradeForTier(data.shipRank) || currentGrade : currentGrade;
      var currentIndex = Math.max(0, order.indexOf(currentGrade));
      var maxIndex = Math.max(0, order.indexOf(maxGrade));
      var nextGrade = currentIndex < maxIndex ? order[currentIndex + 1] : "";
      var next = nextGrade && config.getSkillGradeStats ? config.getSkillGradeStats(id, nextGrade) || {} : {};
      var specs = activeStatSpecs(id);
      var gradeBar = '<div class="fu-detail-grade-bar"><span>当前 ' + currentGrade + '</span><b>实战参数</b><span>' + (nextGrade ? '下一级 ' + nextGrade : '当前战机上限') + '</span></div>';
      var rows = specs.map(function (spec) {
        var currentValue = activeStatValue(spec, current, skill);
        if (currentValue == null || currentValue === "") return "";
        var nextValue = nextGrade ? activeStatValue(spec, next, skill) : null;
        var value = formatActiveMetric(spec, currentValue);
        if (nextGrade && nextValue != null && String(nextValue) !== String(currentValue)) {
          value += '  ›  ' + formatActiveMetric(spec, nextValue);
        }
        return detailLine(spec.label, value);
      }).join("");
      return gradeBar + (rows || detailLine("当前品级", currentGrade));
    }

    function activeStatSpecs(id) {
      var bySkill = {
        "active-summon-wingman": [
          { key: "maxAllies", label: "最大僚机" },
          { key: "attackMultiplier", label: "单发伤害", type: "attackRatio" },
          { key: "maxHits", label: "齐射目标" },
          { key: "attackAngle", label: "攻击扇角", type: "angle" },
          { key: "attackRange", label: "有效射程", type: "pixels" },
          { key: "blockChance", label: "弹幕拦截", type: "percent" },
          { key: "cooldown", label: "召唤间隔", type: "seconds", fallback: "cooldown" },
          { label: "存续规则", value: "生命耗尽前永久存在" }
        ],
        "active-decoy": [
          { key: "shieldDuration", label: "护甲持续", type: "seconds" },
          { key: "cooldown", label: "重置时间", type: "seconds", fallback: "cooldown" },
          { label: "吸收范围", value: "敌弹与敌机碰撞" },
          { label: "伤害结算", value: "不扣生命，不计受击" }
        ],
        "active-chain-lightning": [
          { key: "jumps", label: "连锁目标" },
          { key: "hitMultiplier", label: "每段伤害", type: "attackRatio" },
          { key: "cooldown", label: "重置时间", type: "seconds", fallback: "cooldown" },
          { label: "索敌规则", value: "由近到远连续跳跃" }
        ],
        "active-black-hole": [
          { key: "dpsMultiplier", label: "每秒伤害", type: "attackRatio" },
          { key: "radiusRatio", label: "作用半径", type: "fieldRatio" },
          { key: "duration", label: "持续时间", type: "seconds" },
          { key: "cooldown", label: "重置时间", type: "seconds", fallback: "cooldown" },
          { label: "使用条件", value: "仅限 SS、SSS 战机" },
          { label: "生成位置", value: "战机正前方约 500px" },
          { label: "控制效果", value: "持续吸附范围内敌机" },
          { label: "弹幕效果", value: "吞没范围内非首领敌弹" }
        ]
      };
      return bySkill[id] || [];
    }

    function activeStatValue(spec, stats, skill) {
      if (spec.value != null) return spec.value;
      if (stats && stats[spec.key] != null) return stats[spec.key];
      if (spec.fallback && skill && skill[spec.fallback] != null) return skill[spec.fallback];
      return null;
    }

    function formatActiveMetric(spec, value) {
      if (typeof value === "string") return value;
      var number = Number(value);
      if (spec.type === "attackRatio") return trimNumber(number * 100) + "% 攻击";
      if (spec.type === "percent") return trimNumber(number * 100) + "%";
      if (spec.type === "fieldRatio") return "战场长边 " + trimNumber(number * 100) + "%";
      if (spec.type === "angle") return trimNumber(number) + "°";
      if (spec.type === "seconds") return trimNumber(number) + "s";
      if (spec.type === "pixels") return trimNumber(number) + "px";
      return trimNumber(number);
    }

    function autoStatLines(config, id, level) {
      var definition = config.ALL_AUTO_SKILLS && config.ALL_AUTO_SKILLS[id];
      var maxLevel = Math.max(1, Number(definition && definition.maxLevel) || Number(config.AUTO_SKILL_MAX_LEVEL) || 10);
      var module = shared.autoSkillModule;
      var rows = module && module.getDetailRows
        ? module.getDetailRows(shared, id, Math.max(1, level))
        : [];
      if (!rows.length) {
        var current = config.getAutoSkillLevelStats ? config.getAutoSkillLevelStats(id, Math.max(1, level)) || {} : {};
        var next = level < maxLevel && config.getAutoSkillLevelStats ? config.getAutoSkillLevelStats(id, Math.max(1, level + 1)) || current : current;
        var keys = ["damageMultiplier", "damageBudget", "projectileCount", "trajectoryCount", "shotCount", "pierceTargets", "targetCount", "chainCount", "coverageAngle", "radius", "duration", "fireInterval", "normalBulletCancelRate", "eliteBulletCancelRate", "armorPierceBonus", "projectileSpeed"];
        rows = keys.filter(function (key) { return current[key] != null; }).slice(0, 7).map(function (key) {
          return { key: key, current: current[key], next: next[key], changes: level < maxLevel && next[key] != null && next[key] !== current[key] };
        });
      }
      return rows.map(function (row) {
        return detailLine(autoStatLabel(row.key), formatMetric(row.key, row.current) + (row.changes ? '  ›  ' + formatMetric(row.key, row.next) : ''));
      }).join("") || detailLine("当前等级", 'Lv.' + level);
    }

    function renderActiveMaterial(plan) {
      if (!plan || !plan.nextGrade) return '<section class="fu-material"><small>升级所需</small><strong>已达当前战机品级上限</strong></section>';
      var line = '<strong>' + plan.nextGrade + ' 级主动技能模组</strong><em>' + (plan.tokenOwned ? '1 / 1' : '0 / 1') + '</em>';
      var shop = plan.shop || {};
      var buyable = shop.purchasable && !(shop.limited && shop.limitRemaining <= 0);
      var shortage = (plan.canUpgrade === false && buyable) ? '<em class="fu-material-short">还差 ' + shop.qtyNeeded + ' 个</em>' : '';
      var buyBtn = (plan.canUpgrade === false && buyable)
        ? '<button type="button" class="fu-btn fu-btn--primary" style="min-height:30px;padding:4px 12px;" data-dock-buy-material="' + escapeAttr(shop.itemId + ':' + shop.qtyNeeded) + '">去购买</button>'
        : '';
      return '<section class="fu-material"><small>升级所需</small>' + line + shortage + buyBtn + '</section>';
    }

    function renderAutoMaterial(data, definition, level) {
      var maxLevel = Math.max(1, Number(definition && definition.maxLevel) || Number(shared.tacticalLoadoutConfig && shared.tacticalLoadoutConfig.AUTO_SKILL_MAX_LEVEL) || 10);
      if (level >= maxLevel) return '<section class="fu-material"><small>升级所需</small><strong>MAX</strong></section>';
      // 双材料模型：蓝模块(L1-10) + 紫核心(L7-10)
      var upgradePlan = data.passiveUpgrades && data.passiveUpgrades[definition.id];
      if (upgradePlan) {
        var lines = [];
        var moduleShort = Math.max(0, (upgradePlan.itemCount || 0) - (upgradePlan.itemOwned || 0));
        var moduleShop = upgradePlan.shop || {};
        var moduleBuyable = moduleShop.purchasable && !(moduleShop.limited && moduleShop.limitRemaining <= 0);
        lines.push('<div class="fu-material-line" style="display:flex;align-items:center;gap:8px;"><strong>模块 ' + (upgradePlan.itemOwned || 0) + '/' + (upgradePlan.itemCount || '-') + '</strong>' + (moduleShort > 0 && moduleBuyable ? ' <em class="fu-material-short">还差 ' + moduleShort + ' 个</em><button type="button" class="fu-btn fu-btn--primary" style="min-height:30px;padding:4px 12px;" data-dock-buy-material="' + escapeAttr(moduleShop.itemId + ':' + moduleShop.qtyNeeded) + '">去购买</button>' : '') + '</div>');
        if (upgradePlan.secondaryItemCount > 0) {
          var coreShort = Math.max(0, upgradePlan.secondaryItemCount - (upgradePlan.secondaryItemOwned || 0));
          var coreShop = upgradePlan.shopSecondary || {};
          var coreBuyable = coreShop.purchasable && !(coreShop.limited && coreShop.limitRemaining <= 0);
          lines.push('<div class="fu-material-line" style="display:flex;align-items:center;gap:8px;"><strong>核心 ' + (upgradePlan.secondaryItemOwned || 0) + '/' + upgradePlan.secondaryItemCount + '</strong>' + (coreShort > 0 && coreBuyable ? ' <em class="fu-material-short">还差 ' + coreShort + ' 个</em><button type="button" class="fu-btn fu-btn--primary" style="min-height:30px;padding:4px 12px;" data-dock-buy-material="' + escapeAttr(coreShop.itemId + ':' + coreShop.qtyNeeded) + '">去购买</button>' : '') + '</div>');
        }
        if (upgradePlan.goldCost > 0) lines.push('<div class="fu-material-line" style="display:flex;align-items:center;gap:8px;"><strong>' + formatCompact(upgradePlan.goldCost) + ' 金币</strong></div>');
        return '<section class="fu-material"><small>升级所需</small>' + lines.join('') + '</section>';
      }
      // fallback：无方案时显示等级信息
      return '<section class="fu-material"><small>当前等级</small><strong>Lv.' + level + '</strong></section>';
    }

    function autoUpgradeAction(data, definition, level) {
      var maxLevel = Math.max(1, Number(definition && definition.maxLevel) || Number(shared.tacticalLoadoutConfig && shared.tacticalLoadoutConfig.AUTO_SKILL_MAX_LEVEL) || 10);
      if (level >= maxLevel) return '<button type="button" class="is-primary" disabled>MAX</button>';
      // 统一：所有非固定凹槽自动技能均走 upgradePassive 路径（tactical_core + 金币）
      var upgradePlan = data.passiveUpgrades && data.passiveUpgrades[definition.id];
      return '<button type="button" class="is-primary" data-dock-upgrade-passive="' + escapeAttr(definition.id) + '"' + (!upgradePlan || !upgradePlan.ok || data.pendingAction ? ' disabled' : '') + '>' + (upgradePlan && upgradePlan.ok ? '升级' : '材料不足') + '</button>';
    }

    function renderFooter(data) {
      return '<footer class="fu-footer"><div class="fu-resources">' + data.resourceDisplay.map(function (item) {
        return '<span class="fu-resource-item"><img src="' + escapeAttr(item.icon || "") + '" alt=""><div><strong>' + formatCompact(item.amount) + '</strong><em>' + escapeHtml(item.name) + '</em></div></span>';
      }).join("") + '</div></footer>';
    }

    function emptyDetail(title) {
      return '<aside class="fu-surface fu-detail fu-detail--empty"><header><small>TACTICAL DETAIL</small><strong>' + title + '</strong></header><p>请先选择一个技能。</p></aside>';
    }

    function statCapsule(art, label, value) {
      return '<div><span>' + renderArt(art) + '</span><small>' + label + '</small><strong>' + value + '</strong></div>';
    }

    function detailLine(label, value) { return '<span><b>' + label + '</b><em>' + value + '</em></span>'; }
    function getStatBonus(key, level) { return options.getStatBonus ? options.getStatBonus(key, level) : 0; }
    function getUpgradeResult(data, key, level) {
      return shared.fighterUpgradeApi && shared.fighterUpgradeApi.getUpgradeResult
        ? shared.fighterUpgradeApi.getUpgradeResult(data.profile, key)
        : { canUpgrade: level < data.maxLevel, targetLevel: level + 1, cost: 0 };
    }
    function upgradeButtonLabel(result) {
      if (!result) return "强化";
      if (result.reason === "MAX_LEVEL") return "MAX";
      if (result.reason === "COMMANDER_LEVEL_NOT_ENOUGH") return "等级限制";
      if (result.reason === "GOLD_NOT_ENOUGH") return "金币不足";
      return "强化";
    }
    function effectiveActiveGrade(data, id) {
      var grade = String(data.activeSkillGrades && data.activeSkillGrades[id] || "D").toUpperCase();
      var config = shared.skillGradeConfig || {};
      var max = config.getMaxActiveGradeForTier ? config.getMaxActiveGradeForTier(data.shipRank) || "D" : grade;
      var order = config.ACTIVE_GRADES || ["D", "C", "B", "A", "S", "SS", "SSS"];
      return order[Math.min(Math.max(0, order.indexOf(grade)), Math.max(0, order.indexOf(max)))] || "D";
    }
    function findAutoLocation(loadout, id) {
      if (shared.autoSkillModule && shared.autoSkillModule.findEquippedSlot) {
        return shared.autoSkillModule.findEquippedSlot(loadout, id);
      }
      var fixed = loadout.fixedWeaponOverrides.indexOf(id);
      if (fixed >= 0) return fixed;
      var extension = loadout.autoWeaponIds.indexOf(id);
      return extension >= 0 ? extension + 3 : -1;
    }
    function canEquipAutoAt(data, index) {
      if (!(index >= 0 && index < 6)) return false;
      if (index >= 3) return index - 3 < Math.max(0, Number(data.autoSlotCount) || 0);
      var config = shared.tacticalLoadoutConfig || {};
      var maxOverrides = config.getFixedWeaponOverrideCount ? config.getFixedWeaponOverrideCount(data.shipRank) : 0;
      var overrides = data.shipLoadout && Array.isArray(data.shipLoadout.fixedWeaponOverrides)
        ? data.shipLoadout.fixedWeaponOverrides
        : [null, null, null];
      var currentOverrides = overrides.filter(Boolean).length;
      if (overrides[index]) return currentOverrides <= maxOverrides;
      return currentOverrides < maxOverrides;
    }
    function rankAtLeast(rank, required) { return (RANK_ORDER[String(rank || "").toUpperCase()] || 0) >= (RANK_ORDER[String(required || "").toUpperCase()] || 99); }
    function autoCategoryLabel(category) { return "自动技能"; }
    function activeStatLabel(key) { return ({ maxAllies: "僚机数量", attackMultiplier: "攻击倍率", maxHits: "最大目标", blockChance: "拦截率", duration: "持续时间", radius: "作用半径", cooldown: "重置时间" })[key] || key; }
    function autoStatLabel(key) { return ({ damageMultiplier: "伤害倍率", damageBudget: "总伤害倍率", projectileCount: "弹体数", trajectoryCount: "单边弹道", shotCount: "发射数", pierceTargets: "贯穿目标", targetCount: "最大目标", chainCount: "连锁目标", coverageAngle: "射击角度", radius: "作用半径", duration: "持续时间", fireInterval: "射击间隔", normalBulletCancelRate: "普通弹抵消", eliteBulletCancelRate: "精英弹抵消", armorPierceBonus: "破甲增量", projectileSpeed: "弹体速度" })[key] || key; }
    function formatMetric(key, value) {
      var number = Number(value);
      if (key === "damageMultiplier" || key === "blockChance" || key === "normalBulletCancelRate" || key === "eliteBulletCancelRate" || key === "armorPierceBonus") return trimNumber(number * 100) + "%";
      if (key === "damageBudget") return trimNumber(number * 100) + "%";
      if (key === "coverageAngle") return trimNumber(number) + "°";
      if (key === "duration" || key === "cooldown" || key === "fireInterval") return trimNumber(number) + "s";
      if (key === "projectileSpeed") return trimNumber(number) + " px/s";
      return trimNumber(number);
    }
    function trimNumber(value) { return Number.isInteger(value) ? String(value) : String(Math.round(value * 10000) / 10000); }
    function renderArt(id) { return shared.fighterUpgradeAssets && shared.fighterUpgradeAssets.image ? shared.fighterUpgradeAssets.image(id) : ""; }
    function renderGold(value) {
      var icon = shared.assets && shared.assets.UI_A_HUD_ASSETS && shared.assets.UI_A_HUD_ASSETS.resourceGoldIcon || "";
      return '<span class="fu-currency"><img src="' + escapeAttr(icon) + '" alt=""><strong>' + formatCompact(value) + '</strong></span>';
    }
    function cssAsset(name, value) { return '--rx-td-' + name + ':url(&quot;' + escapeAttr(value || "") + '&quot;);'; }
    function formatStat(key, value) { return key === "armorPenetration" ? trimNumber((Number(value) || 0) * 100) + "%" : formatNumber(value); }
    function formatPercent(value) { return trimNumber((Number(value) || 0) * 100); }
    function formatCompact(value) { var n = Math.max(0, Math.floor(Number(value) || 0)); return n >= 1000000 ? trimNumber(n / 1000000) + "M" : n >= 1000 ? trimNumber(n / 1000) + "K" : String(n); }
    function formatNumber(value) { return Math.max(0, Math.round(Number(value) || 0)).toLocaleString("en-US"); }
    function escapeHtml(value) { return String(value == null ? "" : value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
    function escapeAttr(value) { return escapeHtml(value); }

    // 方案 1（spec §5.1）：库选择走局部补丁，不整渲，保留自动库滚动位置。
    // 仅做两件事：(a) 切换库卡 .is-selected；(b) 用 renderXxxDetail 替换右区 #fu-detail-panel 的 innerHTML。
    function patchLibrarySelection(page, selectedId) {
      if (!mountedContainer || !lastData || !selectedId) return;
      var cards = mountedContainer.querySelectorAll(".fu-skill-card[data-dock-select-skill]");
      for (var ci = 0; ci < cards.length; ci++) {
        var card = cards[ci];
        var isSel = card.getAttribute("data-dock-select-skill") === String(selectedId);
        if (isSel) card.classList.add("is-selected");
        else card.classList.remove("is-selected");
      }
      var panel = mountedContainer.querySelector("#fu-detail-panel");
      if (panel) {
        var patched = {};
        for (var k in lastData) { if (Object.prototype.hasOwnProperty.call(lastData, k)) patched[k] = lastData[k]; }
        if (page === "active") patched.selectedActiveSkillId = selectedId;
        else patched.selectedAutoSkillId = selectedId;
        lastData = patched;
        panel.outerHTML = page === "active" ? renderActiveDetail(patched) : renderAutoDetail(patched);
      }
    }

    return { mount: mount, render: render, patchLibrarySelection: patchLibrarySelection };
  }

  scope.fighterUpgradeView = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.fighterUpgradeView;
})(typeof globalThis !== "undefined" ? globalThis : this);
