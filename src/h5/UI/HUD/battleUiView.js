(function registerBattleUiView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var events = scope.events;
  var textCache = typeof WeakMap !== "undefined" ? new WeakMap() : null;

  function mount(rootElement) {
    var target = rootElement || (root.document && root.document.querySelector("#battleUiRoot"));
    if (!target) return null;
    if (target.querySelector('[data-ui="canvas"]')) return createHandle(target);

    var field = scope.battleGeometry.DEFAULT_FIELD;
    var frame = root.document.createElement("div");
    frame.className = "battle-ui-frame";
    frame.innerHTML =
      '<header class="battle-rail battle-top-rail" aria-label="战斗状态">' +
        '<div class="battle-stat battle-stat-level"><span>关卡</span><strong data-ui="level">1-1</strong></div>' +
        '<div class="battle-stat battle-stat-time"><span>时间</span><strong data-ui="time">0</strong></div>' +
        '<div class="battle-stat battle-stat-health"><span>生命</span><strong data-ui="healthText">0/0</strong><progress data-ui="health" max="1" value="0"></progress></div>' +
        '<div class="battle-stat battle-stat-boss"><span>BOSS</span><strong data-ui="bossText">BOSS 未接敌</strong><progress data-ui="boss" max="1" value="0"></progress></div>' +
        '<div class="battle-stat battle-stat-kills"><span>击落</span><strong data-ui="kills">0</strong></div>' +
        '<button class="battle-pause-button" type="button" data-battle-action="pause">暂停</button>' +
      '</header>' +
      '<div class="battle-field" data-ui="field"><canvas data-ui="canvas" aria-label="战斗区域"></canvas></div>' +
      '<footer class="battle-rail battle-bottom-rail" aria-label="战斗技能">' +
        '<section class="battle-skill-group battle-active-group" aria-label="主动技能">' +
          '<strong class="battle-group-title">主动技能</strong>' +
          '<div class="battle-slot-row" data-ui="activeSlots"></div>' +
        '</section>' +
        '<section class="battle-decisive-command-group" aria-label="决胜指令">' +
          '<strong class="battle-group-title">决胜指令</strong>' +
          '<button class="battle-decisive-command-button" type="button" data-battle-action="decisive-command" disabled>' +
            '<span class="battle-slot-icon" data-ui="decisiveCommandIcon">令</span>' +
            '<span data-ui="decisiveCommandCharges">0/0</span>' +
            '<small data-ui="decisiveCommandCooldown">SPACE</small>' +
          '</button>' +
        '</section>' +
        '<section class="battle-skill-group battle-in-battle-group" aria-label="武器模块">' +
          '<strong class="battle-group-title">武器模块</strong>' +
          '<div class="battle-slot-row" data-ui="inBattleSkills"></div>' +
        '</section>' +
      '</footer>';
    target.appendChild(frame);

    var canvas = frame.querySelector('[data-ui="canvas"]');
    // 逻辑战场仍保持 960×473，画布用 1.5x 像素缓冲：在被大厅宿主放大后依旧清晰，
    // 同时把后台缓冲像素量降到 2x 的 ~56%，显著缓解战斗卡顿。
    var renderScale = 1.5;
    canvas.width = field.width * renderScale;
    canvas.height = field.height * renderScale;
    canvas.dataset.logicalWidth = String(field.width);
    canvas.dataset.logicalHeight = String(field.height);
    canvas.tabIndex = 0;
    createActiveSlots(frame.querySelector('[data-ui="activeSlots"]'));
    createInBattleSkillSlots(frame.querySelector('[data-ui="inBattleSkills"]'));
    if (scope.battlePauseView && scope.battlePauseView.mount) scope.battlePauseView.mount(target);
    return createHandle(target);
  }

  function createActiveSlots(container) {
    for (var i = 0; i < 4; i += 1) {
      var button = root.document.createElement("button");
      button.type = "button";
      button.className = "battle-skill-slot battle-active-slot is-empty";
      button.dataset.battleAction = "active-auto-toggle";
      button.dataset.slotIndex = String(i);
      button.dataset.auto = "off";
      button.dataset.status = "empty";
      button.disabled = true;
      button.innerHTML =
        '<span class="battle-slot-icon">+</span>' +
        '<span class="battle-slot-mode">未配置</span>' +
        '<span class="battle-slot-timer" aria-live="polite"></span>' +
        '<kbd>' + (i + 1) + '</kbd>';
      container.appendChild(button);
    }
  }

  function createInBattleSkillSlots(container) {
    for (var i = 0; i < 6; i += 1) {
      var slot = root.document.createElement("span");
      slot.className = "battle-skill-slot battle-in-battle-slot is-empty";
      slot.dataset.inBattleIndex = String(i);
      slot.innerHTML = '<span class="battle-slot-icon">+</span><small class="battle-slot-level"></small><em class="battle-slot-status"></em>';
      container.appendChild(slot);
    }
  }

  function createHandle(target) {
    var pause = scope.battlePauseView && scope.battlePauseView.mount ? scope.battlePauseView.mount(target) : null;
    var refs = {
      root: target,
      canvas: target.querySelector('[data-ui="canvas"]'),
      level: target.querySelector('[data-ui="level"]'),
      time: target.querySelector('[data-ui="time"]'),
      healthText: target.querySelector('[data-ui="healthText"]'),
      health: target.querySelector('[data-ui="health"]'),
      bossText: target.querySelector('[data-ui="bossText"]'),
      boss: target.querySelector('[data-ui="boss"]'),
      kills: target.querySelector('[data-ui="kills"]'),
      pauseButton: target.querySelector('[data-battle-action="pause"]'),
      activeSlots: Array.prototype.slice.call(target.querySelectorAll('[data-battle-action="active-auto-toggle"]')),
      decisiveCommandButton: target.querySelector('[data-battle-action="decisive-command"]'),
      decisiveCommandIcon: target.querySelector('[data-ui="decisiveCommandIcon"]'),
      decisiveCommandCharges: target.querySelector('[data-ui="decisiveCommandCharges"]'),
      decisiveCommandCooldown: target.querySelector('[data-ui="decisiveCommandCooldown"]'),
      inBattleSkills: Array.prototype.slice.call(target.querySelectorAll("[data-in-battle-index]"))
    };
    return {
      root: target,
      canvas: refs.canvas,
      elements: refs,
      render: function render(model) { renderModel(refs, pause, model || {}); }
    };
  }

  function renderModel(refs, pause, model) {
    setText(refs.level, model.level || "-");
    setText(refs.time, model.time || "0");
    setText(refs.healthText, model.healthText || "0/0");
    setProgress(refs.health, model.healthRatio);
    setText(refs.bossText, model.bossText || "BOSS 未接敌");
    setProgress(refs.boss, model.bossRatio);
    refs.boss.closest(".battle-stat-boss").classList.toggle("is-active", Boolean(model.bossActive));
    setText(refs.kills, model.kills || "0");
    setText(refs.pauseButton, model.paused ? "继续" : "暂停");

    var activeSlots = Array.isArray(model.activeSlots) ? model.activeSlots : [];
    for (var i = 0; i < refs.activeSlots.length; i += 1) renderActiveSlot(refs.activeSlots[i], activeSlots[i], i);
    renderDecisiveCommand(refs, model.decisiveCommand);
    var inBattleSkills = Array.isArray(model.weaponModules) ? model.weaponModules : Array.isArray(model.inBattleSkills) ? model.inBattleSkills : [];
    for (var j = 0; j < refs.inBattleSkills.length; j += 1) renderInBattleSkill(refs.inBattleSkills[j], inBattleSkills[j], j);
    if (pause) pause.render({ visible: Boolean(model.paused) });
  }

  function renderActiveSlot(node, slot, index) {
    var configured = Boolean(slot && slot.id);
    var status = configured ? slot.status || "ready" : "empty";
    node.disabled = !configured;
    node.dataset.auto = configured && slot.autoEnabled ? "on" : "off";
    node.dataset.status = status;
    node.classList.toggle("is-empty", !configured);
    node.classList.toggle("is-ready", configured && status === "ready");
    node.title = configured
      ? (slot.name || ("主动技能 " + (index + 1))) + "｜点击切换自动，按 " + (index + 1) + " 手动释放"
      : "未配置主动技能";
    setText(node.querySelector(".battle-slot-icon"), configured ? iconText(slot) : "+");
    setText(node.querySelector(".battle-slot-mode"), configured ? (slot.autoEnabled ? "自动" : "手动") : "未配置");
    setText(node.querySelector(".battle-slot-timer"), getActiveStatusText(slot, status));
  }

  function getActiveStatusText(slot, status) {
    if (!slot) return "";
    var chargeText = slot.charges == null ? "" : " · " + slot.charges + "/" + slot.maxCharges;
    if (status === "active") return "释放中 " + formatSeconds(slot.activeRemaining);
    if (status === "charging") return "充能 " + formatSeconds(slot.rechargeRemaining) + chargeText;
    if (status === "cooldown") return "冷却 " + formatSeconds(slot.cooldownRemaining) + chargeText;
    return "就绪" + chargeText;
  }

  function renderDecisiveCommand(refs, command) {
    var configured = Boolean(command && command.id);
    refs.decisiveCommandButton.disabled = !configured || !command.ready;
    refs.decisiveCommandButton.classList.toggle("is-ready", configured && command.ready);
    refs.decisiveCommandButton.title = configured ? command.name || "决胜指令" : "未配置决胜指令";
    setText(refs.decisiveCommandIcon, configured ? iconText(command) : "令");
    setText(refs.decisiveCommandCharges, configured ? command.charges + "/" + command.maxCharges : "0/0");
    setText(refs.decisiveCommandCooldown, configured && !command.ready ? "SPACE · " + command.remaining + "s" : "SPACE");
  }

  function renderInBattleSkill(node, skill, index) {
    var configured = Boolean(skill && skill.id && skill.level > 0);
    node.classList.toggle("is-empty", !configured);
    node.classList.toggle("is-active", configured);
    node.classList.toggle("is-extension", configured && skill.source === "meta");
    node.dataset.status = configured ? skill.status || "auto" : "empty";
    node.title = configured ? skill.name + " Lv." + skill.level + "｜" + getWeaponStatusText(skill) : (index >= 3 ? "未配置扩展武器" : "空武器槽");
    setText(node.querySelector(".battle-slot-icon"), configured ? iconText(skill) : "+");
    setText(node.querySelector(".battle-slot-level"), configured ? "Lv." + skill.level : "");
    setText(node.querySelector(".battle-slot-status"), configured ? getWeaponStatusText(skill) : (index >= 3 ? "EMPTY" : ""));
  }

  function getWeaponStatusText(skill) {
    if (!skill) return "";
    return "AUTO";
  }

  function iconText(item) {
    return String(item.iconText || item.name || item.id || "+").charAt(0);
  }

  function formatSeconds(value) {
    return Math.max(0, Number(value) || 0).toFixed(1) + "s";
  }

  function setText(node, value) {
    if (!node) return;
    var next = String(value == null ? "" : value);
    if (textCache && textCache.get(node) === next) return;
    if (!textCache && node.textContent === next) return;
    node.textContent = next;
    if (textCache) textCache.set(node, next);
  }

  function setProgress(node, value) {
    if (!node) return;
    var next = Math.max(0, Math.min(1, Number(value) || 0));
    if (Number(node.value) !== next) node.value = next;
  }

  var api = { mount: mount };
  scope.battleUiView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;

  // ── Room boundary (Rule ③): UI reacts to enemy death via the bus.
  // Combat never touches this DOM counter — the pulse is driven purely by the
  // "enemy:died" broadcast, proving the view is decoupled from combat (Rule ②).
  if (scope.bus && typeof scope.bus.on === "function" && !scope.__battleUiKillPulse__) {
    scope.__battleUiKillPulse__ = true;
    scope.bus.on(events.ENEMY_DIED, function onEnemyDiedPulse() {
      var el = root.document && root.document.querySelector('[data-ui="kills"]');
      if (!el) return;
      el.classList.remove("kills-pulse");
      void el.offsetWidth; // force reflow so the animation restarts each kill
      el.classList.add("kills-pulse");
    });

    scope.bus.on(events.PLAYER_DAMAGED, function onPlayerDamagedPulse() {
      var hpBar = root.document && root.document.querySelector('[data-ui="hp-fill"]');
      if (!hpBar) return;
      hpBar.classList.remove("hp-pulse");
      void hpBar.offsetWidth;
      hpBar.classList.add("hp-pulse");
    });

    scope.bus.on(events.BOSS_SPAWNED, function onBossSpawnedPulse() {
      var bossBar = root.document && root.document.querySelector('[data-ui="boss-hp"]');
      if (!bossBar) return;
      bossBar.classList.remove("boss-intro");
      void bossBar.offsetWidth;
      bossBar.classList.add("boss-intro");
    });

    scope.bus.on(events.ITEM_COLLECTED, function onItemCollectedPulse(payload) {
      var slotEl = root.document && root.document.querySelector(
        '[data-ui="weapon-slot-' + (payload && payload.type || "spread") + '"]'
      );
      if (!slotEl) return;
      slotEl.classList.remove("weapon-flash");
      void slotEl.offsetWidth;
      slotEl.classList.add("weapon-flash");
    });

    scope.bus.on(events.PLAYER_DIED, function onPlayerDiedPulse() {
      var screen = root.document && root.document.querySelector(".battle-screen");
      if (screen) { screen.classList.add("player-died-flash"); }
    });

    scope.bus.on(events.LEVEL_CLEARED, function onLevelClearedPulse() {
      var screen = root.document && root.document.querySelector(".battle-screen");
      if (screen) { screen.classList.add("level-cleared-flash"); }
    });

    scope.bus.on(events.COMBAT_STARTED, function onCombatStartedPulse() {
      var screen = root.document && root.document.querySelector(".battle-screen");
      if (screen) { screen.classList.add("combat-start-flash"); }
    });

    scope.bus.on(events.GOLD_CHANGED, function onGoldChangedPulse() {
      var goldEl = root.document && root.document.querySelector("#goldValue");
      if (!goldEl) return;
      goldEl.classList.remove("gold-pulse");
      void goldEl.offsetWidth;
      goldEl.classList.add("gold-pulse");
    });
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
