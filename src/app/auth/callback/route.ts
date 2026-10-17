import { NextResponse, type NextRequest } from 'next/server';
import { authorizeOwner, AccessError } from '../../../application/auth/owner';
import { authConfig } from '../../../server/auth';
import {
  privateResponse,
  readVerifiedIdentity,
  requestAuth,
} from '../../../infrastructure/auth/supabase';

export async function GET(request: NextRequest) {
  let settings: ReturnType<typeof authConfig>;
  try {
    settings = authConfig();
  } catch {
    return privateResponse(
      new NextResponse('Authentication temporarily unavailable', {
        status: 503,
      }),
    );
  }
  const auth = requestAuth(request, settings);
  const params = request.nextUrl.searchParams;
  const code = params.get('code');
  if (
    params.has('error') ||
    params.getAll('code').length !== 1 ||
    !code ||
    !/^[A-Za-z0-9._~-]{1,4096}$/.test(code)
  ) {
    return auth.finish(
      NextResponse.redirect(`${settings.appOrigin}/login?error=failed`, 303),
    );
  }
  let exchanged = false;
  try {
    const { error } = await auth.client.auth.exchangeCodeForSession(code);
    if (error) throw new AccessError('unauthenticated');
    exchanged = true;
    await authorizeOwner(
      () => readVerifiedIdentity(auth.client),
      settings.ownerGithubId,
    );
    return auth.finish(NextResponse.redirect(`${settings.appOrigin}/`, 303));
  } catch (error) {
    // Revoke only this app's session; never sign out every device or the MCP client.
    if (exchanged)
      await auth.client.auth.signOut({ scope: 'local' }).catch(() => {});
    const reason =
      error instanceof AccessError && error.reason === 'forbidden'
        ? 'denied'
        : 'failed';
    return auth.finish(
      NextResponse.redirect(`${settings.appOrigin}/login?error=${reason}`, 303),
      exchanged,
    );
  }
}
