import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import { test } from 'node:test';

test('built app serves every placeholder, navigation, assets and security headers', {
  timeout: 30_000,
}, async () => {
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const server = spawn(
    process.execPath,
    [
      'node_modules/next/dist/bin/next',
      'start',
      '--hostname',
      '127.0.0.1',
      '--port',
      String(port),
    ],
    { stdio: 'ignore' },
  );
  try {
    let ready = false;
    for (let attempt = 0; attempt < 100; attempt++) {
      try {
        if ((await fetch(origin, { signal: AbortSignal.timeout(500) })).ok) {
          ready = true;
          break;
        }
      } catch {
        /* Wait for this test's local Next.js process. */
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'Built server did not start; run npm run build first');
    for (const path of ['/', '/projects', '/approvals']) {
      const response = await fetch(`${origin}${path}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
      assert.equal(response.headers.get('x-frame-options'), 'DENY');
      assert.equal(response.headers.get('x-powered-by'), null);
      assert.match(
        response.headers.get('content-security-policy') ?? '',
        /frame-ancestors 'none'/,
      );
      const html = await response.text();
      assert.match(html, /Skip to content/);
      assert.match(html, /<main id="main-content"/);
      assert.match(
        html,
        new RegExp(
          `aria-current="page"[^>]*href="${path}"|href="${path}"[^>]*aria-current="page"`,
        ),
      );
      const css = html.match(/href="([^"]+\.css[^"]*)"/);
      assert.ok(css, 'Compiled stylesheet is linked');
      assert.equal(
        (await fetch(new URL(css[1].replaceAll('&amp;', '&'), origin))).status,
        200,
      );
    }
    assert.equal((await fetch(`${origin}/does-not-exist`)).status, 404);
  } finally {
    if (server.exitCode === null) {
      server.kill('SIGTERM');
      await once(server, 'exit');
    }
  }
});
