import { NextResponse } from 'next/server';
import { sessionClient, isOwner } from '../../../lib/supabase';
import { config } from '../../../lib/config';
import { authorizationId } from '../../../lib/oauth';

export async function GET(request: Request) {
  const settings = config();
  const params = new URL(request.url).searchParams;
  const code = params.get('code');
  if (!code || code.length > 4096) return new Response('Invalid sign-in callback', { status: 400 });
  const supabase = await sessionClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return new Response('Sign-in failed; restart login.', { status: 401 });
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !isOwner(user, settings.ownerGithubId)) {
    await supabase.auth.signOut({ scope: 'local' });
    return new Response('Owner access required', { status: 403 });
  }
  const id = authorizationId.safeParse(params.get('authorization_id'));
  const destination = new URL(id.success ? `/oauth/consent?authorization_id=${id.data}` : '/', settings.appOrigin);
  const response = NextResponse.redirect(destination);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}
