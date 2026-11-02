export function oracleWave(time, interval, offset) {
  let at = offset;
  while (at < time) {
    at += interval;
  }
  return at;
}

export function oracleAssign(diedAt, minimumWait, interval, offset) {
  const eligibleAt = diedAt + minimumWait;
  const respawnAt = oracleWave(eligibleAt, interval, offset);
  return {
    diedAt,
    interval,
    minimumWait,
    offset,
    eligibleAt,
    respawnAt,
    wait: respawnAt - diedAt
  };
}
