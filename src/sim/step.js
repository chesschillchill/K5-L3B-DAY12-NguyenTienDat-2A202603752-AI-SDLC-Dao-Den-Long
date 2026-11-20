import {
  distance, ISLAND_RADIUS, randomPosition, spawnMote, spawnShade, TICK_RATE, timeLeft, tuning,
} from './world.js';

const dt = 1 / TICK_RATE;
const ticks = (seconds) => Math.round(seconds * TICK_RATE);

function movePlayer(player, input, jump) {
  const [localX, localZ] = input.move;
  const scale = tuning.player_speed * dt / Math.max(1, Math.hypot(localX, localZ));
  const yaw = (input.cam_yaw_deg % 360) * Math.PI / 180;
  const cos = Math.cos(yaw);
  const sin = Math.sin(yaw);
  const [x, y, z] = player.pos;
  let nextX = x + (localX * cos + localZ * sin) * scale;
  let nextZ = z + (-localX * sin + localZ * cos) * scale;
  const limit = Math.max(ISLAND_RADIUS - 0.3, Math.hypot(x, z));
  const radius = Math.hypot(nextX, nextZ);
  if (radius > limit) {
    nextX *= limit / radius;
    nextZ *= limit / radius;
  }
  if (jump && y <= 0) player.verticalSpeed = 6.5;
  const nextY = Math.max(0, y + player.verticalSpeed * dt);
  player.verticalSpeed = nextY > 0 ? player.verticalSpeed - 20 * dt : 0;
  player.pos = [nextX, nextY, nextZ];
}

function pickMotes(world, emit) {
  const { player } = world;
  world.motes = world.motes.filter((mote) => {
    if (player.carried >= tuning.carry_capacity || distance(player.pos, mote.pos) > tuning.pickup_radius) {
      return true;
    }
    player.carried++;
    world.score += tuning.score.per_mote;
    emit('mote_picked', { carried: player.carried });
    return false;
  });
}

function deposit(world, emit) {
  if (world.player.carried <= 0) return;
  let target;
  let nearest = Infinity;
  for (const lantern of world.lanterns) {
    const range = distance(world.player.pos, lantern.pos);
    if (!lantern.lit && range <= tuning.interact_radius && range < nearest) {
      target = lantern;
      nearest = range;
    }
  }
  if (!target) return;
  const amount = Math.min(world.player.carried, Math.max(0, tuning.lantern_cost - target.deposited));
  if (amount === 0) return;
  world.player.carried -= amount;
  target.deposited += amount;
  emit('deposit', { lantern_id: target.id, amount, deposited: target.deposited });
  if (target.deposited >= tuning.lantern_cost) {
    target.lit = true;
    world.score += tuning.score.per_lantern;
    emit('lantern_lit', { lantern_id: target.id });
  }
}

// Clip a move at the first entrance into a lit lantern's safe circle.
function shadeMove(from, to, zones) {
  let start = from;
  for (const lantern of zones) {
    if (distance(start, lantern.pos) >= tuning.safe_radius) continue;
    const [lx, , lz] = lantern.pos;
    const x = start[0] - lx;
    const z = start[2] - lz;
    const length = Math.hypot(x, z);
    start = length === 0
      ? [lx + tuning.safe_radius, start[1], lz]
      : [lx + x * tuning.safe_radius / length, start[1], lz + z * tuning.safe_radius / length];
  }
  const dx = to[0] - start[0];
  const dz = to[2] - start[2];
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) return start;
  let fraction = 1;
  for (const lantern of zones) {
    const x = start[0] - lantern.pos[0];
    const z = start[2] - lantern.pos[2];
    const dot = x * dx + z * dz;
    if (dot >= 0) continue;
    const outside = Math.max(0, x * x + z * z - tuning.safe_radius ** 2);
    const discriminant = dot * dot - lengthSquared * outside;
    if (discriminant > 0) {
      const entry = outside / (-dot + Math.sqrt(discriminant));
      fraction = Math.min(fraction, entry);
    }
  }
  return [start[0] + dx * fraction, start[1], start[2] + dz * fraction];
}

