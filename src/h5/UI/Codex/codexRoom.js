/**
 * 图鉴模块房间 (codexRoom.js)
 *
 * 注册 codex 房间，把「图鉴」入口接入功能面板系统（featurePanel 房间）。
 * 实际渲染由 UI/Codex/codexView.js 完成；本房间只负责把打开动作转交给
 * featurePanelController 的 enemyCodex 分支（该分支现已委托 codexView 渲染）。
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
    return {
      actions: {
        open: function open() {
          if (context.featurePanelController && typeof context.featurePanelController.open === "function") {
            context.featurePanelController.open("enemyCodex");
          }
        }
      },
      dispose: function dispose() {}
    };
  });
})(typeof globalThis !== "undefined" ? globalThis : window);
