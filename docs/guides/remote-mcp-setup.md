# Reproduce the remote Codex ↔ Supabase OAuth ↔ Vercel MCP spike

> **Audience:** Someone setting up the authentication compatibility prototype again, not installing the future product.
>
> **Read first:** [Architecture and terminology](../architecture/mcp-authentication.md). **Implementation:** [Spike README](../../spikes/remote-mcp/README.md). **Decision baseline:** [Technical spec v0.2](../architecture/technical-spec-v0.2.md).
>
> **Verified result (2026-10-17):** An authenticated Codex CLI invoked `connection_test` through the deployed MCP endpoint. A later call also worked after waiting and restarting Codex, as reported by the owner. Non-owner and revocation tests are still open.

## 0. What you need

- Access to the private GitHub repository, a GitHub account, and a **GitHub OAuth App** that you can configure.
- A dedicated **Supabase project** with GitHub social sign-in and OAuth 2.1 Server enabled. Use an isolated test project for the token hook.
- A **Vercel project** for the Next.js prototype, reachable at a stable public HTTPS hostname (no Vercel deployment-login wall around MCP discovery).
- Recent Codex CLI that supports `codex mcp add` and `codex mcp login`; Node **24**, npm **11.19.0** and Vercel CLI.
- An owner GitHub **numeric provider ID**, a Supabase publishable key, and the IDs/callbacks you generate below.

**Never commit:** `.env.local`, GitHub OAuth secret, Supabase service-role key, personal access tokens, OAuth codes/refresh tokens, session cookies or a configured private copy of the SQL hook. Client IDs and public URLs are not secrets, but access tokens are.

### Reference deployment used for the live test

These are **public identifiers only**; replace them for a fresh deployment:

| Item | Verified reference value |
| --- | --- |
| Repository / branch | `c4rl0s04/ai-development-workspace` → `spike/remote-mcp-auth` |
| App origin (`APP_URL`) | `https://ai-development-workspace-tan.vercel.app` |
| Supabase project origin | `https://tbifhoubudkmxeisvzhh.supabase.co` |
| MCP resource URL | `https://ai-development-workspace-tan.vercel.app/api/mcp` |
| Numeric GitHub owner ID | `159822857` |
| Supabase public OAuth client ID used in hook | `d7efccfe-d936-4eb3-bce6-9496eaa3f0c5` |
| Codex callback recorded for this spike | `http://127.0.0.1:49152/callback/Q_y6-jS361YY` |

The callback suffix is **client-generated** and may change when you register the server again. Treat the row above as evidence of this setup, not as a universal callback. Do not confuse the UUID-formatted Supabase OAuth client ID with GitHub's separate OAuth Client ID.

## 1. Check out the existing prototype

```sh
git clone git@github.com:c4rl0s04/ai-development-workspace.git
cd ai-development-workspace
git switch spike/remote-mcp-auth
cd spikes/remote-mcp
node --version
npm --version
npm ci --ignore-scripts
npm run typecheck
npm test
npm run build
npm run test:http
```

Use Node 24 and npm 11.19.0 as declared in the prototype. `npm run test:http` needs the build from the preceding step. This is a **separate prototype**, not the production app; do not scaffold the application inside this directory.

## 2. Create GitHub social sign-in credentials

