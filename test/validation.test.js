import assert from "node:assert/strict";
import test from "node:test";
import { assignRespawn, earliestWave, planWaves } from "../src/index.js";
import { player, team, validPlan } from "./helpers.js";

const OPTIONS = "options must be an object";
const INTERVAL = "interval must be an integer greater than or equal to 1";
const MINIMUM_WAIT = "minimumWait must be an integer greater than or equal to 0";
const OFFSET = "offset must be an integer greater than or equal to 0 and less than interval";
const TIME = "time must be an integer greater than or equal to 0";
const DIED_AT = "diedAt must be an integer greater than or equal to 0";
const DIED_AT_ORDER = "diedAt must be less than or equal to now";
const NOW = "now must be an integer greater than or equal to 0";
const TEAMS = "teams must be an array";
const TEAM = "team must be an object";
const TEAM_ID = "team id must be a non-empty string";
const TEAM_UNIQUE = "team ids must be unique";
const TEAM_OFFSET =
  "team offset must be an integer greater than or equal to 0 and less than interval";
const PLAYERS = "players must be an array";
const PLAYER = "player must be an object";
const PLAYER_ID = "player id must be a non-empty string";
const PLAYER_UNIQUE = "player ids must be unique";
const PLAYER_TEAM_REQUIRES = "player team requires teams";
const PLAYER_TEAM = "player team must be a non-empty string";
const PLAYER_TEAM_KNOWN = "player team must be a known team";
const ELIGIBLE = "eligible time must be a safe integer";
const RESPAWN = "respawn time must be a safe integer";

const MAX = Number.MAX_SAFE_INTEGER;

function rejects(fn, name, message) {
  assert.throws(fn, { name, message });
}

test("planWaves rejects a bad options object before it reads fields", () => {
  rejects(() => planWaves(), "TypeError", OPTIONS);
  for (const options of [undefined, null, [], "plan", 1, true, false, () => {}]) {
    rejects(() => planWaves(options), "TypeError", OPTIONS);
  }
});

test("planWaves reads interval, minimumWait, offset, now, teams, players, then times", () => {
  rejects(() => planWaves({}), "RangeError", INTERVAL);
  rejects(
    () => planWaves({ minimumWait: -1, offset: 99, now: -1, teams: null, players: null }),
    "RangeError",
    INTERVAL
  );
  rejects(
    () =>
      planWaves({
        interval: 0,
        minimumWait: 0,
        now: 0,
        players: []
      }),
    "RangeError",
    INTERVAL
  );
  rejects(
    () =>
      planWaves({
        interval: 10,
        offset: 10,
        now: -1,
        teams: {},
        players: null
      }),
    "RangeError",
    MINIMUM_WAIT
  );
  rejects(
    () =>
      planWaves({
        interval: 10,
        minimumWait: -1,
        now: 0,
        players: []
      }),
    "RangeError",
    MINIMUM_WAIT
  );
  rejects(
    () =>
      planWaves({
        interval: 10,
        minimumWait: 0,
        offset: 10,
        now: -1,
        players: null
      }),
    "RangeError",
    OFFSET
  );
  rejects(
    () =>
      planWaves({
        interval: 10,
        minimumWait: 0,
        now: -1,
        teams: {},
        players: null
      }),
    "RangeError",
    NOW
  );
  rejects(
    () =>
      planWaves({
        interval: 10,
        minimumWait: 0,
        now: 0,
        teams: {},
        players: null
      }),
    "TypeError",
    TEAMS
  );
  rejects(
    () =>
      planWaves({
        interval: 10,
        minimumWait: 0,
        now: 0,
        players: null
      }),
    "TypeError",
    PLAYERS
  );
  rejects(
    () =>
      planWaves({
        interval: 10,
        minimumWait: 1,
        now: MAX,
        players: [player("player-a", MAX), { id: "" }]
      }),
    "TypeError",
    PLAYER_ID
  );
  rejects(
    () =>
      planWaves({
        interval: 2,
        minimumWait: 1,
        now: MAX,
        players: [player("player-b", MAX)]
      }),
    "RangeError",
    ELIGIBLE
  );
});

