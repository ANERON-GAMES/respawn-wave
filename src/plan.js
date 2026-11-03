import { readPlan } from "./read.js";
import { assignmentNumbers } from "./wave.js";

export function planWaves(options) {
  const input = readPlan(options);
  const rows = [];
  for (const player of input.players) {
    const assigned = assignmentNumbers(
      player.diedAt,
      input.minimumWait,
      input.interval,
      player.offset
    );
    rows.push({
      id: player.id,
      team: player.team,
      diedAt: player.diedAt,
      offset: player.offset,
      eligibleAt: assigned.eligibleAt,
      respawnAt: assigned.respawnAt,
      wait: assigned.respawnAt - player.diedAt,
      remaining: assigned.respawnAt - input.now
    });
  }
  const waves = groupWaves(rows, input.now);
  rows.sort(comparePlayer);
  return freezePlan({
    now: input.now,
    interval: input.interval,
    minimumWait: input.minimumWait,
    offset: input.offset,
    waves,
    players: rows
  });
}

function groupWaves(rows, now) {
  const byTeam = new Map();
  for (const row of rows) {
    let byAt = byTeam.get(row.team);
    if (byAt === undefined) {
      byAt = new Map();
      byTeam.set(row.team, byAt);
    }
    let bucket = byAt.get(row.respawnAt);
    if (bucket === undefined) {
      bucket = [];
      byAt.set(row.respawnAt, bucket);
    }
    bucket.push(row);
  }
  const waves = [];
  for (const [team, byAt] of byTeam) {
    for (const [at, bucket] of byAt) {
      const ids = [];
      for (const row of bucket) {
        ids.push(row.id);
      }
      ids.sort(compareId);
      waves.push({
        at,
        team,
        offset: bucket[0].offset,
        remaining: at - now,
        count: ids.length,
        ids
      });
    }
  }
  waves.sort(compareWave);
  return waves;
}

function comparePlayer(left, right) {
  if (left.respawnAt < right.respawnAt) {
    return -1;
  }
  if (left.respawnAt > right.respawnAt) {
    return 1;
  }
  const team = compareTeam(left.team, right.team);
  if (team !== 0) {
    return team;
  }
  return compareId(left.id, right.id);
}

function compareWave(left, right) {
  if (left.at < right.at) {
    return -1;
  }
  if (left.at > right.at) {
    return 1;
  }
  return compareTeam(left.team, right.team);
}

function compareTeam(left, right) {
  if (left === right) {
    return 0;
  }
  if (left === null) {
    return -1;
  }
  if (right === null) {
    return 1;
  }
  return compareId(left, right);
}

function compareId(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function freezePlan(result) {
  for (const wave of result.waves) {
    Object.freeze(wave.ids);
    Object.freeze(wave);
  }
  Object.freeze(result.waves);
  for (const player of result.players) {
    Object.freeze(player);
  }
  Object.freeze(result.players);
  return Object.freeze(result);
}
