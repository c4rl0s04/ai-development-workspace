import { NextResponse, type NextRequest } from 'next/server';
import {
  AccessError,
  assertMutationOrigin,
} from '../../../application/auth/owner';
import { authConfig } from '../../../server/auth';
import {
  privateResponse,
  requestAuth,
} from '../../../infrastructure/auth/supabase';

export async function POST(request: NextRequest) {
  try {
    const settings = authConfig();
    assertMutationOrigin(request, settings.appOrigin);
    const auth = requestAuth(request, settings);
    // Session cleanup is permitted for non-owners too; it grants no workspace access.
    const result = await auth.client.auth
      .signOut({ scope: 'local' })
      .catch(() => ({ error: true }));
    return auth.finish(
      NextResponse.redirect(
        `${settings.appOrigin}/login${result.error ? '?error=logout' : ''}`,
        303,
      ),
      true,
    );
  } catch (error) {
    return privateResponse(
      new NextResponse('Sign-out could not complete.', {
        status:
          error instanceof AccessError && error.reason === 'origin' ? 403 : 503,
      }),
    );
  }
}
