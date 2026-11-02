# @aneron/respawn-wave

Group dead players into shared respawn waves.

## Purpose

`@aneron/respawn-wave` assigns dead players to shared respawn waves. A wave is one instant when every player placed on it becomes available together. Waves repeat at a fixed interval. A team can shift that cadence with a phase offset. A player becomes eligible at the death time plus a minimum wait, and takes the earliest wave at or after that instant. A death inside the minimum wait before a wave misses that wave and rolls to the following one.

The caller passes the current time, the interval, the minimum wait, the deaths, and any team offsets. The same numbers produce the same result. Time is an argument on every call. The module never reads a clock, starts a timer, draws a random number, or opens a socket. It has no runtime dependencies.

The caller chooses the time unit. Milliseconds and simulation ticks are both valid, provided every value is a safe integer in that unit. The module does not convert units.

## Install

The package is an ES module. It needs Node.js 20 or newer. It has no runtime dependencies. The package name is `@aneron/respawn-wave`. It is not published to the npm registry.

Clone this repository and run the tests:

```bash
git clone https://github.com/ANERON-GAMES/respawn-wave.git
cd respawn-wave
npm install
npm test
```

`npm test` runs `node --test`. `npm run lint` runs ESLint. `npm run format:check` runs Prettier.

Install it as a dependency from the git repository:

```bash
npm install github:ANERON-GAMES/respawn-wave
```

```js
import { assignRespawn, earliestWave, planWaves } from "@aneron/respawn-wave";
```

Code in this repository imports the same entry point with `./src/index.js`.

## Usage

Times below are in the caller's unit. The interval is `10` and the minimum wait is `3`. The current time is `8`. Three players are dead, and none of them names a team, so they share the default offset of `0`.

```js
import { assignRespawn, earliestWave, planWaves } from "@aneron/respawn-wave";

const players = [
  { id: "player-a", diedAt: 0 },
  { id: "player-b", diedAt: 7 },
  { id: "player-c", diedAt: 8 }
];

const plan = planWaves({
  now: 8,
  interval: 10,
  minimumWait: 3,
  players
});
```

`player-a` died at `0`. The eligible time is `3`. The waves are `0`, `10`, `20`, and so on. `3` is past `0` and at or before `10`, so `player-a` joins the wave at `10`. The wait is `10`. The remaining time at `now` of `8` is `2`.

`player-b` died at `7`. The eligible time is `10`, which lands on the wave at `10`. The wait is `3`, the minimum. `player-a` and `player-b` respawn together.

`player-c` died at `8`, one unit after `player-b`. The eligible time is `11`. That is past the wave at `10`, so `player-c` rolls to `20`. The wait is `12`. The remaining time is `12`.

`plan.now` is `8`. `plan.interval` is `10`. `plan.minimumWait` is `3`. `plan.offset` is `0`. `plan.waves[0].ids` is `["player-a", "player-b"]`. `plan.waves[0].at` is `10`. `plan.waves[0].remaining` is `2`. `plan.waves[0].count` is `2`. `plan.waves[0].team` is `null`. `plan.waves[1].ids` is `["player-c"]`. `plan.waves[1].at` is `20`. `plan.players[0].id` is `"player-a"`. `plan.players[0].wait` is `10`. `plan.players[1].wait` is `3`. `plan.players[2].id` is `"player-c"`. `plan.players[2].eligibleAt` is `11`. `plan.players[2].respawnAt` is `20`. `plan.players[2].wait` is `12`. `plan.players[2].remaining` is `12`.

A team offset uses the same interval and a different phase. Red waves sit on `0`, `10`, `20`. Blue waves sit on `5`, `15`, `25`. The current time is `4`. The minimum wait is still `3`.

