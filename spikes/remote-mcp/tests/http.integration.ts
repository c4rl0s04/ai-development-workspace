import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, exportJWK, SignJWT } from 'jose';

test('built Next.js routes enforce OAuth over HTTP with a mock issuer', { timeout: 20_000 }, async () => {
  const { publicKey, privateKey } = await generateKeyPair('ES256');
  const jwk = { ...await exportJWK(publicKey), kid: 'http-test' };
  const auth = createServer((_request, response) => {
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ keys: [jwk] }));
  });
  auth.listen(0, '127.0.0.1');
  await once(auth, 'listening');
  const authAddress = auth.address();
  assert.ok(authAddress && typeof authAddress !== 'string');
  const provider = `http://127.0.0.1:${authAddress.port}`;
  const probe = createServer();
  probe.listen(0, '127.0.0.1');
  await once(probe, 'listening');
  const address = probe.address();
  assert.ok(address && typeof address !== 'string');
  const port = address.port;
  await new Promise<void>(resolve => probe.close(() => resolve()));
  const origin = `http://127.0.0.1:${port}`;
  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--port', String(port), '--hostname', '127.0.0.1'], {
    env: { ...process.env, APP_URL: origin, SUPABASE_URL: provider,
      SUPABASE_PUBLISHABLE_KEY: 'http-test-publishable', OWNER_GITHUB_ID: '12345',
      MCP_OAUTH_CLIENT_ID: 'http-test-client', MCP_OAUTH_REDIRECT_URI: 'http://127.0.0.1:49152/callback' },
    stdio: 'ignore',
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 80; attempt++) {
      try {
        const response = await fetch(`${origin}/.well-known/oauth-protected-resource/api/mcp`, { signal: AbortSignal.timeout(1000) });
        if (response.ok) { ready = true; break; }
      } catch { /* Wait only for this test's local process to start. */ }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert.ok(ready, 'Run npm run build first; Next.js did not start');
    const metadata = await (await fetch(`${origin}/.well-known/oauth-protected-resource/api/mcp`)).json();
    assert.equal(metadata.resource, `${origin}/api/mcp`);
    assert.deepEqual(metadata.authorization_servers, [`${provider}/auth/v1`]);
    const post = (bearer?: string) => fetch(`${origin}/api/mcp`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
        'MCP-Protocol-Version': '2025-11-25', ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}) },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'connection_test', arguments: {} } }),
    });
    assert.equal((await post()).status, 401);
    const bearer = await new SignJWT({ role: 'authenticated', is_anonymous: false, client_id: 'http-test-client', github_provider_id: '12345' })
      .setProtectedHeader({ alg: 'ES256', kid: 'http-test' }).setSubject('8ccaa7af-909f-44e7-84cb-67cdccb56be6')
      .setIssuer(`${provider}/auth/v1`).setAudience(`${origin}/api/mcp`).setIssuedAt().setExpirationTime('5m').sign(privateKey);
    const response = await post(bearer);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /Authenticated connection successful/);
    assert.equal((await fetch(`${origin}/auth/callback`)).status, 400);
    assert.equal((await fetch(`${origin}/oauth/consent`)).status, 200);
  } finally {
    if (child.exitCode === null) { child.kill('SIGTERM'); await once(child, 'exit'); }
    await new Promise<void>(resolve => auth.close(() => resolve()));
  }
});
