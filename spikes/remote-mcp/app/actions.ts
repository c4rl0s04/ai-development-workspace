'use server';

import { redirect } from 'next/navigation';
import { sessionClient, isOwner } from '../lib/supabase';
import { config } from '../lib/config';
import { authorizationId, validateClient, clientRedirect } from '../lib/oauth';

export async function login(form: FormData) {
  const settings = config();
  const id = authorizationId.safeParse(form.get('authorization_id'));
  const callback = new URL('/auth/callback', settings.appOrigin);
  if (id.success) callback.searchParams.set('authorization_id', id.data);
  const supabase = await sessionClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'github', options: { redirectTo: callback.href, skipBrowserRedirect: true },
  });
  if (error || !data.url) throw new Error('GitHub sign-in could not start.');
  redirect(data.url);
}

export async function logout() {
  const supabase = await sessionClient();
  await supabase.auth.signOut({ scope: 'local' });
  redirect('/');
}

export async function consent(form: FormData) {
  const id = authorizationId.parse(form.get('authorization_id'));
  const decision = form.get('decision');
  if (decision !== 'approve' && decision !== 'deny') throw new Error('Invalid decision');
  const settings = config();
  const supabase = await sessionClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !isOwner(user, settings.ownerGithubId)) throw new Error('Owner access required');
  const { data: details, error } = await supabase.auth.oauth.getAuthorizationDetails(id);
  if (error || !details || !('authorization_id' in details) ||
      !validateClient(details, settings.clientId, settings.callback)) throw new Error('Untrusted authorization request');
  const result = decision === 'approve'
    ? await supabase.auth.oauth.approveAuthorization(id, { skipBrowserRedirect: true })
    : await supabase.auth.oauth.denyAuthorization(id, { skipBrowserRedirect: true });
  if (result.error || !result.data) throw new Error('OAuth decision failed');
  redirect(clientRedirect(result.data.redirect_url, settings.callback));
}
