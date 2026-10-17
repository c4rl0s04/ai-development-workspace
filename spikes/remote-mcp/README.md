# Remote MCP authentication spike

Independent Next.js/TypeScript proof of concept for [specification v0.2](../../docs/architecture/technical-spec-v0.2.md). This is not M0 or the final application: it has no product schema, agent execution or GitHub repository permissions. A **manual test deployment** and Supabase configuration exist, but are not provisioned or managed by this repository. For the underlying concepts see [MCP authentication architecture](../../docs/architecture/mcp-authentication.md); for repeating the setup see the [step-by-step guide](../../docs/guides/remote-mcp-setup.md).

**Result as of 2026-10-17:** Local resource-server integration tests and the mock-issuer HTTP smoke test passed in the initial implementation. In the manually deployed experiment, GitHub browser sign-in, Supabase OAuth consent, Codex CLI login and the authenticated `connection_test` MCP call **passed**. The owner reported a later successful tool call after waiting and reopening Codex. This supports moving to M0 design, **not** production approval; refresh-token exchange was not independently traced, and negative security and Codex Desktop tests remain open.

### Live CLI validation record — 2026-10-17

| Check | Observation | Status |
| --- | --- | --- |
| Deployed protected-resource endpoint | Metadata and unauthenticated challenge were checked during setup | Passed (owner report) |
| Browser GitHub social login | Owner confirmed successful sign-in to the Next.js app | Passed (owner report) |
| Supabase consent → Codex CLI OAuth | Browser displayed `Authentication complete. You may close this window.` | Passed (owner report) |
| Remote tool execution | `remote-mcp-spike.connection_test` returned `Authenticated connection successful.` | **Passed (actual Codex tool output provided)** |
| Later tool call and Codex restart | Owner waited, reopened Codex, and reported tool still working | Passed (owner report); refresh mechanism not independently inspected |
| Non-owner login, denial, revocation, key rotation, Desktop parity | Not performed | **Pending** |

The original Git branch incorrectly used `z.uuid()` for Supabase's **opaque** OAuth `authorization_id`; this caused `Missing or invalid authorization request`. It was fixed during the live test and is now committed in `lib/oauth.ts` with regression coverage in `tests/oauth.test.ts`. Do not confuse this ID with Supabase's UUID-shaped **OAuth client ID**.

### Local verification and deployment diagnosis — 2026-10-17

At commit `e667953`, using Node `v24.21.0` and npm `11.19.0`, `npm ci --ignore-scripts`, `npm run typecheck`, `npm test` (12 passed), `npm run build`, and `npm run test:http` (1 passed) all succeeded. Tests required permission for local IPC/loopback listeners outside the execution sandbox. The HTTP test uses an ephemeral mock issuer; these results do not add live Supabase/Codex security evidence.

Git-triggered Preview builds for `d92286d`, `d1de340`, and `e667953` failed because Vercel project `ai-development-workspace` had an unset Root Directory (`.`), so Next.js ran at the repository root. With owner approval, only Root Directory (`spikes/remote-mcp`), Install Command (`npm ci --ignore-scripts`), and Build Command (`npm run build`) were corrected. Next.js, Node `24.x`, default output, Git integration and Production branch `main` were retained.