```js
const staggered = planWaves({
  now: 4,
  interval: 10,
  minimumWait: 3,
  teams: [
    { id: "blue", offset: 5 },
    { id: "red", offset: 0 }
  ],
  players: [
    { id: "player-a", diedAt: 0, team: "red" },
    { id: "player-d", diedAt: 3, team: "blue" },
    { id: "player-b", diedAt: 4, team: "red" },
    { id: "player-c", diedAt: 0, team: "blue" }
  ]
});
```

`player-c` died at `0` on blue. The eligible time is `3`, and the first blue wave is `5`, so the respawn is `5`. The remaining time is `1`.

`player-a` died at `0` on red and `player-b` died at `4` on red. Their eligible times are `3` and `7`. Both are at or before the red wave at `10`, so they share it. `player-b` waits `6`.

`player-d` died at `3` on blue. The eligible time is `6`, which is one unit after the blue wave at `5`, so `player-d` rolls to `15`. The wait is `12`.

The team array listed blue first. The result follows time, then team name. `staggered.waves[0].team` is `"blue"`. `staggered.waves[0].at` is `5`. `staggered.waves[0].offset` is `5`. `staggered.waves[0].ids` is `["player-c"]`. `staggered.waves[1].team` is `"red"`. `staggered.waves[1].at` is `10`. `staggered.waves[1].ids` is `["player-a", "player-b"]`. `staggered.waves[2].team` is `"blue"`. `staggered.waves[2].at` is `15`. `staggered.waves[2].ids` is `["player-d"]`. `staggered.players[0].id` is `"player-c"`. `staggered.players[0].remaining` is `1`. `staggered.players[3].id` is `"player-d"`. `staggered.players[3].respawnAt` is `15`. `staggered.players[3].wait` is `12`. `staggered.players[3].eligibleAt` is `6`.

`assignRespawn` schedules one death. `earliestWave` returns the wave at or after a time. Both use the same rule as `planWaves`.

```js
const caught = assignRespawn({ diedAt: 7, interval: 10, minimumWait: 3, offset: 0 });
const rolled = assignRespawn({ diedAt: 8, interval: 10, minimumWait: 3, offset: 0 });
const exact = assignRespawn({ diedAt: 20, interval: 10, minimumWait: 0, offset: 0 });
const longWait = assignRespawn({ diedAt: 0, interval: 10, minimumWait: 25, offset: 0 });
const phased = assignRespawn({ diedAt: 0, interval: 10, minimumWait: 0, offset: 4 });
const missedPhase = assignRespawn({ diedAt: 2, interval: 10, minimumWait: 3, offset: 4 });
```

`caught.eligibleAt` is `10`. `caught.respawnAt` is `10`. `caught.wait` is `3`. `rolled.eligibleAt` is `11`. `rolled.respawnAt` is `20`. `rolled.wait` is `12`. `exact.respawnAt` is `20`. `exact.wait` is `0`. A minimum wait of `0` respawns on a wave that lands on the death. `longWait.eligibleAt` is `25`. `longWait.respawnAt` is `30`. `longWait.wait` is `30`. The minimum wait is longer than the interval, so the death at `0` skips the waves at `10` and `20`. `phased.respawnAt` is `4`. The first wave is the offset itself. `missedPhase.eligibleAt` is `5`. `missedPhase.respawnAt` is `14`. `missedPhase.wait` is `12`.

`earliestWave({ time: 11, interval: 10, offset: 0 })` is `20`. `earliestWave({ time: 10, interval: 10, offset: 0 })` is `10`. `earliestWave({ time: 0, interval: 10, offset: 5 })` is `5`. `earliestWave({ time: 6, interval: 10, offset: 5 })` is `15`. `earliestWave({ time: 5, interval: 10, offset: 5 })` is `5`.

A player whose wave is already behind `now` stays in the result. The remaining time is negative. The caller can see who should already have respawned.

```js
const late = planWaves({
  now: 25,
  interval: 10,
  minimumWait: 3,
  players: [{ id: "player-a", diedAt: 0 }]
});
```

`late.players[0].respawnAt` is `10`. `late.players[0].remaining` is `-15`. `late.waves[0].at` is `10`. `late.waves[0].remaining` is `-15`.

