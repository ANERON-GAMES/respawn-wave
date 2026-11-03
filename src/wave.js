import { readAssignment, readWave } from "./read.js";

const ELIGIBLE_MESSAGE = "eligible time must be a safe integer";
const RESPAWN_MESSAGE = "respawn time must be a safe integer";

export function earliestWave(options) {
  const input = readWave(options);
  return earliestInstant(input.time, input.interval, input.offset);
}

export function assignRespawn(options) {
  const input = readAssignment(options);
  const assigned = assignmentNumbers(input.diedAt, input.minimumWait, input.interval, input.offset);
  return Object.freeze({
    diedAt: input.diedAt,
    interval: input.interval,
    minimumWait: input.minimumWait,
    offset: input.offset,
    eligibleAt: assigned.eligibleAt,
    respawnAt: assigned.respawnAt,
    wait: assigned.respawnAt - input.diedAt
  });
}

export function assignmentNumbers(diedAt, minimumWait, interval, offset) {
  const eligibleAt = addSafe(diedAt, minimumWait, ELIGIBLE_MESSAGE);
  const respawnAt = earliestInstant(eligibleAt, interval, offset);
  return { eligibleAt, respawnAt };
}

function earliestInstant(time, interval, offset) {
  if (time <= offset) {
    return offset;
  }
  const delta = time - offset;
  const quotient = Math.floor(delta / interval);
  const covered = quotient * interval;
  const base = offset + covered;
  if (base === time) {
    return time;
  }
  if (base > Number.MAX_SAFE_INTEGER - interval) {
    throw new RangeError(RESPAWN_MESSAGE);
  }
  return base + interval;
}

function addSafe(left, right, message) {
  if (right > Number.MAX_SAFE_INTEGER - left) {
    throw new RangeError(message);
  }
  return left + right;
}
