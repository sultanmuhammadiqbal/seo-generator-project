import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../server.js');

test('health endpoint stays available without deployment secrets', async (t) => {
  const server = app.listen(0, '127.0.0.1');
  t.after(() => server.close());

  await new Promise((resolve) => server.once('listening', resolve));
  const address = server.address();
  const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.status, 'ok');
  assert.equal(typeof body.redis, 'boolean');
  assert.equal(typeof body.groq, 'boolean');
  assert.equal(typeof body.tavily, 'boolean');
});

test('deployed frontend uses same-origin API routes', async () => {
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');

  assert.match(html, /fetch\('\/api\/validate-license'/);
  assert.match(html, /const BACKEND_URL = '\/api\/generate-seo'/);
  assert.doesNotMatch(html, /http:\/\/localhost:3001\/api\//);
});
