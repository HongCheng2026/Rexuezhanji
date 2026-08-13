// roomRegistry.js — lifecycle and synchronous door registry for feature rooms.
(function registerRoomRegistry(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  function createRegistry() {
    var definitions = Object.create(null);
    var mountedRooms = Object.create(null);
    var actions = Object.create(null);
    var actionOwners = Object.create(null);

    function assertRoomName(name) {
      if (typeof name !== "string" || !/^[A-Za-z][\w-]*$/.test(name)) {
        throw new Error("[room-registry] invalid room name: " + name);
      }
    }

    function defineRoom(name, factory) {
      assertRoomName(name);
      if (typeof factory !== "function") throw new Error('[room-registry] room "' + name + '" requires a factory');
      if (definitions[name]) throw new Error('[room-registry] duplicate room definition: "' + name + '"');
      definitions[name] = factory;
      return function removeDefinition() {
        unmountRoom(name);
        delete definitions[name];
      };
    }

    function normalizeRoomActions(roomName, roomActions) {
      var normalized = Object.create(null);
      Object.keys(roomActions || {}).forEach(function normalizeAction(verb) {
        var actionName = verb.indexOf(".") >= 0 ? verb : roomName + "." + verb;
        var handler = roomActions[verb];
        if (typeof handler !== "function") throw new Error('[room-registry] action "' + actionName + '" must be a function');
        if (normalized[actionName]) throw new Error('[room-registry] duplicate action in room "' + roomName + '": ' + actionName);
        normalized[actionName] = handler;
      });
      return normalized;
    }

    function mountRoom(name, context) {
      if (mountedRooms[name]) return mountedRooms[name].api;
      var factory = definitions[name];
      if (typeof factory !== "function") return null;

      var instance;
      var normalized;
      try {
        instance = factory(context || {}) || {};
        normalized = normalizeRoomActions(name, instance.actions || {});
        Object.keys(normalized).forEach(function verifyCollision(actionName) {
          if (actions[actionName]) {
            throw new Error('[room-registry] action collision: "' + actionName + '" owned by "' + actionOwners[actionName] + '"');
          }
        });
      } catch (error) {
        if (instance && typeof instance.dispose === "function") {
          try { instance.dispose(); }
          catch (disposeError) {
            if (typeof console !== "undefined" && console.error) console.error('[room-registry] room "' + name + '" rollback dispose failed:', disposeError);
          }
        }
        if (typeof console !== "undefined" && console.error) console.error('[room-registry] room "' + name + '" failed to mount:', error);
        return null;
      }

      Object.keys(normalized).forEach(function commitAction(actionName) {
        actions[actionName] = normalized[actionName];
        actionOwners[actionName] = name;
      });
      mountedRooms[name] = {
        api: instance.api || null,
        actionNames: Object.keys(normalized),
        dispose: typeof instance.dispose === "function" ? instance.dispose : null
      };
      return mountedRooms[name].api || mountedRooms[name];
    }

    function mountAll(context) {
      var report = { mounted: [], failed: [] };
      Object.keys(definitions).forEach(function mountDefinedRoom(name) {
        var before = Boolean(mountedRooms[name]);
        var result = mountRoom(name, context);
        if (result || mountedRooms[name]) {
          if (!before) report.mounted.push(name);
        } else {
          report.failed.push(name);
        }
      });
      return report;
    }

    function unmountRoom(name) {
      var mounted = mountedRooms[name];
      if (!mounted) return false;
      mounted.actionNames.forEach(function removeOwnedAction(actionName) {
        if (actionOwners[actionName] !== name) return;
        delete actions[actionName];
        delete actionOwners[actionName];
      });
      if (mounted.dispose) {
        try { mounted.dispose(); }
        catch (error) {
          if (typeof console !== "undefined" && console.error) console.error('[room-registry] room "' + name + '" dispose failed:', error);
        }
      }
      delete mountedRooms[name];
      return true;
    }

    // Compatibility door for legacy modules during migration. New rooms must
    // use defineRoom() so ownership and cleanup remain explicit.
    function registerAction(name, fn, owner) {
      if (typeof name !== "string" || !name || typeof fn !== "function") return;
      owner = owner || "__legacy__";
      if (actions[name] && actionOwners[name] !== owner) {
        throw new Error('[room-registry] action collision: "' + name + '"');
      }
      actions[name] = fn;
      actionOwners[name] = owner;
    }

    function unregisterAction(name, owner) {
      if (!actions[name]) return false;
      if (owner && actionOwners[name] !== owner) return false;
      delete actions[name];
      delete actionOwners[name];
      return true;
    }

    function getAction(name) {
      return actions[name];
    }

    function hasAction(name) {
      return typeof actions[name] === "function";
    }

    function hasRoom(name) {
      return typeof definitions[name] === "function";
    }

    function dispatch(name, payload) {
      var fn = actions[name];
      if (typeof fn !== "function") {
        if (typeof console !== "undefined" && console.warn) console.warn('[room-registry] no action registered for "' + name + '"');
        return undefined;
      }
      try { return fn(payload); }
      catch (error) {
        if (typeof console !== "undefined" && console.error) console.error('[room-registry] action "' + name + '" failed:', error);
        return undefined;
      }
    }

    return {
      defineRoom: defineRoom,
      mountRoom: mountRoom,
      mountAll: mountAll,
      unmountRoom: unmountRoom,
      registerAction: registerAction,
      unregisterAction: unregisterAction,
      getAction: getAction,
      hasAction: hasAction,
      hasRoom: hasRoom,
      listRooms: function listRooms() { return Object.keys(definitions); },
      listMountedRooms: function listMountedRooms() { return Object.keys(mountedRooms); },
      listActions: function listActions() { return Object.keys(actions); },
      getActionOwner: function getActionOwner(name) { return actionOwners[name] || null; },
      dispatch: dispatch
    };
  }

  var registry = createRegistry();
  registry.createRegistry = createRegistry;
  scope.roomRegistry = registry;
  if (typeof module !== "undefined" && module.exports) module.exports = registry;
})(typeof globalThis !== "undefined" ? globalThis : window);
