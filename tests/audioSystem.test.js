"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const audioSystemFile = path.join(root, "src", "h5", "Presentation", "Audio", "audioSystem.js");
const audioSystemSource = fs.readFileSync(audioSystemFile, "utf8");
const testAudioGuardFile = path.join(root, "src", "h5", "Presentation", "Audio", "testAudioGuard.js");
const testAudioGuardSource = fs.readFileSync(testAudioGuardFile, "utf8");

function createContext(location, testUnlockFlags) {
  const audioInstances = [];
  class FakeAudio {
    constructor(src) {
      this.src = src;
      this.volume = 1;
      this.currentTime = 0;
      this.playCount = 0;
      audioInstances.push(this);
    }
    load() {}
    pause() {}
    play() {
      this.playCount += 1;
      return Promise.resolve();
    }
  }

  const context = vm.createContext({
    Audio: FakeAudio,
    location,
    console: { log() {}, warn() {}, error() {} },
    setInterval,
    clearInterval,
    setTimeout,
    clearTimeout,
    requestAnimationFrame(callback) { callback(); },
    localStorage: {
      getItem() { return null; },
      setItem() {}
    },
    RXGame: {
      testUnlockFlags: testUnlockFlags || {},
      assets: {
        AUDIO_ASSETS: { uiClick: "/audio/ui-click.ogg" },
        BGM_ASSETS: { lobby: "/audio/lobby.ogg" }
      }
    }
  });
  context.globalThis = context;
  context.window = context;
  vm.runInContext(audioSystemSource, context, { filename: audioSystemFile });
  return { audio: context.RXGame.audioSystem, audioInstances };
}

test("local test runtime does not create or play music and sound effects", () => {
  const { audio, audioInstances } = createContext({
    protocol: "http:",
    hostname: "127.0.0.1",
    pathname: "/src/h5/Shell/game-frame.html",
    search: ""
  });

  audio.unlock();
  audio.playBgm("lobby");
  audio.playSfx("uiClick");
  audio.queueSfx("uiClick");
  audio.setMusicMuted(false);
  audio.setSfxMuted(false);

  assert.equal(audioInstances.length, 0);
  assert.equal(audio.isMuted(), true);
  assert.equal(audio.getSettings().musicMuted, true);
  assert.equal(audio.getSettings().sfxMuted, true);
  assert.equal(audio.getSettings().testAudioDisabled, true);
});

test("deployed runtime still follows normal audio settings", () => {
  const { audio, audioInstances } = createContext({
    protocol: "https:",
    hostname: "game.example.com",
    pathname: "/index.html",
    search: ""
  });

  audio.unlock();
  audio.playBgm("lobby");
  audio.playSfx("uiClick");

  assert.equal(audio.getSettings().testAudioDisabled, false);
  assert.equal(audio.isMuted(), false);
  assert.ok(audioInstances.length >= 2);
  assert.equal(audioInstances.reduce((count, instance) => count + instance.playCount, 0), 2);
});

test("test audio kill switch also mutes non-local preview hosts", () => {
  const { audio, audioInstances } = createContext({
    protocol: "https:",
    hostname: "preview.example.com",
    pathname: "/game/index.html",
    search: ""
  }, { LOCAL_TEST_DISABLE_AUDIO: true });

  audio.unlock();
  audio.playBgm("lobby");
  audio.playSfx("uiClick");

  assert.equal(audio.getSettings().testAudioDisabled, true);
  assert.equal(audio.isMuted(), true);
  assert.equal(audioInstances.length, 0);
});

test("entry guard blocks native media playback before the game loads", async () => {
  class FakeMediaElement {
    constructor(src) {
      this.src = src;
      this.muted = false;
      this.volume = 1;
      this.nativePlayCount = 0;
    }
    pause() {}
    play() {
      this.nativePlayCount += 1;
      return Promise.resolve();
    }
  }
  class FakeAudio extends FakeMediaElement {}

  const context = vm.createContext({
    Audio: FakeAudio,
    HTMLMediaElement: FakeMediaElement,
    Promise
  });
  context.globalThis = context;
  context.window = context;
  vm.runInContext(testAudioGuardSource, context, { filename: testAudioGuardFile });

  const audio = new context.Audio("/audio/test.ogg");
  await audio.play();

  assert.equal(context.__RX_TEST_AUDIO_DISABLED__, true);
  assert.equal(audio.muted, true);
  assert.equal(audio.volume, 0);
  assert.equal(audio.nativePlayCount, 0);
});