Two groups that share a respawn instant stay separate when their teams differ. An unteamed player uses the default offset and forms a wave whose team is `null`. That wave sorts before a named team at the same time.

```js
const shared = planWaves({
  now: 0,
  interval: 10,
  minimumWait: 3,
  teams: [{ id: "red", offset: 0 }],
  players: [
    { id: "player-b", diedAt: 0, team: "red" },
    { id: "player-a", diedAt: 0 },
    { id: "player-c", diedAt: 0, team: "red" }
  ]
});
```

`shared.waves[0].team` is `null`. `shared.waves[0].at` is `10`. `shared.waves[0].ids` is `["player-a"]`. `shared.waves[1].team` is `"red"`. `shared.waves[1].at` is `10`. `shared.waves[1].ids` is `["player-b", "player-c"]`. The input listed `player-b` first. The red wave lists `player-b` before `player-c` because of the id order, and it lists them after the unteamed wave because `null` sorts first.

The calls above do not write into the objects they were given. `players[0].diedAt` is still `0`. `players[0].id` is still `"player-a"`. A later edit of `players[0].diedAt` is visible only to a later call. The frozen plan from the first call keeps the ids and times it already returned.

## API

`planWaves`, `assignRespawn`, and `earliestWave` are functions. There is no constructor and no shared state. Each call reads its argument and returns a new result. The same input produces a deep-equal result and a new object tree.

`planWaves` returns a frozen plan. `assignRespawn` returns a frozen assignment. `earliestWave` returns a number. A call freezes only the objects it creates. Inputs stay mutable for the caller.

Own fields are read. Unknown fields are ignored. An omitted optional field, or a field whose value is `undefined`, uses the default. A frozen object and an object with a null prototype are accepted. Inherited fields are ignored. A getter on an unknown field is left unread.

Integer means `Number.isSafeInteger`. `1.0` is accepted. `1.5`, `Infinity`, `NaN`, and `Number.MAX_SAFE_INTEGER + 1` are rejected. `-0` is stored as `0`.

Ids are primitive strings. They are not trimmed and are not case-folded. `"player-a"` and `"player-A"` are different ids. A string of one space is a valid id. `"__proto__"` and `"constructor"` are valid ids and valid team ids. `"player-A"` sorts before `"player-a"` because the code unit `A` is before `a`.

### `planWaves(options)`

```js
planWaves(options);
```

`options` must be an object and must not be an array. Otherwise the function throws `TypeError` with the message `options must be an object`.

Checks run in this order. The first failure wins. A throw returns no result.

1. `options` is an object.
2. `interval` is an integer greater than or equal to `1`.
3. `minimumWait` is an integer greater than or equal to `0`.
4. `offset`, when present and not `undefined`, is an integer in `0 .. interval - 1`.
5. `now` is an integer greater than or equal to `0`.
6. `teams`, when present and not `undefined`, is an array. Each entry is read in order: object, non-empty string `id`, unique `id`, integer `offset` in `0 .. interval - 1`.
7. `players` is an array. Each entry is read in order: object, non-empty string `id`, unique `id`, integer `diedAt` greater than or equal to `0`, `diedAt` less than or equal to `now`, then `team`.
8. Eligible times and respawn times are computed in player order. A sum that leaves the safe integer range throws.

| Field         | Default  | Accepted values                                                                 |
| ------------- | -------- | ------------------------------------------------------------------------------- |
| `interval`    | required | A safe integer greater than or equal to `1`.                                    |
| `minimumWait` | required | A safe integer greater than or equal to `0`.                                    |
| `offset`      | `0`      | A safe integer in `0 .. interval - 1`, or omitted. `-0` is stored as `0`.       |
| `now`         | required | A safe integer greater than or equal to `0`. `-0` is stored as `0`.             |
| `teams`       | omitted  | An array of `{ id, offset }`. An empty array is valid.                          |
| `players`     | required | An array of player objects. An empty array is valid. Order is not result order. |

