import { NextResponse, type NextRequest } from 'next/server';
import { AccessError } from './application/auth/owner';
import { authConfig } from './server/auth';
import { requestAuth, privateResponse } from './infrastructure/auth/supabase';
import { authorizeOwnerMutation } from './application/auth/owner';
import { readVerifiedIdentity } from './infrastructure/auth/supabase';

export async function proxy(request: NextRequest) {
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
  try {
    if (!['GET', 'HEAD'].includes(request.method)) {
      await authorizeOwnerMutation(
        request,
        settings.appOrigin,
        () => readVerifiedIdentity(auth.client),
        settings.ownerGithubId,
      );
    } else {
      // Refresh here; page and service authorization independently verify the user.
      await readVerifiedIdentity(auth.client);
    }
    return auth.finish(NextResponse.next({ request }));
  } catch (error) {
    if (error instanceof AccessError && error.reason !== 'unavailable') {
      return auth.finish(
        new NextResponse('Access denied', {
          status: error.reason === 'unauthenticated' ? 401 : 403,
        }),
      );
    }
    return auth.finish(
      new NextResponse('Authentication temporarily unavailable', {
        status: 503,
      }),
    );
  }
}

export const config = {
  matcher: ['/', '/projects/:path*', '/approvals/:path*'],
};
