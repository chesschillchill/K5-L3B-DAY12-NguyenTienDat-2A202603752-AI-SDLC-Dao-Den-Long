import contract from '../../game.contract.json' with { type: 'json' };

export const tuning = contract.tuning;
export const TICK_RATE = 60;
export const ISLAND_RADIUS = 23;
export const DEFAULT_SEED = 12;
export const defaultInput = {
  move: [0, 0], cam_yaw_deg: 0, jump: false, interact: false, pulse: false,
};

export function distance(a, b) {
  return Math.hypot(a[0] - b[0], a[2] - b[2]);
}

function seededRandom(seed) {
  let state = (seed ^ (Math.trunc(seed / 2 ** 32) * 31)) >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let bits = Math.imul(state ^ (state >>> 15), state | 1);
    bits ^= bits + Math.imul(bits ^ (bits >>> 7), bits | 61);
    return ((bits ^ (bits >>> 14)) >>> 0) / 2 ** 32;
  };
}

const polar = (radius, angle, y = 0) => [radius * Math.sin(angle), y, radius * Math.cos(angle)];

export function spawnMote(world, pos) {
  world.motes.push({ id: `M${++world.nextMote}`, pos: [...pos] });
}

export function spawnShade(world, pos, id) {
  if (id === undefined) {
    do {
      id = `S${++world.nextShade}`;
    } while (world.shadeIds.has(id));
  }
  world.shadeIds.add(id);
  world.shades.push({ id, pos: [...pos], state: 'chase', stunnedThrough: 0 });
  return id;
}

export function randomPosition(world, minRadius, maxRadius, y = 0) {
  return polar(minRadius + world.random() * (maxRadius - minRadius), world.random() * 2 * Math.PI, y);
}

export function createWorld(seed = DEFAULT_SEED, scenario = {}) {
  const specifiedPlayer = scenario.player ?? {};
  const world = {
    tick: 0,
    state: 'playing',
    reason: null,
    duration: scenario.time_left_s ?? tuning.night1_duration_s,
    score: 0,
    player: {
      pos: [...(specifiedPlayer.pos ?? [0, 0, 0])],
      carried: specifiedPlayer.carried ?? 0,
      flames: specifiedPlayer.flames ?? tuning.flames,
      verticalSpeed: 0,
      invulnerableThrough: 0,
      pulseReadyAt: 0,
    },
    lanterns: Array.from({ length: tuning.lantern_count_night1 }, (_, index) => {
      const id = `L${index + 1}`;
      const override = scenario.lanterns?.find((lantern) => lantern.id === id);
      const deposited = override?.deposited ?? (override?.lit ? tuning.lantern_cost : 0);
      return {
        id,
        pos: override?.pos ? [...override.pos] : polar(14, index * 2 * Math.PI / tuning.lantern_count_night1),
        lit: override?.lit ?? deposited >= tuning.lantern_cost,
        deposited,
      };
    }),
    motes: [],
    shades: [],
    random: seededRandom(seed),
    randomMotes: scenario.random_motes ?? true,
    randomShades: scenario.random_shades ?? true,
    nextMote: 0,
    nextShade: 0,
    shadeIds: new Set(scenario.shades?.flatMap(({ id }) => id === undefined ? [] : [id])),
    previousInput: defaultInput,
  };

  if (scenario.motes) {
    for (const pos of scenario.motes) spawnMote(world, pos);
  } else if (world.randomMotes) {
    const sectors = tuning.lantern_count_night1;
    for (let index = 0; index < sectors; index++) {
      const angle = index * 2 * Math.PI / sectors;
      for (let offset = 0; offset < 4; offset++) {
        spawnMote(world, polar(5 + offset * 2.25, angle));
      }
      const [x, , z] = polar(12, angle);
      const [nextX, , nextZ] = polar(12, angle + 2 * Math.PI / sectors);
      for (let offset = 1; offset <= 4; offset++) {
        const fraction = offset / 5;
        spawnMote(world, [x + (nextX - x) * fraction, 0, z + (nextZ - z) * fraction]);
      }
    }
    for (let index = 0; index < 12; index++) spawnMote(world, randomPosition(world, 3, 20));
  }

  if (scenario.shades) {
    for (const { pos, id } of scenario.shades) spawnShade(world, pos, id);
  } else if (world.randomShades) {
    for (let index = 0; index < 2; index++) spawnShade(world, randomPosition(world, 18, 21, 0.8));
  }
  return world;
}

export const timeLeft = (world) => Math.max(0, world.duration - world.tick / TICK_RATE);
