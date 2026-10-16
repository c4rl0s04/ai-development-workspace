import { login, logout } from './actions';
import { sessionClient, isOwner } from '../lib/supabase';
import { config } from '../lib/config';

export const dynamic = 'force-dynamic';
export default async function Home() {
  const { data: { user } } = await (await sessionClient(true)).auth.getUser();
  const owner = isOwner(user, config().ownerGithubId);
  return <>
    <h1>Remote MCP compatibility spike</h1>
    <p>Isolated authentication experiment. The only tool is connection_test.</p>
    {owner ? <p>Owner signed in. Connect Codex to /api/mcp to start OAuth consent.</p> : <p>Owner sign-in required.</p>}
    <form action={user ? logout : login}><button>{user ? 'Sign out' : 'Sign in with GitHub'}</button></form>
  </>;
}