In [GitHub Developer Settings](https://github.com/settings/developers), create a **GitHub OAuth App** (not a GitHub App):

- Homepage URL: `https://<your-stable-app-host>`.
- **Authorization callback URL:** `https://<your-supabase-project>.supabase.co/auth/v1/callback`.
- Copy its GitHub OAuth Client ID and **secret** into **Supabase → Authentication → Sign In / Providers → GitHub**. Never copy that secret into Codex, Git or Vercel.
- No GitHub repository scopes are needed merely to identify the owner.

This GitHub OAuth App is for **social login only**. A future GitHub App integration for repositories will be separately permissioned.

## 3. Set Supabase browser authentication URLs

In **Supabase → Authentication → URL Configuration**:

- **Site URL:** `https://<your-stable-app-host>`.
- Allow the exact app callback `https://<your-stable-app-host>/auth/callback`.
- Also permit the same callback with its optional `authorization_id` query (use a tightly scoped Supabase redirect URL pattern if necessary; do not allow arbitrary domains).
- Enable the **GitHub** sign-in provider and use the credentials from Step 2.

A browser sign-in follows GitHub → Supabase `/auth/v1/callback` → Next.js `/auth/callback`. The app checks that the resulting Supabase user's **GitHub provider ID** equals `OWNER_GITHUB_ID`; a GitHub username or editable profile field is insufficient.

## 4. Enable the Supabase OAuth 2.1 authorization server

In **Supabase → Authentication → OAuth Server** (UI names may evolve):

1. Enable OAuth 2.1 Server.
2. Set the **Authorization Path** to `/oauth/consent` (our Next.js consent screen).
3. Keep client authorization and callback restrictions enabled; do not use a permissive redirect wildcard.

This step makes Supabase an **OAuth authorization server for Codex**. It is separate from enabling GitHub social sign-in.

## 5. Register a *Supabase* OAuth App for Codex

In **Supabase → Authentication → OAuth Apps**, click **Create App** (this creates an OAuth *client*). Configure:

- Name: e.g. `Codex Remote MCP Test`.
- Client type: **Public**; token endpoint auth method `none` where shown.
- Authorization code with **PKCE S256** and refresh capability where configurable.
- Redirect URI: a placeholder loopback URL initially if required; replace it later with the **exact callback Codex reports**.

Copy the **Supabase OAuth App Client ID** (UUID-shaped in the tested setup). It is *not* the GitHub OAuth App Client ID, which caused our initial `oauth_client_not_found` error.

## 6. Prepare Vercel and the six environment variables

Create or link a Vercel project using the `spikes/remote-mcp` **root directory**; use Next.js, Node 24, `npm ci --ignore-scripts` and `npm run build`. Deploy the prototype to a **stable HTTPS hostname** and set its Production environment:

```dotenv
APP_URL=https://<your-stable-app-host>
SUPABASE_URL=https://<your-supabase-project>.supabase.co
SUPABASE_PUBLISHABLE_KEY=<publishable-key-from-supabase>
OWNER_GITHUB_ID=<numeric-github-provider-id>
MCP_OAUTH_CLIENT_ID=<supabase-oauth-app-client-id>
MCP_OAUTH_REDIRECT_URI=<exact-codex-loopback-callback>
```

From the project root `spikes/remote-mcp`, use the Vercel CLI; `vercel link` prompts you to select the correct project:

```sh
vercel link
vercel env ls production
vercel env add MCP_OAUTH_CLIENT_ID production
vercel env add MCP_OAUTH_REDIRECT_URI production
# Use "vercel env update NAME production" to replace an existing variable.
vercel deploy --prod
```

Add or update the other four variables through the Vercel dashboard or `vercel env add`. **Do not paste secrets into shell commands or Git.** Redeploy after changing any Production variables. A preview/deployment-specific URL is *not* a substitute for the canonical `APP_URL`.

If your domain returns a Vercel authentication page instead of public OAuth discovery or MCP's 401 challenge, adjust deployment protection for this dedicated test service; never add Vercel bypass credentials to Codex.

## 7. Register Codex with a fixed loopback callback

In `~/.codex/config.toml`, place the callback defaults at **top level** (outside named server sections):

```toml
mcp_oauth_callback_port = 49152
mcp_oauth_callback_url = "http://127.0.0.1:49152/callback"
```

Register the remote MCP server:

```sh
codex --version
codex mcp add remote-mcp-spike \
  --url https://<your-stable-app-host>/api/mcp \
  --oauth-client-id <supabase-oauth-app-client-id>
```

Codex prints a URL such as `http://127.0.0.1:49152/callback/<codex-generated-suffix>`. **Copy the full actual URL.** If Codex uses a random port instead, set the per-server listener port and callback and check its installed CLI configuration semantics:

```toml
[mcp_servers.remote-mcp-spike.oauth]
client_id = "<supabase-oauth-app-client-id>"
callback_url = "http://127.0.0.1:49152/callback/<codex-generated-suffix>"
callback_port = 49152
```

Keep existing unrelated Codex configuration. Do not blindly replace the suffix or assume all Codex versions generate the same callback. The OAuth authorization request's URL-encoded `redirect_uri` parameter is the definitive value Codex is sending.

Now update the **Supabase OAuth App's registered Redirect URI** to that **exact** callback. Set the **same** value for Vercel's `MCP_OAUTH_REDIRECT_URI` and redeploy. The fixed listener port, URL path and client registration must all agree.

## 8. Install and enable the custom access-token hook

**Only on the isolated test Supabase project.** Supabase's default browser-token audience is not sufficient for our MCP resource validation.

1. Make a private copy of [the SQL template](../../spikes/remote-mcp/supabase/custom-access-token-hook.sql).
2. Replace `REPLACE_PUBLIC_OAUTH_CLIENT_ID` with the **Supabase** OAuth client ID, `REPLACE_NUMERIC_GITHUB_OWNER_ID` with the stable numeric GitHub provider ID, and `https://REPLACE_DEPLOYMENT_HOST/api/mcp` with your canonical MCP resource URL.
3. Review the SQL. Execute it in the Supabase **SQL Editor** (it creates `public.remote_mcp_spike_token_hook(jsonb)` and grants limited execution/identity-read permissions to `supabase_auth_admin`).
4. In **Authentication → Hooks → Custom Access Token**, choose **Postgres** (not HTTPS), schema `public`, function `remote_mcp_spike_token_hook`, enable it and save.
5. Verify that GitHub browser sign-in still works after activation.

The hook uses the database's `auth.identities` records to establish the owner and only adjusts tokens for the allowlisted OAuth client. It sets the `aud` to the MCP URL and caps access-token lifetime at five minutes. **Do not run the template with placeholders still present** or on a shared/production Auth environment without a separate security review.

## 9. Verify endpoints *before* OAuth login

Once Vercel has redeployed:

```sh
curl -i "https://<your-stable-app-host>/.well-known/oauth-protected-resource/api/mcp"
# Expected: HTTP 200 + JSON naming the canonical /api/mcp resource and Supabase issuer.

curl -i -X POST "https://<your-stable-app-host>/api/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
# Expected: HTTP 401 + WWW-Authenticate referring to protected-resource metadata.
```

In `spikes/remote-mcp`, also create `.env.local` from `.env.example` **privately** with the same public/configuration values and run:

```sh
cp .env.example .env.local
# Edit .env.local; never commit it.
npm run check:discovery
```

The discovery script validates advertised metadata/PKCE/JWKS but **does not** prove live login or token refresh.

## 10. Login and test in Codex

```sh
codex mcp login remote-mcp-spike
codex
```

In Codex, ask: **"Use remote-mcp-spike to call connection_test and show the exact tool output."**

Expected:

```text
Authenticated connection successful.
```

Then wait **at least six minutes** from token issuance, call the tool again without reauthorizing, restart Codex and call it again. Record whether a new interactive login was required. A successful later call demonstrates continuity but **does not by itself prove whether Codex used a refresh grant, a different cached token or another renewal behavior**. Capturing the token/refresh transition in a controlled, redacted test would be a separate validation.

## 11. Problems encountered in the real integration

| Symptom | Actual cause / check | Fix |
| --- | --- | --- |
| `oauth_client_not_found` / `invalid client_id format` | Codex sent the **GitHub** OAuth Client ID (`Ov23…`) to Supabase's OAuth server. | Use the **Supabase OAuth Apps** client ID in Codex, the hook and Vercel. |
| `invalid redirect_uri` | Codex's listener used a different port/path than the registered OAuth App; a URL alone did not pin the listener. | Use a fixed listener port and register the **exact** actual Codex callback, including suffix; align Vercel. |
| `Missing or invalid authorization request. Restart login from Codex.` | The prototype validated Supabase's opaque 32-character `authorization_id` with `z.uuid()`. | Use the bounded URL-safe validator in `lib/oauth.ts` and regression tests in `tests/oauth.test.ts`; deploy the fixed source and restart login. |
| MCP route responds 401 after login | JWT rejected (issuer, resource audience, client ID, owner claim, expiry or signature); the hook may not be applied/enabled. | Verify matching configuration and hook, inspect redacted server logs; do **not** disable validation or paste tokens into tickets. |
| Vercel login page or 403 instead of metadata | Deployment protection intercepts discovery. | Make the dedicated test's discovery and challenge publicly reachable; MCP tools remain Bearer-protected. |
| Consent expired or unavailable | Old/consumed `authorization_id` or lost query parameter after sign-in. | Start a fresh `codex mcp login`; verify the Next.js app callback returns to `/oauth/consent?authorization_id=...`. |

## 12. Evidence, cleanup and remaining checks

The [spike README](../../spikes/remote-mcp/README.md) is the source for the **dated validation record**. Its code remains a proof of concept with a single read-only tool, not M0 and not production-ready.

Still needed before accepting this as production authentication: negative tests for non-owner and denied consent, revocation and token residual lifetime, explicit claim/refresh behavior verification, signing-key rotation, cold-start stability, Codex Desktop compatibility if required, protection/rate limits, safe logs, and operational runbooks. The intended fallback remains a local STDIO bridge to the same protected remote app API if provider compatibility regresses. Never weaken audience, issuer or owner validation to make a test pass.

### If you repeat the setup on a new computer

Reuse the **Supabase OAuth App Client ID** if the intended client remains the same, but generate and register that Codex installation's **actual callback URI**, update the one allowlisted `MCP_OAUTH_REDIRECT_URI`, and redeploy. The current spike explicitly allows only **one OAuth client and one callback** at a time; a multi-client design is future work. Do not confuse this demo's registered callback with a generally reusable URL.
