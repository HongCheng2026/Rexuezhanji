(function defineSettlementRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("settlement", function createSettlementRoom(context) {
    return { actions: {
      chest: function chest(result) { return context.settlementController.renderSettlementChest(result); },
      open: function open(result) { return context.settlementController.renderSettlement(result); }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
