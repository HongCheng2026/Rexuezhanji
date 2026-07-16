(function registerSweepDialogView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function openSelection(container, model, callbacks) {
    model = model || {};
    callbacks = callbacks || {};
    var modal = createModal(container, "selection", model.assets);
    if (!modal) return null;

    var maxCount = Math.max(0, Math.floor(Number(model.maxCount) || 0));
    var costPerRun = Math.max(1, Math.floor(Number(model.costPerRun) || 1));
    var count = maxCount > 0 ? 1 : 0;
    var panel = modal.querySelector(".campaign-sweep-panel");

    panel.innerHTML =
      '<header class="campaign-sweep-heading">' +
        '<img data-sweep-crest alt="">' +
        '<div><span>RAPID OPERATION</span><h2>作战扫荡</h2><p data-sweep-stage></p></div>' +
        '<button type="button" class="campaign-sweep-close" data-sweep-close aria-label="关闭扫荡选择">×</button>' +
      '</header>' +
      '<section class="campaign-sweep-energy" aria-label="体力信息">' +
        '<span class="campaign-sweep-energy-icon" aria-hidden="true">体</span>' +
        '<div><small>当前体力</small><strong data-sweep-energy></strong></div>' +
        '<i></i>' +
        '<div><small>单次消耗</small><strong data-sweep-cost></strong></div>' +
        '<i></i>' +
        '<div><small>最多次数</small><strong data-sweep-limit></strong></div>' +
      '</section>' +
      '<section class="campaign-sweep-count" aria-label="选择扫荡次数">' +
        '<span>扫荡次数</span>' +
        '<div class="campaign-sweep-stepper">' +
          '<button type="button" data-sweep-minus aria-label="减少一次">−</button>' +
          '<input type="number" inputmode="numeric" aria-label="扫荡次数" data-sweep-input>' +
          '<button type="button" data-sweep-plus aria-label="增加一次">＋</button>' +
        '</div>' +
        '<button type="button" class="campaign-sweep-max" data-sweep-max>一键最大</button>' +
      '</section>' +
      '<section class="campaign-sweep-preview" aria-label="预计获得">' +
        rewardCard("gold", "预计金币") + rewardCard("exp", "预计经验") +
        '<article class="campaign-sweep-preview-card energy"><span aria-hidden="true">体</span><small>消耗体力</small><strong data-sweep-total-energy></strong></article>' +
      '</section>' +
      '<p class="campaign-sweep-error" data-sweep-error role="status"></p>' +
      '<footer class="campaign-sweep-actions">' +
        '<button type="button" class="campaign-sweep-action secondary" data-sweep-cancel>取消</button>' +
        '<button type="button" class="campaign-sweep-action primary" data-sweep-confirm>开始扫荡</button>' +
      '</footer>';

    setImage(panel.querySelector("[data-sweep-crest]"), model.assets && model.assets.chapter && model.assets.chapter.crest);
    setText(panel, "[data-sweep-stage]", String(model.levelCode || "") + " · " + String(model.levelName || ""));
    setText(panel, "[data-sweep-energy]", formatNumber(model.currentEnergy) + " / " + formatNumber(model.maxEnergy));
    setText(panel, "[data-sweep-cost]", costPerRun + " 点");
    setText(panel, "[data-sweep-limit]", maxCount + " 次");
    setRewardIcon(panel, "gold", model.assets);
    setRewardIcon(panel, "exp", model.assets);

    var input = panel.querySelector("[data-sweep-input]");
    var minus = panel.querySelector("[data-sweep-minus]");
    var plus = panel.querySelector("[data-sweep-plus]");
    var maxButton = panel.querySelector("[data-sweep-max]");
    var confirm = panel.querySelector("[data-sweep-confirm]");
    var errorNode = panel.querySelector("[data-sweep-error]");
    input.min = maxCount > 0 ? "1" : "0";
    input.max = String(maxCount);

    function update(nextCount) {
      count = maxCount > 0 ? clamp(Math.floor(Number(nextCount) || 1), 1, maxCount) : 0;
      input.value = String(count);
      minus.disabled = count <= 1;
      plus.disabled = count >= maxCount;
      maxButton.disabled = maxCount <= 0 || count >= maxCount;
      confirm.disabled = maxCount <= 0;
      setText(panel, '[data-sweep-reward="gold"] strong', "+" + formatNumber((Number(model.singleGold) || 0) * count));
      setText(panel, '[data-sweep-reward="exp"] strong', "+" + formatNumber((Number(model.singleExperience) || 0) * count));
      setText(panel, "[data-sweep-total-energy]", "-" + formatNumber(costPerRun * count));
      errorNode.textContent = maxCount <= 0 ? "当前体力不足，无法进行扫荡。" : "";
    }

    function setPending(pending) {
      modal.dataset.pending = pending ? "true" : "false";
      confirm.disabled = Boolean(pending) || maxCount <= 0;
      minus.disabled = Boolean(pending) || count <= 1;
      plus.disabled = Boolean(pending) || count >= maxCount;
      maxButton.disabled = Boolean(pending) || maxCount <= 0 || count >= maxCount;
      input.disabled = Boolean(pending);
      confirm.textContent = pending ? "扫荡执行中…" : "开始扫荡";
    }

    function setError(message) {
      errorNode.textContent = String(message || "扫荡失败，请稍后重试。");
      setPending(false);
    }

    minus.addEventListener("click", function () { update(count - 1); });
    plus.addEventListener("click", function () { update(count + 1); });
    maxButton.addEventListener("click", function () { update(maxCount); });
    input.addEventListener("change", function () { update(input.value); });
    confirm.addEventListener("click", function () {
      if (maxCount <= 0 || modal.dataset.pending === "true") return;
      setPending(true);
      if (callbacks.onConfirm) callbacks.onConfirm(count, { setPending: setPending, setError: setError, close: function () { close(container); } });
    });
    bindClose(modal, callbacks.onCancel);
    update(count);
    confirm.focus();
    return { setPending: setPending, setError: setError, close: function () { close(container); } };
  }

  function showSettlement(container, model, callbacks) {
    model = model || {};
    callbacks = callbacks || {};
    var modal = createModal(container, "settlement", model.assets);
    if (!modal) return null;
    var panel = modal.querySelector(".campaign-sweep-panel");
    var energyGained = Math.max(0, Math.floor(Number(model.energyGained) || 0));

    panel.innerHTML =
      '<header class="campaign-sweep-heading settlement">' +
        '<img data-sweep-crest alt="">' +
        '<div><span>OPERATION COMPLETE</span><h2>扫荡结算</h2><p data-sweep-stage></p></div>' +
        '<button type="button" class="campaign-sweep-close" data-sweep-close aria-label="关闭扫荡结算">×</button>' +
      '</header>' +
      '<section class="campaign-sweep-result-banner"><span>任务完成</span><strong data-sweep-count></strong><p>航线资源已全部回收</p></section>' +
      '<section class="campaign-sweep-result-grid" aria-label="扫荡获得资源">' +
        resultCard("energy", "消耗体力", "−" + formatNumber(model.energySpent)) +
        resultCard("gold", "获得金币", "+" + formatNumber(model.gold)) +
        resultCard("exp", "获得经验", "+" + formatNumber(model.experience)) +
      '</section>' +
      '<section class="campaign-sweep-result-summary">' +
        '<span>剩余体力 <strong data-sweep-remaining></strong></span>' +
        (energyGained > 0 ? '<span class="bonus">升级返还体力 <strong>+' + energyGained + '</strong></span>' : "") +
      '</section>' +
      '<footer class="campaign-sweep-actions">' +
        '<button type="button" class="campaign-sweep-action secondary" data-sweep-done>返回关卡</button>' +
        '<button type="button" class="campaign-sweep-action primary" data-sweep-again>再次扫荡</button>' +
      '</footer>';

    setImage(panel.querySelector("[data-sweep-crest]"), model.assets && model.assets.chapter && model.assets.chapter.crest);
    setText(panel, "[data-sweep-stage]", String(model.levelCode || "") + " · 扫荡报告");
    setText(panel, "[data-sweep-count]", "完成 " + Math.max(1, Math.floor(Number(model.count) || 1)) + " 次扫荡");
    setText(panel, "[data-sweep-remaining]", formatNumber(model.remainingEnergy) + " / " + formatNumber(model.maxEnergy));
    setResultIcon(panel, "gold", model.assets);
    setResultIcon(panel, "exp", model.assets);

    panel.querySelector("[data-sweep-done]").addEventListener("click", function () {
      close(container);
      if (callbacks.onClose) callbacks.onClose();
    });
    panel.querySelector("[data-sweep-again]").addEventListener("click", function () {
      close(container);
      if (callbacks.onAgain) callbacks.onAgain();
    });
    bindClose(modal, callbacks.onClose);
    panel.querySelector("[data-sweep-done]").focus();
    return { close: function () { close(container); } };
  }

  function showUnavailable(container, model, callbacks) {
    model = model || {};
    callbacks = callbacks || {};
    var modal = createModal(container, "unavailable", model.assets);
    if (!modal) return null;
    var panel = modal.querySelector(".campaign-sweep-panel");
    panel.innerHTML =
      '<header class="campaign-sweep-heading">' +
        '<img data-sweep-crest alt="">' +
        '<div><span>ACCESS RESTRICTED</span><h2>扫荡未解锁</h2><p data-sweep-stage></p></div>' +
        '<button type="button" class="campaign-sweep-close" data-sweep-close aria-label="关闭提示">×</button>' +
      '</header>' +
      '<section class="campaign-sweep-lock-message">' +
        '<span aria-hidden="true">★</span>' +
        '<strong data-sweep-lock-title></strong>' +
        '<p data-sweep-lock-message></p>' +
      '</section>' +
      '<footer class="campaign-sweep-actions single">' +
        '<button type="button" class="campaign-sweep-action primary" data-sweep-done>返回关卡</button>' +
      '</footer>';
    setImage(panel.querySelector("[data-sweep-crest]"), model.assets && model.assets.chapter && model.assets.chapter.crest);
    setText(panel, "[data-sweep-stage]", String(model.levelCode || "") + " · 扫荡权限");
    setText(panel, "[data-sweep-lock-title]", model.title || "需要三星通关");
    setText(panel, "[data-sweep-lock-message]", model.message || "将本关荣誉评价提升到三星后，即可使用扫荡功能。");
    panel.querySelector("[data-sweep-done]").addEventListener("click", function () {
      close(container);
      if (callbacks.onClose) callbacks.onClose();
    });
    bindClose(modal, callbacks.onClose);
    panel.querySelector("[data-sweep-done]").focus();
    return { close: function () { close(container); } };
  }

  function createModal(container, mode, assets) {
    if (!container) return null;
    close(container);
    var host = container.querySelector(".campaign-map-canvas") || container;
    var modal = document.createElement("section");
    modal.className = "campaign-sweep-modal is-" + mode;
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-label", mode === "selection"
      ? "扫荡次数选择"
      : mode === "settlement" ? "扫荡结算" : "扫荡权限提示");
    modal.style.setProperty("--sweep-button-primary", cssUrl(assets && assets.chapter && assets.chapter.buttons && assets.chapter.buttons.primary));
    modal.style.setProperty("--sweep-button-secondary", cssUrl(assets && assets.chapter && assets.chapter.buttons && assets.chapter.buttons.secondary));
    modal.innerHTML = '<div class="campaign-sweep-backdrop"></div><div class="campaign-sweep-panel" tabindex="-1"></div>';
    host.appendChild(modal);
    return modal;
  }

  function bindClose(modal, onClose) {
    var container = modal.parentNode && modal.parentNode.parentNode || modal.parentNode;
    var closeButton = modal.querySelector("[data-sweep-close]");
    function finish() {
      if (modal.dataset.pending === "true") return;
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      if (onClose) onClose();
    }
    if (closeButton) closeButton.addEventListener("click", finish);
    var backdrop = modal.querySelector(".campaign-sweep-backdrop");
    if (backdrop) backdrop.addEventListener("click", finish);
    modal.addEventListener("keydown", function (event) {
      if (event.key === "Escape") finish();
    });
    return container;
  }

  function close(container) {
    if (!container || !container.querySelector) return;
    var modal = container.querySelector(".campaign-sweep-modal");
    if (modal && modal.parentNode) modal.parentNode.removeChild(modal);
  }

  function rewardCard(type, label) {
    return '<article class="campaign-sweep-preview-card" data-sweep-reward="' + type + '"><img alt=""><small>' + label + '</small><strong>+0</strong></article>';
  }

  function resultCard(type, label, value) {
    return '<article class="campaign-sweep-result-card ' + type + '" data-sweep-result="' + type + '">' +
      (type === "energy" ? '<span aria-hidden="true">体</span>' : '<img alt="">') +
      '<small>' + label + '</small><strong>' + value + '</strong></article>';
  }

  function setRewardIcon(panel, type, assets) {
    var image = panel.querySelector('[data-sweep-reward="' + type + '"] img');
    setImage(image, assets && assets.settlement && assets.settlement[type]);
  }

  function setResultIcon(panel, type, assets) {
    var image = panel.querySelector('[data-sweep-result="' + type + '"] img');
    setImage(image, assets && assets.settlement && assets.settlement[type]);
  }

  function setImage(image, src) {
    if (!image) return;
    image.src = src || "";
    image.setAttribute("aria-hidden", "true");
  }

  function setText(rootNode, selector, value) {
    var node = rootNode.querySelector(selector);
    if (node) node.textContent = String(value == null ? "" : value);
  }

  function cssUrl(src) {
    if (!src) return "none";
    var resolved = String(src);
    try { resolved = new URL(resolved, document.baseURI).href; } catch (error) { resolved = String(src); }
    return 'url("' + resolved.replace(/"/g, "%22") + '")';
  }

  function formatNumber(value) {
    return Math.max(0, Math.floor(Number(value) || 0)).toLocaleString("zh-CN");
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  var api = { openSelection: openSelection, showSettlement: showSettlement, showUnavailable: showUnavailable, close: close };
  scope.sweepDialogView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
