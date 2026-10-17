# M1.1 owner-only browser authentication

Implementation for [Issue #5](https://github.com/c4rl0s04/ai-development-workspace/issues/5), within [M1 / Issue #4](https://github.com/c4rl0s04/ai-development-workspace/issues/4) and [specification v0.2](../architecture/technical-spec-v0.2.md). Code and local tests exist; live M1 authentication is **not validated**. No Supabase/Vercel/GitHub configuration was changed for this work.

## What is implemented

- GitHub social sign-in through Supabase Auth, using `@supabase/ssr` PKCE. There is no browser Supabase client or frontend token store.
- Owner checks derive the stable GitHub identity `id` from Auth's server-fetched `getUser()` record, bound to the verified token's subject. Usernames, emails, `user_metadata`, cookie-embedded users and request headers cannot establish owner authority.
- Verified claims must describe a non-anonymous `authenticated` browser session. OAuth-client `client_id` tokens and MCP resource audiences are rejected. This does not implement Supabase's OAuth authorization server or any MCP tools.
- `/`, `/projects` and `/approvals` live in a protected route group. The Next.js Proxy refreshes cookies, but is not the sole authorization boundary. **Every future private data loader/service must call `requireOwner()`; every cookie-authenticated POST mutation must call `requireOwnerMutation(request)`** from `src/server/auth.ts` before reading/changing protected data. Do not accept a request-supplied principal.
- `src/application/auth/owner.ts` owns authorization policy and its typed identity-reader port. `src/infrastructure/auth` implements Supabase and cookie interactions. `src/server/auth.ts` is the server-only composition entry point, binding the port to the current request and configured owner. Pure policy functions are not request adapters.
- Cookies use host-only `aw-auth` names, HttpOnly, SameSite=Lax, Path=/ and Secure on HTTPS. Refresh writes update both the incoming request and outgoing response, including chunked cookies. No session/principal is cached globally. Protected and auth-handler responses use private/no-store caching.

## Routes and failure behavior

| Route | Behavior |
| --- | --- |
| `GET /login` | Public sign-in UI and allowlisted generic errors. Missing configuration hides the login form. |
| `POST /auth/login` | Exact canonical Origin required; initiates GitHub PKCE with the fixed application callback. |
| `GET /auth/callback` | Bounded single code, SDK verifier exchange, verified browser claims and owner assertion; fixed redirect to `/` only. No caller-controlled `next` destination. |
| `POST /auth/logout` | Exact canonical Origin required; revoke only the current local Auth session and clear this app's cookies, including chunks, even if upstream revocation fails. Non-owners may clear their own session; this grants no workspace access. GET never signs out. |
| Protected pages | Missing/expired session redirects to login; non-owner redirects to a generic denied login state. Provider outage/config failure fails closed. |

Origin must match `APP_URL` exactly; missing/`null`/cross-site origins fail. SameSite alone is not CSRF protection. Only POST is currently supported for protected mutations; future HTTP methods require an explicit policy/test change. Callback GET relies on PKCE and Supabase's provider flow. Invalid callbacks do not revoke an existing signed-in session; a newly exchanged session that cannot be authorized is cleared/revoked locally.

Access tokens already issued may remain valid until expiry after sign-out/revocation. Fresh `getUser()` checks are not a promise of immediate JWT revocation. Live TTL and revocation behavior must be measured before introducing sensitive data; stricter session revocation enforcement is a later explicit decision. A non-owner may acquire a Supabase Auth account before the application denies workspace access. Account-creation restrictions and rate limits are provider configuration, not application tables in this slice.

## Supabase project choice (approval required)

| Option | Benefits | Impact / risk |
| --- | --- | --- |
| **Separate development project — recommended** | Independent users, GitHub provider, redirects, keys and signing settings; the working MCP experiment remains isolated. | Requires an explicitly authorized project and a separate GitHub OAuth App; later database migration work starts in M1.2. Do not copy the MCP token hook. |
| Existing experiment project | Reuses an existing Auth service and GitHub provider. | Shared users, provider/site redirect configuration and custom token hook; changes can disrupt MCP. Existing hook preserves ordinary browser audiences but rewrites tokens for its allowlisted OAuth client. Compatibility must be checked before approving reuse. |

The spike's reusable findings are server-verified GitHub identity, PKCE callback handling, server cookies and local-session logout. Its OAuth client registration, consent page, custom audience hook and MCP resource are deliberately excluded. Do not change the experiment's Site URL, provider callback, OAuth registrations, hook, tokens or secrets to make M1 work.

## Exact configuration plan (do not execute before review)

1. Authorize the isolated Supabase development project and a separate GitHub OAuth App. Keep the MCP project unchanged. In the **new** GitHub OAuth App, set the provider callback to `https://<development-project-ref>.supabase.co/auth/v1/callback`. Store its client ID/secret only in that development project's GitHub provider settings; request no repository scopes.
2. Enable GitHub social login in the development project. Disable anonymous/unused sign-in methods and manual identity linking. Retain default asymmetric signing. Do not enable an OAuth authorization server or any custom token hook for M1.1. Confirm provider rate limits before exposing login.
3. Choose a stable **branch-specific Preview origin** for M1 on `ai-development-workspace-preview`. Record the actual Vercel branch URL or separately approved domain, not an invented URL. Its current main/production hostname serves M0 and must not be reused as the M1 callback while it still serves M0. Keep deployment protection enabled; verify that browser callbacks work with it rather than adding bypass secrets.
4. Set the development Supabase Site URL to that canonical M1 HTTPS origin and allow exactly `<M1_ORIGIN>/auth/callback`. For local work, additionally allow `http://127.0.0.1:3000/auth/callback` (or an explicitly chosen loopback port). No wildcard preview-host allowlist. The GitHub-to-Supabase callback and Supabase-to-Next.js callback are different URLs.
5. Configure these four **server-only** app variables. Local values go in private `.env.local`; Vercel values must target **Preview**, restricted to `feature/m1-owner-auth`. Do not set/overwrite Production targets or the MCP project's variables.

| Variable | Required value |
| --- | --- |
| `APP_URL` | Local `http://127.0.0.1:3000`; Preview the exact stable M1 HTTPS origin, no path/query/credentials. |
| `SUPABASE_URL` | `https://<development-project-ref>.supabase.co` (origin only). |
| `SUPABASE_PUBLISHABLE_KEY` | The development project's `sb_publishable_...` key. Secret/service-role and legacy JWT keys are rejected. |
| `OWNER_GITHUB_ID` | `159822857`, the stable numeric provider ID from Issue #5. Not the username or Supabase user UUID. |

No `NEXT_PUBLIC_*`, GitHub secret, database URL, MCP client ID or service-role key belongs in the app. Build succeeds without these variables; protected runtime requests return 503 and login is unavailable until valid configuration exists. This fail-closed behavior is not permission to push an incomplete auth deployment. Review Preview configuration and explicitly authorize push/deploy first.

For local configuration, copy `.env.example` only if `.env.local` does not already exist. Never overwrite another worktree's environment or reuse its Vercel link. Install and checks remain those in the root README; automated HTTP tests override configuration with an ephemeral local mock Auth server and do not contact Supabase.

## Required live checks before accepting M1.1

Use normal GitHub browser sign-in on the approved M1 Preview, recording only sanitized statuses and versions:

1. Anonymous requests to every protected route redirect to login; login completes for the configured owner only. Direct requests, client navigation, reload and another tab preserve the boundary.
2. A different GitHub account is denied even when Supabase sign-in succeeds; spoofed headers/profile fields and an ordinary MCP token cannot substitute for the owner browser session.
3. Callback denial, expiry, missing/wrong verifier and replay fail safely. Confirm the exact registered callback and fixed destinations. Do not paste callback codes into issues/logs.
4. Inspect cookies for host-only, HttpOnly, Secure, SameSite=Lax and correct refresh propagation. Wait beyond access-token expiry and reload; verify refresh continuity, then revoke refresh/session and measure residual access lifetime. Test concurrent tabs and cold instances.
5. Cross-origin or Origin-less mutations fail; legitimate same-origin logout clears all app cookies and returns to login. Another device's session and the MCP `connection_test` remain intact. Check logout when Supabase is unavailable.
6. Verify no authenticated HTML or Set-Cookie response is cached/shared, no provider details/tokens/codes appear in logs or page errors, and no production/MCP settings changed. Record Vercel and Supabase versions plus outcome without credentials.

Local generated fixtures test resource/session behavior, not GitHub/Supabase interoperability. No database tables, migrations, project/task CRUD, MCP tools, teams or execution are included.

## References checked during implementation

- [Supabase SSR client and verification guidance](https://supabase.com/docs/guides/auth/server-side/creating-a-client)
- [GitHub social sign-in and PKCE callback](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [SSR session/caching considerations](https://supabase.com/docs/guides/auth/server-side/advanced-guide)
- [Next.js Proxy](https://nextjs.org/docs/app/api-reference/file-conventions/proxy)

The changelog's October 2026 `@supabase/server` adapter deprecation does not apply to this `@supabase/ssr` integration. Exact dependency pins and the lockfile remain authoritative.
