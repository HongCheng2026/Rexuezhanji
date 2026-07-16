const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const root = path.resolve(__dirname, "..");
const scriptPath = path.join(root, "src/shared/campaignStoryScript.js");
const frameworkPath = path.join(root, "src/shared/campaignStoryFramework.js");

function loadStoryModules() {
  const previous = global.RXGame;
  delete require.cache[require.resolve(scriptPath)];
  delete require.cache[require.resolve(frameworkPath)];
  global.RXGame = {};
  const script = require(scriptPath);
  const framework = require(frameworkPath);
  return { previous, script, framework };
}

test("第一季剧本包含十章和四十个必要场景", () => {
  const loaded = loadStoryModules();
  try {
    const scenes = loaded.script.STORY_SCENES;
    assert.equal(loaded.script.version, 2);
    assert.equal(loaded.script.CHAPTER_STORY_ARCS.length, 10);
    assert.equal(scenes.length, 40);
    assert.equal(new Set(scenes.map((scene) => scene.sceneId)).size, scenes.length);

    const required = [
      "prologue_1_pre",
      "prologue_2_pre",
      "prologue_3_pre",
      "prologue_3_post_win"
    ];
    for (let chapter = 1; chapter <= 9; chapter += 1) {
      required.push(`${chapter}_1_pre`, `${chapter}_5_pre`, `${chapter}_10_pre`, `${chapter}_10_post_win`);
    }
    assert.deepEqual(
      scenes.map((scene) => scene.sceneId).sort(),
      required.sort()
    );
  } finally {
    global.RXGame = loaded.previous;
  }
});

test("所有场景和台词满足可播放结构约束", () => {
  const loaded = loadStoryModules();
  try {
    const speakers = new Set(Object.keys(loaded.script.CHARACTERS));
    const sides = new Set(["left", "right", "center"]);
    const modes = new Set(["character", "system", "messiah"]);
    for (const scene of loaded.script.STORY_SCENES) {
      assert.ok(scene.title, `${scene.sceneId} 应有标题`);
      assert.ok(scene.mood, `${scene.sceneId} 应有情绪基调`);
      assert.ok(scene.lines.length >= 3 && scene.lines.length <= 5, `${scene.sceneId} 应保持3至5句`);
      assert.ok(scene.trigger === "pre_stage" || scene.trigger === "post_win", `${scene.sceneId} 触发类型非法`);
      for (const line of scene.lines) {
        assert.ok(speakers.has(line.speakerId), `${scene.sceneId} 存在未知角色 ${line.speakerId}`);
        assert.ok(line.speakerName, `${scene.sceneId} 存在空角色名`);
        assert.ok(line.text, `${scene.sceneId} 存在空台词`);
        assert.ok([...line.text].length <= 36, `${scene.sceneId} 台词超过36字：${line.text}`);
        assert.ok(sides.has(line.side), `${scene.sceneId} 站位非法`);
        assert.ok(modes.has(line.mode), `${scene.sceneId} 演出模式非法`);
        assert.ok(Number.isFinite(line.pauseMs) && line.pauseMs >= 0, `${scene.sceneId} 停顿非法`);
      }
    }
  } finally {
    global.RXGame = loaded.previous;
  }
});

test("牺牲、取舍和第二季悬念均进入实际可播放场景", () => {
  const loaded = loadStoryModules();
  try {
    const textFor = (sceneId) => loaded.script.STORY_SCENES
      .find((scene) => scene.sceneId === sceneId)
      .lines.map((line) => line.text)
      .join("\n");
    assert.match(textFor("6_10_post_win"), /别替我活，也别替我死/);
    assert.match(textFor("8_10_pre"), /这次别回头。开火/);
    assert.match(textFor("8_10_post_win"), /完整度0\.7%/);
    assert.match(textFor("9_10_post_win"), /不要开门。那不是我/);
    assert.match(textFor("9_10_post_win"), /四十七个归航信号/);
  } finally {
    global.RXGame = loaded.previous;
  }
});

test("框架只查询独立剧本并保持旧接口兼容", () => {
  const loaded = loadStoryModules();
  try {
    assert.equal(loaded.framework.version, 2);
    assert.equal(loaded.framework.STORY_SCENES, loaded.script.STORY_SCENES);
    assert.equal(loaded.framework.getChapterStory(6).shortTitle, "主力决战");
    assert.equal(loaded.framework.getStageStoryScenes({ chapterIndex: 6, stageInChapter: 10 }).length, 2);
    assert.equal(loaded.framework.getStageStoryScenes({ chapterIndex: 6, stageInChapter: 10, trigger: "pre_stage" })[0].sceneId, "6_10_pre");
    assert.match(loaded.framework.getBattleStoryText({ chapterIndex: 6, stageInChapter: 10, key: "clear" }), /白凌通讯终止/);
    assert.equal(loaded.framework.getBattleStoryTimeline({ chapterIndex: 1, stageInChapter: 1 }).length, 5);

    const profile = {};
    const scene = loaded.framework.getNextUnseenStoryScene({ profile, chapterIndex: 1, stageInChapter: 1, trigger: "pre_stage" });
    assert.equal(scene.sceneId, "1_1_pre");
    loaded.framework.markStorySceneSeen(profile, scene.sceneId);
    assert.equal(loaded.framework.isStorySceneSeen(profile, scene.sceneId), true);
    assert.equal(loaded.framework.getNextUnseenStoryScene({ profile, chapterIndex: 1, stageInChapter: 1, trigger: "pre_stage" }), null);
  } finally {
    global.RXGame = loaded.previous;
  }
});

test("H5 按剧本、框架、兼容层顺序加载", () => {
  const loader = fs.readFileSync(path.join(root, "src/h5/shared-loader.js"), "utf8");
  const scriptIndex = loader.indexOf('"campaignStoryScript.js"');
  const frameworkIndex = loader.indexOf('"campaignStoryFramework.js"');
  const compatibilityIndex = loader.indexOf('"stageStoryConfig.js"');
  assert.ok(scriptIndex >= 0, "独立剧本应注册到加载器");
  assert.ok(scriptIndex < frameworkIndex, "剧本应先于剧情框架加载");
  assert.ok(frameworkIndex < compatibilityIndex, "剧情框架应先于兼容层加载");
});
