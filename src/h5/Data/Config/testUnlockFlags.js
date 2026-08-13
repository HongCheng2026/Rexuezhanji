(function registerTestUnlockFlags(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  // 本地测试开关：为 true 时解锁全部关卡（不解锁则仅依赖 unlockedLevel）
  var LOCAL_TEST_UNLOCK_ALL_LEVELS = false;

  // 本地测试开关：为 true 时全部战姬视为已拥有
  var LOCAL_TEST_UNLOCK_ALL_PILOTS = false;

  // 本地测试开关：为 true 时全部战机视为已拥有
  var LOCAL_TEST_UNLOCK_ALL_SHIPS = false;

  // Testing kill switch: disable all music and sound effects on every host.
  // Set to false before a production release that should play audio.
  var LOCAL_TEST_DISABLE_AUDIO = true;

  var api = {
    LOCAL_TEST_UNLOCK_ALL_LEVELS: LOCAL_TEST_UNLOCK_ALL_LEVELS,
    LOCAL_TEST_UNLOCK_ALL_PILOTS: LOCAL_TEST_UNLOCK_ALL_PILOTS,
    LOCAL_TEST_UNLOCK_ALL_SHIPS: LOCAL_TEST_UNLOCK_ALL_SHIPS,
    LOCAL_TEST_DISABLE_AUDIO: LOCAL_TEST_DISABLE_AUDIO
  };

  scope.testUnlockFlags = api;

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
})(typeof globalThis !== "undefined" ? globalThis : this);
