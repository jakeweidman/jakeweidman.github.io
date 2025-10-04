import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';

async function startServer() {
  const child = spawn(process.execPath, ['server.js'], {
    env: { ...process.env, PORT: '0' },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  // Wait briefly for the server to bind; try to parse the port from output or probe common range
  let port;
  const portMatch = /http:\/\/localhost:(\d+)/;

  child.stdout.setEncoding('utf8');
  child.stderr.setEncoding('utf8');

  let buffer = '';
  child.stdout.on('data', chunk => { buffer += chunk; });
  child.stderr.on('data', chunk => { buffer += chunk; });

  for (let i = 0; i < 20; i++) {
    await delay(50);
    const m = buffer.match(portMatch);
    if (m) { port = Number(m[1]); break; }
  }

  assert.ok(child.pid, 'server process should start');
  assert.ok(port, 'server should report listening port');

  async function stop() {
    child.kill('SIGTERM');
    try { await once(child, 'exit'); } catch {}
  }

  return { port, stop };
}

function httpGet(hostname, port, path) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname, port, path }, res => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, body: Buffer.concat(chunks).toString('utf8'), headers: res.headers }));
    });
    req.on('error', reject);
  });
}

test('GET / serves index.html with Hello World', async (t) => {
  const { port, stop } = await startServer();
  t.after(stop);

  const res = await httpGet('localhost', port, '/');
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/html/);
  assert.match(res.body, /Hello, World/);
});
