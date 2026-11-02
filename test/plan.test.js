import assert from "node:assert/strict";
import test from "node:test";
import { assignRespawn, planWaves } from "../src/index.js";
import { assertPlanShape, player, team } from "./helpers.js";
import { oracleAssign } from "./oracle.js";

test("players who clear the minimum wait share a wave and a late death rolls forward", () => {
  const players = [player("player-a", 0), player("player-b", 7), player("player-c", 8)];
  const plan = planWaves({
    now: 8,
    interval: 10,
    minimumWait: 3,
    players
  });
  assertPlanShape(players, plan);
  assert.equal(plan.now, 8);
  assert.equal(plan.interval, 10);
  assert.equal(plan.minimumWait, 3);
  assert.equal(plan.offset, 0);
  assert.deepEqual(plan.waves, [
    {
      at: 10,
      team: null,
      offset: 0,
      remaining: 2,
      count: 2,
      ids: ["player-a", "player-b"]
    },
    {
      at: 20,
      team: null,
      offset: 0,
      remaining: 12,
      count: 1,
      ids: ["player-c"]
    }
  ]);
  assert.equal(plan.players[0].id, "player-a");
  assert.equal(plan.players[0].eligibleAt, 3);
  assert.equal(plan.players[0].respawnAt, 10);
  assert.equal(plan.players[0].wait, 10);
  assert.equal(plan.players[0].remaining, 2);
  assert.equal(plan.players[0].team, null);
  assert.equal(plan.players[1].id, "player-b");
  assert.equal(plan.players[1].eligibleAt, 10);
  assert.equal(plan.players[1].wait, 3);
  assert.equal(plan.players[2].id, "player-c");
  assert.equal(plan.players[2].eligibleAt, 11);
  assert.equal(plan.players[2].respawnAt, 20);
  assert.equal(plan.players[2].wait, 12);
  assert.equal(plan.players[2].remaining, 12);
  assert.equal(players[0].diedAt, 0);
  assert.equal(players[2].id, "player-c");
});

test("a team offset staggers that team onto its own waves", () => {
  const players = [
    player("player-a", 0, "red"),
    player("player-d", 3, "blue"),
    player("player-b", 4, "red"),
    player("player-c", 0, "blue")
  ];
  const staggered = planWaves({
    now: 4,
    interval: 10,
    minimumWait: 3,
    teams: [team("blue", 5), team("red", 0)],
    players
  });
  assertPlanShape(players, staggered);
  assert.equal(staggered.offset, 0);
  assert.deepEqual(
    staggered.waves.map((wave) => ({
      at: wave.at,
      team: wave.team,
      offset: wave.offset,
      remaining: wave.remaining,
      ids: wave.ids
    })),
    [
      { at: 5, team: "blue", offset: 5, remaining: 1, ids: ["player-c"] },
      { at: 10, team: "red", offset: 0, remaining: 6, ids: ["player-a", "player-b"] },
      { at: 15, team: "blue", offset: 5, remaining: 11, ids: ["player-d"] }
    ]
  );
  assert.equal(staggered.players[0].id, "player-c");
  assert.equal(staggered.players[0].remaining, 1);
  assert.equal(staggered.players[0].respawnAt, 5);
  assert.equal(staggered.players[0].wait, 5);
  assert.equal(staggered.players[1].id, "player-a");
  assert.equal(staggered.players[2].id, "player-b");
  assert.equal(staggered.players[2].wait, 6);
  assert.equal(staggered.players[3].id, "player-d");
  assert.equal(staggered.players[3].respawnAt, 15);
  assert.equal(staggered.players[3].wait, 12);
  assert.equal(staggered.players[3].eligibleAt, 6);
  assert.equal(staggered.waves[0].count, 1);
  assert.equal(staggered.waves[1].count, 2);
  assert.equal(staggered.waves[2].count, 1);
});

