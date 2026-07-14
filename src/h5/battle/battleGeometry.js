(function registerBattleGeometry(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var DEFAULT_FIELD = Object.freeze({
    width: 960,
    height: 473,
    legacyHeight: 540,
    playerLeft: 42,
    playerRight: 42,
    playerTop: 42,
    playerBottom: 42,
    spawnPadding: 44,
    cullPadding: 40,
    noticeY: 74
  });

  function createField(overrides) {
    var source = overrides || {};
    return {
      width: positive(source.width, DEFAULT_FIELD.width),
      height: positive(source.height, DEFAULT_FIELD.height),
      legacyHeight: positive(source.legacyHeight, DEFAULT_FIELD.legacyHeight),
      playerLeft: positive(source.playerLeft, DEFAULT_FIELD.playerLeft),
      playerRight: positive(source.playerRight, DEFAULT_FIELD.playerRight),
      playerTop: positive(source.playerTop, DEFAULT_FIELD.playerTop),
      playerBottom: positive(source.playerBottom, DEFAULT_FIELD.playerBottom),
      spawnPadding: positive(source.spawnPadding, DEFAULT_FIELD.spawnPadding),
      cullPadding: positive(source.cullPadding, DEFAULT_FIELD.cullPadding),
      noticeY: positive(source.noticeY, DEFAULT_FIELD.noticeY)
    };
  }

  function getField(state) {
    return state && state.field ? state.field : DEFAULT_FIELD;
  }

  function getCenter(state) {
    var field = getField(state);
    return { x: field.width / 2, y: field.height / 2 };
  }

  function scaleY(state, value) {
    var field = getField(state);
    return Number(value || 0) * field.height / field.legacyHeight;
  }

  function clampPlayer(state, player) {
    var field = getField(state);
    var target = player || (state && state.player);
    if (!target) return target;
    target.x = Math.max(field.playerLeft, Math.min(field.width - field.playerRight, target.x));
    target.y = Math.max(field.playerTop, Math.min(field.height - field.playerBottom, target.y));
    return target;
  }

  function positive(value, fallback) {
    var number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  var api = {
    DEFAULT_FIELD: DEFAULT_FIELD,
    createField: createField,
    getField: getField,
    getCenter: getCenter,
    scaleY: scaleY,
    clampPlayer: clampPlayer
  };

  scope.battleGeometry = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
