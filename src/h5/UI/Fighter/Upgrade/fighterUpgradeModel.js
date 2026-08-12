(function registerFighterUpgradeModel(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  var ARCHIVE_TOKEN_BY_GRADE = Object.freeze({
    C: "active_skill_module_c",
    B: "active_skill_module_b",
    A: "active_skill_module_a",
    S: "active_skill_module_s",
    SS: "active_skill_module_ss",
    SSS: "active_skill_module_sss"
  });

  function create(options) {
    options = options || {};
    var shared = options.shared || scope;
    var levelsConfig = options.levelsConfig || {};
    var selectedByTab = { active: 0, auto: 0 };
    var state = {
      page: "base",
      libraryTab: "active",
      selectedSlot: { type: "active", index: 0 },
      selectedUpgradeStat: "attack",
      selectedActiveSkillId: "active-summon-wingman",
      selectedAutoSkillId: "",
      pendingAction: "",
      notice: ""
    };

    function selectPage(value) {
      var page = value === "active" || value === "auto" ? value : "base";
      state.page = page;
      if (page !== "base") selectTab(page);
      state.notice = "";
    }

    function selectUpgradeStat(value) {
      var stat = value === "armorPenetration" || value === "hp" ? value : "attack";
      state.selectedUpgradeStat = stat;
      state.notice = "";
    }

    function selectTab(value) {
      var tab = value === "auto" ? "auto" : "active";
      state.page = tab;
      state.libraryTab = tab;
      state.selectedSlot = { type: tab, index: selectedByTab[tab] };
      if (tab === "auto" && !state.selectedAutoSkillId) {
        var cfg = shared.tacticalLoadoutConfig || {};
        var all = cfg.ALL_AUTO_SKILLS || {};
        var k = Object.keys(all);
        state.selectedAutoSkillId = k[0] || "";
      }
      state.notice = "";
    }

    function selectAutoSkill(id) {
      if (!id) return;
      state.selectedAutoSkillId = String(id);
      state.notice = "";
    }

    function selectLibrarySkill(id) {
      if (!id) return;
      if (state.libraryTab === "active") state.selectedActiveSkillId = String(id);
      else state.selectedAutoSkillId = String(id);
      state.notice = "";
    }

    function selectSlot(type, rawIndex) {
      var nextType = type === "auto" ? "auto" : "active";
      var config = shared.tacticalLoadoutConfig || {};
      var ship = options.getShipAsset ? options.getShipAsset() : (options.ship || {});
      var currentProfile = options.getProfile ? options.getProfile() : {};
      var maxIndex = nextType === "auto" ? 5 : 3;
      var index = clamp(Math.floor(Number(rawIndex) || 0), 0, maxIndex);
      selectedByTab[nextType] = index;
      state.page = nextType;
      state.libraryTab = nextType;
      state.selectedSlot = { type: nextType, index: index };
      syncSelectedSkillFromSlot(nextType, index, currentProfile, ship, config);
      state.notice = "";
    }

    function syncSelectedSkillFromSlot(type, index, profile, ship, config) {
      var tactical = shared.tacticalLoadoutSystem || {};
      var loadout = tactical.getLoadout
        ? tactical.getLoadout(profile, ship && ship.id)
        : (profile.shipSkillLoadouts && profile.shipSkillLoadouts[ship && ship.id]) || {};
      loadout = normalizeLoadout(loadout);
      var skillId = "";
      if (type === "active") {
        skillId = loadout.activeSlots[index] && loadout.activeSlots[index].skillId || "";
        if (skillId) state.selectedActiveSkillId = String(skillId);
        return;
      }
      if (index < 3) {
        skillId = loadout.fixedWeaponOverrides[index] ||
          (config.FIXED_AUTO_WEAPONS && config.FIXED_AUTO_WEAPONS[index] && config.FIXED_AUTO_WEAPONS[index].id) || "";
      } else {
        skillId = loadout.autoWeaponIds[index - 3] || "";
      }
      if (skillId) state.selectedAutoSkillId = String(skillId);
    }

    function setPending(action, message) {
      state.pendingAction = String(action || "");
      state.notice = String(message || "");
    }

    function finish(message) {
      state.pendingAction = "";
      state.notice = String(message || "");
    }

    function computeGradeUpgrade(ship, shipLoadout, selectedSlot, profile) {
      var gradeConfig = shared.skillGradeConfig;
      var tactical = shared.tacticalLoadoutSystem;
      if (!gradeConfig || !tactical) return null;
      if (!selectedSlot || selectedSlot.type !== "active") return null;
      var slot = shipLoadout.activeSlots[selectedSlot.index];
      if (!slot || !slot.skillId) return null;
      var currentGrade = profile.activeSkillGrades && profile.activeSkillGrades[slot.skillId]
        ? String(profile.activeSkillGrades[slot.skillId]).toUpperCase() : "D";
      var shipRank = tactical.getShipRank ? tactical.getShipRank(profile, ship.id) : (ship && ship.rank ? String(ship.rank).toUpperCase() : "");
      var maxGrade = gradeConfig.getMaxActiveGradeForTier(shipRank) || "D";
      var order = gradeConfig.ACTIVE_GRADES;
      var currentIdx = gradeConfig.activeGradeIndex(currentGrade);
      var maxIdx = gradeConfig.activeGradeIndex(maxGrade);
      var nextGrade = null;
      var nextIdx = -1;
      for (var i = currentIdx + 1; i <= maxIdx; i += 1) {
        if (ARCHIVE_TOKEN_BY_GRADE[order[i]]) { nextGrade = order[i]; nextIdx = i; break; }
      }
      if (nextIdx < 0) {
        return {
          currentGrade: currentGrade,
          maxGrade: maxGrade,
          nextGrade: null,
          canUpgrade: false,
          reason: currentIdx >= maxIdx ? "MAX_GRADE_FOR_TIER" : "NO_TOKEN_TIER"
        };
      }
      var tokenId = ARCHIVE_TOKEN_BY_GRADE[nextGrade];
      var owned = Math.max(0, Math.floor(Number(profile.resources && profile.resources.inventory && profile.resources.inventory[tokenId]) || 0));
      var goldCost = 0;
      var goldOwned = getGold(profile);
      var canUpgrade = owned > 0;
      var shopItem = shared.shopConfig && shared.shopConfig.getShopItem ? shared.shopConfig.getShopItem(tokenId) : null;
      var shop = shopItem ? {
        itemId: tokenId,
        purchasable: shopItem.sellable === true,
        currency: shopItem.priceCurrency,
        priceAmount: shopItem.priceAmount,
        limited: !!shopItem.limit,
        limitRemaining: computeLimitRemaining(shopItem, profile),
        qtyNeeded: Math.max(0, 1 - (owned > 0 ? 1 : 0))
      } : { itemId: tokenId, purchasable: false, currency: "", priceAmount: 0, limited: false, limitRemaining: 0, qtyNeeded: 1 };
      return {
        currentGrade: currentGrade,
        maxGrade: maxGrade,
        nextGrade: nextGrade,
        tokenId: tokenId,
        tokenOwned: owned > 0,
        canUpgrade: canUpgrade,
        reason: canUpgrade ? "" : (owned <= 0 ? "TOKEN_NOT_OWNED" : "GOLD_NOT_ENOUGH"),
        goldCost: goldCost,
        goldOwned: goldOwned,
        shop: shop
      };
    }

    function computePassiveUpgrade(skillId, profile) {
      // 统一入口：所有非固定凹槽自动技能（扩展武器模块 + 战术技能 + 协议技能）
      // 都走 tacticalLoadoutConfig.getAutoSkillUpgrade（双材料：蓝模块 + 紫核心L7+）。
      var config = shared.tacticalLoadoutConfig;
      if (!config || !config.getAutoSkillUpgrade) return null;
      var levels = config.normalizeAutoWeaponLevels ? config.normalizeAutoWeaponLevels(profile.autoWeaponLevels) : (profile.autoWeaponLevels || {});
      var definition = config.ALL_AUTO_SKILLS && config.ALL_AUTO_SKILLS[skillId];
      var maxAutoLevel = Math.max(1, Number(definition && definition.maxLevel) || Number(config.AUTO_SKILL_MAX_LEVEL) || 10);
      var currentGrade = Math.max(0, Math.min(maxAutoLevel, Math.floor(Number(levels[skillId]) || 0)));
      var plan = config.getAutoSkillUpgrade(skillId, currentGrade);
      if (!plan || !plan.ok) {
        return { ok: false, reason: plan ? plan.code : "NO_PLAN", skillId: skillId, currentGrade: currentGrade, targetGrade: currentGrade + 1 };
      }
      var inv = profile.resources && profile.resources.inventory ? profile.resources.inventory : {};
      var ownedItems = Math.max(0, Math.floor(Number(inv[plan.itemId]) || 0));
      var gold = Math.max(0, Number(profile.resources && profile.resources.gold || 0));
      // 紫色自动武器核心（L7+ 额外需要）
      var secondaryNeed = Math.max(0, plan.secondaryItemCount || 0);
      var secondaryOwned = 0;
      if (secondaryNeed > 0 && plan.secondaryItemId) {
        secondaryOwned = Math.max(0, Math.floor(Number(inv[plan.secondaryItemId]) || 0));
      }
      var canUpgrade = ownedItems >= plan.itemCount && secondaryOwned >= secondaryNeed && gold >= plan.goldCost;
      var shopItem = shared.shopConfig && shared.shopConfig.getShopItem ? shared.shopConfig.getShopItem(plan.itemId) : null;
      var shop = shopItem ? {
        itemId: plan.itemId,
        purchasable: shopItem.sellable === true,
        currency: shopItem.priceCurrency,
        priceAmount: shopItem.priceAmount,
        limited: !!shopItem.limit,
        limitRemaining: computeLimitRemaining(shopItem, profile),
        qtyNeeded: Math.max(0, plan.itemCount - ownedItems)
      } : { itemId: plan.itemId, purchasable: false, currency: "", priceAmount: 0, limited: false, limitRemaining: 0, qtyNeeded: Math.max(0, plan.itemCount - ownedItems) };
      var shopSecondary = null;
      if (secondaryNeed > 0 && plan.secondaryItemId) {
        var secItem = shared.shopConfig && shared.shopConfig.getShopItem ? shared.shopConfig.getShopItem(plan.secondaryItemId) : null;
        shopSecondary = secItem ? {
          itemId: plan.secondaryItemId,
          purchasable: secItem.sellable === true,
          currency: secItem.priceCurrency,
          priceAmount: secItem.priceAmount,
          limited: !!secItem.limit,
          limitRemaining: computeLimitRemaining(secItem, profile),
          qtyNeeded: Math.max(0, secondaryNeed - secondaryOwned)
        } : { itemId: plan.secondaryItemId, purchasable: false, currency: "", priceAmount: 0, limited: false, limitRemaining: 0, qtyNeeded: Math.max(0, secondaryNeed - secondaryOwned) };
      }
      return {
        ok: canUpgrade,
        reason: canUpgrade ? "" : (
          !canUpgrade && ownedItems < plan.itemCount ? "BLUE_NOT_ENOUGH" :
          !canUpgrade && secondaryOwned < secondaryNeed ? "PURPLE_NOT_ENOUGH" :
          "GOLD_NOT_ENOUGH"
        ),
        skillId: skillId,
        currentGrade: currentGrade,
        targetGrade: plan.targetLevel,
        itemId: plan.itemId,
        itemCount: plan.itemCount,
        itemOwned: ownedItems,
        secondaryItemId: plan.secondaryItemId,
        secondaryItemCount: secondaryNeed,
        secondaryItemOwned: secondaryOwned,
        goldCost: plan.goldCost,
        goldOwned: gold,
        shop: shop,
        shopSecondary: shopSecondary
      };
    }

    function computeAllPassiveUpgrades(profile) {
      // 统一：所有非固定凹槽自动技能的升级方案（扩展武器模块 + 战术技能 + 协议技能）
      var config = shared.tacticalLoadoutConfig;
      var result = {};
      if (!config || !config.ALL_AUTO_SKILLS) return result;
      var fixedIds = config.FIXED_AUTO_WEAPONS ? Object.keys(config.FIXED_AUTO_WEAPONS).map(function(f) { return config.FIXED_AUTO_WEAPONS[f].id; }) : [];
      var keys = Object.keys(config.ALL_AUTO_SKILLS).filter(function nonFixed(id) { return fixedIds.indexOf(id) < 0; });
      for (var k = 0; k < keys.length; k++) {
        result[keys[k]] = computePassiveUpgrade(keys[k], profile);
      }
      return result;
    }

    function snapshot() {
      var profile = options.getProfile() || {};
      var loadout = shared.fighterUpgradeApi && shared.fighterUpgradeApi.generateBattleLoadout
        ? shared.fighterUpgradeApi.generateBattleLoadout(profile)
        : {};
      var pilot = loadout.pilot || options.getPilotAsset() || {};
      var ship = loadout.ship || options.getShipAsset() || {};
      var tactical = shared.tacticalLoadoutSystem;
      var shipLoadout = tactical && tactical.getLoadout
        ? tactical.getLoadout(profile, ship.id)
        : { activeSlots: [null, null, null, null], fixedWeaponOverrides: [null, null, null], autoWeaponIds: [null, null, null] };
      shipLoadout = normalizeLoadout(shipLoadout);
      var activeDefinitions = shared.shipSkills && shared.shipSkills.ACTIVE_SKILLS || {};
      shipLoadout.activeSlots = shipLoadout.activeSlots.map(function onlyCurrentActive(slot) {
        return slot && activeDefinitions[slot.skillId] ? slot : null;
      });
      var breakdown = buildBreakdown(loadout, profile);
      var combatPower = calculatePower(breakdown);
      var commanderLevel = Math.max(1, Math.floor(Number(profile.player && profile.player.level) || 1));
      var maxLevel = Math.max(1, Number(levelsConfig.FIGHTER_MAX_UPGRADE_LEVEL) || 60);
      var config = shared.tacticalLoadoutConfig || {};
      var shipRank = tactical && tactical.getShipRank ? tactical.getShipRank(profile, ship.id) : (ship.rank ? String(ship.rank).toUpperCase() : "");
      var autoSlotCount = config.getAutoWeaponSlotCount ? config.getAutoWeaponSlotCount(shipRank) : 3;
      // 自动技能等级全局共享，配装仅决定当前战机是否携带。
      var passiveGrades = {};
      var autoLevels = config.normalizeAutoWeaponLevels ? config.normalizeAutoWeaponLevels(profile.autoWeaponLevels) : (profile.autoWeaponLevels || {});
      Object.keys(config.ALL_AUTO_SKILLS || {}).forEach(function exposeLevel(id) {
        var definition = config.ALL_AUTO_SKILLS[id];
        var maxAutoLevel = Math.max(1, Number(definition && definition.maxLevel) || Number(config.AUTO_SKILL_MAX_LEVEL) || 10);
        passiveGrades[id] = Math.max(0, Math.min(maxAutoLevel, Math.floor(Number(autoLevels[id]) || 0)));
      });
      // 资源显示数据
      var inv = profile.resources && profile.resources.inventory ? profile.resources.inventory : {};
      var shopAssets = shared.assets && shared.assets.SHOP_ITEM_ASSETS ? shared.assets.SHOP_ITEM_ASSETS : {};
      var resourceDisplay = [];
      // 金币
      var goldIcon = shared.assets && shared.assets.UI_A_HUD_ASSETS && shared.assets.UI_A_HUD_ASSETS.resourceGoldIcon || "";
      resourceDisplay.push({ type: "gold", id: "gold", name: "金币", amount: getGold(profile), icon: goldIcon });
      var diamondIcon = shared.assets && shared.assets.UI_A_HUD_ASSETS && (shared.assets.UI_A_HUD_ASSETS.resourceDiamondIcon || shared.assets.UI_A_HUD_ASSETS.resourceEnergyIcon) || "";
      resourceDisplay.push({ type: "diamond", id: "diamonds", name: "钻石", amount: Math.max(0, Math.floor(Number(profile.resources && profile.resources.diamonds) || 0)), icon: diamondIcon });
      // 蓝色自动武器模块（自动技能 L1-10 升级材料）
      var blueCount = Math.max(0, Math.floor(Number(inv.auto_weapon_module_purple) || 0));
      if (blueCount > 0) {
        resourceDisplay.push({ type: "item", id: "auto_weapon_module_purple", name: "自动武器模块", amount: blueCount, icon: shopAssets.auto_weapon_module_purple || "" });
      }
      // 紫色自动武器核心（自动技能 L7-10 附加材料）
      var purpleCount = Math.max(0, Math.floor(Number(inv.auto_weapon_module_gold) || 0));
      if (purpleCount > 0) {
        resourceDisplay.push({ type: "item", id: "auto_weapon_module_gold", name: "自动武器核心", amount: purpleCount, icon: shopAssets.auto_weapon_module_gold || "" });
      }
      // 档案令（主动技能升级材料）
      var tokenIds = ["active_skill_module_c", "active_skill_module_b", "active_skill_module_a", "active_skill_module_s", "active_skill_module_ss", "active_skill_module_sss"];
      for (var ti = 0; ti < tokenIds.length; ti++) {
        var tc = Math.max(0, Math.floor(Number(inv[tokenIds[ti]]) || 0));
        if (tc > 0) {
          var tlabel = { active_skill_module_c: "C级主动模组", active_skill_module_b: "B级主动模组", active_skill_module_a: "A级主动模组", active_skill_module_s: "S级主动模组", active_skill_module_ss: "SS级主动模组", active_skill_module_sss: "SSS级主动模组" };
          resourceDisplay.push({ type: "item", id: tokenIds[ti], name: tlabel[tokenIds[ti]] || tokenIds[ti], amount: tc, icon: shopAssets[tokenIds[ti]] || "" });
        }
      }
      return {
        profile: profile,
        pilot: pilot,
        ship: ship,
        loadout: loadout,
        shipLoadout: normalizeLoadout(shipLoadout),
        gradeUpgrade: computeGradeUpgrade(ship, shipLoadout, state.selectedSlot, profile),
        breakdown: breakdown,
        combatPower: combatPower,
        gold: getGold(profile),
        levelCap: Math.min(commanderLevel, maxLevel),
        maxLevel: maxLevel,
        page: state.page,
        libraryTab: state.libraryTab,
        selectedUpgradeStat: state.selectedUpgradeStat,
        selectedSlot: { type: state.selectedSlot.type, index: state.selectedSlot.index },
        pendingAction: state.pendingAction,
        notice: state.notice,
        shipRank: shipRank,
        autoSlotCount: autoSlotCount,
        passiveGrades: passiveGrades,
        resourceDisplay: resourceDisplay,
        passiveUpgrades: computeAllPassiveUpgrades(profile),
        activeSkillGrades: Object.assign({}, profile.activeSkillGrades || {}),
        autoSkillLevels: autoLevels,
        selectedActiveSkillId: state.selectedActiveSkillId,
        selectedAutoSkillId: state.selectedAutoSkillId
      };
    }

    function buildBreakdown(loadout, profile) {
      loadout = loadout || {};
      profile = profile || {};
      var pilot = loadout.pilot || {};
      var ship = loadout.ship || {};
      var fighter = loadout.fighterUpgrades || profile.fighterUpgrades || {};
      var attackLevel = statLevel(fighter, "attack");
      var hpLevel = statLevel(fighter, "hp");
      var armorLevel = statLevel(fighter, "armorPenetration");
      return {
        attack: Math.max(0, Math.round(Number(pilot.damage) || 0)) + Math.max(0, Math.round(Number(ship.damage) || 0)) + statBonus("attack", attackLevel),
        hp: Math.max(0, Math.round(Number(pilot.hp) || 0)) + Math.max(0, Math.round(Number(ship.hp) || 0)) + statBonus("hp", hpLevel),
        armorPenetration: Math.max(0, Number(pilot.armorPenetration) || 0) + Math.max(0, Number(ship.armorPenetration) || 0) + statBonus("armorPenetration", armorLevel)
      };
    }

    function calculatePower(stats) {
      return Math.max(0, Math.round(
        (Number(stats.attack) || 0) * 10 +
        (Number(stats.hp) || 0) * 1.4 +
        (Number(stats.armorPenetration) || 0) * 1800
      ));
    }

    function statLevel(fighter, key) {
      return Math.max(1, Math.floor(Number(fighter && fighter[key]) || 1));
    }

    function statBonus(type, level) {
      var gain = levelsConfig.FIGHTER_UPGRADE_STAT_GAIN || {};
      if (type === "attack") return Math.max(0, (level - 1) * (Number(gain.attackPerLevel) || 1));
      if (type === "hp") return Math.max(0, (level - 1) * (Number(gain.hpPerLevel) || 10));
      return Math.max(0, level * (Number(gain.armorPenetrationPerLevel) || 0.001));
    }

    function getGold(profile) {
      return shared.profile && shared.profile.getGold
        ? shared.profile.getGold(profile)
        : Math.max(0, Number(profile.resources && profile.resources.gold) || 0);
    }

    function normalizeLoadout(loadout) {
      var active = Array.isArray(loadout && loadout.activeSlots) ? loadout.activeSlots.slice(0, 4) : [];
      var auto = Array.isArray(loadout && loadout.autoWeaponIds) ? loadout.autoWeaponIds.slice(0, 3) : [];
      var fixed = Array.isArray(loadout && loadout.fixedWeaponOverrides) ? loadout.fixedWeaponOverrides.slice(0, 3) : [];
      while (active.length < 4) active.push(null);
      while (auto.length < 3) auto.push(null);
      while (fixed.length < 3) fixed.push(null);
      return { activeSlots: active, fixedWeaponOverrides: fixed, autoWeaponIds: auto };
    }

    function cloneLoadout(loadout) {
      var normalized = normalizeLoadout(loadout);
      return {
        activeSlots: normalized.activeSlots.map(function (slot) {
          return slot ? { skillId: slot.skillId, autoEnabled: Boolean(slot.autoEnabled) } : null;
        }),
        fixedWeaponOverrides: normalized.fixedWeaponOverrides.map(function (id) { return id || null; }),
        autoWeaponIds: normalized.autoWeaponIds.map(function (id) { return id || null; })
      };
    }

    function localDateKey(date) {
      if (scope.worldTimeSystem && typeof scope.worldTimeSystem.dateKey === "function") return scope.worldTimeSystem.dateKey(date);
      date = date || new Date();
      return date.getFullYear() + "-" + String(date.getMonth() + 1).padStart(2, "0") + "-" + String(date.getDate()).padStart(2, "0");
    }

    function isoWeekKey(date) {
      if (scope.worldTimeSystem && typeof scope.worldTimeSystem.weekKey === "function") return scope.worldTimeSystem.weekKey(date);
      date = date || new Date();
      var d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      var day = (d.getDay() + 6) % 7;
      d.setDate(d.getDate() - day + 3);
      var firstThursday = new Date(d.getFullYear(), 0, 4);
      var firstDay = (firstThursday.getDay() + 6) % 7;
      firstThursday.setDate(4 - firstDay);
      var week = 1 + Math.round((d - firstThursday) / (7 * 24 * 3600 * 1000));
      return d.getFullYear() + "-W" + String(week).padStart(2, "0");
    }

    // 参考 ShopView 限购逻辑：用 profile 的周/日已购计数推算剩余可购数量。
    // 若 profile 无购买记录（首次/本地档），则按商品 limit 全量计剩余。
    function computeLimitRemaining(item, profile) {
      if (!item || !item.limit) return Infinity;
      profile = profile || {};
      var daily = profile.shopDailyPurchases || {};
      var weekly = profile.shopWeeklyPurchases || {};
      var dk = localDateKey();
      var wk = isoWeekKey();
      var lwk = wk.replace("-W", "-");
      var count = item.limitType === "daily"
        ? (daily[dk] || {})[item.id] || 0
        : item.limitType === "weekly"
          ? Math.max((weekly[wk] || {})[item.id] || 0, (weekly[lwk] || {})[item.id] || 0)
          : 0;
      return Math.max(0, item.limit - count);
    }

    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

    return {
      snapshot: snapshot,
      selectPage: selectPage,
      selectUpgradeStat: selectUpgradeStat,
      selectTab: selectTab,
      selectSlot: selectSlot,
      selectAutoSkill: selectAutoSkill,
      selectLibrarySkill: selectLibrarySkill,
      setPending: setPending,
      finish: finish,
      cloneLoadout: cloneLoadout,
      statBonus: statBonus
    };
  }

  scope.fighterUpgradeModel = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.fighterUpgradeModel;
})(typeof globalThis !== "undefined" ? globalThis : this);
