import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { createWorld, defaultInput, tuning } from '../src/sim/world.js';
import { step } from '../src/sim/step.js';

const quietWorld = { random_motes: false, random_shades: false };
const lantern = (id, pos, fields = {}) => ({ id, pos, ...fields });
const byType = (rows, type) => rows.filter((row) => row.type === type);
const events = (rows, name) => byType(rows, 'event').filter((row) => row.name === name);
const end = (rows) => rows.at(-1);

function invoke(t, options = {}) {
  const folder = mkdtempSync(join(tmpdir(), 'lantern-contract-'));
  t.after(() => rmSync(folder, { recursive: true, force: true }));
  const out = join(folder, 'run.jsonl');
  const args = [
    'src/headless.js', '--seed', String(options.seed ?? 12), '--night', '1',
    '--ticks', String(options.ticks ?? 1), '--out', out,
  ];
  if (options.snapshotEvery !== undefined) args.push('--snapshot-every', String(options.snapshotEvery));
  for (const key of ['scenario', 'inputs']) {
    if (Object.hasOwn(options, key)) {
      const path = join(folder, key + '.json');
      writeFileSync(path, JSON.stringify(options[key]));
      args.push('--' + key, path);
    }
  }
  if (options.inputPath) args.push('--inputs', options.inputPath);
  const result = spawnSync(process.execPath, args, { encoding: 'utf8' });
  assert.ifError(result.error);
  if (result.status !== 0) return result;
  const raw = readFileSync(out, 'utf8');
  assert.ok(raw.endsWith('\n'));
  return { ...result, raw, rows: raw.trimEnd().split('\n').map(JSON.parse) };
}

test('CLI writes tick 0 before input, then exact fixed ticks; zero ticks is valid', (t) => {
  const { rows } = invoke(t, {
    scenario: quietWorld, seed: -11, ticks: 3, snapshotEvery: 1,
    inputs: { frames: [{ tick: 0, move: [0, 1] }, { tick: 2, cam_yaw_deg: 90 }] },
  });
  const snapshots = byType(rows, 'snapshot');
  assert.deepEqual(snapshots.map(({ tick, sim_tick }) => [tick, sim_tick]), [[0, 0], [1, 1], [2, 2], [3, 3]]);
  assert.deepEqual(snapshots.map(({ player }) => player.pos), [[0, 0, 0], [0, 0, 0.1], [0, 0, 0.2], [0.1, 0, 0.2]]);
  assert.equal(snapshots[3].time_left_s, tuning.night1_duration_s - 3 / 60);
  assert.deepEqual(end(rows), { type: 'end', ticks: 3, state: 'playing', score: 0 });
  assert.deepEqual(invoke(t, { scenario: quietWorld, ticks: 0 }).rows.map(({ type }) => type), ['snapshot', 'end']);
});

test('movement normalizes diagonals; holding jump does not auto-jump after landing', () => {
  const world = createWorld(12, quietWorld);
  step(world, { ...defaultInput, move: [1, 1], jump: true });
  assert.ok(Math.abs(Math.hypot(world.player.pos[0], world.player.pos[2]) - tuning.player_speed / 60) < 1e-9);
  assert.ok(world.player.pos[1] > 0);
  for (let index = 0; index < 80; index++) step(world, { ...defaultInput, jump: true });
  assert.equal(world.player.pos[1], 0);
  step(world, defaultInput);
  step(world, { ...defaultInput, jump: true });
  assert.ok(world.player.pos[1] > 0);
});

test('scenario updates by ID without scoring and uses empty lists literally', (t) => {
  const scenario = {
    motes: [], shades: [],
    lanterns: [lantern('L4', [2, 3, 4], { lit: true })],
  };
  const { rows } = invoke(t, { scenario, snapshotEvery: 1 });
  assert.deepEqual(rows[0].lanterns.map(({ id }) => id), ['L1', 'L2', 'L3', 'L4', 'L5']);
  assert.deepEqual(rows[0].lanterns[3], { ...scenario.lanterns[0], deposited: tuning.lantern_cost });
  assert.equal(rows[0].motes_active, 0);
  assert.deepEqual(rows[0].shades, []);
  assert.equal(rows[0].score, 0);
  assert.deepEqual(byType(rows, 'event'), []);
});

test('XZ pickup includes the boundary and ignores height; capacity holds', (t) => {
  const { rows } = invoke(t, {
    scenario: {
      ...quietWorld,
      motes: [[tuning.pickup_radius + 0.001, 0, 0], [tuning.pickup_radius, 19, 0], [0, 0, 0]],
      player: { carried: tuning.carry_capacity - 1 },
    },
    snapshotEvery: 1,
  });
  assert.deepEqual(events(rows, 'mote_picked'), [{
    type: 'event', tick: 1, name: 'mote_picked', data: { carried: tuning.carry_capacity },
  }]);
  assert.deepEqual(rows.at(-2).motes.map(({ id }) => id), ['M1', 'M3']);
});

test('interaction is rising-edge only; partial deposits preserve remaining light', (t) => {
  const { rows } = invoke(t, {
    scenario: {
      ...quietWorld,
      player: { carried: 6 },
      lanterns: [lantern('L1', [0, 17, 0], { deposited: 2 }), lantern('L2', [0, 0, 1])],
    },
    inputs: { frames: [{ tick: 0, interact: true }, { tick: 1, move: [0, 0] },
      { tick: 2, interact: false }, { tick: 3, interact: true }] },
    ticks: 4,
    snapshotEvery: 1,
  });
  assert.deepEqual(events(rows, 'deposit').map(({ tick, data }) => [tick, data]), [
    [1, { lantern_id: 'L1', amount: 2, deposited: 4 }],
    [4, { lantern_id: 'L2', amount: 4, deposited: 4 }],
  ]);
  assert.equal(rows.at(-2).player.carried, 0);
});