One separately authorized [Preview redeployment of `e667953`](https://vercel.com/carlosandreshuete-1394s-projects/ai-development-workspace/HY8E7335uWuXtChH7tbXeExkMZhU) reached **READY**. Full build logs confirmed installation, TypeScript, compilation, route generation and deployment succeeded; the only warning concerned npm's `cache-dir` environment configuration. The exact cloud npm version was not recorded. The Production alias remained on the existing `READY` deployment; no environment variables, OAuth, Supabase, domains or deployment protection were changed.

The six app variables target **Production only**. Preview authentication was not tested and is not established by the successful build. Configuring Preview OAuth would require separate approval and matching origin/audience/callback settings. Remaining live security checks are listed in the validation record and adoption checklist below; the exact tested Codex client version was not recorded.

## Compatibility risks and design

- Supabase OAuth Server remains beta. Its documented access-token audience defaults to `authenticated`; this endpoint rejects that audience. The manual Auth hook sets `aud` to the exact canonical `/api/mcp` URL only for the configured OAuth client, derives `github_provider_id` from `auth.identities`, and caps access tokens at five minutes. It must be tested for both code exchange and refresh. No user-editable metadata establishes owner access.
- Use a pre-registered **public** OAuth client (`token_endpoint_auth_method: none`) with PKCE S256. No confidential-client secret is needed. CIMD/DCR support differs across client/provider releases; registration discovery alone does not prove interoperability. This spike deliberately allowlists one client ID.
- Supabase documents exact OAuth callback matching. Current Codex can append a server-specific callback path and select a dynamic listener port. Configure a fixed listener port and register the exact callback it displays. Do not assume `/callback` or confuse MCP callbacks with GitHub/social-login callbacks.
- `mcp-handler` 2.3.0 uses MCP SDK v2 (`@modelcontextprotocol/server` 2.3.1), not the older monolithic SDK package. It serves stateless Streamable HTTP, including a 2025-protocol fallback; no Redis, sticky sessions, SSE endpoint, or durable state is required. Subscriptions are disabled.
- JWT validation uses the configured issuer's cached JWKS, ES256/RS256, expiry, subject, audience, OAuth client and owner claim on every MCP request. Browser cookies and regular Supabase login tokens cannot authorize MCP. Revoking consent/refresh tokens does **not** immediately revoke existing JWTs: residual access is bounded to five minutes by the hook. Immediate revocation would need additional validated session/introspection machinery before production adoption.
- Public metadata and `401` challenges point to a configured canonical origin, not a forwarded Host header. Vercel protection must not replace these responses with its login page. No HTTP endpoints mint or proxy OAuth codes/tokens: Supabase remains the authorization server.

## Local setup

Use Node 24 and npm 11.19.0. From this directory:

```sh
npm ci --ignore-scripts
cp .env.example .env.local
# Edit .env.local privately; never commit it.
npm run typecheck
npm test
npm run build
npm run test:http
npm run dev
```

Dependencies are exact-pinned with one independent lockfile. `.npmrc` disables dependency lifecycle scripts; build/test use packaged platform binaries. Do not blanket-enable install scripts. No root package manager or application setup is introduced.

`APP_URL` is the canonical origin, without a path. `OWNER_GITHUB_ID` is the numeric GitHub provider ID, not the username, email or Supabase user UUID. `MCP_OAUTH_CLIENT_ID` is a public client identifier, not a Supabase publishable key. `MCP_OAUTH_REDIRECT_URI` must match the registered Codex callback exactly. No service-role key or GitHub OAuth secret belongs in this app or Codex configuration.

## Supabase and GitHub configuration (manual test setup)

Use an isolated test Supabase project; do not install the hook into a shared/production Auth service.

1. Configure asymmetric signing (ES256 or RS256). Disable unused sign-in methods and anonymous login. Leave manual identity linking disabled; do not link other accounts to the owner during the experiment.
2. Create/configure a GitHub OAuth app. Its **GitHub authorization callback** is `https://<project-ref>.supabase.co/auth/v1/callback`. Put its GitHub client ID/secret only in the Supabase GitHub provider settings. Request no repository scopes.
3. In Supabase URL Configuration set Site URL to `APP_URL`. Add the exact app callback URLs needed for this experiment, including `/auth/callback` and the `/auth/callback?authorization_id=...` continuation. If a pattern is needed for the opaque authorization ID, restrict it to this exact origin/path; never permit arbitrary preview domains. Separate local and deployed experiments when possible.
4. Enable OAuth 2.1 Server and set its Authorization Path to `/oauth/consent`. This is the app's consent UI, not the provider's `/auth/v1/oauth/authorize` protocol endpoint.
5. Register a **public** OAuth client with authorization-code and refresh-token grants, response type `code`, token endpoint authentication `none`. DCR can stay disabled. Record its ID in `.env.local` and Vercel settings. Finish its exact callback registration after the Codex step below.
6. In a private copy of [custom-access-token-hook.sql](supabase/custom-access-token-hook.sql), replace the three placeholders with that client ID, the stable GitHub owner ID, and canonical MCP resource URL. Manually apply the function to the isolated project, then select it under Authentication → Hooks → Custom Access Token. The template introduces only an Auth hook, no application tables; it fails closed if unconfigured. Only `supabase_auth_admin` may execute it. Keep the configured copy out of Git.
7. Use the app's GitHub sign-in. The callback and consent actions fetch a server-verified user and check the GitHub identity. A different account cannot consent or call MCP, although Supabase may create its Auth account before the app denies entry. Blocking all non-owner account creation is outside this experiment.

The hook preserves ordinary browser-session audiences. OAuth tokens for other clients never receive this resource audience or owner claim. An ordinary browser session cannot substitute for a third-party OAuth access token.

## Vercel setup (manual test deployment exists)

Import this existing repository with **Root Directory `spikes/remote-mcp`**, Next.js framework, Node 24, install command `npm ci --ignore-scripts`, build command `npm run build`, default Next.js output. Set the six variables from `.env.example` privately. Use a stable HTTPS hostname for `APP_URL`, Supabase Site URL and the hook audience; preview URL changes require a new configuration and login.

The spike's OAuth metadata and MCP endpoint must be reachable without Vercel deployment-login protection; MCP's own bearer authentication still protects tools. Use an appropriately configured test deployment/domain. No Vercel bypass token should be embedded in Codex configuration. Provider-side rate limits/platform abuse protection should be enabled for a public test; no distributed rate-limit store is introduced here.

After deployment, set the same canonical settings in local `.env.local` and run:

```sh
npm run check:discovery
```

This read-only script checks public protected-resource metadata, the unauthenticated `401` challenge, issuer-specific OAuth discovery, public-client/PKCE support and asymmetric JWKS. It does not inspect registration secrets or pretend to prove token issuance. Metadata exists at both `/.well-known/oauth-protected-resource/api/mcp` and the root fallback.

## Normal Codex CLI/Desktop setup

Check the installed client's `codex --version`, `codex mcp add --help` and `codex mcp login --help`; the setup must use the normal client, not a custom OAuth simulator. Current official Codex guidance supports a pre-registered client and explicit callback configuration.

Set the global callback overrides in your private Codex configuration before adding the server (merge with existing configuration; do not replace it):

```toml
mcp_oauth_callback_port = 49152
mcp_oauth_callback_url = "http://127.0.0.1:49152/callback"
```

Then run, replacing the public values:

```sh
codex mcp add remote-mcp-spike --url https://YOUR_HOST/api/mcp --oauth-client-id YOUR_PUBLIC_CLIENT_ID
```

Register the **exact callback displayed by Codex** on the Supabase OAuth client, including any server-specific suffix. Set `MCP_OAUTH_REDIRECT_URI` to the same exact URI in this app's environment and redeploy/restart if changed. Codex stores its per-server `oauth.callback_url`; set per-server `oauth.callback_port = 49152` if needed so the listener agrees. An explicit port in the callback URL alone does not configure the listener.

If the provider advertises `authorization_response_iss_parameter_supported`, Codex requires a matching `iss` in the actual response. Without that support Codex may append a server-specific callback ID. Do not remove the suffix or guess it; record the actual generated callback. Failure to honor the fixed port or exact callback is a failed compatibility test, not a reason to weaken redirect validation.

```sh
codex mcp login remote-mcp-spike
```

Complete GitHub login and approve consent. In a normal Codex conversation ask it to call `remote-mcp-spike.connection_test`. Expected output: `Authenticated connection successful.` No token, user ID, email or claims should appear in tool output. Do not configure static bearer headers or a service key as an OAuth workaround.

For Desktop, add/use the same HTTP server through its MCP settings or supported shared configuration, complete its normal login, and call the tool in a new chat. Record Desktop version and the **actual** callback; do not assume its OAuth/client/callback behavior matches the CLI. If it needs a different callback, register and configure that exact URI for a separate test run. This spike intentionally permits one configured callback/client at a time. Do not alter unrelated Codex settings automatically.

## Verification and adoption checklist

| Check | Current evidence / required live result |
| --- | --- |
| TypeScript/build | Run the local commands; dynamic routes compile without real credentials |
| Resource integration | `npm test`: ephemeral signed JWTs pass through real `mcp-handler`; unauthenticated, invalid signature/issuer/audience/client/owner, expired and browser tokens fail |
| Statelessness | Local tests initialize/list/call across fresh handlers without a session ID |
| Actual Next.js HTTP routes | `npm run test:http` after build: mock JWKS, authenticated tool call, unauthenticated rejection, metadata, callback/consent error paths; no cloud traffic |
| Consent boundaries | Local tests reject alternate client/callback and profile-metadata owner spoofing; live deny/non-owner checks still required |
| Provider discovery | `npm run check:discovery` against deployed host; save PASS/failure without tokens |
| Real CLI login | **Passed, 2026-10-17 (owner demonstration):** Codex OAuth completed and `connection_test` returned the expected text |
| Desktop login | Repeat using normal Desktop UI and record actual version/callback/client behavior |
| Audience and refresh | A later call worked after waiting and restarting Codex; independent JWT-claim inspection and refresh-grant tracing are **pending**. The resource-server tests reject incorrect issuer/audience/client/owner claims. |
| Rejection/revocation | Deny consent; try non-owner login; revoke client consent/refresh; reconnect must fail after outstanding access token expiry |
| No local server | Stop the local Next.js process; both clients must continue reaching deployed tools |
| Restart/cold instance | Repeat tool call after redeploy/cold start without relying on process state |

Record actual versions, date, deployment host, discovery flags, callback shape, passed/failed checks and sanitized failure categories in a review note. Never paste access/refresh tokens, callback authorization codes, cookies or client secrets. If audience customization breaks issuance/refresh, or callback/client discovery fails, mark the combination **not validated**; do not relax issuer, audience, client or owner checks. The documented STDIO fallback remains a later decision, not part of this spike.

Known limits: JWT revocation has a five-minute window; cached JWKS follows key rotation on library refresh; browser sessions may require sign-in again if a refresh cannot persist during render. Local tests use generated keys, not Supabase. The **unconfigured** SQL template is in this repo; a customized instance was manually applied and enabled in the isolated test Supabase project. No production readiness claim is made.

## Official references checked 2026-10-16

- [Supabase OAuth Server setup and consent APIs](https://supabase.com/docs/guides/auth/oauth-server/getting-started)
- [Supabase MCP authentication](https://supabase.com/docs/guides/auth/oauth-server/mcp-authentication)
- [Supabase token security and custom audiences](https://supabase.com/docs/guides/auth/oauth-server/token-security)
- [Supabase custom access-token hook contract](https://supabase.com/docs/guides/auth/auth-hooks/custom-access-token-hook)
- [Supabase GitHub sign-in](https://supabase.com/docs/guides/auth/social-login/auth-github)
- [Auth identity serialization source](https://github.com/supabase/auth/blob/master/internal/models/identity.go)
- [Vercel MCP hosting](https://vercel.com/docs/mcp/deploy-mcp-servers-to-vercel)
- [Current mcp-handler API and v2 migration](https://github.com/vercel-labs/mcp-handler)
- [Codex OAuth registration/callback configuration](https://learn.chatgpt.com/docs/extend/mcp#oauth-client-registration-and-callbacks)