test("the same respawn time stays split by team and an unteamed wave sorts first", () => {
  const players = [
    player("player-b", 0, "red"),
    player("player-a", 0),
    player("player-c", 0, "red")
  ];
  const shared = planWaves({
    now: 0,
    interval: 10,
    minimumWait: 3,
    teams: [team("red", 0)],
    players
  });
  assertPlanShape(players, shared);
  assert.equal(shared.waves[0].team, null);
  assert.equal(shared.waves[0].at, 10);
  assert.deepEqual(shared.waves[0].ids, ["player-a"]);
  assert.equal(shared.waves[1].team, "red");
  assert.equal(shared.waves[1].at, 10);
  assert.deepEqual(shared.waves[1].ids, ["player-b", "player-c"]);
  assert.equal(shared.players[0].id, "player-a");
  assert.equal(shared.players[1].id, "player-b");
});

test("id order is UTF-16 order and input order does not change the result", () => {
  const forward = [player("player-b", 1), player("player-A", 1), player("player-a", 2)];
  const reverse = [player("player-a", 2), player("player-A", 1), player("player-b", 1)];
  const first = planWaves({ now: 2, interval: 10, minimumWait: 0, players: forward });
  const second = planWaves({ now: 2, interval: 10, minimumWait: 0, players: reverse });
  assert.deepEqual(first.waves[0].ids, ["player-A", "player-a", "player-b"]);
  assert.deepEqual(first, second);
  assert.equal(first === second, false);
  assert.equal(first.waves === second.waves, false);
  assert.equal(first.waves[0] === second.waves[0], false);
  assert.equal(first.waves[0].ids === second.waves[0].ids, false);
  assert.equal(first.players[0] === second.players[0], false);
});

test("a wave that is already behind now stays in the partition with a negative remaining", () => {
  const players = [player("player-a", 0)];
  const late = planWaves({ now: 25, interval: 10, minimumWait: 3, players });
  assertPlanShape(players, late);
  assert.equal(late.players[0].respawnAt, 10);
  assert.equal(late.players[0].remaining, -15);
  assert.equal(late.waves[0].remaining, -15);
  assert.equal(late.waves[0].at, 10);
});

test("an empty player list and an empty team list are valid", () => {
  const empty = planWaves({ now: 4, interval: 10, minimumWait: 3, players: [] });
  assert.deepEqual(empty.waves, []);
  assert.deepEqual(empty.players, []);
  assert.equal(Object.isFrozen(empty.waves), true);
  const unused = planWaves({
    now: 0,
    interval: 10,
    minimumWait: 0,
    teams: [],
    players: [player("player-a", 0)]
  });
  assert.equal(unused.players[0].team, null);
  assert.equal(unused.players[0].respawnAt, 0);
  assert.equal(unused.waves[0].team, null);
});

test("each planned player matches assignRespawn for that player's offset", () => {
  const players = [
    player("player-a", 0, "red"),
    player("player-b", 6),
    player("player-c", 3, "blue"),
    player("player-d", 9, "red")
  ];
  const plan = planWaves({
    now: 9,
    interval: 10,
    minimumWait: 4,
    offset: 2,
    teams: [team("blue", 5), team("red", 1)],
    players
  });
  assertPlanShape(players, plan);
  assert.equal(plan.offset, 2);
  for (const entry of plan.players) {
    const assigned = assignRespawn({
      diedAt: entry.diedAt,
      interval: plan.interval,
      minimumWait: plan.minimumWait,
      offset: entry.offset
    });
    assert.equal(entry.eligibleAt, assigned.eligibleAt);
    assert.equal(entry.respawnAt, assigned.respawnAt);
    assert.equal(entry.wait, assigned.wait);
    if (entry.team === null) {
      assert.equal(entry.offset, plan.offset);
    }
  }
  assert.equal(plan.players.find((entry) => entry.id === "player-b").offset, 2);
  assert.equal(plan.players.find((entry) => entry.id === "player-c").offset, 5);
  assert.equal(plan.players.find((entry) => entry.id === "player-a").offset, 1);
});