test("interval, minimumWait, offset, and now are own safe integers", () => {
  for (const interval of [
    undefined,
    null,
    true,
    "10",
    0,
    -1,
    1.5,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    MAX + 1
  ]) {
    rejects(() => planWaves(validPlan({ interval })), "RangeError", INTERVAL);
  }
  assert.equal(planWaves(validPlan({ interval: 1.0 })).interval, 1);
  const inherited = Object.create({
    interval: 10,
    minimumWait: 0,
    now: 0,
    players: []
  });
  rejects(() => planWaves(inherited), "RangeError", INTERVAL);
  rejects(() => planWaves(validPlan({ minimumWait: undefined })), "RangeError", MINIMUM_WAIT);
  for (const minimumWait of [null, "0", -1, 0.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    rejects(() => planWaves(validPlan({ minimumWait })), "RangeError", MINIMUM_WAIT);
  }
  assert.equal(planWaves(validPlan({ minimumWait: 0.0 })).minimumWait, 0);
  for (const offset of [null, -1, 10, 10.5, "0", Number.NaN]) {
    rejects(() => planWaves(validPlan({ interval: 10, offset })), "RangeError", OFFSET);
  }
  assert.equal(planWaves(validPlan({ offset: undefined })).offset, 0);
  assert.equal(Object.is(planWaves(validPlan({ offset: -0, now: -0 })).offset, 0), true);
  assert.equal(Object.is(planWaves(validPlan({ offset: -0, now: -0 })).now, 0), true);
  for (const now of [
    undefined,
    null,
    -1,
    1.5,
    "0",
    Number.NaN,
    Number.POSITIVE_INFINITY,
    MAX + 1
  ]) {
    rejects(() => planWaves(validPlan({ now })), "RangeError", NOW);
  }
  assert.equal(planWaves(validPlan({ now: MAX })).now, MAX);
});

test("teams are an array of objects with unique ids and in-range offsets", () => {
  rejects(() => planWaves(validPlan({ teams: null })), "TypeError", TEAMS);
  rejects(() => planWaves(validPlan({ teams: [null] })), "TypeError", TEAM);
  rejects(() => planWaves(validPlan({ teams: [[]] })), "TypeError", TEAM);
  rejects(() => planWaves(validPlan({ teams: [{}] })), "TypeError", TEAM_ID);
  rejects(() => planWaves(validPlan({ teams: [{ id: "" }] })), "TypeError", TEAM_ID);
  rejects(() => planWaves(validPlan({ teams: [{ id: 1, offset: 0 }] })), "TypeError", TEAM_ID);
  rejects(
    () => planWaves(validPlan({ teams: [team("red", 0), team("red", 1)] })),
    "TypeError",
    TEAM_UNIQUE
  );
  rejects(
    () => planWaves(validPlan({ teams: [team("red", 0), { id: "red", offset: "soon" }] })),
    "TypeError",
    TEAM_UNIQUE
  );
  rejects(
    () =>
      planWaves(
        validPlan({
          teams: [
            { id: "red", offset: "soon" },
            { id: "red", offset: 0 }
          ]
        })
      ),
    "RangeError",
    TEAM_OFFSET
  );
  rejects(() => planWaves(validPlan({ teams: [{ id: "red" }] })), "RangeError", TEAM_OFFSET);
  for (const offset of [undefined, null, -1, 10, 1.5, Number.NaN]) {
    rejects(
      () => planWaves(validPlan({ teams: [{ id: "red", offset }] })),
      "RangeError",
      TEAM_OFFSET
    );
  }
  const plan = planWaves(
    validPlan({
      teams: [team("red", 0), team("__proto__", 2), team("constructor", 9)],
      players: [player("player-a", 0, "constructor")]
    })
  );
  assert.equal(plan.players[0].offset, 9);
  assert.equal(plan.players[0].respawnAt, 9);
});

test("players are an array of objects with unique ids and a death at or before now", () => {
  rejects(() => planWaves(validPlan({ players: undefined })), "TypeError", PLAYERS);
  rejects(() => planWaves(validPlan({ players: {} })), "TypeError", PLAYERS);
  rejects(() => planWaves(validPlan({ players: [null] })), "TypeError", PLAYER);
  rejects(() => planWaves(validPlan({ players: [[]] })), "TypeError", PLAYER);
  rejects(
    () => planWaves(validPlan({ players: [player("player-a", 0), undefined] })),
    "TypeError",
    PLAYER
  );
  rejects(() => planWaves(validPlan({ players: [{}] })), "TypeError", PLAYER_ID);
  rejects(() => planWaves(validPlan({ players: [{ id: "", diedAt: 0 }] })), "TypeError", PLAYER_ID);
  rejects(() => planWaves(validPlan({ players: [{ id: 1, diedAt: 0 }] })), "TypeError", PLAYER_ID);
  rejects(
    () => planWaves(validPlan({ players: [player("player-a", 0), player("player-a", -1)] })),
    "TypeError",
    PLAYER_UNIQUE
  );
  rejects(() => planWaves(validPlan({ players: [{ id: "player-a" }] })), "RangeError", DIED_AT);
  for (const diedAt of [null, -1, 1.5, "0", Number.NaN, Number.POSITIVE_INFINITY, MAX + 1]) {
    rejects(
      () => planWaves(validPlan({ players: [{ id: "player-a", diedAt }] })),
      "RangeError",
      DIED_AT
    );
  }
  rejects(
    () => planWaves(validPlan({ now: 4, players: [player("player-a", 5)] })),
    "RangeError",
    DIED_AT_ORDER
  );
  rejects(
    () =>
      planWaves(
        validPlan({
          now: 4,
          players: [{ id: "player-a", diedAt: -1, team: "missing" }]
        })
      ),
    "RangeError",
    DIED_AT
  );
  const boundary = planWaves(validPlan({ now: 4, players: [player("player-a", 4)] }));
  assert.equal(boundary.players[0].diedAt, 4);
  assert.equal(
    Object.is(planWaves(validPlan({ players: [player("player-a", -0)] })).players[0].diedAt, 0),
    true
  );
});

test("a player team requires the team table and must name a known team", () => {
  rejects(
    () => planWaves(validPlan({ players: [player("player-a", 0, "red")] })),
    "TypeError",
    PLAYER_TEAM_REQUIRES
  );
  rejects(
    () => planWaves(validPlan({ players: [{ id: "player-a", diedAt: 0, team: 1 }] })),
    "TypeError",
    PLAYER_TEAM_REQUIRES
  );
  rejects(
    () =>
      planWaves(
        validPlan({
          teams: [],
          players: [{ id: "player-a", diedAt: 0, team: "" }]
        })
      ),
    "TypeError",
    PLAYER_TEAM
  );
  rejects(
    () =>
      planWaves(
        validPlan({
          teams: [team("red", 0)],
          players: [{ id: "player-a", diedAt: 0, team: null }]
        })
      ),
    "TypeError",
    PLAYER_TEAM
  );
  rejects(
    () =>
      planWaves(
        validPlan({
          teams: [team("red", 0)],
          players: [player("player-a", 0, "blue")]
        })
      ),
    "TypeError",
    PLAYER_TEAM_KNOWN
  );
  const inherited = Object.create({ team: "red" });
  inherited.id = "player-a";
  inherited.diedAt = 0;
  const plan = planWaves(validPlan({ teams: [team("red", 3)], players: [inherited] }));
  assert.equal(plan.players[0].team, null);
  assert.equal(plan.players[0].offset, 0);
  const omitted = player("player-a", 0);
  omitted.team = undefined;
  assert.equal(planWaves(validPlan({ players: [omitted] })).players[0].team, null);
});

test("unknown fields are ignored and only own fields are read", () => {
  const options = validPlan({ note: "ignore" });
  Object.defineProperty(options, "extra", {
    enumerable: true,
    get() {
      throw new Error("extra");
    }
  });
  const plan = planWaves(options);
  assert.equal(plan.players[0].id, "player-a");
  assert.equal(Object.hasOwn(plan, "note"), false);
  const entry = player("player-a", 0);
  entry.label = "keep";
  const tagged = planWaves(validPlan({ players: [entry] }));
  assert.equal(Object.hasOwn(tagged.players[0], "label"), false);
  assert.equal(entry.label, "keep");
});

test("assignRespawn checks interval, minimumWait, offset, diedAt, then the sum", () => {
  rejects(() => assignRespawn(), "TypeError", OPTIONS);
  rejects(() => assignRespawn([]), "TypeError", OPTIONS);
  rejects(() => assignRespawn({}), "RangeError", INTERVAL);
  rejects(() => assignRespawn({ minimumWait: -1, offset: 4, diedAt: -1 }), "RangeError", INTERVAL);
  rejects(() => assignRespawn({ interval: 10, offset: 3, diedAt: 0 }), "RangeError", MINIMUM_WAIT);
  rejects(
    () => assignRespawn({ interval: 10, minimumWait: 0, offset: 10, diedAt: -1 }),
    "RangeError",
    OFFSET
  );
  rejects(() => assignRespawn({ interval: 10, minimumWait: 0, diedAt: -1 }), "RangeError", DIED_AT);
  rejects(
    () => assignRespawn({ interval: 10, minimumWait: MAX, diedAt: 1 }),
    "RangeError",
    ELIGIBLE
  );
  rejects(
    () => assignRespawn({ interval: 10, minimumWait: 0, diedAt: MAX }),
    "RangeError",
    RESPAWN
  );
  assert.equal(assignRespawn({ interval: 10, minimumWait: 0, diedAt: 0 }).respawnAt, 0);
});

test("inherited schedule fields are ignored", () => {
  const inheritedNow = Object.assign(Object.create({ now: 5 }), {
    interval: 10,
    minimumWait: 0,
    players: []
  });
  rejects(() => planWaves(inheritedNow), "RangeError", NOW);
  const inheritedOffset = Object.assign(Object.create({ offset: 4 }), {
    interval: 10,
    minimumWait: 0,
    now: 0,
    players: [player("player-a", 0)]
  });
  const plan = planWaves(inheritedOffset);
  assert.equal(plan.offset, 0);
  assert.equal(plan.players[0].respawnAt, 0);
  const inheritedDeath = Object.create({ diedAt: 0 });
  inheritedDeath.id = "player-a";
  rejects(() => planWaves(validPlan({ players: [inheritedDeath] })), "RangeError", DIED_AT);
  const inheritedDied = Object.create({ diedAt: 4 });
  inheritedDied.interval = 10;
  inheritedDied.minimumWait = 0;
  rejects(() => assignRespawn(inheritedDied), "RangeError", DIED_AT);
});

test("earliestWave checks interval, offset, then time", () => {
  rejects(() => earliestWave(), "TypeError", OPTIONS);
  rejects(() => earliestWave(null), "TypeError", OPTIONS);
  rejects(() => earliestWave({}), "RangeError", INTERVAL);
  rejects(() => earliestWave({ offset: 1, time: -1 }), "RangeError", INTERVAL);
  rejects(() => earliestWave({ interval: 10, offset: 10, time: -1 }), "RangeError", OFFSET);
  rejects(() => earliestWave({ interval: 10, time: -1 }), "RangeError", TIME);
  rejects(() => earliestWave({ interval: 10, offset: 0, time: 1.5 }), "RangeError", TIME);
  rejects(() => earliestWave({ interval: 10, time: MAX + 1 }), "RangeError", TIME);
  assert.equal(earliestWave({ interval: 10, time: 0.0 }), 0);
  const inherited = Object.create({ time: 4 });
  inherited.interval = 10;
  rejects(() => earliestWave(inherited), "RangeError", TIME);
});
