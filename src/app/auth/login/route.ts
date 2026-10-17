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
    const { data, error } = await auth.client.auth.signInWithOAuth({
      provider: 'github',
      options: {
        redirectTo: `${settings.appOrigin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });
    if (error || !data.url)
      return auth.finish(
        NextResponse.redirect(`${settings.appOrigin}/login?error=failed`, 303),
      );
    const target = new URL(data.url);
    if (
      target.origin !== settings.supabaseUrl ||
      target.pathname !== '/auth/v1/authorize'
    )
      throw new AccessError('unavailable');
    return auth.finish(NextResponse.redirect(target, 303));
  } catch (error) {
    return privateResponse(
      new NextResponse(
        'Sign-in could not start. Return to login and try again.',
        {
          status:
            error instanceof AccessError && error.reason === 'origin'
              ? 403
              : 503,
        },
      ),
    );
  }
}
