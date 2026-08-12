/**
 * 图鉴模块房间 (codexRoom.js)
 *
 * 注册 codex 房间。图鉴渲染、状态和云端激活全部由 Codex 模块自行控制，
 * 功能面板系统只提供通用外壳能力。
 *
 * 旧占位实现位于 Gameplay/Collection/codexRoom.js（已归档，不再占用 codex 房名）。
 *
 * @module codexRoom
 */
(function defineCodexRoom(root) {
  "use strict";
  var registry = root.RXGame && root.RXGame.roomRegistry;
  if (!registry) return;

  registry.defineRoom("codex", function createCodexRoom(context) {
    var capabilities = context.codex || {};
    var controller = root.RXGame.codexController && root.RXGame.codexController.create({
      dom: context.dom,
      getProfile: capabilities.getProfile,
      ensureGameGateway: capabilities.ensureGameGateway,
      getGameGateway: capabilities.getGameGateway,
      applyGatewayProfile: capabilities.applyGatewayProfile,
      saveProfile: capabilities.saveProfile,
      renderLobby: capabilities.renderLobby,
      updateHud: capabilities.updateHud,
      openShell: capabilities.openShell
    });
    return {
      actions: {
        open: function open() {
          if (controller) controller.open();
        }
      },
      dispose: function dispose() {}
    };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
