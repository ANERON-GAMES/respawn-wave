import assert from "node:assert/strict";
import test from "node:test";
import { assignRespawn, earliestWave } from "../src/index.js";
import { oracleAssign, oracleWave } from "./oracle.js";

const MAX = Number.MAX_SAFE_INTEGER;

test("a death inside the minimum wait rolls to the following wave", () => {
  const caught = assignRespawn({ diedAt: 7, interval: 10, minimumWait: 3, offset: 0 });
  const rolled = assignRespawn({ diedAt: 8, interval: 10, minimumWait: 3, offset: 0 });
  assert.deepEqual(caught, {
    diedAt: 7,
    interval: 10,
    minimumWait: 3,
    offset: 0,
    eligibleAt: 10,
    respawnAt: 10,
    wait: 3
  });
  assert.deepEqual(rolled, {
    diedAt: 8,
    interval: 10,
    minimumWait: 3,
    offset: 0,
    eligibleAt: 11,
    respawnAt: 20,
    wait: 12
  });
  assert.equal(Object.isFrozen(caught), true);
  assert.equal(Object.isFrozen(rolled), true);
});

test("a death exactly on a wave respawns there when the minimum wait is 0", () => {
  const exact = assignRespawn({ diedAt: 20, interval: 10, minimumWait: 0, offset: 0 });
  assert.equal(exact.eligibleAt, 20);
  assert.equal(exact.respawnAt, 20);
  assert.equal(exact.wait, 0);
});

test("a minimum wait longer than the interval skips whole waves", () => {
  const longWait = assignRespawn({ diedAt: 0, interval: 10, minimumWait: 25, offset: 0 });
  assert.equal(longWait.eligibleAt, 25);
  assert.equal(longWait.respawnAt, 30);
  assert.equal(longWait.wait, 30);
});

test("the phase offset moves the first wave and the later ones", () => {
  const phased = assignRespawn({ diedAt: 0, interval: 10, minimumWait: 0, offset: 4 });
  const caught = assignRespawn({ diedAt: 1, interval: 10, minimumWait: 3, offset: 4 });
  const missed = assignRespawn({ diedAt: 2, interval: 10, minimumWait: 3, offset: 4 });
  assert.equal(phased.respawnAt, 4);
  assert.equal(phased.wait, 4);
  assert.equal(caught.eligibleAt, 4);
  assert.equal(caught.respawnAt, 4);
  assert.equal(caught.wait, 3);
  assert.equal(missed.eligibleAt, 5);
  assert.equal(missed.respawnAt, 14);
  assert.equal(missed.wait, 12);
});

test("an omitted offset is 0 and an explicit 0 matches it", () => {
  const omitted = assignRespawn({ diedAt: 8, interval: 10, minimumWait: 3 });
  const explicit = assignRespawn({ diedAt: 8, interval: 10, minimumWait: 3, offset: 0 });
  assert.deepEqual(omitted, explicit);
  assert.equal(omitted.offset, 0);
});

test("earliestWave returns the wave at or after the given time", () => {
  assert.equal(earliestWave({ time: 11, interval: 10, offset: 0 }), 20);
  assert.equal(earliestWave({ time: 10, interval: 10, offset: 0 }), 10);
  assert.equal(earliestWave({ time: 0, interval: 10, offset: 5 }), 5);
  assert.equal(earliestWave({ time: 6, interval: 10, offset: 5 }), 15);
  assert.equal(earliestWave({ time: 5, interval: 10, offset: 5 }), 5);
  assert.equal(earliestWave({ time: 0, interval: 10 }), 0);
});

test("negative zero is stored as zero", () => {
  const assigned = assignRespawn({
    diedAt: -0,
    interval: 10,
    minimumWait: -0,
    offset: -0
  });
  assert.equal(Object.is(assigned.diedAt, 0), true);
  assert.equal(Object.is(assigned.minimumWait, 0), true);
  assert.equal(Object.is(assigned.offset, 0), true);
  assert.equal(Object.is(assigned.respawnAt, 0), true);
  assert.equal(Object.is(earliestWave({ time: -0, interval: 10, offset: -0 }), 0), true);
});

test("the closed form matches walking the interval on a dense grid", () => {
  for (let interval = 1; interval <= 12; interval += 1) {
    for (let offset = 0; offset < interval; offset += 1) {
      for (let time = 0; time <= 48; time += 1) {
        assert.equal(earliestWave({ time, interval, offset }), oracleWave(time, interval, offset));
      }
      for (let minimumWait = 0; minimumWait <= 15; minimumWait += 1) {
        for (let diedAt = 0; diedAt <= 40; diedAt += 1) {
          const actual = assignRespawn({ diedAt, interval, minimumWait, offset });
          assert.deepEqual(actual, oracleAssign(diedAt, minimumWait, interval, offset));
          assert.equal(actual.wait >= minimumWait, true);
          assert.equal(actual.wait < minimumWait + interval, true);
        }
      }
    }
  }
});

test("values at the safe integer boundary stay exact or throw", () => {
  const landed = MAX - (MAX % 10);
  assert.equal(earliestWave({ time: landed, interval: 10, offset: 0 }), landed);
  assert.equal(earliestWave({ time: MAX, interval: 2, offset: 1 }), MAX);
  assert.equal(earliestWave({ time: 1, interval: MAX, offset: 0 }), MAX);
  assert.equal(
    assignRespawn({ diedAt: landed, interval: 10, minimumWait: 0, offset: 0 }).respawnAt,
    landed
  );
  const wide = assignRespawn({ diedAt: 1, interval: MAX, minimumWait: 0, offset: 0 });
  assert.equal(wide.respawnAt, MAX);
  assert.equal(wide.wait, MAX - 1);
  assert.throws(() => earliestWave({ time: landed + 1, interval: 10, offset: 0 }), {
    name: "RangeError",
    message: "respawn time must be a safe integer"
  });
  assert.throws(() => earliestWave({ time: MAX, interval: 2, offset: 0 }), {
    name: "RangeError",
    message: "respawn time must be a safe integer"
  });
  assert.throws(() => assignRespawn({ diedAt: MAX, interval: 2, minimumWait: 1, offset: 0 }), {
    name: "RangeError",
    message: "eligible time must be a safe integer"
  });
  assert.throws(() => assignRespawn({ diedAt: MAX, interval: 2, minimumWait: 0, offset: 0 }), {
    name: "RangeError",
    message: "respawn time must be a safe integer"
  });
});

test("the same assignment input returns a new frozen object", () => {
  const options = { diedAt: 8, interval: 10, minimumWait: 3, offset: 0 };
  const first = assignRespawn(options);
  const second = assignRespawn(options);
  assert.deepEqual(first, second);
  assert.equal(first === second, false);
  options.diedAt = 0;
  assert.equal(first.diedAt, 8);
  assert.equal(assignRespawn(options).respawnAt, 10);
});

test("1.0 is an integer and unknown fields are ignored", () => {
  const assigned = assignRespawn({
    diedAt: 8.0,
    interval: 10.0,
    minimumWait: 3.0,
    offset: 0.0,
    note: "kept-off-the-result"
  });
  assert.equal(assigned.respawnAt, 20);
  assert.equal(Object.hasOwn(assigned, "note"), false);
});
