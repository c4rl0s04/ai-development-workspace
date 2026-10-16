import { test } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPair, createLocalJWKSet, exportJWK, SignJWT } from 'jose';
import { createMcpEndpoint, resourceMetadata } from '../lib/mcp';
import { config } from '../lib/config';
import { clientRedirect, validateClient } from '../lib/oauth';
import { isOwner } from '../lib/owner';
import type { User } from '@supabase/supabase-js';

const settings = {
  appOrigin: 'https://spike.example.com', supabaseUrl: 'https://project.supabase.co',
  publishableKey: 'test-publishable-key', ownerGithubId: '12345', clientId: 'test-client',
  callback: 'http://127.0.0.1:49152/callback/server-id',
  issuer: 'https://project.supabase.co/auth/v1', resource: 'https://spike.example.com/api/mcp',
  metadata: 'https://spike.example.com/.well-known/oauth-protected-resource/api/mcp',
};
const { publicKey, privateKey } = await generateKeyPair('ES256');
const jwk = await exportJWK(publicKey);
jwk.kid = 'test-key';
const endpoint = createMcpEndpoint(settings, createLocalJWKSet({ keys: [jwk] }));
const subject = '8ccaa7af-909f-44e7-84cb-67cdccb56be6';
async function token(overrides: Record<string, unknown> = {}) {
  return new SignJWT({
    sub: subject, iss: settings.issuer, aud: settings.resource,
    iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 300,
    client_id: settings.clientId, github_provider_id: settings.ownerGithubId,
    role: 'authenticated', is_anonymous: false, ...overrides,
  }).setProtectedHeader({ alg: 'ES256', kid: 'test-key' }).sign(privateKey);
}
function request(bearer?: string, method = 'tools/list', params: unknown = {}, extra: Record<string, string> = {}) {
  return new Request(settings.resource, {
    method: 'POST', headers: {
      'Content-Type': 'application/json', Accept: 'application/json, text/event-stream',
      'MCP-Protocol-Version': '2025-11-25',
      ...(bearer ? { Authorization: `Bearer ${bearer}` } : {}), ...extra,
    }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
}
async function rpc(response: Response) {
  const text = await response.text();
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    return JSON.parse(text.split('\n').find(line => line.startsWith('data: '))!.slice(6));
  }
  return JSON.parse(text);
}

test('missing/invalid credentials challenge with canonical protected-resource metadata', async () => {
  for (const bearer of [undefined, 'not-a-jwt']) {
    const response = await endpoint(request(bearer, undefined, undefined, { 'X-Forwarded-Host': 'attacker.example' }));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get('WWW-Authenticate'), `Bearer resource_metadata="${settings.metadata}"`);
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
  }
});

test('reject wrong issuer, generic audience, OAuth client, owner, expired and browser tokens', async () => {
  for (const overrides of [
    { iss: 'https://attacker.example' }, { aud: 'authenticated' },
    { client_id: 'other-client' }, { github_provider_id: '54321' },
    { exp: 1 }, { client_id: undefined }, { github_provider_id: undefined },
    { role: 'service_role' }, { is_anonymous: true }, { sub: 'not-a-user-id' },
    { nbf: Math.floor(Date.now() / 1000) + 600 },
    { iat: Math.floor(Date.now() / 1000) - 600 },
  ]) assert.equal((await endpoint(request(await token(overrides)))).status, 401);
  const altered = (await token()).split('.');
  altered[2] = 'invalid';
  assert.equal((await endpoint(request(altered.join('.')))).status, 401);
});

test('authenticated Streamable HTTP initialize/list/call work without server sessions', async () => {
  const bearer = await token();
  const initialize = await endpoint(request(bearer, 'initialize', {
    protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'integration-test', version: '1' },
  }));
  assert.equal(initialize.status, 200);
  assert.equal(initialize.headers.get('Mcp-Session-Id'), null);
  const listing = await endpoint(request(bearer));
  assert.equal(listing.status, 200);
  assert.deepEqual((await rpc(listing)).result.tools.map((tool: { name: string }) => tool.name), ['connection_test']);
  // A fresh handler simulates another Vercel instance; no initialize/session state is shared.
  const fresh = createMcpEndpoint(settings, createLocalJWKSet({ keys: [jwk] }));
  const call = await fresh(request(bearer, 'tools/call', { name: 'connection_test', arguments: {} }));
  assert.equal(call.status, 200);
  assert.deepEqual((await rpc(call)).result.content, [{ type: 'text', text: 'Authenticated connection successful.' }]);
});

test('cross-origin browser requests cannot use credentials', async () => {
  assert.equal((await endpoint(request(await token(), undefined, undefined, { Origin: 'https://attacker.example' }))).status, 403);
});

test('metadata is public and canonically binds resource to the configured issuer', async () => {
  const response = resourceMetadata(settings)(new Request(settings.metadata));
  assert.equal(response.status, 200);
  const metadata = await response.json();
  assert.equal(metadata.resource, settings.resource);
  assert.deepEqual(metadata.authorization_servers, [settings.issuer]);
});

test('consent rejects alternate client/callback and callback open redirects', () => {
  assert.ok(validateClient({ client: { id: settings.clientId }, redirect_uri: settings.callback }, settings.clientId, settings.callback));
  assert.ok(!validateClient({ client: { id: 'other' }, redirect_uri: settings.callback }, settings.clientId, settings.callback));
  assert.throws(() => clientRedirect('https://attacker.example/callback?code=test', settings.callback));
  assert.throws(() => clientRedirect('http://127.0.0.1:49152/callback/other?code=test', settings.callback));
  assert.equal(clientRedirect(`${settings.callback}?code=test&state=test`, settings.callback), `${settings.callback}?code=test&state=test`);
});

test('owner uses provider identity rather than mutable profile metadata', () => {
  const user = { is_anonymous: false, identities: [{ provider: 'github', id: settings.ownerGithubId }] } as User;
  assert.ok(isOwner(user, settings.ownerGithubId));
  assert.ok(!isOwner({ ...user, identities: [], user_metadata: { github_provider_id: settings.ownerGithubId } }, settings.ownerGithubId));
  assert.ok(!isOwner({ ...user, is_anonymous: true }, settings.ownerGithubId));
});

test('configuration fails closed when required owner/URL settings are absent or unsafe', () => {
  const before = { ...process.env };
  try {
    process.env.APP_URL = 'https://spike.example.com';
    process.env.SUPABASE_URL = settings.supabaseUrl;
    process.env.SUPABASE_PUBLISHABLE_KEY = settings.publishableKey;
    process.env.OWNER_GITHUB_ID = settings.ownerGithubId;
    process.env.MCP_OAUTH_CLIENT_ID = settings.clientId;
    process.env.MCP_OAUTH_REDIRECT_URI = settings.callback;
    assert.equal(config().resource, settings.resource);
    process.env.OWNER_GITHUB_ID = 'mutable-login';
    assert.throws(config);
    process.env.OWNER_GITHUB_ID = settings.ownerGithubId;
    process.env.APP_URL = 'http://public.example.com';
    assert.throws(config);
  } finally {
    for (const key of Object.keys(process.env)) if (!(key in before)) delete process.env[key];
    Object.assign(process.env, before);
  }
});
