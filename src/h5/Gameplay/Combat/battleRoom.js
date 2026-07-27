(function defineBattleRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("battle", function createBattleRoom(context) {
    var flow = context.battleFlowController;
    var lobby = context.lobbyController;
    return { actions: {
      startSelectedLevel: function startSelectedLevel() { return flow.startSelectedLevel(); },
      resume: function resume() { return lobby.resumeGame(); },
      pause: function pause() { return lobby.pauseGame(); },
      abort: function abort(target) { return flow.abortBattle(target); },
      settlePending: function settlePending() { return flow.settlePendingBattle(); },
      decisiveCommand: context.tryUseDecisiveCommand,
      castActiveSlot: context.tryCastActiveSlot,
      toggleActiveSlotAuto: context.toggleActiveSlotAuto,
      nextOrReplay: function nextOrReplay() {
        var result = context.getLastBattleResult();
        if (result && !result.isWin) return flow.startSelectedLevel();
        context.setSelectedLevel(context.clamp(context.getSelectedLevel() + 1, 1, context.levels.length));
        return lobby.openBattleSelect();
      }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
