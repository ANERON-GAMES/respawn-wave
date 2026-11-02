import assert from "node:assert/strict";

export function player(id, diedAt, teamId) {
  if (teamId === undefined) {
    return { id, diedAt };
  }
  return { id, diedAt, team: teamId };
}

export function team(id, offset) {
  return { id, offset };
}

export function validPlan(extra = {}) {
  return {
    now: 0,
    interval: 10,
    minimumWait: 0,
    players: [player("player-a", 0)],
    ...extra
  };
}

export function assertFrozenPlan(result) {
  assert.equal(Object.isFrozen(result), true);
  assert.equal(Object.isFrozen(result.waves), true);
  assert.equal(Object.isFrozen(result.players), true);
  for (const wave of result.waves) {
    assert.equal(Object.isFrozen(wave), true);
    assert.equal(Object.isFrozen(wave.ids), true);
  }
  for (const entry of result.players) {
    assert.equal(Object.isFrozen(entry), true);
  }
}

export function assertPlanShape(inputPlayers, result) {
  assertFrozenPlan(result);
  const ids = [];
  let counted = 0;
  let previousWave = null;
  for (const wave of result.waves) {
    assert.equal(wave.count, wave.ids.length);
    assert.equal(wave.remaining, wave.at - result.now);
    assert.equal(Number.isSafeInteger(wave.at), true);
    assert.equal(Number.isSafeInteger(wave.remaining), true);
    if (previousWave !== null) {
      assert.equal(waveComesAfter(previousWave, wave), true);
    }
    previousWave = wave;
    let previousId = null;
    for (const id of wave.ids) {
      if (previousId !== null) {
        assert.equal(previousId < id, true);
      }
      previousId = id;
      ids.push(id);
    }
    counted += wave.count;
  }
  assert.equal(counted, result.players.length);
  assert.equal(ids.length, result.players.length);
  const expected = [];
  for (const entry of inputPlayers) {
    expected.push(entry.id);
  }
  expected.sort(compareString);
  const actual = ids.slice();
  actual.sort(compareString);
  assert.deepEqual(actual, expected);
  const seen = Object.create(null);
  for (let index = 0; index < result.players.length; index += 1) {
    const entry = result.players[index];
    assert.equal(entry.id, ids[index]);
    assert.equal(Object.hasOwn(seen, entry.id), false);
    seen[entry.id] = true;
    assert.equal(entry.remaining, entry.respawnAt - result.now);
    assert.equal(entry.wait, entry.respawnAt - entry.diedAt);
    assert.equal(entry.wait >= result.minimumWait, true);
    assert.equal(entry.wait < result.minimumWait + result.interval, true);
    assert.equal(entry.respawnAt >= entry.eligibleAt, true);
    assert.equal(entry.eligibleAt, entry.diedAt + result.minimumWait);
  }
}

function waveComesAfter(left, right) {
  if (left.at < right.at) {
    return true;
  }
  if (left.at > right.at) {
    return false;
  }
  if (left.team === right.team) {
    return false;
  }
  if (left.team === null) {
    return true;
  }
  if (right.team === null) {
    return false;
  }
  return left.team < right.team;
}

function compareString(left, right) {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}