`interval` of `1` makes every eligible time land on a wave, because every integer is a wave when the offset is `0`. A larger offset with interval `1` is impossible, because the only in-range offset is `0`.

### `options.players`

`players` must be an own property whose value is an array. Otherwise `TypeError`: `players must be an array`. An empty array is valid. The wave list and the player list are then empty.

A hole in the array is `undefined` and fails the object check.

Each entry must be an object and must not be an array. Otherwise `TypeError`: `player must be an object`.

Each player is read in order:

1. `id` must be an own property whose value is a string of length at least `1`. Otherwise `TypeError`: `player id must be a non-empty string`.
2. That id must not already have been seen. Otherwise `TypeError`: `player ids must be unique`.
3. `diedAt` must be an own safe integer greater than or equal to `0`. Otherwise `RangeError`: `diedAt must be an integer greater than or equal to 0`.
4. `diedAt` must be less than or equal to `now`. Otherwise `RangeError`: `diedAt must be less than or equal to now`.

The duplicate check happens before `diedAt` is validated. A repeated id with a bad death time reports the duplicate. A bad id is reported before the death time. The first player is finished before the second player is read. A bad id on a later player is reported before an earlier eligible-time overflow, because every player is validated before any respawn time is computed.

Unknown player fields are ignored. They are not copied onto the result.

### `options.players[].team`

`team` may be omitted. An own value of `undefined` is the same as omitted. The player then uses the default `offset`, and the result stores `team` as `null`.

When `teams` is omitted, any other own `team` value throws `TypeError`: `player team requires teams`. The value is not inspected. `team: 1` and `team: "red"` both report that message when the table is absent.

When `teams` is present, `team` must be a string of length at least `1`. Otherwise `TypeError`: `player team must be a non-empty string`. The string must be a team id in the table. Otherwise `TypeError`: `player team must be a known team`.

An inherited `team` is ignored. The player is unteamed.

A player with a team uses that team's offset. The default offset still applies to every unteamed player in the same call. An unteamed player and a named team that happens to use the same offset produce two waves when their respawn times coincide.

### `options.teams`

`teams` may be omitted or be `undefined`. Players then cannot name a team.

A present value other than `undefined` must be an array. Otherwise `TypeError`: `teams must be an array`. An empty array is valid. It publishes a table with no ids, so a named team still fails the known-team check, and unteamed players remain valid.

Each entry must be an object and must not be an array. Otherwise `TypeError`: `team must be an object`.

Each team is read in order:

1. `id` must be an own property whose value is a string of length at least `1`. Otherwise `TypeError`: `team id must be a non-empty string`.
2. That id must not already have been seen. Otherwise `TypeError`: `team ids must be unique`.
3. `offset` must be an own safe integer in `0 .. interval - 1`. Otherwise `RangeError`: `team offset must be an integer greater than or equal to 0 and less than interval`.

A duplicate id is reported before that entry's offset is read. The first team is finished before the second team is read, so a bad offset on the first team is reported before a duplicate id on the second team.

Unknown team fields are ignored. A team with no players does not appear in the result. The offset is consulted only for players who name that id.

### `options.now`

`now` must be an own property. A missing `now`, an inherited `now`, and a present value that is not a safe integer greater than or equal to `0` all throw `RangeError`: `now must be an integer greater than or equal to 0`.

`-0` is stored as `0`. `Number.MAX_SAFE_INTEGER` is accepted. The module does not know which instant is current. The caller passes it.

`now` is the instant at which remaining time is measured. It also bounds `diedAt`. A death after `now` is rejected, because that player is not dead at the instant being planned.

### `options.interval`, `options.minimumWait`, and `options.offset`

`interval` must be an own safe integer greater than or equal to `1`. Otherwise `RangeError`: `interval must be an integer greater than or equal to 1`.

