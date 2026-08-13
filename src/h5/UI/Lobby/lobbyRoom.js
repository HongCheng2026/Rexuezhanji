(function defineLobbyRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("lobby", function createLobbyRoom(context) {
    return { actions: {
      openBattleSelect: function openBattleSelect() { return context.lobbyController.openBattleSelect(); }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
