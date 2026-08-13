/**
 * 图鉴独立控制器：负责渲染、即时激活、云端确认与失败回滚。
 * @module codexController
 */
(function registerCodexController(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function create(options) {
    options = options || {};
    var viewHandle = null;
    var pending = {};

    function getProfile() { return options.getProfile ? options.getProfile() : {}; }
    function keyOf(kind, id) { return kind + ":" + id; }

    function pendingActivationState() {
      var result = { activatedUnits: [], activatedBonds: [] };
      Object.keys(pending).forEach(function collect(key) {
        var item = pending[key];
        if (!item) return;
        (item.kind === "unit" ? result.activatedUnits : result.activatedBonds).push(item.id);
      });
      return result;
    }

    function render(statusText, isError) {
      if (!scope.codexView || typeof scope.codexView.renderCodex !== "function") return;
      if (viewHandle && typeof viewHandle.refresh === "function") {
        viewHandle.refresh(getProfile(), statusText, isError);
        return;
      }
      viewHandle = scope.codexView.renderCodex(options.dom, getProfile(), { onActivate: activate });
      if (viewHandle && statusText) viewHandle.refresh(getProfile(), statusText, isError);
    }

    function refreshSurroundingViews() {
      if (options.renderLobby) options.renderLobby();
      if (options.updateHud) options.updateHud();
    }

    function activate(kind, id) {
      var system = scope.codexSystem;
      var profile = getProfile();
      var key = keyOf(kind, id);
      if (!system || pending[key] || !system.activateEntry(profile, kind, id)) return Promise.resolve({ duplicate: true });

      pending[key] = { kind: kind, id: String(id) };
      if (options.saveProfile) options.saveProfile();
      render("正在保存激活状态…");
      refreshSurroundingViews();

      var request = Promise.resolve().then(function ensureGateway() {
        return options.ensureGameGateway ? options.ensureGameGateway() : options.getGameGateway && options.getGameGateway();
      }).then(function activateOnGateway(gateway) {
        gateway = gateway || (options.getGameGateway && options.getGameGateway());
        if (!gateway || typeof gateway.activateCodexEntry !== "function") throw new Error("图鉴激活服务尚未就绪。");
        return gateway.activateCodexEntry(kind, id);
      }).then(function acceptActivation(result) {
        if (result && result.profile) {
          system.mergeActivationState(result.profile, pendingActivationState());
          if (options.applyGatewayProfile) options.applyGatewayProfile(result.profile);
        }
        delete pending[key];
        render("激活状态已保存");
        refreshSurroundingViews();
        return result;
      }).catch(function recoverActivation(error) {
        delete pending[key];
        system.deactivateEntry(getProfile(), kind, id);
        if (options.saveProfile) options.saveProfile();
        var gateway = options.getGameGateway && options.getGameGateway();
        var recovery = gateway && typeof gateway.syncProfile === "function"
          ? Promise.resolve(gateway.syncProfile(0)).then(function waitForRecovery(snapshot) {
              return snapshot && snapshot.refreshPromise ? snapshot.refreshPromise : snapshot;
            }).then(function applyRecovery(result) {
              if (result && result.profile && options.applyGatewayProfile) options.applyGatewayProfile(result.profile);
            }).catch(function keepRollback() {})
          : Promise.resolve();
        return recovery.then(function showFailure() {
          render("激活未保存，已按云端状态恢复，请重试", true);
          refreshSurroundingViews();
          throw error;
        });
      });
      request.catch(function reportActivationFailure(error) {
        if (root.console && root.console.error) root.console.error("Codex activation failed", error);
      });
      return request;
    }

    function open() {
      viewHandle = null;
      render();
      if (options.openShell) options.openShell("codex-panel");
    }

    return { open: open, activate: activate, refresh: render };
  }

  scope.codexController = { create: create };
  if (typeof module !== "undefined" && module.exports) module.exports = scope.codexController;
})(typeof globalThis !== "undefined" ? globalThis : window);