`minimumWait` must be an own safe integer greater than or equal to `0`. Otherwise `RangeError`: `minimumWait must be an integer greater than or equal to 0`. It may be larger than `interval`. It is not clamped.

`offset` is the phase for players who do not name a team. The field may be omitted or be `undefined`. The plan then stores `offset` as `0`.

A present value other than `undefined` must be a safe integer greater than or equal to `0` and less than `interval`. Otherwise `RangeError`: `offset must be an integer greater than or equal to 0 and less than interval`. `interval` itself is rejected. `-0` is stored as `0`.

Waves for a phase are `offset + k * interval` for integers `k >= 0`. The first wave is `offset`. There is no wave before it.

### Result

The return value is a frozen object:

| Field         | Meaning                               |
| ------------- | ------------------------------------- |
| `now`         | The instant used for this call.       |
| `interval`    | The interval used for this call.      |
| `minimumWait` | The minimum wait used for this call.  |
| `offset`      | The default phase used for this call. |
| `waves`       | One frozen entry per occupied wave.   |
| `players`     | One frozen entry per input player.    |

`players` is ordered by `respawnAt` ascending, then by team, then by id. `waves` is ordered by `at` ascending, then by team. Team order places `null` before every string, then uses UTF-16 code unit order, the same order as `<` on strings. The id order is the same string order. The input order is not used.

Each wave entry is a frozen object:

| Field       | Meaning                                                     |
| ----------- | ----------------------------------------------------------- |
| `at`        | The respawn instant.                                        |
| `team`      | The team id, or `null` for the default phase.               |
| `offset`    | The phase that produced `at`.                               |
| `remaining` | `at - now`. Zero means the wave is due at `now`.            |
| `count`     | `ids.length`.                                               |
| `ids`       | Player ids on this wave, sorted by id. The array is frozen. |

Each player entry is a frozen object:

| Field        | Meaning                                             |
| ------------ | --------------------------------------------------- |
| `id`         | The player id.                                      |
| `team`       | The team id, or `null` when the player is unteamed. |
| `diedAt`     | The death time used for this call.                  |
| `offset`     | The phase used for this player.                     |
| `eligibleAt` | `diedAt + minimumWait`.                             |
| `respawnAt`  | The wave instant.                                   |
| `wait`       | `respawnAt - diedAt`.                               |
| `remaining`  | `respawnAt - now`.                                  |

`wait` is greater than or equal to `minimumWait` and less than or equal to `minimumWait + interval - 1`. `remaining` is a safe integer and may be negative.

Every input id appears in exactly one wave and exactly once in `players`. `players` is the wave membership flattened in wave order. Within a wave, that order is the id order. The sum of the wave `count` fields equals `players.length`. Reversing the input does not change the result.

A wave belongs to one team. Two teams with the same respawn instant produce two wave entries. Players in one wave share `respawnAt`, `team`, and `offset`. They can differ in `diedAt`, `eligibleAt`, and `wait`.

The result does not share object or array references with the input or with another call.

### `assignRespawn(options)`

```js
assignRespawn(options);
```

Schedule one death. `options` must be an object. Checks run in this order:

1. `options` is an object.
2. `interval` is an integer greater than or equal to `1`.
3. `minimumWait` is an integer greater than or equal to `0`.
4. `offset`, when present and not `undefined`, is an integer in `0 .. interval - 1`.
5. `diedAt` is an integer greater than or equal to `0`.
6. `diedAt + minimumWait` is a safe integer. Otherwise `RangeError`: `eligible time must be a safe integer`.
7. The respawn instant is a safe integer. Otherwise `RangeError`: `respawn time must be a safe integer`.

There is no `now` and no team table. `diedAt` is not compared with a current time.

The return value is a frozen object:

| Field         | Meaning                                     |
| ------------- | ------------------------------------------- |
| `diedAt`      | The death time used.                        |
| `interval`    | The interval used.                          |
| `minimumWait` | The minimum wait used.                      |
| `offset`      | The phase used. Omitted means `0`.          |
| `eligibleAt`  | `diedAt + minimumWait`.                     |
| `respawnAt`   | The earliest wave at or after `eligibleAt`. |
| `wait`        | `respawnAt - diedAt`.                       |

