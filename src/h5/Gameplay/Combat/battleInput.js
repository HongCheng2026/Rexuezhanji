(function registerBattleInput(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var ACTIVE_SLOT_BY_CODE = Object.freeze({
    Digit1: 0,
    Digit2: 1,
    Digit3: 2,
    Digit4: 3,
    Numpad1: 0,
    Numpad2: 1,
    Numpad3: 2,
    Numpad4: 3
  });
  var CODE_BY_KEY = Object.freeze({
    ArrowLeft: "ArrowLeft",
    ArrowRight: "ArrowRight",
    ArrowUp: "ArrowUp",
    ArrowDown: "ArrowDown",
    a: "KeyA",
    A: "KeyA",
    d: "KeyD",
    D: "KeyD",
    w: "KeyW",
    W: "KeyW",
    s: "KeyS",
    S: "KeyS",
    p: "KeyP",
    P: "KeyP",
    " ": "Space",
    Spacebar: "Space"
  });

  function getCode(eventOrCode) {
    if (typeof eventOrCode === "string") return eventOrCode;
    var event = eventOrCode || {};
    if (event.code) return String(event.code);
    var key = String(event.key || "");
    if (/^[1-4]$/.test(key)) return "Digit" + key;
    return CODE_BY_KEY[key] || "";
  }

  function getActiveSlotIndex(eventOrCode) {
    var code = getCode(eventOrCode);
    if (Object.prototype.hasOwnProperty.call(ACTIVE_SLOT_BY_CODE, code)) return ACTIVE_SLOT_BY_CODE[code];

    var event = typeof eventOrCode === "object" && eventOrCode ? eventOrCode : {};
    var legacyCode = Number(event.keyCode || event.which) || 0;
    if (legacyCode >= 49 && legacyCode <= 52) return legacyCode - 49;
    if (legacyCode >= 97 && legacyCode <= 100) return legacyCode - 97;
    return -1;
  }

  var api = {
    getCode: getCode,
    getActiveSlotIndex: getActiveSlotIndex
  };

  scope.battleInput = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
