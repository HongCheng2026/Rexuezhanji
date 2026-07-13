(function registerCampaignStoryPlayerView(root) {
  var scope = root.RXGame || (root.RXGame = {});
  var assets = scope.assets || {};
  var playerState = null;

  function openStoryScene(scene, options) {
    options = options || {};
    if (!scene || !Array.isArray(scene.lines) || !scene.lines.length) {
      if (options.onFinish) options.onFinish({ scene: scene, skipped: false });
      return null;
    }
    closeStoryScene(false);
    playerState = {
      scene: scene,
      options: options,
      index: 0,
      auto: false,
      timer: null,
      root: ensureRoot()
    };
    render();
    playerState.root.classList.remove("hidden");
    return playerState;
  }

  function closeStoryScene(emitFinish, skipped) {
    if (!playerState) return;
    stopAuto();
    var state = playerState;
    if (state.root) state.root.classList.add("hidden");
    playerState = null;
    if (emitFinish && state.options && state.options.onFinish) {
      state.options.onFinish({ scene: state.scene, skipped: Boolean(skipped) });
    }
  }

  function ensureRoot() {
    var rootEl = document.querySelector("#campaignStoryPlayer");
    if (rootEl) return rootEl;
    rootEl = document.createElement("section");
    rootEl.id = "campaignStoryPlayer";
    rootEl.className = "campaign-story-player hidden";
    rootEl.setAttribute("aria-label", "主线剧情");
    rootEl.innerHTML =
      '<div class="campaign-story-bg" aria-hidden="true"></div>' +
      '<div class="campaign-story-scrim" aria-hidden="true"></div>' +
      '<section class="campaign-story-stage">' +
        '<figure class="campaign-story-portrait left"><img alt=""></figure>' +
        '<figure class="campaign-story-portrait right"><img alt=""></figure>' +
      '</section>' +
      '<section class="campaign-story-dialog">' +
        '<div class="campaign-story-head">' +
          '<span class="campaign-story-kicker">CAMPAIGN STORY</span>' +
          '<strong class="campaign-story-title"></strong>' +
        '</div>' +
        '<button type="button" class="campaign-story-text"></button>' +
        '<div class="campaign-story-footer">' +
          '<span class="campaign-story-progress"></span>' +
          '<div class="campaign-story-actions">' +
            '<button type="button" data-story-action="auto">自动</button>' +
            '<button type="button" data-story-action="skip">跳过</button>' +
            '<button type="button" class="primary" data-story-action="next">下一句</button>' +
          '</div>' +
        '</div>' +
      '</section>';
    rootEl.addEventListener("click", handleClick);
    document.body.appendChild(rootEl);
    return rootEl;
  }

  function handleClick(event) {
    if (!playerState) return;
    var textButton = event.target && event.target.closest ? event.target.closest(".campaign-story-text") : null;
    if (textButton) {
      advance();
      return;
    }
    var action = event.target && event.target.closest ? event.target.closest("[data-story-action]") : null;
    if (!action) return;
    var type = action.dataset.storyAction;
    if (type === "next") advance();
    if (type === "skip") {
      if (playerState.options && playerState.options.onSkip) playerState.options.onSkip({ scene: playerState.scene });
      closeStoryScene(true, true);
    }
    if (type === "auto") toggleAuto();
  }

  function advance() {
    if (!playerState) return;
    if (playerState.index >= playerState.scene.lines.length - 1) {
      closeStoryScene(true, false);
      return;
    }
    playerState.index += 1;
    render();
  }

  function toggleAuto() {
    if (!playerState) return;
    playerState.auto = !playerState.auto;
    if (playerState.auto) {
      playerState.timer = root.setInterval(function autoAdvance() {
        advance();
      }, playerState.options.autoDelayMs || 2200);
    } else {
      stopAuto();
    }
    render();
  }

  function stopAuto() {
    if (playerState && playerState.timer) {
      root.clearInterval(playerState.timer);
      playerState.timer = null;
    }
    if (playerState) playerState.auto = false;
  }

  function render() {
    if (!playerState) return;
    var scene = playerState.scene;
    var line = scene.lines[playerState.index] || {};
    var rootEl = playerState.root;
    var speaker = resolveSpeaker(line);
    var chapterCover = getChapterCover(scene.chapterIndex);
    rootEl.querySelector(".campaign-story-bg").style.backgroundImage = chapterCover ? "url('" + chapterCover + "')" : "";
    rootEl.querySelector(".campaign-story-title").textContent = scene.title || "主线剧情";
    rootEl.querySelector(".campaign-story-kicker").textContent = scene.trigger === "post_win" ? "AFTER ACTION STORY" : "PRE MISSION STORY";
    rootEl.querySelector(".campaign-story-progress").textContent = (playerState.index + 1) + " / " + scene.lines.length;
    rootEl.querySelector(".campaign-story-text").innerHTML =
      '<span>' + escapeHtml(speaker.name || "通讯") + '</span>' +
      '<strong>' + escapeHtml(line.text || "") + '</strong>';

    renderPortrait(rootEl.querySelector(".campaign-story-portrait.left"), speaker, line.side !== "right");
    renderPortrait(rootEl.querySelector(".campaign-story-portrait.right"), speaker, line.side === "right");

    var nextButton = rootEl.querySelector('[data-story-action="next"]');
    var autoButton = rootEl.querySelector('[data-story-action="auto"]');
    nextButton.textContent = playerState.index >= scene.lines.length - 1
      ? (playerState.options.finishLabel || "开始作战")
      : "下一句";
    autoButton.classList.toggle("active", playerState.auto);
    autoButton.textContent = playerState.auto ? "停止" : "自动";
  }

  function renderPortrait(node, speaker, active) {
    if (!node) return;
    var img = node.querySelector("img");
    node.classList.toggle("active", Boolean(active));
    node.classList.toggle("empty", !speaker.src);
    img.src = speaker.src || "";
    img.alt = speaker.name || "";
  }

  function resolveSpeaker(line) {
    var speakerId = line && line.speakerId;
    var pilot = (assets.PILOT_ASSETS || []).find(function findPilot(item) {
      return item.id === speakerId;
    });
    if (pilot) return { id: pilot.id, name: line.speakerName || pilot.name, src: pilot.src };
    if (speakerId === "messiah") return { id: "messiah", name: line.speakerName || "弥赛亚", src: assets.ASSET_PATHS && assets.ASSET_PATHS.boss || "" };
    return { id: speakerId || "system", name: line && line.speakerName || "星港管制", src: "" };
  }

  function getChapterCover(chapterIndex) {
    var cover = (assets.CHAPTER_COVER_ASSETS || []).find(function findCover(item) {
      return Number(item.chapterIndex) === Number(chapterIndex);
    });
    return cover && cover.src || "";
  }

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  scope.campaignStoryPlayerView = {
    openStoryScene: openStoryScene,
    closeStoryScene: function close() { closeStoryScene(false); }
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = scope.campaignStoryPlayerView;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