test("two hundred deaths land on the interval boundaries", () => {
  const players = [];
  for (let diedAt = 0; diedAt < 200; diedAt += 1) {
    players.push(player("player-" + String(diedAt).padStart(3, "0"), diedAt));
  }
  const plan = planWaves({ now: 199, interval: 10, minimumWait: 0, players });
  assertPlanShape(players, plan);
  assert.equal(plan.waves.length, 21);
  assert.equal(plan.waves[0].at, 0);
  assert.equal(plan.waves[0].count, 1);
  assert.deepEqual(plan.waves[0].ids, ["player-000"]);
  assert.equal(plan.waves[1].at, 10);
  assert.equal(plan.waves[1].count, 10);
  assert.equal(plan.waves[20].at, 200);
  assert.equal(plan.waves[20].count, 9);
  for (const entry of plan.players) {
    const expected = oracleAssign(entry.diedAt, 0, 10, 0);
    assert.equal(entry.respawnAt, expected.respawnAt);
  }
});

test("inputs are not mutated and a later edit is visible only to a later call", () => {
  const players = [player("player-a", 0), player("player-b", 8)];
  const teams = [team("red", 0)];
  const options = { now: 8, interval: 10, minimumWait: 3, teams, players };
  const plan = planWaves(options);
  players[0].diedAt = 8;
  players[0].id = "changed";
  teams[0].offset = 5;
  options.now = 0;
  assert.equal(plan.players[0].diedAt, 0);
  assert.equal(plan.players[0].id, "player-a");
  assert.equal(plan.now, 8);
  assert.equal(plan.waves[0].ids[0], "player-a");
  assert.throws(() => {
    plan.players.push(player("player-c", 0));
  }, TypeError);
  assert.throws(() => {
    plan.waves[0].ids.push("player-c");
  }, TypeError);
  assert.throws(() => {
    plan.waves.push({});
  }, TypeError);
  const again = planWaves({
    now: 8,
    interval: 10,
    minimumWait: 3,
    players
  });
  assert.equal(again.players[0].id, "changed");
  assert.equal(again.players[0].diedAt, 8);
  assert.equal(again.players[0].respawnAt, 20);
});

test("reserved ids and a one-character space are ordinary ids", () => {
  const players = [player("__proto__", 0), player("constructor", 0), player(" ", 1)];
  const plan = planWaves({
    now: 1,
    interval: 10,
    minimumWait: 0,
    teams: [team("__proto__", 3)],
    players: [player("alpha", 0, "__proto__"), ...players]
  });
  assert.equal(plan.players.find((entry) => entry.id === "__proto__").respawnAt, 0);
  assert.equal(plan.players.find((entry) => entry.id === "alpha").offset, 3);
  assert.equal(plan.players.find((entry) => entry.id === "alpha").respawnAt, 3);
  assert.equal(
    plan.waves.some((wave) => wave.ids.includes(" ")),
    true
  );
  assert.equal(
    plan.waves.some((wave) => wave.ids.includes("constructor")),
    true
  );
});

test("a frozen input and a null-prototype input are accepted", () => {
  const frozen = Object.freeze({
    now: 7,
    interval: 10,
    minimumWait: 3,
    players: Object.freeze([Object.freeze(player("player-a", 7))])
  });
  const plan = planWaves(frozen);
  assert.equal(plan.players[0].respawnAt, 10);
  const bare = Object.assign(Object.create(null), {
    now: 8,
    interval: 10,
    minimumWait: 3,
    players: [player("player-c", 8)]
  });
  assert.equal(planWaves(bare).players[0].respawnAt, 20);
});

test("a default offset applies only to players without a team", () => {
  const plan = planWaves({
    now: 0,
    interval: 10,
    minimumWait: 0,
    offset: 4,
    teams: [team("red", 1)],
    players: [player("player-a", 0), player("player-b", 0, "red")]
  });
  assert.equal(plan.offset, 4);
  assert.equal(plan.players.find((entry) => entry.id === "player-a").respawnAt, 4);
  assert.equal(plan.players.find((entry) => entry.id === "player-b").respawnAt, 1);
  assert.equal(plan.waves[0].team, "red");
  assert.equal(plan.waves[1].team, null);
});
