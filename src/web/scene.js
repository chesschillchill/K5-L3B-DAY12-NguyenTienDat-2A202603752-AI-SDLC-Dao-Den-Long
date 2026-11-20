import * as THREE from 'three';
import { ISLAND_RADIUS, tuning } from '../sim/world.js';

const matte = (color, options = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.85, ...options });
const glow = (color) => new THREE.MeshBasicMaterial({ color });
const palette = {
  wood: matte(0x39233c),
  brass: matte(0xaa613a),
  grass: matte(0x433865),
  rock: matte(0x392f55),
  leaf: matte(0x675381),
  leafDark: matte(0x372a52),
  cream: matte(0xe9bf7c),
  cloak: matte(0x466c78),
  paperOff: matte(0x8e534b),
  paperOn: glow(0xffbc58),
  wick: glow(0xffe39d),
  mote: glow(0xffd378),
  shade: matte(0x291838, { emissive: 0x36144d, emissiveIntensity: 0.52 }),
  stunned: matte(0x685880, { emissive: 0x582955, emissiveIntensity: 0.45 }),
  eyes: glow(0xc699ff),
};

const moteShape = new THREE.OctahedronGeometry(0.18);
const shadeShape = new THREE.SphereGeometry(0.69, 12, 8);
const eyeShape = new THREE.SphereGeometry(0.055, 7, 5);
const haloShape = new THREE.RingGeometry(tuning.safe_radius - 0.055, tuning.safe_radius, 64);

function mesh(parent, geometry, material, x = 0, y = 0, z = 0) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(x, y, z);
  parent.add(object);
  return object;
}

function tree(scene, x, z, scale, spin) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  group.rotation.y = spin;
  scene.add(group);
  mesh(group, new THREE.CylinderGeometry(0.11, 0.24, 2.1, 6), palette.wood, 0, 1.03);
  mesh(group, new THREE.IcosahedronGeometry(1.22, 0), palette.leafDark, -0.14, 2.06).scale.set(1.08, 0.95, 1);
  mesh(group, new THREE.IcosahedronGeometry(0.98, 0), palette.leaf, 0.32, 2.57, 0.15);
  mesh(group, new THREE.IcosahedronGeometry(0.78, 0), palette.leaf, -0.45, 2.38, -0.38);
}

function makeIsland(scene) {
  mesh(scene, new THREE.CylinderGeometry(ISLAND_RADIUS, 19.2, 2.8, 56), palette.grass, 0, -1.4);
  mesh(scene, new THREE.CylinderGeometry(19, 12, 8, 26), palette.rock, 0, -6.75);
  const moss = matte(0x54476e);
  const stone = new THREE.IcosahedronGeometry(1, 0);
  for (let index = 0; index < 52; index++) {
    const angle = index * 2.399963;
    const radius = 15 + (index % 9) * 0.83;
    const object = mesh(scene, stone, index % 4 === 0 ? moss : palette.rock,
      Math.sin(angle) * radius, 0.12, Math.cos(angle) * radius);
    object.scale.set(0.24 + (index % 4) * 0.15, 0.18 + (index % 3) * 0.16, 0.54);
    object.rotation.y = angle;
  }
  for (let index = 0; index < 12; index++) {
    const angle = index * 2.399963;
    const radius = 17.5 + (index % 4) * 1.1;
    tree(scene, Math.sin(angle) * radius, Math.cos(angle) * radius, 0.75 + (index % 3) * 0.25, angle);
  }
  const path = new THREE.RingGeometry(13.4, 14.65, 64);
  mesh(scene, path, matte(0x4f4068), 0, 0.012).rotation.x = -Math.PI / 2;
}

