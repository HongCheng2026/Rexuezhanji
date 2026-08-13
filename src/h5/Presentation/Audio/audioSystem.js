(function registerAudioSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var events = scope.events;
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
  var testAudioDisabled = isTestAudioDisabled();
  var bgmEnabled = true;
  var settings = loadSettings();
  var unlocked = false;
  var bgmCache = {};
  var currentBgmId = "lobby";
  var sfxCache = {};
  var lastPlayedAt = {};
  var pendingSfx = {};
  var flushScheduled = false;
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
    start: 250,
    playerHit: 400,
    shieldAbsorb: 300,
    skillPhaseShield: 300,
    skillSkyLockBeam: 350,
    skillGoldJudgement: 350,
    skillObsidianWell: 350,
    decisiveStellarBeam: 500,
    decisiveDarkCore: 500,
    decisiveGoldenLances: 500,
    bossPhaseBurst: 600,
    bossArmorSwitch: 400,
    bossTelegraph: 300,
    bossSummon: 400,
    shootNormal: 180,
    extSidewing: 300,
    extOrbital: 350,
    extSwarm: 350,
    weaponUpgrade: 200,
    criticalHit: 350,
    eliteWave: 500,
    goldCollect: 60,
    lowHpWarning: 500,
    endlessWave: 600,
    uiPanelOpen: 120,
    uiPanelClose: 120,
    uiAchievement: 250,
    uiQuestComplete: 250,
    uiLevelUp: 300,
    uiGachaPull: 200,
    uiGachaReveal: 200,
    uiGachaSSR: 400,
    uiPurchase: 150,
    uiSweepComplete: 200,
    uiError: 150,
    uiMailReceived: 200,
    uiSignin: 200,
    uiCountdownTick: 80,
    uiCountdownWarning: 120,
    uiRankUp: 300
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
    enemyHit: { group: "enemyHit", priority: 18, cooldown: 260 },
    playerHit: { group: "playerHit", priority: 95, cooldown: 400 },
    shieldAbsorb: { group: "shieldAbsorb", priority: 82, cooldown: 300 },
    bossPhaseBurst: { group: "bossPhaseBurst", priority: 88, cooldown: 600 },
    bossArmorSwitch: { group: "bossArmorSwitch", priority: 75, cooldown: 400 },
    decisiveStellarBeam: { group: "decisiveStellarBeam", priority: 86, cooldown: 500 },
    decisiveDarkCore: { group: "decisiveDarkCore", priority: 86, cooldown: 500 },
    decisiveGoldenLances: { group: "decisiveGoldenLances", priority: 86, cooldown: 500 },
    lowHpWarning: { group: "lowHpWarning", priority: 98, cooldown: 500 }
  };

  function clamp01(value, fallback) {
    var next = Number(value);
    if (!isFinite(next)) next = fallback == null ? 0 : fallback;
    return Math.max(0, Math.min(1, next));
  }

  function isTestAudioDisabled() {
    var testFlags = scope.testUnlockFlags || {};
    return root.__RX_TEST_AUDIO_DISABLED__ === true
      || testFlags.LOCAL_TEST_DISABLE_AUDIO === true
      || isLocalTestRuntime();
  }

  function isLocalTestRuntime() {
    var runtimeLocation = root.location || {};
    var protocol = String(runtimeLocation.protocol || "").toLowerCase();
    var hostname = String(runtimeLocation.hostname || "").toLowerCase();
    var pathname = String(runtimeLocation.pathname || "").replace(/\\/g, "/");
    var search = String(runtimeLocation.search || "");
    return protocol === "file:"
      || /^(127\.0\.0\.1|localhost|\[::1\])$/.test(hostname)
      || /(?:^|\/)src\/h5(?:\/|$)/i.test(pathname)
      || /(?:^|[?&])slot=[^&]+/i.test(search);
  }

  function isMusicMuted() {
    return Boolean(testAudioDisabled || settings.musicMuted);
  }

  function isSfxMuted() {
    return Boolean(testAudioDisabled || settings.sfxMuted);
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
        root.localStorage.setItem(legacyMutedKey, settings.musicMuted && settings.sfxMuted ? "1" : "0");
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
    var bgmAssets = (scope.assets && scope.assets.BGM_ASSETS) || {};
    return bgmAssets[id] || null;
  }

  function resolveBgm(id) {
    if (id === "battle" || id === "lobby") return id;
    return "bgm_" + id;
  }

  function ensureBgm(id) {
    if (testAudioDisabled || !bgmEnabled) return null;
    var resolved = resolveBgm(id);
    if (!bgmCache[resolved]) {
      var src = getBgmSrc(resolved);
      if (!src && resolved !== "lobby") {
        // fallback: try generic id
        src = getBgmSrc(id);
      }
      bgmCache[resolved] = createAudio(src, true, settings.musicVolume);
    }
    if (bgmCache[resolved]) bgmCache[resolved].volume = isMusicMuted() ? 0 : settings.musicVolume;
    return bgmCache[resolved];
  }

  function applySfxVolume(id) {
    var audio = sfxCache[id];
    if (!audio) return;
    var base = id === "shoot" || id === "shootSpread" || id === "shootLaser" || id === "shootMissile" ? 0.32
      : id === "enemyHit" ? 0.22
      : id === "explosionSmall" ? 0.42
      : id === "explosionHeavy" || id === "bossExplosion" ? 0.72
      : 1;
    audio.volume = isSfxMuted() ? 0 : clamp01(settings.sfxVolume * base, settings.sfxVolume);
  }

  function applyAllVolumes() {
    if (bgmEnabled) ensureBgm(currentBgmId);
    for (var id in sfxCache) {
      if (Object.prototype.hasOwnProperty.call(sfxCache, id)) applySfxVolume(id);
    }
  }

  function unlock() {
    primeAudio();
    if (unlocked) {
      return;
    }
    unlocked = true;
  }

  function primeAudio() {
    if (testAudioDisabled) return;
    getSfx("uiClick");
    getSfx("pickup");
    getSfx("victory");
    getSfx("defeat");
  }

  function playBgm(id, options) {
    var resolved = resolveBgm(id);
    if (currentBgmId !== resolved) stopBgm();
    currentBgmId = resolved;
    if (testAudioDisabled || !bgmEnabled) return;
    var bgm = ensureBgm(resolved);
    if (!bgm || isMusicMuted() || !unlocked) return;
    if (options && typeof options.crossfade === "number" && bgm.volume > 0) {
      var targetVolume = settings.musicVolume;
      var steps = Math.ceil(options.crossfade / 30);
      var stepDown = bgm.volume / steps;
      var stepUp = targetVolume / steps;
      var tick = 0;
      var interval = setInterval(function () {
        tick++;
        if (tick >= steps) {
          clearInterval(interval);
          bgm.volume = targetVolume;
          return;
        }
        bgm.volume = Math.max(0, bgm.volume - stepDown);
      }, 30);
      bgm.volume = 0;
    }
    bgm.volume = settings.musicVolume;
    var promise = bgm.play();
    if (promise && promise.catch) promise.catch(function onBgmError(error) {
      lastPlayError = error && error.message ? error.message : "bgm-play-blocked";
    });
  }

  function restartBgm() {
    if (testAudioDisabled || !bgmEnabled) return;
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
    if (testAudioDisabled) return null;
    var src = audioAssets[id];
    if (!src) return null;
    if (!sfxCache[id]) {
      sfxCache[id] = createAudio(src, false, settings.sfxVolume);
      applySfxVolume(id);
    }
    return sfxCache[id];
  }

  function playSfx(id, options) {
    if (!id || isSfxMuted() || !unlocked) return;
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
    if (!id || isSfxMuted()) return;
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
    scheduleFrameAudioFlush();
  }

  function scheduleFrameAudioFlush() {
    if (flushScheduled) return;
    flushScheduled = true;
    var schedule = typeof root.requestAnimationFrame === "function"
      ? root.requestAnimationFrame.bind(root)
      : function scheduleFallback(callback) { return root.setTimeout(callback, 0); };
    schedule(function flushScheduledAudio() {
      flushScheduled = false;
      flushFrameAudio();
    });
  }

  function flushFrameAudio() {
    if (isSfxMuted()) {
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
    if (testAudioDisabled) return;
    settings.musicMuted = Boolean(nextMuted);
    saveSettings();
    var bgm = ensureBgm(currentBgmId);
    if (isMusicMuted()) {
      if (bgm) bgm.pause();
    } else {
      playBgm(currentBgmId);
    }
  }

  function setSfxMuted(nextMuted) {
    if (testAudioDisabled) return;
    settings.sfxMuted = Boolean(nextMuted);
    saveSettings();
    applyAllVolumes();
  }

  function setMusicVolume(value) {
    settings.musicVolume = clamp01(value, defaults.musicVolume);
    saveSettings();
    ensureBgm(currentBgmId);
    if (!isMusicMuted()) playBgm(currentBgmId);
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
    return isMuted();
  }

  function isMuted() {
    return Boolean(isMusicMuted() && isSfxMuted());
  }

  function getSettings() {
    return {
      musicMuted: isMusicMuted(),
      sfxMuted: isSfxMuted(),
      musicVolume: settings.musicVolume,
      sfxVolume: settings.sfxVolume,
      testAudioDisabled: testAudioDisabled,
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

  // ── Room boundary (Rule ③): audio REACTS to enemy death via the bus.
  // Combat never calls audioSystem directly here — it only broadcasts
  // "enemy:died"; this listener is wired purely through the event bus,
  // proving the rooms are decoupled (Rule ②).
  if (scope.bus && typeof scope.bus.on === "function") {
    scope.bus.on(events.ENEMY_DIED, function onEnemyDied(payload) {
      if (!payload) return;
      var sfx = payload.isBoss ? "bossExplosion"
        : payload.type === "elite" ? "explosionHeavy"
        : "explosionSmall";
      queueSfx(sfx);
    });

    scope.bus.on(events.PLAYER_DAMAGED, function onPlayerDamaged(payload) {
      if (!payload || !payload.damage) return;
      queueSfx(payload.shieldAbsorbed ? "shieldAbsorb" : "playerHit");
    });

    scope.bus.on(events.BOSS_SPAWNED, function onBossSpawned() {
      queueSfx("bossWarning");
    });

    scope.bus.on(events.ITEM_COLLECTED, function onItemCollected() {
      queueSfx("pickup");
    });

    scope.bus.on(events.PLAYER_DIED, function onPlayerDied() {
      queueSfx("defeat");
    });

    scope.bus.on(events.LEVEL_CLEARED, function onLevelCleared() {
      queueSfx("victory");
    });

    scope.bus.on(events.COMBAT_STARTED, function onCombatStarted(payload) {
      var chapterIndex = payload && payload.chapterIndex;
      if (chapterIndex != null && chapterIndex >= 0) {
        var chapterId = "chapter_" + String(chapterIndex).padStart(2, "0");
        playBgm(chapterId);
      } else {
        playBgm("battle");
      }
    });

    scope.bus.on(events.WEAPON_UPGRADED, function onWeaponUpgraded() {
      queueSfx("weaponUpgrade");
      // fallback: if weaponUpgrade asset not available, use pickup
      if (!audioAssets["weaponUpgrade"]) queueSfx("pickup");
    });

    scope.bus.on(events.WEAPON_FIRED, function onWeaponFired(payload) {
      if (payload && payload.source === "extension") {
        var extMap = {
          "sidewing": "extSidewing",
          "orbital": "extOrbital",
          "missile": "extSwarm"
        };
        var extSfx = extMap[payload.weaponType] || "shootSpread";
        queueSfx(extSfx);
        return;
      }
      var weaponType = payload && payload.weaponType;
      var sfx = weaponType === "missile" ? "shootMissile"
        : weaponType === "laser" ? "shootLaser"
        : weaponType === "spread" ? "shootSpread"
        : "shootNormal";
      queueSfx(sfx);
    });

    scope.bus.on(events.ENEMY_HIT, function onEnemyHit(payload) {
      queueSfx("enemyHit", { count: payload && payload.count });
    });

    scope.bus.on(events.SKILL_ACTIVATED, function onSkillActivated(payload) {
      var skillId = payload && payload.skillId;
      var sfxMap = {
        "phase-shield": "skillPhaseShield",
        "sky-lock-beam": "skillSkyLockBeam",
        "gold-judgement-buff": "skillGoldJudgement",
        "obsidian-gravity-well": "skillObsidianWell"
      };
      var sfx = sfxMap[skillId] || "skill";
      queueSfx(sfx);
    });

    // ── New events (Phase 1) ──

    // BOSS phase burst (70%/40%/15% HP)
    if (events.BOSS_PHASE_BURST) {
      scope.bus.on(events.BOSS_PHASE_BURST, function onBossPhaseBurst() {
        queueSfx("bossPhaseBurst");
      });
    }

    // BOSS armor switch (shielded / exposed)
    if (events.BOSS_ARMOR_SWITCH) {
      scope.bus.on(events.BOSS_ARMOR_SWITCH, function onBossArmorSwitch() {
        queueSfx("bossArmorSwitch");
      });
    }

    // BOSS defeated
    if (events.BOSS_DEFEATED) {
      scope.bus.on(events.BOSS_DEFEATED, function onBossDefeated() {
        queueSfx("bossExplosion");
      });
    }

    // Phase 2 — Boss signature skill audio
    if (events.BOSS_RAGE_ACTIVATED) {
      scope.bus.on(events.BOSS_RAGE_ACTIVATED, function onBossRage() { queueSfx("bossPhaseBurst"); });
    }
    if (events.BOSS_SHIELD_LAYER_BROKEN) {
      scope.bus.on(events.BOSS_SHIELD_LAYER_BROKEN, function onShieldLayer() { queueSfx("bossArmorSwitch"); });
    }
    if (events.BOSS_OVERLOAD_START) {
      scope.bus.on(events.BOSS_OVERLOAD_START, function onOverload() { queueSfx("bossPhaseBurst"); });
    }
    if (events.BOSS_CORE_EXPOSED) {
      scope.bus.on(events.BOSS_CORE_EXPOSED, function onCoreExposed() { queueSfx("bossTelegraph"); });
    }
    if (events.BOSS_ENDGAME) {
      scope.bus.on(events.BOSS_ENDGAME, function onEndgame() { queueSfx("bossWarning"); });
    }
    if (events.BOSS_OVERHEAT) {
      scope.bus.on(events.BOSS_OVERHEAT, function onBossOverheat() { queueSfx("bossPhaseBurst"); });
    }
    if (events.BOSS_HEAT_DUMP) {
      scope.bus.on(events.BOSS_HEAT_DUMP, function onHeatDump() { queueSfx("bossExplosion"); });
    }
    if (events.BOSS_ROTOR_OVERDRIVE) {
      scope.bus.on(events.BOSS_ROTOR_OVERDRIVE, function onRotorOverdrive() { queueSfx("bossPhaseBurst"); });
    }
    if (events.BOSS_MIGRATION_CHARGE) {
      scope.bus.on(events.BOSS_MIGRATION_CHARGE, function onMigration() { queueSfx("bossTelegraph"); });
    }
    if (events.BOSS_FORM_CHANGED) {
      scope.bus.on(events.BOSS_FORM_CHANGED, function onFormChanged() { queueSfx("bossWarning"); });
    }

    // Decisive command used
    if (events.DECISIVE_COMMAND_USED) {
      scope.bus.on(events.DECISIVE_COMMAND_USED, function onDecisiveCommand(payload) {
        var effectId = payload && payload.effectId;
        var sfxMap = {
          "stellar-beam": "decisiveStellarBeam",
          "dark-core": "decisiveDarkCore",
          "golden-lances": "decisiveGoldenLances"
        };
        var sfx = sfxMap[effectId] || "skill";
        queueSfx(sfx);
      });
    }

    // Decisive command ready
    if (events.DECISIVE_COMMAND_READY) {
      scope.bus.on(events.DECISIVE_COMMAND_READY, function onDecisiveReady() {
        queueSfx("decisiveReady");
      });
    }

    // Skill cooldown ready
    if (events.SKILL_COOLDOWN_READY) {
      scope.bus.on(events.SKILL_COOLDOWN_READY, function onSkillCooldownReady() {
        queueSfx("skillCooldownReady");
      });
    }

    // Gold collected
    if (events.GOLD_CHANGED) {
      scope.bus.on(events.GOLD_CHANGED, function onGoldChanged(payload) {
        if (payload && payload.source === "collect") {
          queueSfx("goldCollect");
        }
      });
    }

    // Elite wave incoming
    if (events.ELITE_WAVE_INCOMING) {
      scope.bus.on(events.ELITE_WAVE_INCOMING, function onEliteWave() {
        queueSfx("eliteWave");
      });
    }

    // Player low HP
    if (events.PLAYER_LOW_HP) {
      scope.bus.on(events.PLAYER_LOW_HP, function onPlayerLowHp() {
        queueSfx("lowHpWarning");
      });
    }

    // Chapter cleared
    if (events.CHAPTER_CLEARED) {
      scope.bus.on(events.CHAPTER_CLEARED, function onChapterCleared() {
        queueSfx("victory");
      });
    }

    // Endless wave transition
    if (events.ENDLESS_WAVE_TRANSITION) {
      scope.bus.on(events.ENDLESS_WAVE_TRANSITION, function onEndlessWave() {
        queueSfx("endlessWave");
      });
    }
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
