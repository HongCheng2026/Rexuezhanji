(function defineSettingsRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("setting", function createSettingsRoom(context) {
    var audio = context.audioSystem;

    function unlock(mode) {
      if (!audio || !audio.unlock) return false;
      audio.unlock();
      if (audio.playBgm) audio.playBgm(mode === "fight" ? "battle" : "lobby");
      return true;
    }

    function render() {
      var dom = context.dom;
      if (!dom.featurePanel || dom.featurePanel.classList.contains("hidden")) return;
      if (!dom.featurePanelTitle || dom.featurePanelTitle.textContent !== "设置") return;
      return context.renderFeaturePanel("setting");
    }

    function handleClick(event) {
      if (!audio) return false;
      var target = event && event.target;
      var toggle = target && target.closest ? target.closest("[data-audio-toggle]") : null;
      if (toggle) {
        unlock(context.getState() && context.getState().mode);
        var current = audio.getSettings ? audio.getSettings() : {};
        if (toggle.dataset.audioToggle === "music" && audio.setMusicMuted) audio.setMusicMuted(!current.musicMuted);
        if (toggle.dataset.audioToggle === "sfx" && audio.setSfxMuted) audio.setSfxMuted(!current.sfxMuted);
        render();
        return true;
      }
      var action = target && target.closest ? target.closest("[data-setting-action]") : null;
      if (action && action.dataset.settingAction === "restart-bgm" && audio.restartBgm) {
        unlock(context.getState() && context.getState().mode);
        audio.restartBgm();
        render();
        return true;
      }
      return false;
    }

    function handleInput(event) {
      if (!audio) return false;
      var target = event && event.target;
      var input = target && target.closest ? target.closest("[data-audio-volume]") : null;
      if (!input) return false;
      var value = Math.max(0, Math.min(1, Number(input.value || 0) / 100));
      unlock(context.getState() && context.getState().mode);
      if (input.dataset.audioVolume === "music" && audio.setMusicVolume) audio.setMusicVolume(value);
      if (input.dataset.audioVolume === "sfx" && audio.setSfxVolume) audio.setSfxVolume(value);
      var row = input.closest(".settings-control-row");
      var text = row && row.querySelector("p");
      if (text) text.textContent = "当前 " + Math.round(value * 100) + "%，拖动后即时生效。";
      return true;
    }

    return { actions: {
      open: function open() { return context.featurePanelController.open("setting"); },
      render: render,
      unlock: unlock,
      handleClick: handleClick,
      handleInput: handleInput,
      uiClick: function uiClick() { return audio && audio.playSfx && audio.playSfx("button"); },
      chest: function chest() { return audio && audio.playSfx && audio.playSfx("chest"); }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
