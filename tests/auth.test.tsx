import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  authorizeOwner,
  authorizeOwnerMutation,
  AccessError,
  type VerifiedIdentity,
} from '../src/application/auth/owner';
import { parseAuthConfig } from '../src/infrastructure/auth/config';

const owner = '159822857';
const verified: VerifiedIdentity = {
  userId: 'server-user',
  anonymous: false,
  githubIds: [owner],
};
const origin = 'https://workspace.example';

test('owner authorization returns only the server-verified principal', async () => {
  assert.deepEqual(await authorizeOwner(async () => verified, owner), {
    userId: 'server-user',
    githubProviderId: owner,
  });
});

test('missing and expired/revoked sessions cannot establish authority', async () => {
  await assert.rejects(
    authorizeOwner(async () => null, owner),
    (error: unknown) =>
      error instanceof AccessError && error.reason === 'unauthenticated',
  );
});

test('wrong provider ID, anonymous and missing GitHub identities are denied', async () => {
  for (const identity of [
    { ...verified, githubIds: ['1'] },
    { ...verified, anonymous: true },
    { ...verified, githubIds: [] },
  ]) {
    await assert.rejects(
      authorizeOwner(async () => identity, owner),
      (error: unknown) =>
        error instanceof AccessError && error.reason === 'forbidden',
    );
  }
});

test('protected writes require exact Origin and a verified owner independently of navigation', async () => {
  for (const headers of [
    new Headers(),
    new Headers({ Origin: 'null' }),
    new Headers({ Origin: 'https://attacker.example' }),
    new Headers({ Origin: origin, 'Sec-Fetch-Site': 'cross-site' }),
  ]) {
    let read = false;
    await assert.rejects(
      authorizeOwnerMutation(
        new Request(origin, { method: 'POST', headers }),
        origin,
        async () => {
          read = true;
          return verified;
        },
        owner,
      ),
    );
    assert.equal(read, false, 'CSRF denied before provider access');
  }
  const request = new Request(origin, {
    method: 'POST',
    headers: { Origin: origin, 'X-Owner-ID': owner },
  });
  await assert.rejects(
    authorizeOwnerMutation(request, origin, async () => null, owner),
  );
  await assert.rejects(
    authorizeOwnerMutation(
      request,
      origin,
      async () => ({ ...verified, githubIds: ['2'] }),
      owner,
    ),
  );
  assert.equal(
    (await authorizeOwnerMutation(request, origin, async () => verified, owner))
      .githubProviderId,
    owner,
  );
});

test('configuration fails closed, allows HTTP only on loopback and rejects privileged keys', () => {
  const env = {
    APP_URL: origin,
    SUPABASE_URL: 'https://development.supabase.co',
    SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    OWNER_GITHUB_ID: owner,
  };
  assert.equal(parseAuthConfig(env).appOrigin, origin);
  assert.equal(
    parseAuthConfig({ ...env, APP_URL: 'http://127.0.0.1:3000' }).appOrigin,
    'http://127.0.0.1:3000',
  );
  for (const override of [
    { APP_URL: '' },
    { APP_URL: 'http://workspace.example' },
    { APP_URL: `${origin}/evil` },
    { APP_URL: 'https://user:pass@workspace.example' },
    { SUPABASE_URL: 'file:///tmp' },
    { OWNER_GITHUB_ID: 'username' },
    { SUPABASE_PUBLISHABLE_KEY: 'sb_secret_bad' },
    { SUPABASE_PUBLISHABLE_KEY: 'legacy-jwt-key' },
  ])
    assert.throws(() => parseAuthConfig({ ...env, ...override }));
});
