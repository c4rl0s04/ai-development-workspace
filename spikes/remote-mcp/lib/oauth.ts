import { z } from 'zod';

// Supabase OAuth authorization IDs are opaque, URL-safe strings (not necessarily UUIDs).
// This guards input shape only; getAuthorizationDetails() validates the request with Supabase.
export const authorizationId = z.string().min(16).max(128).regex(/^[A-Za-z0-9_-]+$/);

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
