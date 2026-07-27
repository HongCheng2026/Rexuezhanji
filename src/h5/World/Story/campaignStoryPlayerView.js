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
    var keepAutoPlaying = playerState.auto;
    clearAutoTimer();
    if (playerState.index >= playerState.scene.lines.length - 1) {
      closeStoryScene(true, false);
      return;
    }
    playerState.index += 1;
    render();
    if (keepAutoPlaying) scheduleAuto();
  }

  function toggleAuto() {
    if (!playerState) return;
    if (playerState.auto) {
      stopAuto();
    } else {
      playerState.auto = true;
      scheduleAuto();
    }
    render();
  }

  function clearAutoTimer() {
    if (playerState && playerState.timer) {
      root.clearTimeout(playerState.timer);
      playerState.timer = null;
    }
  }

  function scheduleAuto() {
    if (!playerState || !playerState.auto) return;
    clearAutoTimer();
    var line = playerState.scene.lines[playerState.index] || {};
    var delay = Number(playerState.options.autoDelayMs)
      || Math.max(2200, 1200 + (Number(line.pauseMs) || 900));
    playerState.timer = root.setTimeout(function autoAdvance() {
      advance();
    }, delay);
  }

  function stopAuto() {
    clearAutoTimer();
    if (playerState) playerState.auto = false;
  }

  function render() {
    if (!playerState) return;
    var scene = playerState.scene;
    var line = scene.lines[playerState.index] || {};
    var rootEl = playerState.root;
    var speaker = resolveSpeaker(line, scene);
    var leftSpeaker = findPortraitSpeaker(scene, playerState.index, "left");
    var rightSpeaker = findPortraitSpeaker(scene, playerState.index, "right");
    var chapterCover = getChapterCover(scene.chapterIndex);
    rootEl.dataset.storyMode = line.mode || (line.narrator ? "system" : "character");
    rootEl.dataset.storyEmotion = line.emotion || "normal";
    rootEl.dataset.storyMood = scene.mood || "normal";
    rootEl.dataset.activeSide = line.side || "center";
    rootEl.querySelector(".campaign-story-bg").style.backgroundImage = chapterCover ? "url('" + chapterCover + "')" : "";
    rootEl.querySelector(".campaign-story-title").textContent = scene.title || "主线剧情";
    rootEl.querySelector(".campaign-story-kicker").textContent = scene.trigger === "post_win" ? "AFTER ACTION STORY" : "PRE MISSION STORY";
    rootEl.querySelector(".campaign-story-progress").textContent = (playerState.index + 1) + " / " + scene.lines.length;
    rootEl.querySelector(".campaign-story-text").innerHTML =
      '<span>' + escapeHtml(speaker.name || "通讯") + '</span>' +
      '<strong>' + escapeHtml(line.text || "") + '</strong>';

    renderPortrait(rootEl.querySelector(".campaign-story-portrait.left"), leftSpeaker, line.side === "left");
    renderPortrait(rootEl.querySelector(".campaign-story-portrait.right"), rightSpeaker, line.side === "right");

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
    speaker = speaker || { id: "", name: "", src: "" };
    var img = node.querySelector("img");
    node.classList.toggle("active", Boolean(active));
    node.classList.toggle("empty", !speaker.src);
    node.dataset.speakerId = speaker.id || "";
    img.src = speaker.src || "";
    img.alt = speaker.name || "";
  }

  function findPortraitSpeaker(scene, currentIndex, side) {
    var lines = scene && Array.isArray(scene.lines) ? scene.lines : [];
    var current = lines[currentIndex];
    if (current && current.side === side) {
      var currentSpeaker = resolveSpeaker(current, scene);
      if (currentSpeaker.src) return currentSpeaker;
    }
    for (var before = currentIndex - 1; before >= 0; before -= 1) {
      if (lines[before] && lines[before].side === side) {
        var previousSpeaker = resolveSpeaker(lines[before], scene);
        if (previousSpeaker.src) return previousSpeaker;
      }
    }
    for (var after = currentIndex + 1; after < lines.length; after += 1) {
      if (lines[after] && lines[after].side === side) {
        var nextSpeaker = resolveSpeaker(lines[after], scene);
        if (nextSpeaker.src) return nextSpeaker;
      }
    }
    return { id: "", name: "", src: "" };
  }

  function resolveSpeaker(line, scene) {
    var speakerId = line && line.speakerId;
    var pilot = (assets.PILOT_ASSETS || []).find(function findPilot(item) {
      return item.id === speakerId;
    });
    if (pilot) return { id: pilot.id, name: line.speakerName || pilot.name, src: pilot.src };
    if (speakerId === "messiah") {
      var bossVisual = typeof assets.getBossVisual === "function"
        ? assets.getBossVisual(scene && scene.chapterIndex, scene && scene.stageInChapter)
        : assets.BOSS_VISUALS && assets.BOSS_VISUALS[scene && scene.chapterIndex];
      return {
        id: "messiah",
        name: line.speakerName || "弥赛亚",
        src: bossVisual && bossVisual.src || assets.ASSET_PATHS && assets.ASSET_PATHS.boss || ""
      };
    }
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
