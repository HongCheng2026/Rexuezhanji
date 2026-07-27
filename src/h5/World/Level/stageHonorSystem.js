(function registerStageHonorSystem(root) {
  const scope = root.RXGame || (root.RXGame = {});

  const HONOR_TIERS = Object.freeze([
    Object.freeze({ tier: 0, stars: 0, label: "未通关", crownKey: "" }),
    Object.freeze({ tier: 1, stars: 1, label: "1星", crownKey: "" }),
    Object.freeze({ tier: 2, stars: 2, label: "2星", crownKey: "" }),
    Object.freeze({ tier: 3, stars: 3, label: "3星", crownKey: "" }),
    Object.freeze({ tier: 4, stars: 3, label: "3星金冠", crownKey: "crownGold" }),
    Object.freeze({ tier: 5, stars: 3, label: "3星彩冠", crownKey: "crownColorful" })
  ]);

  function normalizeTier(value) {
    return Math.max(0, Math.min(5, Math.floor(Number(value) || 0)));
  }

  function readTier(value) {
    if (value && typeof value === "object") {
      return normalizeTier(Math.max(
        Number(value.bestHonorTier) || 0,
        Number(value.honorTier) || 0,
        Number(value.tier) || 0,
        Number(value.stars) || 0
      ));
    }
    return normalizeTier(value);
  }

  function getStageKey(level) {
    if (!level) return "";
    const chapterIndex = Math.max(0, Math.floor(Number(level.chapterIndex) || 0));
    const stageInChapter = Math.max(1, Math.floor(Number(level.stageInChapter) || 1));
    return chapterIndex === 0 ? `prologue_${stageInChapter}` : `${chapterIndex}_${stageInChapter}`;
  }

  function getStageAliases(level) {
    if (!level) return [];
    const key = getStageKey(level);
    const values = [
      key,
      key.replace(/_/g, "-"),
      level.stageId,
      level.id,
      level.id != null ? String(level.id) : "",
      level.code,
      String(level.code || "").replace(/-/g, "_"),
      String(level.code || "").replace(/_/g, "-")
    ];
    return Array.from(new Set(values.filter(function keepAlias(value) { return value !== "" && value != null; }).map(String)));
  }

  function readBestFromMap(map, aliases) {
    if (!map || typeof map !== "object") return 0;
    return aliases.reduce(function findBest(best, key) {
      return Math.max(best, readTier(map[key]));
    }, 0);
  }

  function createHonorViewModel(tier) {
    const normalizedTier = normalizeTier(tier);
    const definition = HONOR_TIERS[normalizedTier];
    return {
      tier: definition.tier,
      stars: definition.stars,
      label: definition.label,
      crownKey: definition.crownKey,
      hasCrown: Boolean(definition.crownKey)
    };
  }

  function getStageHonor(profile, level) {
    const aliases = getStageAliases(level);
    const progress = profile && profile.progress || {};
    const tier = Math.max(
      readBestFromMap(progress.stageHonors, aliases),
      readBestFromMap(progress.stageStars, aliases),
      readBestFromMap(profile && profile.ratings, aliases)
    );
    return createHonorViewModel(tier);
  }

  function recordStageHonor(profile, level, rating) {
    if (!profile || !level) return createHonorViewModel(0);
    const previous = getStageHonor(profile, level);
    const nextTier = Math.max(previous.tier, readTier(rating));
    const next = createHonorViewModel(nextTier);
    const stageKey = getStageKey(level);

    profile.progress = profile.progress || {};
    profile.progress.stageHonors = profile.progress.stageHonors || {};
    profile.progress.stageStars = profile.progress.stageStars || {};
    profile.ratings = profile.ratings || {};
    profile.progress.stageHonors[stageKey] = next.tier;
    profile.progress.stageStars[level.id] = Math.max(readTier(profile.progress.stageStars[level.id]), next.stars);
    profile.ratings[level.id] = Math.max(readTier(profile.ratings[level.id]), next.stars);

    return Object.assign({}, next, {
      previousTier: previous.tier,
      isNewRecord: next.tier > previous.tier,
      stageKey
    });
  }

  function migrateProfileStageHonors(profile, levels) {
    if (!profile || !Array.isArray(levels)) return profile;
    levels.forEach(function migrateLevel(level) {
      const honor = getStageHonor(profile, level);
      if (honor.tier <= 0) return;
      profile.progress = profile.progress || {};
      profile.progress.stageHonors = profile.progress.stageHonors || {};
      const stageKey = getStageKey(level);
      profile.progress.stageHonors[stageKey] = Math.max(
        readTier(profile.progress.stageHonors[stageKey]),
        honor.tier
      );
    });
    return profile;
  }

  const api = {
    HONOR_TIERS,
    normalizeTier,
    readTier,
    getStageKey,
    getStageAliases,
    createHonorViewModel,
    getStageHonor,
    recordStageHonor,
    migrateProfileStageHonors
  };

  scope.stageHonorSystem = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : this);