`planWaves` uses this schedule for each player, with that player's phase, and then groups the rows.

### `earliestWave(options)`

```js
earliestWave(options);
```

Return the earliest wave at or after `time`. Checks run in this order:

1. `options` is an object.
2. `interval` is an integer greater than or equal to `1`.
3. `offset`, when present and not `undefined`, is an integer in `0 .. interval - 1`.
4. `time` is an integer greater than or equal to `0`. Otherwise `RangeError`: `time must be an integer greater than or equal to 0`.
5. The wave instant is a safe integer. Otherwise `RangeError`: `respawn time must be a safe integer`.

The return value is that instant. A `time` that already sits on a wave returns `time`. A `time` before the first wave returns `offset`.

### Schedule

Let `eligible = diedAt + minimumWait`. Waves for the phase are `offset + k * interval` for integers `k >= 0`. `respawnAt` is the smallest of those values that is greater than or equal to `eligible`.

For safe integers the value is computed as follows:

1. If `eligible <= offset`, the respawn is `offset`.
2. Otherwise let `delta = eligible - offset` and `q = floor(delta / interval)`.
3. Let `base = offset + q * interval`.
4. If `base === eligible`, the respawn is `eligible`.
5. Otherwise the respawn is `base + interval`, when that sum is still a safe integer.

`floor` of a ratio of safe integers is the exact integer quotient. The product `q * interval` is exact because it is a safe integer less than or equal to `delta`. A boundary that would pass `Number.MAX_SAFE_INTEGER` throws, and no result is returned.

The same rule decides `earliestWave`. Pass the eligible time as `time`.

A death at `W - minimumWait` is eligible exactly at wave `W` and takes that wave, when `W` is a wave of the player's phase and `W` is at or after the offset. A death one unit later is eligible at `W + 1` and takes the following wave.

`respawnAt - offset` is divisible by `interval`. Either `respawnAt` is the first wave, or the previous wave is strictly before `eligibleAt`.

### Errors

| When the check fails                                                    | Error        | Message                                                                            |
| ----------------------------------------------------------------------- | ------------ | ---------------------------------------------------------------------------------- |
| `options` is missing, an array, or not an object                        | `TypeError`  | `options must be an object`                                                        |
| `interval` is missing or not an integer greater than or equal to `1`    | `RangeError` | `interval must be an integer greater than or equal to 1`                           |
| `minimumWait` is missing or not an integer greater than or equal to `0` | `RangeError` | `minimumWait must be an integer greater than or equal to 0`                        |
| `offset` is present and outside `0 .. interval - 1`                     | `RangeError` | `offset must be an integer greater than or equal to 0 and less than interval`      |
| `time` is missing or not an integer greater than or equal to `0`        | `RangeError` | `time must be an integer greater than or equal to 0`                               |
| `now` is missing or not an integer greater than or equal to `0`         | `RangeError` | `now must be an integer greater than or equal to 0`                                |
| `teams` is present and not an array                                     | `TypeError`  | `teams must be an array`                                                           |
| A team entry is an array or not an object                               | `TypeError`  | `team must be an object`                                                           |
| A team id is not a non-empty string                                     | `TypeError`  | `team id must be a non-empty string`                                               |
| A team id is repeated                                                   | `TypeError`  | `team ids must be unique`                                                          |
| A team offset is missing or outside `0 .. interval - 1`                 | `RangeError` | `team offset must be an integer greater than or equal to 0 and less than interval` |
| `players` is missing or not an array                                    | `TypeError`  | `players must be an array`                                                         |
| A player entry is an array or not an object                             | `TypeError`  | `player must be an object`                                                         |
| A player id is not a non-empty string                                   | `TypeError`  | `player id must be a non-empty string`                                             |
| A player id is repeated                                                 | `TypeError`  | `player ids must be unique`                                                        |
| `diedAt` is missing or not an integer greater than or equal to `0`      | `RangeError` | `diedAt must be an integer greater than or equal to 0`                             |
| `diedAt` is greater than `now`                                          | `RangeError` | `diedAt must be less than or equal to now`                                         |
| A player names a team and `teams` is omitted                            | `TypeError`  | `player team requires teams`                                                       |
| A player team is not a non-empty string                                 | `TypeError`  | `player team must be a non-empty string`                                           |
| A player team is not in the table                                       | `TypeError`  | `player team must be a known team`                                                 |
| `diedAt + minimumWait` exceeds the safe integer range                   | `RangeError` | `eligible time must be a safe integer`                                             |
| The next wave exceeds the safe integer range                            | `RangeError` | `respawn time must be a safe integer`                                              |

