# M1.1 owner-only browser authentication

Implementation for [Issue #5](https://github.com/c4rl0s04/ai-development-workspace/issues/5), within [M1 / Issue #4](https://github.com/c4rl0s04/ai-development-workspace/issues/4) and [specification v0.2](../architecture/technical-spec-v0.2.md). Real local and hosted owner GitHub login/logout have passed using the existing shared Supabase project. Hosted validation found a raw React-payload authorization gap; Proxy now rejects unauthorized page requests before rendering, with regression coverage. Preview variables were configured only for this branch; Production and MCP configuration were preserved.

## What is implemented

- GitHub social sign-in through Supabase Auth, using `@supabase/ssr` PKCE. There is no browser Supabase client or frontend token store.
- Owner checks derive the stable GitHub identity `id` from Auth's server-fetched `getUser()` record, bound to the verified token's subject. Usernames, emails, `user_metadata`, cookie-embedded users and request headers cannot establish owner authority.
- Verified claims must describe a non-anonymous `authenticated` browser session. OAuth-client `client_id` tokens and MCP resource audiences are rejected. This does not implement Supabase's OAuth authorization server or any MCP tools.
- `/`, `/projects` and `/approvals` live in a protected route group. The Next.js Proxy verifies owner access before page rendering and propagates refresh cookies; the protected layout independently verifies access. Proxy is not the sole authorization boundary. **Every future private data loader/service must call `requireOwner()`; every cookie-authenticated POST mutation must call `requireOwnerMutation(request)`** from `src/server/auth.ts` before reading/changing protected data. Do not accept a request-supplied principal.
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

## Shared Supabase project decision

The owner chose to reuse project `tbifhoubudkmxeisvzhh` (`https://tbifhoubudkmxeisvzhh.supabase.co`). Do not create another Supabase project or GitHub OAuth App. Shared users, provider settings and the token hook couple this app to the MCP experiment; preserve all existing configuration.

The existing hook changes audience and adds `github_provider_id` only for its registered MCP OAuth client. Browser authorization does not require that claim: it verifies normal browser claims and the GitHub provider identity returned by Auth. Keep the MCP OAuth client, token hook and consent configuration unchanged.

## Configuration

Local `.env.local` is ignored and private. Never overwrite an existing environment file. Required server-only variables:

| Variable | Local value / Preview requirement |
| --- | --- |
| `APP_URL` | `http://127.0.0.1:3000`; Preview must use Vercel's confirmed stable branch origin. |
| `SUPABASE_URL` | `https://tbifhoubudkmxeisvzhh.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | Existing project's publishable key; never service-role or legacy JWT keys. |
| `OWNER_GITHUB_ID` | `159822857` |

The owner added `http://127.0.0.1:3000/auth/callback` to allowed Supabase redirects. Preserve Site URL and all existing redirects. Add only the exact confirmed M1 Preview origin's `/auth/callback`; never wildcard aliases. The existing GitHub-to-Supabase callback remains unchanged.

On Vercel, target only project `ai-development-workspace-preview` (`prj_HLgUvRzHvl9nugIF6TbAE1sEtCOm`), **Preview**, branch `feature/m1-owner-auth`. Do not change Production variables, deployment protection or the disconnected MCP project. Confirm the actual branch alias before setting APP_URL; do not guess a generated hostname. Push only after local OAuth and required Preview setup pass. Production configuration needs separate review before merge.

No GitHub secret, database URL, MCP client ID or service-role key belongs in the app. Automated tests use local mock Auth and ephemeral signing keys; builds need no credentials. Missing configuration fails closed.

## Local browser validation

Real GitHub login using the existing shared project succeeded locally on 2026-10-17. Existing GitHub authorization completed without an interactive prompt. Owner access to Overview, Projects and Approvals, direct navigation, reload persistence and logout were verified. After logout, direct Approvals access redirected to login. No real non-owner login or wall-clock token-expiry test is claimed; those cases have automated coverage.

Browser testing found and fixed two header interactions: Chromium applies form-action to OAuth POST redirects, so CSP allows only self, the validated Supabase origin and GitHub; private responses use same-origin Referrer-Policy so legitimate same-origin POSTs retain Origin while cross-origin referrers remain suppressed. No CSRF checks were relaxed.

Hosted owner login, Overview/Projects/Approvals, direct navigation, reload and logout passed on the stable branch origin below. Missing-Origin and cross-origin logout requests returned 403; an unauthenticated protected POST returned 401. A malformed session cookie redirected to login. No real second-account login or wall-clock expiry/revocation measurement is claimed; wrong-owner, expired and refresh cases use automated fixtures. Runtime error/warning scan returned zero records. MCP connection_test passed after hosted logout.

Stable branch origin: `https://ai-development-work-git-9c7d34-carlosandreshuete-1394s-projects.vercel.app`. The owner registered exactly this origin's `/auth/callback` in Supabase. APP_URL, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY and OWNER_GITHUB_ID target only Preview / feature/m1-owner-auth. Production environment setup requires a separate review before merge. Automatic Git deployments remain disabled; Preview updates currently require authorized manual Git-source deployments.

Vercel CLI generated a deployment-protection bypass token during the bootstrap HTTP verification. Protection remains enabled; do not copy its value into documentation, logs or source.

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
