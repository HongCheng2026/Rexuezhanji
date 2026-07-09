(function registerAudioSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var assets = scope.assets || {};
  var audioAssets = assets.AUDIO_ASSETS || {};
  var legacyMutedKey = "rx_audio_muted";
  var settingsKey = "rx_audio_settings_v2";
  var defaults = {
    musicMuted: false,
    sfxMuted: false,
    musicVolume: 0.32,
    sfxVolume: 0.42
  };
  var settings = loadSettings();
  var unlocked = false;
  var bgmCache = {};
  var currentBgmId = "lobby";
  var sfxCache = {};
  var lastPlayedAt = {};
  var pendingSfx = {};
  var debugPlayCounts = {};
  var lastPlayError = "";
  var throttleMs = {
    shoot: 220,
    shootSpread: 220,
    shootLaser: 220,
    shootMissile: 220,
    enemyHit: 260,
    explosionSmall: 280,
    explosionHeavy: 420,
    button: 70,
    uiClick: 70,
    pickup: 80,
    skill: 250,
    boss: 500,
    bossWarning: 500,
    bossExplosion: 700,
    chest: 250,
    victory: 600,
    defeat: 600,
    start: 250
  };
  var eventConfig = {
    bossExplosion: { group: "bossExplosion", priority: 100, cooldown: 999999 },
    victory: { group: "ceremony", priority: 92, cooldown: 600 },
    defeat: { group: "ceremony", priority: 92, cooldown: 600 },
    skill: { group: "skill", priority: 84, cooldown: 250 },
    bossWarning: { group: "bossWarning", priority: 78, cooldown: 500 },
    pickup: { group: "pickup", priority: 70, cooldown: 80 },
    explosionHeavy: { group: "explosionHeavy", priority: 58, cooldown: 420 },
    explosionSmall: { group: "explosionSmall", priority: 42, cooldown: 280 },
    shootMissile: { group: "shoot", priority: 34, cooldown: 220 },
    shootLaser: { group: "shoot", priority: 32, cooldown: 220 },
    shootSpread: { group: "shoot", priority: 30, cooldown: 220 },
    shoot: { group: "shoot", priority: 30, cooldown: 220 },
    enemyHit: { group: "enemyHit", priority: 18, cooldown: 260 }
  };

  function clamp01(value, fallback) {
    var next = Number(value);
    if (!isFinite(next)) next = fallback == null ? 0 : fallback;
    return Math.max(0, Math.min(1, next));
  }

  function loadSettings() {
    var next = {
      musicMuted: defaults.musicMuted,
      sfxMuted: defaults.sfxMuted,
      musicVolume: defaults.musicVolume,
      sfxVolume: defaults.sfxVolume
    };
    try {
      if (root.localStorage) {
        var raw = root.localStorage.getItem(settingsKey);
        if (raw) {
          var parsed = JSON.parse(raw);
          next.musicMuted = Boolean(parsed.musicMuted);
          next.sfxMuted = Boolean(parsed.sfxMuted);
          next.musicVolume = clamp01(parsed.musicVolume, defaults.musicVolume);
          next.sfxVolume = clamp01(parsed.sfxVolume, defaults.sfxVolume);
        } else if (root.localStorage.getItem(legacyMutedKey) === "1") {
          next.musicMuted = true;
          next.sfxMuted = true;
        }
      }
    } catch (e) {}
    return next;
  }

  function saveSettings() {
    try {
      if (root.localStorage) {
        root.localStorage.setItem(settingsKey, JSON.stringify(settings));
        root.localStorage.setItem(legacyMutedKey, isMuted() ? "1" : "0");
      }
    } catch (e) {}
  }

  function createAudio(src, loop, volume) {
    if (!src || typeof root.Audio !== "function") return null;
    var audio = new root.Audio(src);
    audio.preload = "auto";
    audio.loop = Boolean(loop);
    audio.volume = clamp01(volume, 0.6);
    try { audio.load(); } catch (e) {}
    return audio;
  }

  function getBgmSrc(id) {
    return id === "battle" ? audioAssets.bgmBattle : audioAssets.bgmLobby;
  }

  function ensureBgm(id) {
    id = id === "battle" ? "battle" : "lobby";
    if (!bgmCache[id]) bgmCache[id] = createAudio(getBgmSrc(id), true, settings.musicVolume);
    if (bgmCache[id]) bgmCache[id].volume = settings.musicMuted ? 0 : settings.musicVolume;
    return bgmCache[id];
  }

  function applySfxVolume(id) {
    var audio = sfxCache[id];
    if (!audio) return;
    var base = id === "shoot" || id === "shootSpread" || id === "shootLaser" || id === "shootMissile" ? 0.32
      : id === "enemyHit" ? 0.22
      : id === "explosionSmall" ? 0.42
      : id === "explosionHeavy" || id === "bossExplosion" ? 0.72
      : 1;
    audio.volume = settings.sfxMuted ? 0 : clamp01(settings.sfxVolume * base, settings.sfxVolume);
  }

  function applyAllVolumes() {
    ensureBgm(currentBgmId);
    for (var id in sfxCache) {
      if (Object.prototype.hasOwnProperty.call(sfxCache, id)) applySfxVolume(id);
    }
  }

  function unlock() {
    primeAudio();
    if (unlocked) {
      playBgm(currentBgmId);
      return;
    }
    unlocked = true;
    playBgm(currentBgmId);
  }

  function primeAudio() {
    ensureBgm("lobby");
    ensureBgm("battle");
    getSfx("uiClick");
    getSfx("pickup");
    getSfx("victory");
    getSfx("defeat");
  }

  function playBgm(id) {
    id = id === "battle" ? "battle" : "lobby";
    if (currentBgmId !== id) stopBgm();
    currentBgmId = id;
    var bgm = ensureBgm(id);
    if (!bgm || settings.musicMuted || !unlocked) return;
    bgm.volume = settings.musicVolume;
    var promise = bgm.play();
    if (promise && promise.catch) promise.catch(function onBgmError(error) {
      lastPlayError = error && error.message ? error.message : "bgm-play-blocked";
    });
  }

  function restartBgm() {
    var bgm = ensureBgm(currentBgmId);
    if (!bgm) return;
    try { bgm.currentTime = 0; } catch (e) {}
    playBgm(currentBgmId);
  }

  function stopBgm() {
    for (var id in bgmCache) {
      if (!Object.prototype.hasOwnProperty.call(bgmCache, id) || !bgmCache[id]) continue;
      bgmCache[id].pause();
      try { bgmCache[id].currentTime = 0; } catch (e) {}
    }
  }

  function getSfx(id) {
    var src = audioAssets[id];
    if (!src) return null;
    if (!sfxCache[id]) {
      sfxCache[id] = createAudio(src, false, settings.sfxVolume);
      applySfxVolume(id);
    }
    return sfxCache[id];
  }

  function playSfx(id, options) {
    if (!id || settings.sfxMuted || !unlocked) return;
    var now = Date.now();
    var wait = throttleMs[id] || 0;
    if (!(options && options.force) && lastPlayedAt[id] && now - lastPlayedAt[id] < wait) return;
    lastPlayedAt[id] = now;
    var audio = getSfx(id);
    if (!audio) return;
    recordDebugPlay(id);
    applySfxVolume(id);
    try {
      audio.currentTime = 0;
      var promise = audio.play();
      if (promise && promise.catch) promise.catch(function onSfxError(error) {
        lastPlayError = error && error.message ? error.message : "sfx-play-blocked";
      });
    } catch (e) {}
  }

  function getEventConfig(id) {
    return eventConfig[id] || { group: id, priority: 1, cooldown: throttleMs[id] || 0 };
  }

  function queueSfx(id, options) {
    if (!id || settings.sfxMuted) return;
    var config = getEventConfig(id);
    var group = config.group || id;
    var weight = Math.max(1, Math.floor(Number(options && options.count) || 1));
    var pending = pendingSfx[group];
    if (!pending || (config.priority || 0) > pending.priority) {
      pendingSfx[group] = {
        id: id,
        group: group,
        priority: config.priority || 0,
        count: weight,
        queuedAt: Date.now()
      };
    } else {
      pending.count += weight;
    }
  }

  function flushFrameAudio() {
    if (settings.sfxMuted) {
      pendingSfx = {};
      return;
    }
    var best = null;
    var now = Date.now();
    for (var group in pendingSfx) {
      if (!Object.prototype.hasOwnProperty.call(pendingSfx, group)) continue;
      var item = pendingSfx[group];
      var config = getEventConfig(item.id);
      var wait = Math.max(0, Number(config.cooldown) || throttleMs[item.id] || 0);
      var last = lastPlayedAt[group] || lastPlayedAt[item.id] || 0;
      if (last && now - last < wait) continue;
      if (!best || item.priority > best.priority || (item.priority === best.priority && item.count > best.count)) best = item;
    }
    pendingSfx = {};
    if (!best) return;
    lastPlayedAt[best.group] = now;
    playSfx(best.id, { force: true });
  }

  function recordDebugPlay(id) {
    debugPlayCounts[id] = (debugPlayCounts[id] || 0) + 1;
  }

  function resetDebugPlayCounts() {
    debugPlayCounts = {};
    pendingSfx = {};
    lastPlayedAt = {};
  }

  function setMusicMuted(nextMuted) {
    settings.musicMuted = Boolean(nextMuted);
    saveSettings();
    var bgm = ensureBgm(currentBgmId);
    if (settings.musicMuted) {
      if (bgm) bgm.pause();
    } else {
      playBgm(currentBgmId);
    }
  }

  function setSfxMuted(nextMuted) {
    settings.sfxMuted = Boolean(nextMuted);
    saveSettings();
    applyAllVolumes();
  }

  function setMusicVolume(value) {
    settings.musicVolume = clamp01(value, defaults.musicVolume);
    saveSettings();
    ensureBgm(currentBgmId);
    if (!settings.musicMuted) playBgm(currentBgmId);
  }

  function setSfxVolume(value) {
    settings.sfxVolume = clamp01(value, defaults.sfxVolume);
    saveSettings();
    applyAllVolumes();
  }

  function setMuted(nextMuted) {
    setMusicMuted(nextMuted);
    setSfxMuted(nextMuted);
  }

  function toggleMuted() {
    var next = !isMuted();
    setMuted(next);
    return next;
  }

  function isMuted() {
    return Boolean(settings.musicMuted && settings.sfxMuted);
  }

  function getSettings() {
    return {
      musicMuted: Boolean(settings.musicMuted),
      sfxMuted: Boolean(settings.sfxMuted),
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
      bgm: currentBgmId,
      unlocked: unlocked,
      lastPlayError: lastPlayError,
      debugPlayCounts: Object.assign({}, debugPlayCounts)
    };
  }

  scope.audioSystem = {
    unlock: unlock,
    primeAudio: primeAudio,
    playBgm: playBgm,
    restartBgm: restartBgm,
    stopBgm: stopBgm,
    playSfx: playSfx,
    queueSfx: queueSfx,
    flushFrameAudio: flushFrameAudio,
    setMuted: setMuted,
    toggleMuted: toggleMuted,
    isMuted: isMuted,
    isUnlocked: function isUnlocked() { return unlocked; },
    setMusicMuted: setMusicMuted,
    setSfxMuted: setSfxMuted,
    setMusicVolume: setMusicVolume,
    setSfxVolume: setSfxVolume,
    getSettings: getSettings,
    resetDebugPlayCounts: resetDebugPlayCounts
  };
})(typeof globalThis !== "undefined" ? globalThis : this);
