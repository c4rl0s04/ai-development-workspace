# AI Development Workspace

A workspace for connecting software projects, versioned specifications, human decisions and supervised coding agents.

**Current branch: M1.1 owner-only authentication on the merged M0 foundation.** The root Next.js dashboard now has a Supabase/GitHub browser authentication boundary. Projects and Approvals remain honest product placeholders; no project data, task operations, approvals, MCP or agents are implemented. Authentication has local automated coverage; live M1 provider/Preview validation is pending. The currently deployed main dashboard remains M0 until a separately authorized push/deployment.

## Run locally

Use Node **24.21.0** (`.node-version`) and npm **11.19.0** (`packageManager`). Installation, tests and build require no provider accounts or credentials. Actual browser sign-in requires the four server-only variables in `.env.example`; without them the login UI is unavailable and private routes fail closed. See the [owner-auth setup/validation plan](docs/guides/owner-auth.md) before configuring anything.

```sh
npm ci --ignore-scripts
npm run dev
```

Open <http://127.0.0.1:3000>. The dev and production start scripts bind loopback by default. Dependency lifecycle scripts remain disabled in `.npmrc`; exact dependency versions and `package-lock.json` are committed.

## Checks

Run at the repository root, in this order:

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:http
```

`npm run format` applies Biome formatting. `typecheck` generates Next.js route types before checking TypeScript, so it works on a fresh checkout. Tests retain the M0 placeholder checks and cover owner authorization and CSRF/configuration policy. The HTTP check uses an ephemeral local mock Auth server and production Next.js process to verify protected routes, refresh cookies, PKCE callbacks, non-owner/spoofed/expired/MCP-token rejection, unauthorized writes, logout (including chunks/provider failure), assets, 404 behavior and security headers. A second HTTP scenario proves missing configuration fails closed. It requires a successful build. CI uses the same commands with read-only GitHub permissions and no provider credentials.

To serve the build locally, run `npm start`. The foundation sets anti-framing, content-type, referrer and permissions headers, disables the powered-by header and asks crawlers not to index it. Its CSP constrains framing, objects, base URLs and forms; it is not a complete script policy or an authentication mechanism. The workspace is owner-protected, but its product content is still placeholder-only. A complete deployment-specific CSP and real-world authentication checks remain required before private data is introduced. The browser Auth flow is separate from future MCP client OAuth authorization.

Local verification on 2026-10-17 with Node `v24.21.0` / npm `11.19.0`: clean install, formatting, lint, typecheck and credential-free production build passed; **9 component/policy tests and 2 built-server HTTP scenarios passed**. The dependency audit reported zero vulnerabilities. The existing CI commands include the new tests. This branch is local-only; no M1 hosted CI or live authentication result is claimed.

## Structure and boundaries

```text
src/
  app/                 Public login + auth route adapters
    (workspace)/       Owner-protected Overview, Projects, Approvals
  application/auth/    Owner/CSRF policy and identity-reader contract
  infrastructure/auth/ Supabase SSR, cookies and config validation
  server/auth.ts       Server-only request-bound authorization entry points
  proxy.ts             Refresh propagation and early mutation checks
  components/          Shared presentation and navigation
tests/                 Component rendering and built-server checks
.github/workflows/     Local-check parity in GitHub Actions
docs/architecture/     Versioned technical specifications
```

This is a modular monolith, with an independently hosted runner planned later. Authentication policy and its provider adapter are now separated from UI. Future feature-owned domain logic belongs under `src/domain`, use cases under `src/application`, and server-only providers under `src/infrastructure`. Future private loaders/services must call `requireOwner()`; cookie-authenticated POST handlers must call `requireOwnerMutation(request)` from `src/server/auth.ts` independently of route/layout protection. Domain logic must stay independent of React/Next.js/providers; routes and future MCP handlers must call the same application services. Empty modules and generic service frameworks remain absent. The Supabase client is request-scoped and server-only.

## Required workflow and milestone boundary

[Technical specification v0.2](docs/architecture/technical-spec-v0.2.md) remains the architectural baseline. Its documentation-only status describes the original draft, not the current branch; Issues #4/#5 and the explicit M1.1 request authorize this authentication slice on M0. Required workflow/authority rules remain intact; provisional provider choices are not implemented by installing this app.

The seven task stages will be **Backlog → Specification → Pending review → Ready → In progress → Review → Done**. **On Hold** remains a separate manual condition projected as an extra lane. Dependency guards and explicit transitions must apply through every interface. Human approvals bind to exact revisions; execution grants are separate. Agents cannot approve their own work, authorize execution or bypass acceptance/integration gates.

- **M1:** owner-only login, persistent projects/tasks, Kanban, specifications, approvals and audit/outbox foundations.
- **M2:** normal Codex planning through scoped MCP and shared application services. Agents never receive database credentials.
- **M3 onward:** separately isolated execution, GitHub App integration, independent reviews and production readiness.

Supabase owns workflow records; GitHub owns repository/PR/CI facts. No application database tables, MCP tools, runner, orchestration or GitHub App integration are included in this slice. No cloud resources were provisioned or settings changed during implementation. Live M1 authentication requires the separately approved setup in the auth guide.

## Independent OAuth experiment

The separate [`spike/remote-mcp-auth` branch / PR #1](https://github.com/c4rl0s04/ai-development-workspace/pull/1) demonstrated GitHub browser sign-in, Supabase OAuth consent and an authenticated remote Codex CLI `connection_test` call. A later successful call was owner-reported; refresh internals were not independently traced. Local resource-server tests and a corrected Vercel Preview build passed. Non-owner/denial, revocation, token claims/lifetime, key rotation and Desktop parity remain open before production adoption. Its implementation and credentials are not copied into this foundation.

The M0 dashboard is deployed separately at <https://ai-development-workspace-preview.vercel.app> in Vercel project `ai-development-workspace-preview` (Root Directory `.`). This is a public placeholder deployment, not a production-ready authenticated application.

The existing `ai-development-workspace` Vercel project still serves the OAuth experiment from its last successful deployment at <https://ai-development-workspace-tan.vercel.app>. **Its Git integration was intentionally disconnected before merging M0** to prevent automatic builds from branches that do not include `spikes/remote-mcp`. The production deployment, aliases and authentication configuration were preserved. The MCP project remains an isolated reference and is not the M0 application's deployment target.

The `ai-development-workspace-preview` Vercel project remains connected to the repository and uses `main` as its production branch. A future authorized merge into `main` will deploy the root dashboard **only to the dashboard project**; feature pushes can also trigger Preview builds. Do not push M1 until its branch-specific Preview environment/callback configuration is reviewed and authorized. The currently deployed main app remains the public M0 placeholder; the local M1 branch must not be deployed until its auth setup is approved. Do not reconnect or repoint the isolated MCP project; integrating MCP into the real app is separate work for M2.

See [AGENTS.md](AGENTS.md) for contributor commands and invariants. M1.1 acceptance, the Supabase development-project choice and Preview configuration remain subject to human review. Prefer a separate development Auth project; the exact setup and real-world checks are in [the auth guide](docs/guides/owner-auth.md).
