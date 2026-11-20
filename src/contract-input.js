import { readFileSync } from 'node:fs';
import { tuning } from './sim/world.js';

export class InputFileError extends Error {}

const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const natural = (value) => Number.isSafeInteger(value) && value >= 0;
const vector = (value, length, check) =>
  Array.isArray(value) && value.length === length && value.every(check);
const boolean = (value) => typeof value === 'boolean';
const position = (value) => vector(value, 3, Number.isFinite);

function requireField(condition, field) {
  if (!condition) throw new Error(`Trường không hợp lệ: ${field}`);
}

function optionalFields(value, checks, prefix) {
  requireField(object(value), prefix);
  for (const [key, check] of Object.entries(checks)) {
    if (Object.hasOwn(value, key)) requireField(check(value[key]), `${prefix}.${key}`);
  }
}

function distinctIds(items, field) {
  const ids = items.flatMap(({ id }) => id === undefined ? [] : [id]);
  requireField(new Set(ids).size === ids.length, `${field}.id trùng`);
}

export function readScenario(path) {
  return readDocument(path, (scenario) => {
    optionalFields(scenario, {
      player: object,
      random_motes: boolean,
      random_shades: boolean,
      motes: (value) => Array.isArray(value) && value.every(position),
      shades: Array.isArray,
      lanterns: Array.isArray,
      time_left_s: (value) => Number.isFinite(value) && value >= 0,
    }, 'scenario');
    if (scenario.player) {
      optionalFields(scenario.player, { pos: position, carried: natural, flames: natural }, 'player');
    }
    for (const [index, shade] of (scenario.shades ?? []).entries()) {
      optionalFields(shade, { id: (id) => typeof id === 'string' && id.length > 0 }, `shades[${index}]`);
      requireField(position(shade.pos), `shades[${index}].pos`);
    }
    distinctIds(scenario.shades ?? [], 'shades');
    const lanternIds = Array.from({ length: tuning.lantern_count_night1 }, (_, index) => `L${index + 1}`);
    for (const [index, lantern] of (scenario.lanterns ?? []).entries()) {
      optionalFields(lantern, { pos: position, lit: boolean, deposited: natural }, `lanterns[${index}]`);
      requireField(lanternIds.includes(lantern.id), `lanterns[${index}].id`);
    }
    distinctIds(scenario.lanterns ?? [], 'lanterns');
    return scenario;
  });
}

export function readInputs(path) {
  return readDocument(path, (inputs) => {
    requireField(object(inputs) && Array.isArray(inputs.frames), 'frames');
    let previousTick = -1;
    for (const [index, frame] of inputs.frames.entries()) {
      optionalFields(frame, {
        move: (value) => vector(value, 2, (axis) => Number.isFinite(axis) && Math.abs(axis) <= 1),
        cam_yaw_deg: Number.isFinite,
        jump: boolean,
        interact: boolean,
        pulse: boolean,
        dash: boolean,
      }, `frames[${index}]`);
      requireField(natural(frame.tick) && frame.tick > previousTick, `frames[${index}].tick`);
      previousTick = frame.tick;
    }
    return inputs.frames;
  });
}

function readDocument(path, validate) {
  try {
    return validate(JSON.parse(readFileSync(path, 'utf8')));
  } catch (error) {
    throw new InputFileError(`${path}: ${error.message}`);
  }
}
