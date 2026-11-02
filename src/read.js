import { isObject, normalizeZero } from "./shape.js";

const OPTIONS_MESSAGE = "options must be an object";
const INTERVAL_MESSAGE = "interval must be an integer greater than or equal to 1";
const MINIMUM_WAIT_MESSAGE = "minimumWait must be an integer greater than or equal to 0";
const OFFSET_MESSAGE =
  "offset must be an integer greater than or equal to 0 and less than interval";
const TIME_MESSAGE = "time must be an integer greater than or equal to 0";
const DIED_AT_MESSAGE = "diedAt must be an integer greater than or equal to 0";
const DIED_AT_ORDER_MESSAGE = "diedAt must be less than or equal to now";
const NOW_MESSAGE = "now must be an integer greater than or equal to 0";
const TEAMS_MESSAGE = "teams must be an array";
const TEAM_MESSAGE = "team must be an object";
const TEAM_ID_MESSAGE = "team id must be a non-empty string";
const TEAM_UNIQUE_MESSAGE = "team ids must be unique";
const TEAM_OFFSET_MESSAGE =
  "team offset must be an integer greater than or equal to 0 and less than interval";
const PLAYERS_MESSAGE = "players must be an array";
const PLAYER_MESSAGE = "player must be an object";
const PLAYER_ID_MESSAGE = "player id must be a non-empty string";
const PLAYER_UNIQUE_MESSAGE = "player ids must be unique";
const PLAYER_TEAM_REQUIRES_MESSAGE = "player team requires teams";
const PLAYER_TEAM_MESSAGE = "player team must be a non-empty string";
const PLAYER_TEAM_KNOWN_MESSAGE = "player team must be a known team";

export function readWave(options) {
  if (!isObject(options)) {
    throw new TypeError(OPTIONS_MESSAGE);
  }
  const interval = readInterval(options);
  const offset = readOptionalOffset(options, interval);
  const time = readRequiredWhole(options, "time", TIME_MESSAGE);
  return { time, interval, offset };
}

export function readAssignment(options) {
  if (!isObject(options)) {
    throw new TypeError(OPTIONS_MESSAGE);
  }
  const interval = readInterval(options);
  const minimumWait = readMinimumWait(options);
  const offset = readOptionalOffset(options, interval);
  const diedAt = readRequiredWhole(options, "diedAt", DIED_AT_MESSAGE);
  return { diedAt, interval, minimumWait, offset };
}

export function readPlan(options) {
  if (!isObject(options)) {
    throw new TypeError(OPTIONS_MESSAGE);
  }
  const interval = readInterval(options);
  const minimumWait = readMinimumWait(options);
  const offset = readOptionalOffset(options, interval);
  const now = readRequiredWhole(options, "now", NOW_MESSAGE);
  const teams = readTeams(options, interval);
  const players = readPlayers(options, now, teams, offset);
  return { interval, minimumWait, offset, now, players };
}

function readInterval(source) {
  if (!Object.hasOwn(source, "interval")) {
    throw new RangeError(INTERVAL_MESSAGE);
  }
  const value = source.interval;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new RangeError(INTERVAL_MESSAGE);
  }
  return value;
}

function readMinimumWait(source) {
  return readRequiredWhole(source, "minimumWait", MINIMUM_WAIT_MESSAGE);
}

function readOptionalOffset(source, interval) {
  if (!Object.hasOwn(source, "offset") || source.offset === undefined) {
    return 0;
  }
  return readBounded(source.offset, interval, OFFSET_MESSAGE);
}

function readRequiredWhole(source, key, message) {
  if (!Object.hasOwn(source, key)) {
    throw new RangeError(message);
  }
  return readWhole(source[key], message);
}

function readWhole(value, message) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(message);
  }
  return normalizeZero(value);
}

function readBounded(value, interval, message) {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0 || value >= interval) {
    throw new RangeError(message);
  }
  return normalizeZero(value);
}

function readTeams(options, interval) {
  if (!Object.hasOwn(options, "teams") || options.teams === undefined) {
    return null;
  }
  if (!Array.isArray(options.teams)) {
    throw new TypeError(TEAMS_MESSAGE);
  }
  const byId = Object.create(null);
  for (const entry of options.teams) {
    const team = readTeam(entry, byId, interval);
    byId[team.id] = team.offset;
  }
  return byId;
}

function readTeam(entry, byId, interval) {
  if (!isObject(entry)) {
    throw new TypeError(TEAM_MESSAGE);
  }
  if (!Object.hasOwn(entry, "id") || typeof entry.id !== "string" || entry.id.length === 0) {
    throw new TypeError(TEAM_ID_MESSAGE);
  }
  if (Object.hasOwn(byId, entry.id)) {
    throw new TypeError(TEAM_UNIQUE_MESSAGE);
  }
  const offset = readRequiredBounded(entry, interval);
  return { id: entry.id, offset };
}

function readRequiredBounded(entry, interval) {
  if (!Object.hasOwn(entry, "offset")) {
    throw new RangeError(TEAM_OFFSET_MESSAGE);
  }
  return readBounded(entry.offset, interval, TEAM_OFFSET_MESSAGE);
}

function readPlayers(options, now, teams, offset) {
  if (!Object.hasOwn(options, "players") || !Array.isArray(options.players)) {
    throw new TypeError(PLAYERS_MESSAGE);
  }
  const seen = Object.create(null);
  const players = [];
  for (const entry of options.players) {
    players.push(readPlayer(entry, seen, now, teams, offset));
  }
  return players;
}

function readPlayer(entry, seen, now, teams, offset) {
  if (!isObject(entry)) {
    throw new TypeError(PLAYER_MESSAGE);
  }
  if (!Object.hasOwn(entry, "id") || typeof entry.id !== "string" || entry.id.length === 0) {
    throw new TypeError(PLAYER_ID_MESSAGE);
  }
  if (Object.hasOwn(seen, entry.id)) {
    throw new TypeError(PLAYER_UNIQUE_MESSAGE);
  }
  seen[entry.id] = true;
  const diedAt = readRequiredWhole(entry, "diedAt", DIED_AT_MESSAGE);
  if (diedAt > now) {
    throw new RangeError(DIED_AT_ORDER_MESSAGE);
  }
  const team = readPlayerTeam(entry, teams);
  const phase = team === null ? offset : teams[team];
  return { id: entry.id, diedAt, team, offset: phase };
}

function readPlayerTeam(entry, teams) {
  if (!Object.hasOwn(entry, "team") || entry.team === undefined) {
    return null;
  }
  if (teams === null) {
    throw new TypeError(PLAYER_TEAM_REQUIRES_MESSAGE);
  }
  if (typeof entry.team !== "string" || entry.team.length === 0) {
    throw new TypeError(PLAYER_TEAM_MESSAGE);
  }
  if (!Object.hasOwn(teams, entry.team)) {
    throw new TypeError(PLAYER_TEAM_KNOWN_MESSAGE);
  }
  return entry.team;
}
