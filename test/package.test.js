import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { assignRespawn, earliestWave, planWaves } from "../src/index.js";
import * as api from "../src/index.js";

const root = new URL("..", import.meta.url);

test("public exports stay limited to the documented surface", () => {
  assert.deepEqual(Object.keys(api).sort(), ["assignRespawn", "earliestWave", "planWaves"]);
  assert.equal(typeof api.planWaves, "function");
  assert.equal(typeof api.assignRespawn, "function");
  assert.equal(typeof api.earliestWave, "function");
  assert.equal(planWaves, api.planWaves);
  assert.equal(assignRespawn, api.assignRespawn);
  assert.equal(earliestWave, api.earliestWave);
});

test("package metadata names the module and the author", () => {
  const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));
  assert.equal(pkg.name, "@aneron/respawn-wave");
  assert.equal(pkg.license, "MIT");
  assert.equal(pkg.author, "Vadim Gubin");
  assert.equal(pkg.type, "module");
  assert.equal(pkg.sideEffects, false);
  assert.equal(pkg.engines.node, ">=20");
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.dependencies, undefined);
  assert.equal(pkg.main, "./src/index.js");
  assert.equal(pkg.exports, "./src/index.js");
  assert.equal(pkg.repository.type, "git");
  assert.equal(pkg.repository.url, "git+https://github.com/ANERON-GAMES/respawn-wave.git");
  assert.deepEqual(pkg.files, ["src", "LICENSE", "README.md"]);
  assert.equal(pkg.scripts.test, "node --test test/*.test.js");
  assert.equal(pkg.scripts.lint, "eslint .");
  assert.equal(pkg.scripts.format, "prettier --write .");
  assert.equal(pkg.scripts["format:check"], "prettier --check .");
  const license = readFileSync(new URL("LICENSE", root), "utf8");
  assert.equal(license.includes("Copyright (c) 2026 Vadim Gubin"), true);
  assert.equal(license.includes("anerongames"), false);
  const readme = readFileSync(new URL("README.md", root), "utf8");
  for (const heading of [
    "## Purpose",
    "## Install",
    "## Usage",
    "## API",
    "## Design notes",
    "## License"
  ]) {
    assert.equal(readme.includes(heading), true, heading);
  }
  assert.equal(readme.includes('`plan.waves[0].ids` is `["player-a", "player-b"]`'), true);
  assert.equal(readme.includes("`plan.waves[0].at` is `10`"), true);
  assert.equal(readme.includes("`plan.waves[0].remaining` is `2`"), true);
  assert.equal(readme.includes('`plan.waves[1].ids` is `["player-c"]`'), true);
  assert.equal(readme.includes("`plan.waves[1].at` is `20`"), true);
  assert.equal(readme.includes("`plan.players[2].wait` is `12`"), true);
  assert.equal(readme.includes("`plan.players[2].eligibleAt` is `11`"), true);
  assert.equal(readme.includes('`staggered.waves[0].team` is `"blue"`'), true);
  assert.equal(readme.includes("`staggered.waves[0].at` is `5`"), true);
  assert.equal(readme.includes('`staggered.waves[0].ids` is `["player-c"]`'), true);
  assert.equal(readme.includes('`staggered.waves[1].ids` is `["player-a", "player-b"]`'), true);
  assert.equal(readme.includes("`staggered.waves[2].at` is `15`"), true);
  assert.equal(readme.includes('`staggered.waves[2].ids` is `["player-d"]`'), true);
  assert.equal(readme.includes("`staggered.players[3].respawnAt` is `15`"), true);
  assert.equal(readme.includes("`staggered.players[3].wait` is `12`"), true);
  assert.equal(readme.includes("`caught.respawnAt` is `10`"), true);
  assert.equal(readme.includes("`caught.wait` is `3`"), true);
  assert.equal(readme.includes("`rolled.respawnAt` is `20`"), true);
  assert.equal(readme.includes("`rolled.wait` is `12`"), true);
  assert.equal(readme.includes("`exact.respawnAt` is `20`"), true);
  assert.equal(readme.includes("`exact.wait` is `0`"), true);
  assert.equal(readme.includes("`longWait.respawnAt` is `30`"), true);
  assert.equal(readme.includes("`phased.respawnAt` is `4`"), true);
  assert.equal(readme.includes("`missedPhase.respawnAt` is `14`"), true);
  assert.equal(
    readme.includes("`earliestWave({ time: 11, interval: 10, offset: 0 })` is `20`"),
    true
  );
  assert.equal(
    readme.includes("`earliestWave({ time: 0, interval: 10, offset: 5 })` is `5`"),
    true
  );
  assert.equal(readme.includes("`late.waves[0].remaining` is `-15`"), true);
  assert.equal(readme.includes("`late.players[0].respawnAt` is `10`"), true);
  assert.equal(readme.includes("`shared.waves[0].team` is `null`"), true);
  assert.equal(readme.includes('`shared.waves[1].team` is `"red"`'), true);
  assert.equal(readme.includes("`players[0].diedAt` is still `0`"), true);
  assert.equal(readme.includes('`players[0].id` is still `"player-a"`'), true);
});

test("source files do not contain comments, clocks, timers, or network calls", () => {
  const files = readdirSync(new URL("src/", root)).sort();
  assert.deepEqual(files, ["index.js", "plan.js", "read.js", "shape.js", "wave.js"]);
  for (const name of files) {
    const source = readFileSync(new URL("src/" + name, root), "utf8");
    const specifiers = source.match(/from "[^"]+"/g) ?? [];
    assert.equal(specifiers.length > 0 || !source.includes("import "), true, name);
    for (const specifier of specifiers) {
      assert.match(specifier, /^from "\.\/[a-z]+\.js"$/);
    }
    assert.equal(source.includes("node:"), false, name);
    assert.equal(source.includes("require("), false, name);
    assert.equal(source.includes("/*"), false, name);
    assert.equal(source.includes("//"), false, name);
    for (const token of [
      "Date",
      "setTimeout",
      "setInterval",
      "Math.random",
      "process",
      "fetch(",
      "globalThis",
      "queueMicrotask",
      "setImmediate",
      "performance"
    ]) {
      assert.equal(source.includes(token), false, name + " " + token);
    }
  }
});

test("ci runs lint, format, and tests on node 20 and 22", () => {
  const ci = readFileSync(new URL(".github/workflows/ci.yml", root), "utf8");
  assert.equal(ci.includes("node-version: [20, 22]"), true);
  assert.equal(ci.includes("npm ci"), true);
  assert.equal(ci.includes("npm test"), true);
  assert.equal(ci.includes("npm run lint"), true);
  assert.equal(ci.includes("npm run format:check"), true);
});

test("the lockfile resolves only from the npm registry", () => {
  const lockPath = new URL("package-lock.json", root);
  const lock = JSON.parse(readFileSync(lockPath, "utf8"));
  assert.equal(lock.lockfileVersion >= 2, true);
  const text = readFileSync(lockPath, "utf8");
  assert.equal(text.includes("git+"), false);
  assert.equal(text.includes("github:"), false);
  let resolved = 0;
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) {
        walk(item);
      }
      return;
    }
    if (value !== null && typeof value === "object") {
      if (typeof value.resolved === "string") {
        resolved += 1;
        assert.equal(
          value.resolved.startsWith("https://registry.npmjs.org/"),
          true,
          value.resolved
        );
      }
      for (const key of Object.keys(value)) {
        walk(value[key]);
      }
    }
  };
  walk(lock);
  assert.equal(resolved > 0, true);
});
