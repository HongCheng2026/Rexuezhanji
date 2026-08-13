"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const stageHonorSystem = require(path.join(root, "src/h5/World/Level/stageHonorSystem.js"));
const chapterViewSource = fs.readFileSync(path.join(root, "src/h5/UI/ChapterSelect/chapterSelectView.js"), "utf8");

const level = { id: 7, code: "1-4", chapterIndex: 1, stageInChapter: 4 };

test("关卡荣誉统一为三星、金冠、彩冠五档", () => {
  assert.deepEqual(stageHonorSystem.createHonorViewModel(3), {
    tier: 3,
    stars: 3,
    label: "3星",
    crownKey: "",
    hasCrown: false
  });
  assert.deepEqual(stageHonorSystem.createHonorViewModel(5), {
    tier: 5,
    stars: 3,
    label: "3星彩冠",
    crownKey: "crownColorful",
    hasCrown: true
  });
});

test("旧存档的数字ID、关卡代码和规范键都能读取彩冠", () => {
  const profiles = [
    { progress: { stageHonors: { 7: 5 } } },
    { progress: { stageHonors: { "1-4": 5 } } },
    { progress: { stageHonors: { "1_4": 5 } } }
  ];
  for (const profile of profiles) {
    assert.equal(stageHonorSystem.getStageHonor(profile, level).tier, 5);
    assert.equal(stageHonorSystem.getStageHonor(profile, level).crownKey, "crownColorful");
  }
});

test("旧三星记录会迁移到统一键，但不会凭空伪造彩冠", () => {
  const profile = {
    ratings: { 7: 3 },
    progress: { stageStars: { 7: 3 }, stageHonors: {} }
  };
  stageHonorSystem.migrateProfileStageHonors(profile, [level]);
  assert.equal(profile.progress.stageHonors["1_4"], 3);
  assert.equal(stageHonorSystem.getStageHonor(profile, level).label, "3星");
});

test("记录更高荣誉时统一更新荣誉、星级和旧评级入口", () => {
  const profile = { ratings: { 7: 3 }, progress: { stageStars: { 7: 3 }, stageHonors: {} } };
  const first = stageHonorSystem.recordStageHonor(profile, level, { stars: 3, bestHonorTier: 4, honorTier: 5 });
  const second = stageHonorSystem.recordStageHonor(profile, level, { stars: 3, honorTier: 4 });
  assert.equal(first.isNewRecord, true);
  assert.equal(first.tier, 5);
  assert.equal(second.isNewRecord, false);
  assert.equal(profile.progress.stageHonors["1_4"], 5);
  assert.equal(profile.progress.stageStars[7], 3);
  assert.equal(profile.ratings[7], 3);
});

test("已通关但没有评级时不再假显示三星", () => {
  assert.doesNotMatch(chapterViewSource, /completed\s*\?\s*["']★★★/);
  assert.match(chapterViewSource, /completed\s*\?\s*["']已通关/);
  assert.match(chapterViewSource, /stageHonorSystem\.getStageHonor/);
});
