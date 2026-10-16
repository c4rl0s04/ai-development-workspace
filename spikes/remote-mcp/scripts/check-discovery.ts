import assert from 'node:assert/strict';
import { config } from '../lib/config';

const settings = config();
async function json(url: string) {
  const response = await fetch(url, { redirect: 'error', signal: AbortSignal.timeout(10_000) });
  assert.equal(response.status, 200, 'Discovery endpoint must return 200 without deployment login');
  return response.json();
}
const metadata = await json(settings.metadata);
assert.equal(metadata.resource, settings.resource, 'Protected resource must be the exact MCP URL');
assert.deepEqual(metadata.authorization_servers, [settings.issuer]);
const missing = await fetch(settings.resource, {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: '{}', redirect: 'error', signal: AbortSignal.timeout(10_000),
});
assert.equal(missing.status, 401, 'Unauthenticated MCP requests must be rejected');
assert.ok(missing.headers.get('www-authenticate')?.includes(settings.metadata));
const discovery = await json(`${settings.supabaseUrl}/.well-known/oauth-authorization-server/auth/v1`);
assert.equal(discovery.issuer, settings.issuer, 'Issuer must match exactly, including /auth/v1');
for (const name of ['authorization_endpoint', 'token_endpoint', 'jwks_uri']) {
  assert.equal(new URL(discovery[name]).origin, settings.supabaseUrl, 'Unexpected provider endpoint origin');
  assert.ok(discovery[name].startsWith(`${settings.issuer}/`), 'Unexpected issuer endpoint path');
}
assert.ok(discovery.response_types_supported.includes('code'));
assert.ok(discovery.grant_types_supported.includes('authorization_code'));
assert.ok(discovery.grant_types_supported.includes('refresh_token'));
assert.ok(discovery.code_challenge_methods_supported.includes('S256'), 'PKCE S256 required');
assert.ok(discovery.token_endpoint_auth_methods_supported.includes('none'), 'Public client support required');
const keys = await json(discovery.jwks_uri);
assert.ok(keys.keys.some((key: { kty: string; use?: string }) =>
  ['EC', 'RSA'].includes(key.kty) && (!key.use || key.use === 'sig')), 'Asymmetric signing key required');
console.log('PASS: public metadata, canonical issuer/resource, unauthenticated rejection, PKCE/public-client discovery and JWKS.');
console.log(`Provider advertises issuer-bound responses: ${discovery.authorization_response_iss_parameter_supported === true}`);
console.log(`Provider advertises CIMD: ${discovery.client_id_metadata_document_supported === true}; DCR: ${!!discovery.registration_endpoint}`);
console.log('NOT PROVEN: configured client registration, actual callback/iss response, token audience/refresh, consent, Codex CLI/Desktop. Complete the README live checklist.');
