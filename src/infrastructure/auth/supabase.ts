import 'server-only';
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr';
import { isAuthError, type SupabaseClient } from '@supabase/supabase-js';
import type { NextResponse, NextRequest } from 'next/server';
import {
  AccessError,
  type VerifiedIdentity,
} from '../../application/auth/owner';
import type { AuthConfig } from './config';

export const sessionCookie = 'aw-auth';

function cookieOptions(settings: AuthConfig) {
  return {
    path: '/',
    httpOnly: true,
    secure: settings.appOrigin.startsWith('https:'),
    sameSite: 'lax' as const,
  };
}

export function sessionClient(
  settings: AuthConfig,
  cookies: CookieMethodsServer,
) {
  return createServerClient(settings.supabaseUrl, settings.publishableKey, {
    cookieOptions: { name: sessionCookie, ...cookieOptions(settings) },
    cookies,
    global: {
      fetch: (url, init) =>
        fetch(url, {
          ...init,
          cache: 'no-store',
          signal: AbortSignal.timeout(8000),
        }),
    },
  });
}

function checkProviderError(error: unknown) {
  if (!error) return;
  if (
    !isAuthError(error) ||
    error.status === 0 ||
    (error.status ?? 0) >= 500 ||
    error.name === 'AuthRetryableFetchError'
  ) {
    throw new AccessError('unavailable');
  }
}

export async function readVerifiedIdentity(
  client: SupabaseClient,
): Promise<VerifiedIdentity | null> {
  const claimsResult = await client.auth.getClaims();
  checkProviderError(claimsResult.error);
  const claims = claimsResult.data?.claims;
  if (
    claimsResult.error ||
    !claims ||
    claims.aud !== 'authenticated' ||
    claims.client_id !== undefined ||
    claims.role !== 'authenticated' ||
    claims.is_anonymous !== false
  )
    return null;
  const {
    data: { user },
    error,
  } = await client.auth.getUser();
  checkProviderError(error);
  if (error || !user || user.id !== claims.sub) return null;
  return {
    userId: user.id,
    anonymous: user.is_anonymous !== false,
    githubIds: (user.identities ?? [])
      .filter(
        (identity) =>
          identity.provider === 'github' && identity.user_id === user.id,
      )
      .map((identity) => identity.id),
  };
}

export function privateResponse(response: NextResponse) {
  response.headers.set('Cache-Control', 'private, no-store, max-age=0');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}

export function requestAuth(request: NextRequest, settings: AuthConfig) {
  const writes = new Map<
    string,
    Parameters<NonNullable<CookieMethodsServer['setAll']>>[0][number]
  >();
  const client = sessionClient(settings, {
    getAll: () => request.cookies.getAll(),
    setAll: (values) =>
      values.forEach((cookie) => {
        request.cookies.set(cookie.name, cookie.value);
        writes.set(cookie.name, cookie);
      }),
  });
  return {
    client,
    finish(response: NextResponse, clear = false) {
      for (const { name, value, options } of writes.values())
        response.cookies.set(name, value, options);
      if (clear) {
        const names = new Set([
          ...request.cookies.getAll().map((cookie) => cookie.name),
          ...writes.keys(),
        ]);
        for (const name of names) {
          if (
            name === sessionCookie ||
            name.startsWith(`${sessionCookie}.`) ||
            name.startsWith(`${sessionCookie}-code-verifier`)
          ) {
            response.cookies.set(name, '', {
              ...cookieOptions(settings),
              maxAge: 0,
            });
          }
        }
      }
      return privateResponse(response);
    },
  };
}