function makeSky(scene) {
  const cloud = new THREE.IcosahedronGeometry(1, 1);
  const cloudMaterials = [matte(0x534467), matte(0x69567e), matte(0x746190)];
  for (let index = 0; index < 29; index++) {
    const angle = index * 2.399963;
    const radius = 27 + (index % 8) * 4.5;
    const object = mesh(scene, cloud, cloudMaterials[index % 3], Math.sin(angle) * radius,
      -4.5 - (index % 4) * 1.4, Math.cos(angle) * radius);
    object.scale.set(6.8 + index % 6, 1.7 + (index % 3) * 0.3, 4.5 + index % 4);
    object.rotation.y = angle;
  }
  const stars = [];
  for (let index = 0; index < 195; index++) {
    const angle = index * 2.399963;
    const height = 6 + ((index * 81) % 173) * 0.38;
    const radius = 96 + index % 10;
    stars.push(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
  }
  const starGeometry = new THREE.BufferGeometry();
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(stars, 3));
  scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({
    color: 0xd7bcab, size: 0.22, fog: false, opacity: 0.67, transparent: true,
  })));
  mesh(scene, new THREE.SphereGeometry(2.7, 32, 24),
    new THREE.MeshBasicMaterial({ color: 0xffdbac, fog: false }), -24, 11, 67);
}

function makePlayer(scene) {
  const body = new THREE.Group();
  scene.add(body);
  const left = mesh(body, new THREE.CapsuleGeometry(0.09, 0.25, 4, 7), palette.wood, -0.14, 0.26);
  const right = mesh(body, left.geometry, palette.wood, 0.14, 0.26);
  mesh(body, new THREE.CylinderGeometry(0.19, 0.37, 0.73, 10), palette.cloak, 0, 0.64);
  mesh(body, new THREE.CylinderGeometry(0.22, 0.24, 0.09, 10), palette.brass, 0, 0.88);
  mesh(body, new THREE.SphereGeometry(0.23, 14, 10), palette.cream, 0, 1.13);
  mesh(body, new THREE.ConeGeometry(0.58, 0.34, 14), palette.cream, 0, 1.51);
  mesh(body, new THREE.TorusGeometry(0.54, 0.024, 6, 18), palette.brass, 0, 1.35).rotation.x = Math.PI / 2;
  mesh(body, new THREE.CylinderGeometry(0.011, 0.011, 0.32, 5), palette.wood, 0, 1.27, 0.47);
  mesh(body, new THREE.CylinderGeometry(0.087, 0.105, 0.19, 8), palette.paperOn, 0, 1.04, 0.47);
  mesh(body, new THREE.SphereGeometry(0.035, 6, 6), palette.wick, 0, 0.94, 0.47);
  return { body, left, right };
}

function makeLantern(scene, lantern) {
  const group = new THREE.Group();
  group.position.set(...lantern.pos);
  scene.add(group);
  mesh(group, new THREE.CylinderGeometry(0.76, 0.91, 0.24, 8), palette.rock, 0, 0.12);
  mesh(group, new THREE.CylinderGeometry(0.18, 0.31, 2, 7), palette.wood, 0, 1.15);
  mesh(group, new THREE.CylinderGeometry(0.6, 0.43, 0.22, 6), palette.brass, 0, 1.95);
  const paper = mesh(group, new THREE.CylinderGeometry(0.41, 0.45, 0.8, 6), palette.paperOff, 0, 2.43);
  const frame = new THREE.CylinderGeometry(0.035, 0.05, 0.81, 6);
  for (let index = 0; index < 6; index++) {
    const angle = index * Math.PI / 3;
    mesh(group, frame, palette.wood, Math.sin(angle) * 0.43, 2.43, Math.cos(angle) * 0.43);
  }
  mesh(group, new THREE.ConeGeometry(0.75, 0.56, 6), palette.wood, 0, 3.02);
  mesh(group, new THREE.SphereGeometry(0.09, 8, 6), palette.brass, 0, 3.34);
  const lamp = new THREE.PointLight(0xffa737, 0, 12, 1.65);
  lamp.position.y = 2.45;
  group.add(lamp);
  const halo = mesh(group, haloShape, new THREE.MeshBasicMaterial({
    color: 0xdb9f58, transparent: true, opacity: 0.53, depthWrite: false, side: THREE.DoubleSide,
  }), 0, 0.028);
  halo.rotation.x = -Math.PI / 2;
  return { paper, lamp, halo };
}

function makeShade(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const body = mesh(group, shadeShape, palette.shade);
  body.scale.set(0.93, 1.15, 0.83);
  mesh(group, eyeShape, palette.eyes, -0.18, 0.12, 0.51);
  mesh(group, eyeShape, palette.eyes, 0.18, 0.12, 0.51);
  const tail = mesh(group, new THREE.ConeGeometry(0.39, 0.63, 9), palette.shade, 0, -0.47);
  tail.rotation.z = Math.PI;
  return { group, body, tail };
}

