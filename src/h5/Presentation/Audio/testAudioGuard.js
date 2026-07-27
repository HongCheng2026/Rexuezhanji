(function installTestAudioGuard(root) {
  "use strict";

  // Temporary test-only master switch. Set to false before an audio-enabled release.
  var TEST_AUDIO_DISABLED = true;
  root.__RX_TEST_AUDIO_DISABLED__ = TEST_AUDIO_DISABLED;
  if (!TEST_AUDIO_DISABLED) return;

  var MediaElement = root.HTMLMediaElement;
  if (MediaElement && MediaElement.prototype) {
    MediaElement.prototype.play = function blockMediaPlaybackDuringTests() {
      this.muted = true;
      this.volume = 0;
      try { this.pause(); } catch (e) {}
      return root.Promise && root.Promise.resolve ? root.Promise.resolve() : undefined;
    };
  }

  if (typeof root.Audio === "function") {
    var NativeAudio = root.Audio;
    function MutedTestAudio(src) {
      var audio = new NativeAudio(src);
      audio.muted = true;
      audio.volume = 0;
      return audio;
    }
    MutedTestAudio.prototype = NativeAudio.prototype;
    root.Audio = MutedTestAudio;
  }
})(typeof globalThis !== "undefined" ? globalThis : window);
