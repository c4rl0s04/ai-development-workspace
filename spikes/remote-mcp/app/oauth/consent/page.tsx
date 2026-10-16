import { config } from '../../../lib/config';
import { sessionClient, isOwner } from '../../../lib/supabase';
import { authorizationId, validateClient, clientRedirect } from '../../../lib/oauth';
import { consent, login, logout } from '../../actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export default async function Consent({ searchParams }: { searchParams: Promise<{ authorization_id?: string }> }) {
  const id = authorizationId.safeParse((await searchParams).authorization_id);
  if (!id.success) return <p>Missing or invalid authorization request. Restart login from Codex.</p>;
  const settings = config();
  const supabase = await sessionClient(true);
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) return <>
    <h1>Sign in to authorize Codex</h1>
    <form action={login}><input type="hidden" name="authorization_id" value={id.data} /><button>Sign in with GitHub</button></form>
  </>;
  if (!isOwner(user, settings.ownerGithubId)) return <>
    <p>Owner access required. This account cannot authorize MCP clients.</p>
    <form action={logout}><button>Sign out</button></form>
  </>;
  const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(id.data);
  if (error || !data) return <p>Authorization expired or unavailable. Restart login from Codex.</p>;
  if (!('authorization_id' in data)) redirect(clientRedirect(data.redirect_url, settings.callback));
  if (!validateClient(data, settings.clientId, settings.callback)) return <p>Client or callback is not configured for this spike.</p>;
  return <>
    <h1>Authorize MCP access</h1>
    <p>Client: {data.client.name} ({data.client.id})</p>
    <p>Callback: {data.redirect_uri}</p>
    <p>Requested identity scopes: {data.scope || '(none)'}</p>
    <p>Application permission: call connection_test only. No project or repository access.</p>
    <form action={consent}>
      <input type="hidden" name="authorization_id" value={id.data} />
      <button name="decision" value="approve">Approve</button>{' '}
      <button name="decision" value="deny">Deny</button>
    </form>
  </>;
}
