(function registerEventBus(root) {
  "use strict";
  var scope = root.RXGame || (root.RXGame = {});

  // 轻量发布/订阅总线：房间之间只通过它做"广播"交流。
  // - on(event, handler)   订阅，返回取消函数
  // - once(event, handler) 只触发一次
  // - off(event, handler)  取消订阅
  // - emit(event, payload) 广播；单个监听器抛错不影响其他监听器
  function createBus() {
    var channels = Object.create(null);

    function on(event, handler) {
      if (typeof handler !== "function") return function noop() {};
      (channels[event] || (channels[event] = [])).push(handler);
      return function offHandle() { off(event, handler); };
    }

    function once(event, handler) {
      if (typeof handler !== "function") return function noop() {};
      var wrapped = function wrapped(payload) {
        off(event, wrapped);
        handler(payload);
      };
      return on(event, wrapped);
    }

    function off(event, handler) {
      var list = channels[event];
      if (!list) return;
      var idx = list.indexOf(handler);
      if (idx >= 0) list.splice(idx, 1);
    }

    function emit(event, payload) {
      var list = channels[event];
      if (!list || !list.length) return;
      var snapshot = list.slice(); // 防止监听器在遍历时增删自己
      for (var i = 0; i < snapshot.length; i += 1) {
        try {
          snapshot[i](payload);
        } catch (err) {
          if (typeof console !== "undefined" && console.error) {
            console.error('[bus] listener error on "' + event + '":', err);
          }
        }
      }
    }

    return { on: on, once: once, off: off, emit: emit };
  }

  var bus = createBus();
  scope.bus = bus;
  if (typeof module !== "undefined" && module.exports) module.exports = bus;
})(typeof globalThis !== "undefined" ? globalThis : this);
