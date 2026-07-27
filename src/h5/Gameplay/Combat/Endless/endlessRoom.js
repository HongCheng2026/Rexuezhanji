(function defineEndlessRoom(root) {
  "use strict";
  // The endless room owns only its combat lifecycle; presentation remains injectable.
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;
  registry.defineRoom("endless", function createEndlessRoom(context) {
    return { actions: {
      start: function start() {
        return context.endlessRoomController
          ? context.endlessRoomController.start()
          : Promise.reject(new Error("无尽战斗房间尚未就绪。"));
      }
    } };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