test('pulse costs light, pushes and stuns at inclusive range, and respects cooldown', (t) => {
  const { rows } = invoke(t, {
    scenario: {
      ...quietWorld,
      player: { carried: 6 },
      shades: [{ id: 'edge', pos: [tuning.pulse_radius, 1, 0] }, { id: 'outside', pos: [0, 1, 10] }],
    },
    inputs: { frames: [{ tick: 0, pulse: true }, { tick: 2, pulse: false }, { tick: 3, pulse: true }] },
    ticks: 5,
    snapshotEvery: 1,
  });
  assert.deepEqual(events(rows, 'pulse'), [{
    type: 'event', tick: 1, name: 'pulse', data: { stunned_ids: ['edge'] },
  }]);
  assert.equal(rows.at(-2).player.carried, 6 - tuning.pulse_cost);
  assert.deepEqual(rows.at(-2).shades[0], { id: 'edge', pos: [8.2, 1, 0], state: 'stunned' });
  assert.equal(end(rows).score, tuning.score.per_stun);
});

test('lit lantern blocks pursuit; without one damage debounces and no_flames ends early', (t) => {
  const shades = [{ id: 'near', pos: [0.2, 1, 0] }, { id: 'other', pos: [0, 1, 0.2] }];
  const safe = invoke(t, {
    scenario: { ...quietWorld, shades, lanterns: [lantern('L1', [0, 0, 0], { lit: true })] },
    ticks: 4, snapshotEvery: 1,
  }).rows;
  assert.equal(events(safe, 'player_hit').length, 0);
  assert.ok(safe.at(-2).shades.every(({ pos }) => Math.hypot(pos[0], pos[2]) >= tuning.safe_radius));
  const exposed = invoke(t, {
    scenario: { ...quietWorld, player: { flames: 2, carried: 3 }, shades },
    ticks: 250,
  }).rows;
  assert.deepEqual(events(exposed, 'player_hit').map(({ tick, data }) => [tick, data]), [
    [1, { by: 'shade', flames: 1, dropped: 0 }],
    [1 + tuning.invuln_s * 60, { by: 'shade', flames: 0, dropped: 0 }],
  ]);
  assert.deepEqual(events(exposed, 'game_over')[0].data, { result: 'lost', reason: 'no_flames' });
  assert.deepEqual(end(exposed), { type: 'end', ticks: 91, state: 'lost', score: 0 });
});

test('dawn stops at the deadline without win bonuses', (t) => {
  const { rows } = invoke(t, { scenario: { ...quietWorld, time_left_s: 0.05 }, ticks: 50, snapshotEvery: 1 });
  assert.deepEqual(events(rows, 'game_over'), [{
    type: 'event', tick: 3, name: 'game_over', data: { result: 'lost', reason: 'dawn' },
  }]);
  assert.equal(rows.at(-2).time_left_s, 0);
  assert.deepEqual(end(rows), { type: 'end', ticks: 3, state: 'lost', score: 0 });
});

test('playable default world wins through five lights with repeatable JSONL', (t) => {
  const options = { inputPath: 'test/fixtures/walk-the-lanterns.json', ticks: 1500, snapshotEvery: 60 };
  const first = invoke(t, options);
  const second = invoke(t, options);
  assert.equal(first.raw, second.raw);
  assert.equal(events(first.rows, 'lantern_lit').length, 5);
  assert.deepEqual(events(first.rows, 'game_over')[0].data, { result: 'won', reason: 'all_lit' });
  assert.equal(end(first.rows).ticks, 689);
  const expectedScore = events(first.rows, 'mote_picked').length * tuning.score.per_mote
    + 5 * tuning.score.per_lantern + Math.floor(tuning.night1_duration_s - 689 / 60) * tuning.score.per_second_left
    + tuning.flames * tuning.score.per_flame_left;
  assert.equal(end(first.rows).score, expectedScore);
});

test('default snapshot interval and generated IDs are repeatable', (t) => {
  const options = {
    ticks: 2110,
    scenario: { player: { pos: [0, 0, 0] }, random_motes: false, motes: [],
      shades: [{ id: 'S1', pos: [20, 1, 20] }, { pos: [17, 1, 18] }],
      lanterns: [lantern('L1', [0, 0, 0], { lit: true })] },
  };
  const first = invoke(t, options);
  assert.equal(first.raw, invoke(t, options).raw);
  assert.deepEqual(byType(first.rows, 'snapshot').slice(0, 3).map(({ tick }) => tick), [0, 10, 20]);
  assert.deepEqual(events(first.rows, 'shade_spawned').map(({ data }) => data), [{ id: 'S3' }]);
});

test('CLI rejects wrong input and scenario formats with exit code 2 on stderr', (t) => {
  for (const option of [
    { inputs: { frames: [{ tick: 0 }, { tick: 0 }] } },
    { inputs: { frames: [{ tick: 0, move: [2, 0] }] } },
    { inputs: { frames: [{ tick: 2, pulse: 1 }] } },
    { scenario: { lanterns: [{ id: 'L6' }] } },
    { scenario: { motes: [[0, 2]] } },
    { scenario: null },
  ]) {
    const result = invoke(t, option);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /Trường không hợp lệ/);
    assert.equal(result.stdout, '');
  }
});
