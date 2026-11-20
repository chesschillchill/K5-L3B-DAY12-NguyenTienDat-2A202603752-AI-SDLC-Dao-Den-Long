import { closeSync, openSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import { InputFileError, readInputs, readScenario } from './contract-input.js';
import { step } from './sim/step.js';
import { createWorld, defaultInput, timeLeft } from './sim/world.js';

function integer(value, name, minimum = Number.MIN_SAFE_INTEGER) {
  const parsed = Number(value);
  if (!/^-?\d+$/.test(value) || !Number.isSafeInteger(parsed) || parsed < minimum) {
    throw new Error(`--${name} cần số nguyên hợp lệ`);
  }
  return parsed;
}

function configuration() {
  const args = process.argv.slice(2);
  const seedIndex = args.lastIndexOf('--seed');
  if (seedIndex >= 0 && /^-\d+$/.test(args[seedIndex + 1])) {
    args.splice(seedIndex, 2, `--seed=${args[seedIndex + 1]}`);
  }
  const { values } = parseArgs({
    args,
    options: {
      seed: { type: 'string' },
      night: { type: 'string' },
      scenario: { type: 'string' },
      inputs: { type: 'string' },
      ticks: { type: 'string' },
      out: { type: 'string' },
      'snapshot-every': { type: 'string', default: '10' },
    },
  });
  if (integer(values.night, 'night', 1) !== 1) throw new Error('Phase 1 chỉ hỗ trợ --night 1');
  if (!values.out) throw new Error('Thiếu đường dẫn --out');
  return {
    seed: integer(values.seed, 'seed'),
    ticks: integer(values.ticks, 'ticks', 0),
    snapshotEvery: integer(values['snapshot-every'], 'snapshot-every', 1),
    scenario: values.scenario === undefined ? {} : readScenario(values.scenario),
    frames: values.inputs === undefined ? [] : readInputs(values.inputs),
    out: values.out,
  };
}

const roundedPosition = (pos) => pos.map((value) => Number(value.toFixed(3)));

function snapshot(world) {
  const { tick, state, score, player, lanterns, shades, motes } = world;
  return {
    type: 'snapshot',
    tick,
    sim_tick: tick,
    state,
    time_left_s: timeLeft(world),
    score,
    player: { pos: roundedPosition(player.pos), flames: player.flames, carried: player.carried },
    lanterns: lanterns.map(({ id, pos, lit, deposited }) => ({ id, pos: roundedPosition(pos), lit, deposited })),
    shades: shades.map(({ id, pos, state }) => ({ id, pos: roundedPosition(pos), state })),
    motes_active: motes.length,
    motes: motes.map(({ id, pos }) => ({ id, pos: roundedPosition(pos) })),
  };
}

function run({ seed, ticks, snapshotEvery, scenario, frames, out }) {
  const world = createWorld(seed, scenario);
  const file = openSync(out, 'w');
  let lines = [];
  const emit = (entry) => {
    lines.push(JSON.stringify(entry) + '\n');
    if (lines.length === 128) {
      writeFileSync(file, lines.join(''));
      lines = [];
    }
  };
  try {
    let input = defaultInput;
    let nextFrame = 0;
    emit(snapshot(world));
    while (world.state === 'playing' && world.tick < ticks) {
      if (frames[nextFrame]?.tick === world.tick) {
        const { tick, ...patch } = frames[nextFrame++];
        input = { ...input, ...patch };
      }
      for (const event of step(world, input)) emit(event);
      if (world.tick % snapshotEvery === 0) emit(snapshot(world));
    }
    emit({ type: 'end', ticks: world.tick, state: world.state, score: world.score });
    if (lines.length > 0) writeFileSync(file, lines.join(''));
  } finally {
    closeSync(file);
  }
}

try {
  run(configuration());
} catch (error) {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = error instanceof InputFileError ? 2 : 1;
}