`time` applies to `earliestWave`. `now`, `teams`, and `players` apply to `planWaves`. `diedAt` applies to `assignRespawn` and to each player of `planWaves`. The eligible-time error and the respawn-time error apply to `assignRespawn` and to `planWaves`. The respawn-time error also applies to `earliestWave`.

## Design notes

Individual death timers trickle. A player who dies one unit later respawns one unit later, so a fight that ended together comes back one corpse at a time. A shared wave collects every death that is eligible for the same boundary and returns them together. The caller applies the wave when `now` reaches `at`.

The minimum wait is the gap that keeps a late death off the incoming wave. With a wait of `0`, a death at `9` and an interval of `10` respawns at `10`. That player was absent for one unit. With a wait of `3`, a death at `7` is eligible at `10` and catches the wave, and a death at `8` is eligible at `11` and waits until `20`. The extra absence is the point of the rule. The player does not receive a private respawn at `diedAt + minimumWait`. Eligibility only opens the door. The door that opens is the next shared boundary.

The minimum wait is allowed to exceed the interval. A wait of `25` with an interval of `10` skips the waves at `10` and `20` for a death at `0`, and the respawn is `30`. Clamping the wait to the interval would change that request. The caller who wants a shorter absence passes a shorter wait.

The team offset is a phase, so both teams keep the same interval. Red on offset `0` and blue on offset `5` with interval `10` respawn five units apart, every cycle. The stagger is stable from one wave to the next. Players on one team share a wave with their teammates. They do not join another team whose offset happens to be equal, and they do not join the unteamed wave. The caller can spawn each wave in a team-specific place even when two instants coincide.

Unteamed players are the default phase. Omitting `teams` is the one-group schedule. Passing `teams` adds named phases without removing that default. A match that is only teams can put every player on a team. A player with no `team` field then still has a defined wave, on the default offset.

`now` is part of the plan because remaining time is `respawnAt - now`, and because a death after `now` is not a dead player at that instant. The function still returns waves that are already behind `now`. Dropping them would hide a player the caller included. A negative `remaining` means the wave instant has passed and the player was still in the input. `remaining` of `0` means the wave is due at this instant.

The output order is fixed so two callers with the same deaths make the same lists. Reversing the input, or listing teams in another order, does not change the waves. Team `null` comes first at a tied instant so the default phase has a stable slot. Ids break ties by UTF-16 code units, which is the order already used by string comparison. The caller does not pre-sort.

Safe integers keep the boundary exact. A death that is eligible on a wave joins that wave, including a death exactly `minimumWait` before it. A float timeline would make that equality depend on rounding. The closed form matches walking forward from the offset by `interval`, and it stays exact at the top of the safe integer range. A sum that would leave that range throws, so a caller never receives a rounded respawn time.

The result is a pure reduction of the numbers the caller passed. Inputs stay mutable. Two calls do not share result objects, so freezing one result cannot change the next call. A later edit of a death time is visible only to a later call. The earlier frozen plan keeps the waves it selected.

## License

MIT. Copyright (c) 2026 Vadim Gubin.