export function createView(canvas, world) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x271b38);
  scene.fog = new THREE.FogExp2(0x271b38, 0.024);
  const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 150);
  const ambient = new THREE.HemisphereLight(0xbeb8ff, 0x9b594c, 1.18);
  const moonlight = new THREE.DirectionalLight(0xc5b3f1, 1.5);
  moonlight.position.set(-10, 16, 8);
  scene.add(ambient, moonlight);
  makeSky(scene);
  makeIsland(scene);
  const player = makePlayer(scene);
  const lanterns = world.lanterns.map((lantern) => makeLantern(scene, lantern));
  const motes = [];
  const shades = [];
  const pulse = mesh(scene, new THREE.RingGeometry(0.94, 1, 48), new THREE.MeshBasicMaterial({
    color: 0xffcc79, transparent: true, side: THREE.DoubleSide, depthWrite: false,
  }));
  pulse.rotation.x = -Math.PI / 2;
  const pulseOrigin = new THREE.Vector3();
  let pulseAt = -Infinity;

  const resize = () => {
    const { clientWidth, clientHeight } = canvas;
    if (!clientHeight || !clientWidth) return;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  };
  resize();
  window.addEventListener('resize', resize);

  return {
    usePulse(pos, seconds) {
      pulseOrigin.set(pos[0], 0.06, pos[2]);
      pulseAt = seconds;
    },
    reset() {
      pulseAt = -Infinity;
    },
    render(state, yaw, heading, moving, seconds) {
      const [x, y, z] = state.player.pos;
      const angle = yaw * Math.PI / 180;
      camera.position.set(x - Math.sin(angle) * 7.7, 4.3 + y * 0.65, z - Math.cos(angle) * 7.7);
      camera.lookAt(x + Math.sin(angle) * 3.7, 1.8 + y * 0.65, z + Math.cos(angle) * 3.7);
      player.body.position.set(x, y, z);
      player.body.rotation.y = heading;
      player.body.visible = state.tick > state.player.invulnerableThrough || state.tick % 12 < 8;
      const stride = moving && y === 0 ? Math.sin(seconds * 13) * 0.42 : 0;
      player.left.rotation.x = stride;
      player.right.rotation.x = -stride;

      let litCount = 0;
      state.lanterns.forEach((lantern, index) => {
        const { paper, lamp, halo } = lanterns[index];
        paper.material = lantern.lit ? palette.paperOn : palette.paperOff;
        lamp.intensity = lantern.lit ? 28 : 0;
        halo.visible = lantern.lit;
        litCount += Number(lantern.lit);
      });
      ambient.intensity = 1.18 + litCount * 0.21;
      state.motes.forEach(({ pos }, index) => {
        motes[index] ??= mesh(scene, moteShape, palette.mote);
        const mote = motes[index];
        mote.visible = true;
        mote.position.set(pos[0], pos[1] + 0.53 + 0.15 * Math.sin(seconds * 3 + index), pos[2]);
        mote.rotation.y = seconds * 1.6 + index;
      });
      for (let index = state.motes.length; index < motes.length; index++) motes[index].visible = false;

      state.shades.forEach((shade, index) => {
        shades[index] ??= makeShade(scene);
        const { group, body, tail } = shades[index];
        group.visible = true;
        group.position.set(shade.pos[0], shade.pos[1] + Math.sin(seconds * 3 + index) * 0.12, shade.pos[2]);
        group.rotation.y = Math.atan2(x - shade.pos[0], z - shade.pos[2]);
        body.material = tail.material = shade.state === 'stunned' ? palette.stunned : palette.shade;
      });
      for (let index = state.shades.length; index < shades.length; index++) shades[index].group.visible = false;

      const pulseElapsed = (seconds - pulseAt) / 0.5;
      pulse.visible = pulseElapsed < 1;
      if (pulse.visible) {
        pulse.position.copy(pulseOrigin);
        pulse.scale.setScalar(0.1 + pulseElapsed * tuning.pulse_radius);
        pulse.material.opacity = (1 - pulseElapsed) * 0.8;
      }
      renderer.render(scene, camera);
    },
  };
}
