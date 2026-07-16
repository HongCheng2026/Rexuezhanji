(function registerBattleUiController(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var view = options.view;
    var lastRenderAt = -Infinity;
    var interval = Math.max(50, Number(options.renderInterval) || 100);

    function render(force) {
      if (!view || !view.render) return false;
      var now = currentTime();
      if (!force && now - lastRenderAt < interval) return false;
      lastRenderAt = now;
      view.render(createModel({
        state: options.getState ? options.getState() : null,
        loadout: options.getLoadout ? options.getLoadout() : null
      }));
      return true;
    }

    return {
      render: render,
      forceRender: function forceRender() { return render(true); },
      reset: function reset() { lastRenderAt = -Infinity; }
    };
  }

  function createModel(input) {
    input = input || {};
    var state = input.state || {};
    var loadout = input.loadout || {};
    var player = state.player || {};
    var level = state.level || {};
    var abilities = player.abilities || {};
    var configuredAbilities = loadout.abilities || {};
    var hp = player.hp == null ? 0 : Math.max(0, Number(player.hp) || 0);
    var maxHp = Math.max(1, Number(player.maxHp) || hp || 1);
    var bossRatio = state.boss ? Math.max(0, Math.min(1, Number(state.boss.hp) / Math.max(1, Number(state.boss.maxHp) || 1))) : 0;
    var decisiveCommandRuntime = abilities.decisiveCommand || null;
    var decisiveCommandConfig = configuredAbilities.decisiveCommand || null;
    var weaponModules = createWeaponSkillModels(state, player);
    return {
      level: state.battleMode === "endless" ? "无尽 #" + Math.max(1, Number(state.endless && state.endless.round) || 1) : level.code || String(level.id || "-"),
      time: getTimeText(state),
      healthText: Math.ceil(hp) + "/" + Math.ceil(maxHp),
      healthRatio: hp / maxHp,
      bossText: state.boss ? (state.battleMode === "endless" ? "第 " + state.boss.endlessRound + " 只 " : "BOSS ") + Math.ceil(bossRatio * 100) + "%" : state.bossSpawned ? "BOSS 接近" : "BOSS 未接敌",
      bossRatio: bossRatio,
      bossActive: Boolean(state.boss),
      kills: String(state.battleMode === "endless" ? state.endless && state.endless.kills || 0 : state.killStats && state.killStats.total || 0),
      paused: state.mode === "paused",
      activeSlots: createActiveSlotModels(abilities.activeSlots, configuredAbilities.activeSlots),
      decisiveCommand: createDecisiveCommandModel(decisiveCommandRuntime, decisiveCommandConfig),
      weaponModules: weaponModules,
      inBattleSkills: weaponModules
    };
  }

  function getTimeText(state) {
    var levels = scope.levels || {};
    if (state.battleMode === "endless") return Math.max(0, Math.floor(Number(state.elapsed) || 0)) + "s";
    if (state.mode === "fight" || state.mode === "paused") {
      if (state.boss) return "接敌";
      return String(Math.max(0, Math.ceil((levels.BOSS_SPAWN_TIME || 60) - (Number(state.elapsed) || 0))));
    }
    return String(levels.LEVEL_DURATION || 90);
  }

  function createActiveSlotModels(runtimeSlots, configuredSlots) {
    var runtime = Array.isArray(runtimeSlots) ? runtimeSlots : [];
    var configured = Array.isArray(configuredSlots) ? configuredSlots : [];
    var result = [];
    for (var i = 0; i < 4; i += 1) {
      var config = configured[i];
      var current = runtime[i];
      result.push(config && current ? {
        id: config.id,
        name: config.name || current.name,
        icon: config.icon || current.icon,
        iconText: config.iconText || "",
        autoEnabled: Boolean(current.autoEnabled),
        status: getActiveSlotStatus(current),
        activeRemaining: Math.max(0, Number(current.activeRemaining) || 0),
        cooldownRemaining: Math.max(0, Number(current.cooldownTimer) || 0),
        ready: (Number(current.cooldownTimer) || 0) <= 0
          && (Number(current.activeRemaining) || 0) <= 0
          && (current.charges == null || current.charges > 0)
      } : null);
    }
    return result;
  }

  function getActiveSlotStatus(runtime) {
    if ((Number(runtime.activeRemaining) || 0) > 0) return "active";
    if ((Number(runtime.cooldownTimer) || 0) > 0) return "cooldown";
    return "ready";
  }

  function createDecisiveCommandModel(runtime, config) {
    if (!runtime || !config) return null;
    return {
      id: config.id || runtime.id,
      name: config.name || runtime.name,
      icon: config.icon || runtime.icon,
      iconText: config.iconText || "令",
      charges: Math.max(0, Math.floor(Number(runtime.charges) || 0)),
      maxCharges: Math.max(1, Math.floor(Number(runtime.maxCharges) || 1)),
      remaining: Math.max(0, Math.ceil(Number(runtime.rechargeTimer) || 0)),
      ready: Number(runtime.charges) > 0
    };
  }

  function createWeaponSkillModels(state, player) {
    var current = player.weapons || {};
    var skills = player.weaponSkills || {};
    var fixed = Array.isArray(skills.fixed) ? skills.fixed : [];
    var extensions = Array.isArray(skills.extensions) ? skills.extensions : [];
    var fixedFallbacks = [
      { id: "weapon_fixed_01", weaponType: "laser", name: "脉冲光束", iconText: "光" },
      { id: "weapon_fixed_02", weaponType: "spread", name: "星芒散射", iconText: "散" },
      { id: "weapon_fixed_03", weaponType: "missile", name: "猎杀追踪", iconText: "猎" }
    ];
    var result = fixedFallbacks.map(function createFixedModel(fallback, index) {
      var runtime = fixed[index] || fallback;
      var type = runtime.weaponType || fallback.weaponType;
      return {
        id: runtime.id || fallback.id,
        name: runtime.name || fallback.name,
        iconText: fallback.iconText,
        source: "battle",
        level: Math.max(0, Math.floor(Number(current[type]) || Number(runtime.level) || 0)),
        status: "auto"
      };
    });
    for (var i = 0; i < 3; i += 1) {
      var extension = extensions[i];
      if (!extension) {
        result.push(null);
        continue;
      }
      var remaining = Math.max(0, Number(extension.nextFireAt) - Math.max(0, Number(state.elapsed) || 0));
      result.push({
        id: extension.id,
        name: extension.name,
        iconText: extension.category === "sidewing" ? "翼" : extension.category === "orbital" ? "轨" : "蜂",
        source: "meta",
        level: Math.max(1, Math.floor(Number(extension.level) || 1)),
        status: extension.waitingForTarget ? "waiting-target" : remaining > 0 ? "cooldown" : "ready",
        cooldownRemaining: remaining
      });
    }
    return result;
  }

  function currentTime() {
    return root.performance && root.performance.now ? root.performance.now() : Date.now();
  }

  var api = { create: create, createModel: createModel, createWeaponSkillModels: createWeaponSkillModels };
  scope.battleUiController = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
