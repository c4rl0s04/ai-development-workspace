import 'server-only';
import { cookies } from 'next/headers';
import {
  authorizeOwner,
  authorizeOwnerMutation,
  AccessError,
} from '../application/auth/owner';
import { parseAuthConfig } from '../infrastructure/auth/config';
import {
  sessionClient,
  readVerifiedIdentity,
} from '../infrastructure/auth/supabase';

export function authConfig() {
  try {
    return parseAuthConfig(process.env);
  } catch {
    throw new AccessError('unavailable');
  }
}

async function identityReader(writable = false) {
  const jar = await cookies();
  const client = sessionClient(authConfig(), {
    getAll: () => jar.getAll(),
    // Proxy persists refreshes before rendering; Server Components cannot write cookies.
    setAll: (values) => {
      if (writable)
        values.forEach(({ name, value, options }) => {
          jar.set(name, value, options);
        });
    },
  });
  return () => readVerifiedIdentity(client);
}

// No caller-provided identity, headers, tokens or owner IDs can establish authority.
export async function requireOwner() {
  return authorizeOwner(await identityReader(), authConfig().ownerGithubId);
}

export async function requireOwnerMutation(request: Request) {
  return authorizeOwnerMutation(
    request,
    authConfig().appOrigin,
    await identityReader(true),
    authConfig().ownerGithubId,
  );
}
