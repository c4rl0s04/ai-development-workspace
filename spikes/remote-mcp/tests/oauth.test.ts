import { test } from 'node:test';
import assert from 'node:assert/strict';
import { authorizationId } from '../lib/oauth';

test('accepts the opaque URL-safe authorization IDs issued by Supabase', () => {
  const opaqueId = 'uesk1234567890ABCDEFGHIJKLMNOPQR';
  assert.equal(opaqueId.length, 32);
  assert.equal(authorizationId.safeParse(opaqueId).success, true);
  assert.equal(authorizationId.safeParse('zZ0123_abc-DEFghijklmnopqrstu5678').success, true);
});

test('retains compatibility with UUID-shaped authorization IDs', () => {
  assert.equal(authorizationId.safeParse('d7efccfe-d936-4eb3-bce6-9496eaa3f0c5').success, true);
});

test('rejects missing, malformed or unbounded authorization IDs', () => {
  for (const value of [
    undefined, null, '', 'short', 'a'.repeat(129),
    '/callback/traversal', 'valid-but-with space', 'with.dot.in.id',
    'https://attacker.example/callback', 'a%2Fb', '<script>alert(1)</script>',
  ]) assert.equal(authorizationId.safeParse(value).success, false, String(value));
});

test('parses an authorization ID from the consent-page query string', () => {
  const id = 'uesk1234567890ABCDEFGHIJKLMNOPQR';
  const url = new URL(`https://app.example/oauth/consent?authorization_id=${id}`);
  assert.equal(authorizationId.safeParse(url.searchParams.get('authorization_id')).success, true);
});
