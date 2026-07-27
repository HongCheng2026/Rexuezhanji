(function registerBattlePauseView(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function mount(rootElement) {
    if (!rootElement) return null;
    var existing = rootElement.querySelector("[data-battle-pause-layer]");
    if (existing) return createHandle(existing);

    var layer = document.createElement("section");
    layer.className = "battle-pause-layer hidden";
    layer.dataset.battlePauseLayer = "";
    layer.setAttribute("role", "dialog");
    layer.setAttribute("aria-modal", "true");
    layer.setAttribute("aria-labelledby", "battlePauseTitle");
    layer.innerHTML =
      '<div class="battle-pause-copy">' +
        '<h2 id="battlePauseTitle">作战暂停</h2>' +
        '<p>战斗已暂停</p>' +
      '</div>' +
      '<nav class="battle-pause-actions" aria-label="暂停操作">' +
        '<button type="button" data-battle-action="pause-resume">继续战斗</button>' +
        '<button type="button" data-battle-action="pause-chapter">返回关卡</button>' +
        '<button type="button" data-battle-action="pause-lobby">返回大厅</button>' +
      '</nav>';
    rootElement.appendChild(layer);
    return createHandle(layer);
  }

  function createHandle(layer) {
    return {
      element: layer,
      render: function render(model) {
        var visible = Boolean(model && model.visible);
        layer.classList.toggle("hidden", !visible);
        layer.setAttribute("aria-hidden", visible ? "false" : "true");
      }
    };
  }

  scope.battlePauseView = { mount: mount };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.battlePauseView;
})(typeof globalThis !== "undefined" ? globalThis : window);
