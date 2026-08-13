(function bootViewportHost(root) {
  "use strict";

  var shared = root.RXGame || {};
  var module = shared.gameViewportController;
  var viewport = root.document.querySelector("#gameViewport");
  var stage = root.document.querySelector("#gameStage");
  var frame = root.document.querySelector("#gameFrame");
  var fullscreenButton = root.document.querySelector("#fullscreenToggle");
  var fullscreenLabel = root.document.querySelector("#fullscreenLabel");
  var notice = root.document.querySelector("#viewportNotice");
  var noticeTimer = 0;

  if (!module || !module.create || !viewport || !stage || !frame || !fullscreenButton) {
    throw new Error("H5 viewport bootstrap failed.");
  }

  var controller = module.create({
    root: root,
    document: root.document,
    viewport: viewport,
    stage: stage
  });

  var frameSource = frame.getAttribute("data-src") || "game-frame.html";
  frame.addEventListener("load", function onGameFrameLoad() {
    controller.fit();
    viewport.classList.add("is-frame-ready");
  });

  function showNotice(message) {
    if (!notice) return;
    notice.textContent = message;
    notice.classList.add("is-visible");
    if (noticeTimer) root.clearTimeout(noticeTimer);
    noticeTimer = root.setTimeout(function hideNotice() {
      notice.classList.remove("is-visible");
    }, 2600);
  }

  controller.subscribe(function renderViewportState(state) {
    fullscreenButton.classList.toggle("is-unavailable", !state.canFullscreen);
    fullscreenButton.setAttribute("aria-pressed", state.isFullscreen ? "true" : "false");
    fullscreenButton.setAttribute("aria-label", state.isFullscreen ? "退出全屏" : "进入全屏");
    if (fullscreenLabel) fullscreenLabel.textContent = state.isFullscreen ? "退出" : (state.canFullscreen ? "全屏" : "全屏说明");
  });

  fullscreenButton.addEventListener("click", function onFullscreenClick() {
    var state = controller.getState();
    if (!state.canFullscreen) {
      showNotice("当前浏览器不支持网页全屏，游戏仍可正常游玩。");
      return;
    }
    controller.toggleFullscreen().catch(function onFullscreenRejected() {
      showNotice("浏览器未允许全屏，请使用浏览器菜单重试。");
    });
  });

  root.addEventListener("message", function onGameMessage(event) {
    if (event.source !== frame.contentWindow || event.origin !== root.location.origin) return;
    if (!event.data || event.data.type !== "rxgame:auth-result") return;
    showNotice(String(event.data.message || (event.data.ok ? "邮箱验证成功。" : "邮箱验证失败。")));
  });

  controller.start();
  frame.src = frameSource + (root.location.search || "") + (root.location.hash || "");
  root.rxGameViewport = controller;
})(typeof globalThis !== "undefined" ? globalThis : window);
