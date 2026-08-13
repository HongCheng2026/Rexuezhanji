"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const backendPaths = [
  path.join(root, "src", "backend", "functions", "game-api", "index.ts"),
  path.join(root, "supabase", "functions", "game-api", "index.ts")
];

test("两套云端入口都保留十级自动技能和完整六槽配装字段", () => {
  for (const backendPath of backendPaths) {
    const source = fs.readFileSync(backendPath, "utf8");
    assert.doesNotMatch(source, /maxLevel:\s*9|Math\.min\(9,\s*supplied\)|currentLevel\s*>=\s*9/, backendPath);
    assert.match(source, /maxLevel:\s*10|Math\.min\(10,\s*supplied\)/, backendPath);
    assert.match(source, /fixedWeaponOverrides/, backendPath);
    assert.match(source, /upgrade-auto-weapon-components/, backendPath);
    assert.match(source, /upgrade-passive-skill/, backendPath);
  }
});
