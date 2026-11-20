import { step } from '../sim/step.js';
import { createWorld, distance, TICK_RATE, timeLeft, tuning } from '../sim/world.js';
import { createView } from './scene.js';

const canvas = document.querySelector('#scene');
const panel = document.querySelector('#panel');
const play = document.querySelector('#play');
const title = document.querySelector('#panel-title');
const kicker = document.querySelector('#panel-kicker');
const description = document.querySelector('#panel-description');
const hint = document.querySelector('#hint');
const hud = Object.fromEntries(['flames', 'carried', 'lantern-count', 'clock', 'score']
  .map((key) => [key, document.getElementById(key)]));

const keys = new Set();
const pending = new Set();
const actionKeys = new Set(['Space', 'KeyE', 'KeyF']);
const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight']);
const dt = 1 / TICK_RATE;
const lossReasons = {
  dawn: 'Bình minh đã đến trước khi Mây thắp hết đèn.',
  no_flames: 'Bóng Mực đã dập tắt ngọn lửa cuối cùng của Mây.',
};
let world = createWorld();
let view;
let yaw = 0;
let heading = 0;
let active = false;
let previousTime;
let accumulator = 0;
let drag = null;

function updateHud() {
  hud.flames.textContent = world.player.flames;
  hud.carried.textContent = `${world.player.carried}/${tuning.carry_capacity}`;
  hud['lantern-count'].textContent = `${world.lanterns.filter(({ lit }) => lit).length}/${world.lanterns.length}`;
  const seconds = Math.ceil(timeLeft(world));
  hud.clock.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  hud.score.textContent = world.score;
  const target = world.lanterns.find(({ pos, lit }) => !lit && distance(pos, world.player.pos) <= tuning.interact_radius);
  hint.hidden = !active || !target;
  if (target) {
    hint.textContent = world.player.carried > 0
      ? `E · Nạp đèn (${target.deposited}/${tuning.lantern_cost})`
      : 'Hãy gom đom đóm để nạp đèn.';
  }
}

function start() {
  world = createWorld();
  yaw = 0;
  heading = 0;
  accumulator = 0;
  drag = null;
  keys.clear();
  pending.clear();
  view.reset();
  active = true;
  panel.hidden = true;
  updateHud();
}

function finish() {
  active = false;
  panel.hidden = false;
  kicker.textContent = world.state === 'won' ? 'Đêm 1 · Hoàn thành' : 'Đêm 1 · Kết thúc';
  title.textContent = world.state === 'won' ? 'Đảo đã sáng!' : 'Ngọn lửa tắt';
  const message = world.state === 'won' ? 'Mây đã thắp lại cả năm đèn.' : lossReasons[world.reason];
  description.textContent = `${message} Điểm: ${world.score}.`;
  play.textContent = 'Chơi lại';
  play.focus();
}

function inputForTick() {
  const down = (...codes) => codes.some((code) => keys.has(code));
  const action = (code) => pending.delete(code) || down(code);
  return {
    move: [
      Number(down('KeyA', 'ArrowLeft')) - Number(down('KeyD', 'ArrowRight')),
      Number(down('KeyW', 'ArrowUp')) - Number(down('KeyS', 'ArrowDown')),
    ],
    cam_yaw_deg: yaw,
    jump: action('Space'),
    interact: action('KeyE'),
    pulse: action('KeyF'),
  };
}

function frame(timestamp) {
  const seconds = timestamp / 1000;
  const elapsed = previousTime === undefined ? 0 : Math.min(seconds - previousTime, 0.1);
  previousTime = seconds;
  let moving = false;
  if (active) {
    accumulator += elapsed;
    while (active && accumulator + 1e-9 >= dt) {
      const before = world.player.pos;
      for (const event of step(world, inputForTick())) {
        if (event.name === 'pulse') view.usePulse(world.player.pos, seconds);
        if (event.name === 'game_over') finish();
      }
      const [x, , z] = world.player.pos;
      if (x !== before[0] || z !== before[2]) {
        moving = true;
        heading = Math.atan2(x - before[0], z - before[2]);
      }
      accumulator -= dt;
    }
    updateHud();
  }
  view.render(world, yaw, heading, moving, seconds);
  requestAnimationFrame(frame);
}

try {
  view = createView(canvas, world);
  play.disabled = false;
  play.addEventListener('click', start);
  updateHud();
  requestAnimationFrame(frame);
} catch (error) {
  description.textContent = 'Không khởi tạo được WebGL. Hãy mở game bằng trình duyệt có hỗ trợ WebGL 2.';
  console.error(error);
}

window.addEventListener('keydown', (event) => {
  if (!active || (!movementKeys.has(event.code) && !actionKeys.has(event.code))) return;
  event.preventDefault();
  keys.add(event.code);
  if (!event.repeat && actionKeys.has(event.code)) pending.add(event.code);
});
window.addEventListener('keyup', (event) => keys.delete(event.code));
window.addEventListener('blur', () => {
  keys.clear();
  pending.clear();
  drag = null;
});
canvas.addEventListener('pointerdown', (event) => {
  if (active && event.button === 0) {
    drag = { id: event.pointerId, x: event.clientX };
  }
});
window.addEventListener('pointermove', (event) => {
  if (!active || drag?.id !== event.pointerId) return;
  if ((event.buttons & 1) === 0) {
    drag = null;
    return;
  }
  yaw = (yaw - (event.clientX - drag.x) * 0.36) % 360;
  drag.x = event.clientX;
});
const stopDrag = (event) => { if (drag?.id === event.pointerId) drag = null; };
window.addEventListener('pointerup', stopDrag);
window.addEventListener('pointercancel', stopDrag);