function pulse(world, zones, emit) {
  const { player } = world;
  if (player.carried < tuning.pulse_cost || world.tick < player.pulseReadyAt) return;
  player.carried -= tuning.pulse_cost;
  player.pulseReadyAt = world.tick + ticks(tuning.pulse_cooldown_s);
  const stunnedIds = [];
  for (const shade of world.shades) {
    const range = distance(player.pos, shade.pos);
    if (range > tuning.pulse_radius) continue;
    const dx = range === 0 ? 1 : (shade.pos[0] - player.pos[0]) / range;
    const dz = range === 0 ? 0 : (shade.pos[2] - player.pos[2]) / range;
    const [x, y, z] = shade.pos;
    shade.pos = shadeMove(shade.pos, [x + dx * tuning.pulse_push_m, y, z + dz * tuning.pulse_push_m], zones);
    shade.stunnedThrough = world.tick + ticks(tuning.pulse_stun_s) - 1;
    stunnedIds.push(shade.id);
  }
  world.score += stunnedIds.length * tuning.score.per_stun;
  emit('pulse', { stunned_ids: stunnedIds });
}

function updateShades(world, zones, emit) {
  const { player } = world;
  const safe = zones.some((lantern) => distance(player.pos, lantern.pos) <= tuning.safe_radius);
  for (const shade of world.shades) {
    const [x, y, z] = shade.pos;
    const range = distance(player.pos, shade.pos);
    if (world.tick <= shade.stunnedThrough) {
      shade.pos = shadeMove(shade.pos, shade.pos, zones);
      shade.state = 'stunned';
      continue;
    }
    shade.state = 'chase';
    const advance = range === 0 ? 0 : Math.min(1, tuning.shade_speed * dt / range);
    shade.pos = shadeMove(shade.pos, [
      x + (player.pos[0] - x) * advance,
      y,
      z + (player.pos[2] - z) * advance,
    ], zones);
    if (safe || world.tick <= player.invulnerableThrough || distance(player.pos, shade.pos) > tuning.shade_hit_radius) {
      continue;
    }
    player.flames = Math.max(0, player.flames - 1);
    const dropped = Math.floor(player.carried * tuning.hit_drop_ratio);
    player.carried -= dropped;
    player.invulnerableThrough = world.tick + ticks(tuning.invuln_s) - 1;
    emit('player_hit', { by: 'shade', flames: player.flames, dropped });
    if (player.flames === 0) break;
  }
}

function finish(world, reason, emit) {
  world.reason = reason;
  world.state = reason === 'all_lit' ? 'won' : 'lost';
  if (world.state === 'won') {
    world.score += Math.floor(timeLeft(world)) * tuning.score.per_second_left
      + world.player.flames * tuning.score.per_flame_left;
  }
  emit('game_over', { result: world.state, reason });
}

export function step(world, input) {
  if (world.state !== 'playing') return [];
  const events = [];
  const emit = (name, data) => events.push({ type: 'event', tick: world.tick, name, data });
  const pressed = (key) => input[key] && !world.previousInput[key];
  world.tick++;

  if (world.player.flames === 0) {
    finish(world, 'no_flames', emit);
    return events;
  }
  if (world.lanterns.every(({ lit }) => lit)) {
    finish(world, 'all_lit', emit);
    return events;
  }
  movePlayer(world.player, input, pressed('jump'));
  pickMotes(world, emit);
  if (pressed('interact')) deposit(world, emit);
  const zones = world.lanterns.filter(({ lit }) => lit);
  if (world.lanterns.length === zones.length) {
    finish(world, 'all_lit', emit);
  } else {
    if (pressed('pulse')) pulse(world, zones, emit);
    if (world.randomMotes && world.motes.length < 8 && world.tick % ticks(8) === 0) {
      for (let index = 0; index < 4; index++) spawnMote(world, randomPosition(world, 4, 20));
    }
    if (world.randomShades && world.shades.length < 4 && world.tick % ticks(35) === 0) {
      const pos = randomPosition(world, 20, 22, 0.8);
      emit('shade_spawned', { id: spawnShade(world, shadeMove(pos, pos, zones)) });
    }
    updateShades(world, zones, emit);
    if (world.player.flames === 0) finish(world, 'no_flames', emit);
    else if (timeLeft(world) === 0) finish(world, 'dawn', emit);
  }
  world.previousInput = { ...input };
  return events;
}
