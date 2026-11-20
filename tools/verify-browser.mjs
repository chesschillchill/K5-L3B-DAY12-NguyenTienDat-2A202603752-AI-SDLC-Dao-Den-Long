import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, resolve, sep } from 'node:path';
import { tmpdir } from 'node:os';
import { setTimeout as sleep } from 'node:timers/promises';

const proof = resolve('docs/proof/phase-1');
const root = resolve('dist');
const media = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(root, pathname === '/' ? 'index.html' : '.' + pathname);
  try {
    if (!file.startsWith(root + sep) || !media[extname(file)]) throw new Error('Not found');
    res.setHeader('Content-Type', media[extname(file)]);
    res.end(await readFile(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((done) => server.listen(0, '127.0.0.1', done));
const profile = await mkdtemp(join(tmpdir(), 'lab12-cdp-'));
const browser = spawn(process.env.CHROME_BIN || 'google-chrome', [
  '--headless', '--disable-background-networking', '--use-gl=angle', '--use-angle=swiftshader',
  '--enable-unsafe-swiftshader', '--no-first-run', '--remote-debugging-port=0',
  '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });

let ws;
let browserError;
browser.on('error', (error) => { browserError = error; });
const log = [];
try {
  const endWaitAt = Date.now() + 10_000;
  let port;
  while (!port) {
    try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
    catch (error) {
      if (browserError) throw browserError;
      if (Date.now() > endWaitAt || browser.exitCode !== null) throw error;
      await sleep(50);
    }
  }
  const url = 'http://127.0.0.1:' + port;
  const browserVersion = await (await fetch(url + '/json/version')).json();
  const [page] = await (await fetch(url + '/json/list')).json();
  ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((done, fail) => {
    ws.addEventListener('open', done, { once: true });
    ws.addEventListener('error', fail, { once: true });
  });
  let seq = 0;
  const awaiting = new Map();
  const exceptions = [];
  ws.addEventListener('message', ({ data }) => {
    const msg = JSON.parse(data);
    if (msg.method === 'Runtime.exceptionThrown') exceptions.push(msg.params.exceptionDetails);
    const callback = awaiting.get(msg.id);
    if (callback) {
      awaiting.delete(msg.id);
      callback(msg);
    }
  });
  function call(method, params = {}) {
    return new Promise((done, fail) => {
      const id = ++seq;
      const timer = setTimeout(() => fail(new Error('CDP timeout: ' + method)), 25_000);
      awaiting.set(id, (msg) => {
        clearTimeout(timer);
        if (msg.error) fail(new Error(JSON.stringify(msg.error)));
        else done(msg.result);
      });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function evaluate(expression) {
    const data = await call('Runtime.evaluate', { expression, returnByValue: true });
    if (data.exceptionDetails) throw new Error(JSON.stringify(data.exceptionDetails));
    return data.result.value;
  }
  await call('Runtime.enable');
  await call('Page.enable');
  await call('Emulation.setDeviceMetricsOverride', { width: 1366, height: 864, deviceScaleFactor: 1, mobile: false });
  await call('Page.addScriptToEvaluateOnNewDocument', { source: `
    let queue = [], ticks = 0;
    window.requestAnimationFrame = (fn) => queue.push(fn);
    window.advance = (count = 0) => {
      do {
        const steps = Math.min(count, 5);
        ticks += steps;
        count -= steps;
        const batch = queue;
        queue = [];
        for (const callback of batch) callback(ticks * 1000 / 60);
      } while (count > 0);
    };
  ` });
  await call('Page.navigate', { url: 'http://127.0.0.1:' + server.address().port });
  for (let i = 0; i < 100; i++) {
    if (await evaluate('document.querySelector("#play")?.disabled === false')) break;
    if (i === 99) throw new Error('Game did not start');
    await sleep(50);
  }
  const mouse = (type, x, y, pressed = false) => call('Input.dispatchMouseEvent', {
    type, x, y, button: type === 'mouseMoved' ? 'none' : 'left',
    buttons: pressed ? 1 : 0, clickCount: type === 'mouseMoved' ? 0 : 1,
  });
  async function clickPlay() {
    const [x, y] = await evaluate('(() => {const r = document.querySelector("#play").getBoundingClientRect(); return [r.x + r.width/2, r.y + r.height/2]})()');
    await mouse('mousePressed', x, y, true);
    await mouse('mouseReleased', x, y);
  }
  async function turn(deltaPixels) {
    await mouse('mouseMoved', 950, 460);
    await mouse('mousePressed', 950, 460, true);
    for (let i = 1; i <= 5; i++) await mouse('mouseMoved', 950 + deltaPixels * i / 5, 460, true);
    await mouse('mouseReleased', 950 + deltaPixels, 460);
  }
  async function input(key, ticks) {
    const code = key === ' ' ? 'Space' : 'Key' + key;
    await call('Input.dispatchKeyEvent', { type: 'rawKeyDown', key, code });
    await evaluate('advance(' + ticks + ')');
    await call('Input.dispatchKeyEvent', { type: 'keyUp', key, code });
  }
  const getStatus = () => evaluate(`Object.fromEntries(['flames','carried','lantern-count','clock','score','panel-title','play'].map(id => [id, document.getElementById(id).textContent.trim()]))`);
  async function screenshot(name) {
    const { data } = await call('Page.captureScreenshot', { format: 'png' });
    await writeFile(join(proof, name), Buffer.from(data, 'base64'));
  }

  await evaluate('advance()');
  await clickPlay();
  assert.equal(await evaluate('document.querySelector("#panel").hidden'), true);
  await input('W', 120);
  await input('E', 1);
  const first = await getStatus();
  assert.equal(first['lantern-count'], '1/5');
  log.push({ check: 'Walk to first lantern and light it', observed: first });
  await screenshot('browser-playing.png');

  for (let index = 0; index < 4; index++) {
    await turn(index === 0 ? -350 : -200);
    await input('W', 141);
    await input('E', 1);
    const status = await getStatus();
    assert.equal(status['lantern-count'], (index + 2) + '/5', JSON.stringify(status));
  }
  const victory = await getStatus();
  assert.equal(victory['panel-title'], 'Đảo đã sáng!');
  assert.equal(victory.play, 'Chơi lại');
  log.push({ check: 'Light all five lanterns using keyboard and camera drag', observed: victory });
  await screenshot('browser-won.png');

  await clickPlay();
  assert.equal((await getStatus())['lantern-count'], '0/5');
  await evaluate('advance(900)');
  const defeat = await getStatus();
  assert.equal(defeat.flames, '0');
  assert.equal(defeat['panel-title'], 'Ngọn lửa tắt');
  log.push({ check: 'Restart after a win and lose to shades', observed: defeat });
  await clickPlay();
  const restarted = await getStatus();
  assert.equal(restarted.flames, '3');
  assert.equal(restarted['lantern-count'], '0/5');
  assert.equal(restarted.score, '0');
  assert.equal(await evaluate('document.querySelector("#panel").hidden'), true);
  log.push({ check: 'Restart after a loss with a fresh HUD and hidden end panel', observed: restarted });
  assert.deepEqual(exceptions, []);
  const result = JSON.stringify({ browser: browserVersion.Browser, checks: log }, null, 2) + '\n';
  await writeFile(join(proof, 'browser-checks.json'), result);
  process.stdout.write(result);
} finally {
  ws?.close();
  browser.kill();
  server.close();
  await sleep(300);
  await rm(profile, { recursive: true, force: true, maxRetries: 3 });
}
