(function registerEventModeHubView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var modes = [];
  var activeModeId = "";
  var placeholderSlots = [
    { id: "limited-operation", label: "敬请期待", subtitle: "限时行动" },
    { id: "cooperative-operation", label: "敬请期待", subtitle: "协同作战" },
    { id: "unknown-signal", label: "敬请期待", subtitle: "未知信号" }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (ch) {
      return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch];
    });
  }

  function registerMode(descriptor) {
    descriptor = descriptor || {};
    var id = String(descriptor.id || "").trim();
    if (!id || typeof descriptor.render !== "function") return false;
    var normalized = {
      id: id,
      label: String(descriptor.label || id),
      description: String(descriptor.description || "选择玩法并开始挑战。"),
      navSubtitle: String(descriptor.navSubtitle || "进行中"),
      render: descriptor.render,
      handleEvent: typeof descriptor.handleEvent === "function" ? descriptor.handleEvent : null,
      getFrame: typeof descriptor.getFrame === "function" ? descriptor.getFrame : null
    };
    var replaced = false;
    for (var i = 0; i < modes.length; i++) {
      if (modes[i].id === id) {
        modes[i] = normalized;
        replaced = true;
        break;
      }
    }
    if (!replaced) modes.push(normalized);
    if (!activeModeId) activeModeId = id;
    return true;
  }

  function getActiveMode() {
    for (var i = 0; i < modes.length; i++) {
      if (modes[i].id === activeModeId) return modes[i];
    }
    activeModeId = modes.length ? modes[0].id : "";
    return modes[0] || null;
  }

  function renderModeButtons(active) {
    var html = '<nav class="event-hub-rail" aria-label="活动玩法">';
    for (var i = 0; i < modes.length; i++) {
      var mode = modes[i];
      var selected = mode.id === active.id;
      html += '<button type="button" class="event-hub-mode-card' + (selected ? " is-active" : "") + '" data-event-mode-option="' + escapeHtml(mode.id) + '" aria-current="' + (selected ? "page" : "false") + '">' +
        '<strong>' + escapeHtml(mode.label) + '</strong><small>' + escapeHtml(mode.navSubtitle) + '</small></button>';
    }
    for (var j = modes.length; j < 4; j++) {
      var placeholder = placeholderSlots[j - modes.length] || { id: "future-" + j, label: "敬请期待", subtitle: "未知活动" };
      html += '<button type="button" class="event-hub-mode-card is-placeholder" data-event-mode-placeholder="' + escapeHtml(placeholder.id) + '" aria-label="' + escapeHtml(placeholder.subtitle + "，暂未开放") + '">' +
        '<strong>' + escapeHtml(placeholder.label) + '</strong><small>' + escapeHtml(placeholder.subtitle) + '</small></button>';
    }
    return html + '</nav>';
  }

  function renderPanel(dom, options) {
    options = options || {};
    var active = getActiveMode();
    if (!active || !dom) return false;
    var renderOptions = Object.assign({}, options, { dom: dom, activeModeId: active.id });
    var frame = active.getFrame ? active.getFrame() : "";
    dom.featurePanelKicker.textContent = "";
    dom.featurePanelTitle.classList.remove("event-mode-title");
    dom.featurePanelTitle.textContent = "";
    dom.featurePanelBody.textContent = "";
    dom.featurePanelSlots.className = "terminal-panel-content event-panel-content feature-panel-room-content event-mode-content";
    dom.featurePanelSlots.innerHTML = '<section class="event-hub-page" data-event-mode-hub>' +
      '<img class="event-hub-frame" src="' + escapeHtml(frame) + '" alt="">' +
      '<header class="event-hub-header"><h2>活动中心</h2><small>EVENT HUB</small><button type="button" class="event-hub-back" data-feature-back aria-label="返回大厅"><span aria-hidden="true">←</span><strong>返回</strong></button></header>' +
      renderModeButtons(active) +
      '<div class="event-hub-notice" data-event-hub-notice role="status" aria-live="polite"></div>' +
      '<div class="event-hub-mode-content">' + active.render(options.profile || {}, renderOptions) + '</div>' +
    '</section>';
    return true;
  }

  function handleEvent(event, dom, options) {
    var target = event && event.target;
    var option = target && target.closest ? target.closest("[data-event-mode-option]") : null;
    if (option) {
      var nextId = option.getAttribute("data-event-mode-option") || "";
      for (var i = 0; i < modes.length; i++) {
        if (modes[i].id !== nextId) continue;
        activeModeId = nextId;
        renderPanel(dom, options || {});
        var nextButton = dom.featurePanelSlots && dom.featurePanelSlots.querySelector
          ? dom.featurePanelSlots.querySelector('[data-event-mode-option="' + nextId + '"]')
          : null;
        if (nextButton && nextButton.focus) nextButton.focus();
        return true;
      }
    }

    var placeholder = target && target.closest ? target.closest("[data-event-mode-placeholder]") : null;
    if (placeholder) {
      var notice = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector
        ? dom.featurePanelSlots.querySelector("[data-event-hub-notice]")
        : null;
      if (notice) {
        notice.textContent = "该活动尚未开放，敬请期待";
        notice.classList.remove("is-visible");
        void notice.offsetWidth;
        notice.classList.add("is-visible");
      }
      return true;
    }

    var active = getActiveMode();
    return Boolean(active && active.handleEvent && active.handleEvent(event, dom, options || {}));
  }

  function handleKeydown(event, dom) {
    if (!event || event.key !== "Escape") return false;
    var hub = dom && dom.featurePanelSlots && dom.featurePanelSlots.querySelector
      ? dom.featurePanelSlots.querySelector("[data-event-mode-hub]")
      : null;
    if (!hub) return false;
    if (dom.closeFeaturePanel && dom.closeFeaturePanel.click) dom.closeFeaturePanel.click();
    if (event.preventDefault) event.preventDefault();
    return true;
  }

  var api = {
    registerMode: registerMode,
    renderPanel: renderPanel,
    handleEvent: handleEvent,
    handleKeydown: handleKeydown,
    getActiveModeId: function getActiveModeId() { return activeModeId; },
    getModes: function getModes() { return modes.slice(); }
  };

  scope.eventModeHubView = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
