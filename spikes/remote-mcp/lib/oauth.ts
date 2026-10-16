import { z } from 'zod';

export const authorizationId = z.uuid();

export function validateClient(details: { client: { id: string }; redirect_uri: string }, clientId: string, callback: string) {
  return details.client.id === clientId && details.redirect_uri === callback;
}

export function clientRedirect(value: string, callback: string) {
  const target = new URL(value);
  const expected = new URL(callback);
  if (target.origin !== expected.origin || target.pathname !== expected.pathname || target.hash ||
      target.username || target.password) throw new Error('Unexpected OAuth callback');
  return target.href;
}
