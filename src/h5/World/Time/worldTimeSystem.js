(function registerWorldTimeSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});
  var DEFAULT_TIME_ZONE = "Asia/Shanghai";
  var DEFAULT_UTC_OFFSET_MINUTES = 8 * 60;
  var WEEKDAY_LABELS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  function pad(value) {
    return String(Math.max(0, Math.floor(Number(value) || 0))).padStart(2, "0");
  }

  function parseTimestamp(value) {
    var candidate = value;
    if (value instanceof Date || value && typeof value.getTime === "function") {
      candidate = value.getTime();
    }
    else if (value && typeof value === "object") {
      candidate = value.unixMs != null ? value.unixMs
        : value.timestamp != null ? value.timestamp
          : value.epochMs != null ? value.epochMs
            : value.iso != null ? value.iso
              : value.serverTime;
    }
    if (typeof candidate === "number") {
      if (!isFinite(candidate)) return NaN;
      return candidate > 0 && candidate < 100000000000 ? candidate * 1000 : candidate;
    }
    var parsed = new Date(candidate).getTime();
    return isFinite(parsed) ? parsed : NaN;
  }

  function create(options) {
    options = options || {};
    var timeZone = options.timeZone || DEFAULT_TIME_ZONE;
    var wallNow = typeof options.wallNow === "function" ? options.wallNow : Date.now;
    var monotonicNow = typeof options.monotonicNow === "function"
      ? options.monotonicNow
      : root.performance && typeof root.performance.now === "function"
        ? function performanceNow() { return root.performance.now(); }
        : wallNow;
    var setTimer = options.setTimer || root.setTimeout;
    var clearTimer = options.clearTimer || root.clearTimeout;
    var baseEpochMs = Number(wallNow()) || Date.now();
    var baseMonotonicMs = Number(monotonicNow()) || 0;
    var source = "device";
    var synchronized = false;
    var offsetMs = 0;
    var listeners = [];
    var timer = 0;
    var lastDateKey = "";

    function now() {
      var elapsed = (Number(monotonicNow()) || 0) - baseMonotonicMs;
      return Math.max(0, Math.floor(baseEpochMs + Math.max(0, elapsed)));
    }

    function zonedParts(value) {
      var timestamp = value == null ? now() : parseTimestamp(value);
      if (!isFinite(timestamp)) timestamp = now();
      try {
        var formatter = new Intl.DateTimeFormat("en-US", {
          timeZone: timeZone,
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hourCycle: "h23"
        });
        var values = {};
        formatter.formatToParts(new Date(timestamp)).forEach(function collect(part) {
          if (part.type !== "literal") values[part.type] = part.value;
        });
        var year = Number(values.year);
        var month = Number(values.month);
        var day = Number(values.day);
        return {
          year: year,
          month: month,
          day: day,
          hour: Number(values.hour),
          minute: Number(values.minute),
          second: Number(values.second),
          weekday: new Date(Date.UTC(year, month - 1, day)).getUTCDay()
        };
      } catch (error) {
        var shifted = new Date(timestamp + DEFAULT_UTC_OFFSET_MINUTES * 60000);
        return {
          year: shifted.getUTCFullYear(),
          month: shifted.getUTCMonth() + 1,
          day: shifted.getUTCDate(),
          hour: shifted.getUTCHours(),
          minute: shifted.getUTCMinutes(),
          second: shifted.getUTCSeconds(),
          weekday: shifted.getUTCDay()
        };
      }
    }

    function dateKey(value) {
      var parts = zonedParts(value);
      return parts.year + "-" + pad(parts.month) + "-" + pad(parts.day);
    }

    function weekKey(value) {
      var parts = zonedParts(value);
      var target = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
      var day = (target.getUTCDay() + 6) % 7;
      target.setUTCDate(target.getUTCDate() - day + 3);
      var weekYear = target.getUTCFullYear();
      var firstThursday = new Date(Date.UTC(weekYear, 0, 4));
      var firstDay = (firstThursday.getUTCDay() + 6) % 7;
      firstThursday.setUTCDate(firstThursday.getUTCDate() - firstDay + 3);
      var week = 1 + Math.round((target.getTime() - firstThursday.getTime()) / 604800000);
      return weekYear + "-W" + pad(week);
    }

    function nextDailyResetAt(resetHour) {
      var hour = Math.max(0, Math.min(23, Math.floor(Number(resetHour) || 0)));
      var current = now();
      var parts = zonedParts(current);
      var reset = Date.UTC(parts.year, parts.month - 1, parts.day, hour - 8, 0, 0, 0);
      if (reset <= current) reset += 86400000;
      return reset;
    }

    function snapshot(value) {
      var timestamp = value == null ? now() : parseTimestamp(value);
      if (!isFinite(timestamp)) timestamp = now();
      var parts = zonedParts(timestamp);
      var key = parts.year + "-" + pad(parts.month) + "-" + pad(parts.day);
      return Object.freeze({
        timestamp: timestamp,
        iso: new Date(timestamp).toISOString(),
        timeZone: timeZone,
        utcOffset: "+08:00",
        source: source,
        synchronized: synchronized,
        offsetMs: offsetMs,
        dateKey: key,
        weekKey: weekKey(timestamp),
        dateText: parts.year + "." + pad(parts.month) + "." + pad(parts.day),
        timeText: pad(parts.hour) + ":" + pad(parts.minute) + ":" + pad(parts.second),
        weekdayText: WEEKDAY_LABELS[parts.weekday] || "",
        parts: Object.freeze(parts)
      });
    }

    function emit(eventName, payload) {
      if (scope.bus && typeof scope.bus.emit === "function") scope.bus.emit(eventName, payload);
    }

    function notify() {
      var current = snapshot();
      var previousDateKey = lastDateKey;
      lastDateKey = current.dateKey;
      listeners.slice().forEach(function dispatch(listener) {
        try { listener(current); }
        catch (error) {
          if (root.console && typeof root.console.error === "function") root.console.error("[world-time] listener failed", error);
        }
      });
      emit(scope.events && scope.events.WORLD_TIME_TICK || "world-time:tick", current);
      if (previousDateKey && previousDateKey !== current.dateKey) {
        emit(scope.events && scope.events.WORLD_DATE_CHANGED || "world-time:date-changed", {
          previousDateKey: previousDateKey,
          dateKey: current.dateKey,
          snapshot: current
        });
      }
      return current;
    }

    function schedule() {
      if (timer || !listeners.length || typeof setTimer !== "function") return;
      var delay = Math.max(40, 1020 - (now() % 1000));
      timer = setTimer(function onTimer() {
        timer = 0;
        notify();
        schedule();
      }, delay);
    }

    function subscribe(listener) {
      if (typeof listener !== "function") return function noop() {};
      listeners.push(listener);
      listener(snapshot());
      schedule();
      return function unsubscribe() {
        var index = listeners.indexOf(listener);
        if (index >= 0) listeners.splice(index, 1);
        if (!listeners.length && timer && typeof clearTimer === "function") {
          clearTimer(timer);
          timer = 0;
        }
      };
    }

    function sync(value, metadata) {
      var timestamp = parseTimestamp(value);
      if (!isFinite(timestamp)) return false;
      var receivedAt = Number(wallNow()) || Date.now();
      baseEpochMs = timestamp;
      baseMonotonicMs = Number(monotonicNow()) || 0;
      offsetMs = Math.round(timestamp - receivedAt);
      source = metadata && metadata.source ? String(metadata.source) : "server";
      synchronized = source !== "device";
      var current = notify();
      emit(scope.events && scope.events.WORLD_TIME_SYNCED || "world-time:synced", current);
      schedule();
      return true;
    }

    function millisecondsUntilDailyReset(resetHour) {
      return Math.max(0, nextDailyResetAt(resetHour) - now());
    }

    return {
      now: now,
      date: function date() { return new Date(now()); },
      getParts: zonedParts,
      getSnapshot: snapshot,
      dateKey: dateKey,
      weekKey: weekKey,
      nextDailyResetAt: nextDailyResetAt,
      millisecondsUntilDailyReset: millisecondsUntilDailyReset,
      sync: sync,
      subscribe: subscribe,
      refresh: notify,
      isSynchronized: function isSynchronized() { return synchronized; },
      getSource: function getSource() { return source; },
      TIME_ZONE: timeZone
    };
  }

  var api = create();
  api.create = create;
  scope.worldTimeSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
