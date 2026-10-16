# Remote MCP compatibility spike

This directory is an independent disposable Next.js application, authorized before M0 solely to test remote authentication. The repository architecture remains in `../../docs/architecture/technical-spec-v0.2.md`; do not import spike modules into a final application or add product tables here.

- Run commands from this directory with Node 24 and npm 11.19.0. `npm ci --ignore-scripts`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:http` are the local checks. Package versions and the lockfile are pinned; install scripts stay disabled in `.npmrc`.
- `app/api/mcp/route.ts` is the stateless resource endpoint; `lib/mcp.ts` owns bearer validation. Server-rendered GitHub login and OAuth consent use Supabase Auth, never an application credential store.
- `supabase/custom-access-token-hook.sql` is a manual isolated-project setup template, not an applied migration or production schema. Never apply it or provision/deploy resources without a separate user request.
- `.env.local` and generated output are ignored. `.env.example` contains placeholders only. Do not log tokens, authorization codes, session cookies, or provider responses.
- Local integration tests use ephemeral signing keys and prove resource-server behavior only. The owner reported a successful **live Codex CLI OAuth + connection_test** and later connection after a restart; the README records this evidence, but revocation, non-owner denial, token-refresh internals and Desktop remain untested. Do not claim production readiness.

The [architecture guide](../../docs/architecture/mcp-authentication.md) describes the authorization model, while the [setup guide](../../docs/guides/remote-mcp-setup.md) records the reproducible manual configuration. Keep the spike README's validation record current when provider behavior or deployment results change.
