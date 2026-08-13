(function registerTaskSystem(root) {
  "use strict";

  var scope = root.RXGame || (root.RXGame = {});

  function getCatalog() {
    return scope.taskCatalog || { tracks: [], tasks: [], activityRewards: [] };
  }

  function toNumber(value) {
    return Math.max(0, Math.floor(Number(value) || 0));
  }

  function shanghaiDateKey(date) {
    if (scope.worldTimeSystem && typeof scope.worldTimeSystem.dateKey === "function") return scope.worldTimeSystem.dateKey(date);
    if (scope.shanghaiDateKey) return scope.shanghaiDateKey(date);
    var value = date instanceof Date ? date : new Date();
    var utc = value.getTime() + value.getTimezoneOffset() * 60000;
    var cst = new Date(utc + 28800000);
    return cst.getFullYear() + "-" + String(cst.getMonth() + 1).padStart(2, "0") + "-" + String(cst.getDate()).padStart(2, "0");
  }

  function getTracks() {
    return getCatalog().tracks.slice();
  }

  function getTrack(trackId) {
    return getTracks().filter(function (track) { return track.id === trackId; })[0] || null;
  }

  function getTasks(trackId) {
    return getCatalog().tasks.filter(function (task) { return !trackId || task.track === trackId; });
  }

  function getTask(taskId) {
    return getTasks().filter(function (task) { return task.id === taskId; })[0] || null;
  }

  function getFighterLevels(profile) {
    if (scope.fighterUpgradeApi && typeof scope.fighterUpgradeApi.getLevels === "function") {
      return scope.fighterUpgradeApi.getLevels(profile || {}) || {};
    }
    return (profile && profile.fighterUpgrades) || {};
  }

  function getUpgradeTotal(profile) {
    var fighter = getFighterLevels(profile);
    return ["attack", "hp", "armorPenetration"].reduce(function (sum, key) {
      return sum + Math.max(1, toNumber(fighter[key]) || 1);
    }, 0);
  }

  function hasClearedStage(profile, stageId) {
    var ids = profile && profile.progress && Array.isArray(profile.progress.clearedStageIds)
      ? profile.progress.clearedStageIds
      : [];
    var target = String(stageId || "").replace(/-/g, "_");
    return ids.some(function (id) { return String(id || "").replace(/-/g, "_") === target; });
  }

  function getShipRank(profile) {
    var shipId = String(profile && profile.scene && profile.scene.shipId || "");
    if (scope.shipSkills && typeof scope.shipSkills.shipRankById === "function") {
      return String(scope.shipSkills.shipRankById(shipId) || "");
    }
    return "";
  }

  function getConditionMetric(condition, profile) {
    condition = condition || {};
    profile = profile || {};
    var progress = profile.progress || {};
    var type = condition.type || "";
    var clearCount = Math.max(toNumber(progress.clearCount), Array.isArray(profile.completed) ? profile.completed.length : 0);
    var fighter = getFighterLevels(profile);

    if (type === "login") return 1;
    if (type === "clear_count") return clearCount;
    if (type === "clear_stage") return hasClearedStage(profile, condition.stageId) ? 1 : 0;
    if (type === "perfect_count") return toNumber(progress.perfectClearCount);
    if (type === "no_damage_boss_count") return toNumber(progress.noDamageBossClearCount);
    if (type === "fighter_upgrade") return Math.max(1, toNumber(fighter[condition.stat]) || 1);
    if (type === "fighter_upgrade_any") return Math.max(0, getUpgradeTotal(profile) - 3);
    if (type === "fighter_upgrade_total") return getUpgradeTotal(profile);
    if (type === "earned_gold") return toNumber(profile.localEarned && profile.localEarned.gold);
    if (type === "owned_pilots") return Array.isArray(profile.owned && profile.owned.pilots) ? profile.owned.pilots.length : 0;
    if (type === "owned_ships") return Array.isArray(profile.owned && profile.owned.ships) ? profile.owned.ships.length : 0;
    if (type === "selected_ship_rank") return (condition.ranks || []).indexOf(getShipRank(profile)) >= 0 ? 1 : 0;
    return -1;
  }

  function getDailyClaimIds(profile) {
    var record = profile && profile.claimedDailyTasks;
    return record && record.date === shanghaiDateKey() && Array.isArray(record.ids) ? record.ids : [];
  }

  function getActivityClaimPoints(profile) {
    var record = profile && profile.claimedDailyActivityRewards;
    return record && record.date === shanghaiDateKey() && Array.isArray(record.points) ? record.points : [];
  }

  function isClaimed(task, profile) {
    if (!task) return false;
    if (task.track === "daily") return getDailyClaimIds(profile).indexOf(task.id) >= 0;
    var claimed = profile && Array.isArray(profile.claimedTasks) ? profile.claimedTasks : [];
    return claimed.indexOf(task.id) >= 0;
  }

  function getTaskState(task, profile) {
    if (!task) return null;
    var target = toNumber(task.condition && task.condition.target);
    var rawCurrent = getConditionMetric(task.condition, profile);
    var current = rawCurrent < 0 ? 0 : Math.min(rawCurrent, target);
    var claimed = isClaimed(task, profile);
    var ready = !claimed && rawCurrent >= target && rawCurrent >= 0;
    return {
      task: task,
      current: current,
      rawCurrent: rawCurrent,
      target: target,
      percent: Math.max(0, Math.min(100, Math.round((current / Math.max(1, target)) * 100))),
      claimed: claimed,
      ready: ready,
      status: claimed ? "claimed" : ready ? "ready" : "active"
    };
  }

  function stateWeight(state) {
    if (state.ready) return 0;
    if (!state.claimed) return 1;
    return 2;
  }

  function getTaskStates(profile, trackId) {
    return getTasks(trackId).map(function (task) {
      return getTaskState(task, profile);
    }).sort(function (a, b) {
      var difference = stateWeight(a) - stateWeight(b);
      return difference || toNumber(a.task.priority) - toNumber(b.task.priority);
    });
  }

  function getDailyActivity(profile) {
    return getTasks("daily").reduce(function (sum, task) {
      var state = getTaskState(task, profile);
      return sum + (state && (state.ready || state.claimed) ? toNumber(task.activity) : 0);
    }, 0);
  }

  function getActivityRewardStates(profile) {
    var activity = getDailyActivity(profile);
    var claimed = getActivityClaimPoints(profile);
    return getCatalog().activityRewards.map(function (reward) {
      var isClaimed = claimed.indexOf(reward.points) >= 0;
      return {
        reward: reward,
        claimed: isClaimed,
        ready: !isClaimed && activity >= reward.points,
        status: isClaimed ? "claimed" : activity >= reward.points ? "ready" : "locked"
      };
    });
  }

  function getSnapshot(profile, trackId) {
    var activeTrack = getTrack(trackId) || getTracks()[0] || { id: "daily", label: "任务" };
    var states = getTaskStates(profile, activeTrack.id);
    var ready = states.filter(function (state) { return state.ready; });
    var active = states.filter(function (state) { return state.status === "active"; });
    var claimed = states.filter(function (state) { return state.claimed; });
    return {
      track: activeTrack,
      tracks: getTracks(),
      tasks: states,
      focus: ready[0] || active[0] || claimed[0] || null,
      summary: {
        total: states.length,
        ready: ready.length,
        active: active.length,
        claimed: claimed.length,
        completed: ready.length + claimed.length
      },
      activity: getDailyActivity(profile),
      activityRewards: getActivityRewardStates(profile)
    };
  }

  function addUnique(list, value) {
    if (list.indexOf(value) < 0) list.push(value);
    return list;
  }

  function applyRewards(profile, rewards) {
    profile.resources = profile.resources || {};
    profile.resources.inventory = profile.resources.inventory || {};
    (rewards || []).forEach(function (reward) {
      var amount = toNumber(reward.amount);
      if (reward.type === "gold") {
        profile.resources.gold = toNumber(profile.resources.gold != null ? profile.resources.gold : profile.coins) + amount;
        profile.coins = profile.resources.gold;
      } else if (reward.type === "diamonds") {
        profile.resources.diamonds = toNumber(profile.resources.diamonds) + amount;
      } else if (reward.type === "energy") {
        var maximum = toNumber(profile.resources.maxEnergy);
        var nextEnergy = toNumber(profile.resources.energy) + amount;
        profile.resources.energy = maximum ? Math.min(maximum, nextEnergy) : nextEnergy;
      } else if (reward.type === "item") {
        var itemId = reward.itemId || "item";
        profile.resources.inventory[itemId] = toNumber(profile.resources.inventory[itemId]) + amount;
      }
    });
  }

  function claimTask(profile, taskId) {
    profile = profile || {};
    var task = getTask(taskId);
    var state = getTaskState(task, profile);
    if (!task) return { ok: false, reason: "TASK_NOT_FOUND" };
    if (state.claimed) return { ok: false, reason: "TASK_CLAIMED" };
    if (!state.ready) return { ok: false, reason: "TASK_LOCKED" };
    if (task.track === "daily") {
      var dailyIds = getDailyClaimIds(profile).slice();
      profile.claimedDailyTasks = { date: shanghaiDateKey(), ids: addUnique(dailyIds, task.id) };
    } else {
      profile.claimedTasks = addUnique(Array.isArray(profile.claimedTasks) ? profile.claimedTasks : [], task.id);
    }
    applyRewards(profile, task.rewards);
    return { ok: true, task: task, rewards: task.rewards || [] };
  }

  function claimActivityReward(profile, rawPoints) {
    profile = profile || {};
    var points = toNumber(rawPoints);
    var state = getActivityRewardStates(profile).filter(function (entry) {
      return entry.reward.points === points;
    })[0];
    if (!state) return { ok: false, reason: "ACTIVITY_REWARD_NOT_FOUND" };
    if (state.claimed) return { ok: false, reason: "ACTIVITY_REWARD_CLAIMED" };
    if (!state.ready) return { ok: false, reason: "ACTIVITY_NOT_ENOUGH" };
    profile.claimedDailyActivityRewards = {
      date: shanghaiDateKey(),
      points: addUnique(getActivityClaimPoints(profile).slice(), points)
    };
    applyRewards(profile, state.reward.rewards);
    return { ok: true, rewards: state.reward.rewards || [], points: points };
  }

  function getReadyCount(profile) {
    var taskReady = getTaskStates(profile).filter(function (state) { return state.ready; }).length;
    var activityReady = getActivityRewardStates(profile).filter(function (state) { return state.ready; }).length;
    return taskReady + activityReady;
  }

  var api = {
    getTracks: getTracks,
    getTrack: getTrack,
    getTasks: getTasks,
    getTask: getTask,
    getTaskState: getTaskState,
    getTaskStates: getTaskStates,
    getSnapshot: getSnapshot,
    getConditionMetric: getConditionMetric,
    getDailyActivity: getDailyActivity,
    getActivityRewardStates: getActivityRewardStates,
    getReadyCount: getReadyCount,
    claimTask: claimTask,
    claimActivityReward: claimActivityReward,
    applyRewards: applyRewards,
    shanghaiDateKey: shanghaiDateKey,

    getTaskConfig: function getTaskConfig() { return getTasks(); },
    getDailyTasks: function getDailyTasks() { return getTasks("daily"); },
    getGrowthTasks: function getGrowthTasks() { return getTasks("growth"); },
    getTaskMetric: function getTaskMetric(taskId, profile) {
      var task = getTask(taskId);
      return task ? getConditionMetric(task.condition, profile) : -1;
    },
    isTaskComplete: function isTaskComplete(task, profile) {
      var state = getTaskState(task, profile);
      return !!state && (state.ready || state.claimed);
    },
    getTaskStatus: function getTaskStatus(task, profile) {
      var state = getTaskState(task, profile);
      return !state ? "in_progress" : state.claimed ? "claimed" : state.ready ? "completed" : "in_progress";
    }
  };

  scope.taskSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
