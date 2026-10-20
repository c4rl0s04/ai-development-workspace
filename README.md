# AI Development Workspace

A workspace for connecting software projects, versioned specifications, human decisions and supervised coding agents.

**M1.2 is merged into main and deployed (owner-confirmed).** Projects and Tasks persist through server-side Drizzle/PostgreSQL, owner authorization, RLS and optimistic revisions. This local M1.2.1 branch refines the frontend and reduces redundant Auth/database reads. Approvals and workflow transitions remain unimplemented. No push, deployment or hosted configuration change is authorized for this milestone. See [persistence setup and rollout](docs/guides/persistence.md) and [Auth validation limits](docs/guides/owner-auth.md).

## Run locally

Use Node **24.21.0** (`.node-version`) and npm **11.19.0** (`packageManager`). Installation, unit/Auth tests and build require no hosted credentials. The PostgreSQL integration suite uses Docker PostgreSQL. Actual browser sign-in requires the four server-only variables in `.env.example`; without them the login UI is unavailable and private routes fail closed. Project/task data additionally requires server-only DATABASE_URL using the dedicated runtime role; missing storage configuration fails closed with safe errors. See the [owner-auth setup/validation plan](docs/guides/owner-auth.md) before configuring anything.

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

`npm run format` applies Biome formatting. `typecheck` generates Next.js route types before checking TypeScript, so it works on a fresh checkout. Tests retain the M0 shell/Approvals checks and cover owner authorization and CSRF/configuration policy. The HTTP check uses an ephemeral local mock Auth server and production Next.js process to verify protected routes, refresh cookies, PKCE callbacks, non-owner/spoofed/expired/MCP-token rejection, unauthorized writes, logout (including chunks/provider failure), assets, 404 behavior and security headers. A second HTTP scenario proves missing configuration fails closed. It requires a successful build. CI uses the same commands with read-only GitHub permissions and no provider credentials.

To serve the build locally, run `npm start`. The foundation sets anti-framing, content-type, referrer and permissions headers, disables the powered-by header and asks crawlers not to index it. Its CSP constrains framing, objects, base URLs and forms; it is not a complete script policy or an authentication mechanism. Projects/tasks have real persistence; Approvals remains a placeholder. A complete deployment-specific CSP and real-world authentication checks remain required before private data is introduced. The browser Auth flow is separate from future MCP client OAuth authorization.

M1.1 verification on 2026-10-17 with Node `v24.21.0` / npm `11.19.0`: clean install, formatting, lint, typecheck and credential-free production build passed; **10 component/policy tests and 2 built-server HTTP scenarios passed**. The dependency audit reported zero vulnerabilities. The existing CI commands include the new tests. GitHub Actions passed, and real local/hosted owner login, navigation, reload and logout passed. Wrong-owner and expired-session cases use automated fixtures; real token-expiry/revocation checks remain open.

## Structure and boundaries

```text
src/
  app/                 Public login + auth route adapters
    (workspace)/       Owner-protected Overview, Projects, Approvals
  application/         Authorized Auth and project/task use cases
  domain/workspace.ts   Entities, validation and invariants
  infrastructure/      Supabase SSR + PostgreSQL/Drizzle adapters
  server/              Server-only auth, services and safe HTTP composition
  proxy.ts             Early owner authorization and refresh propagation
  components/          Shared presentation and navigation
drizzle/               SQL migrations and metadata
scripts/               Local-only migration/role setup
tests/                 Unit, Auth HTTP and real PostgreSQL/HTTP suites
.github/workflows/     Local-check parity in GitHub Actions
docs/architecture/     Versioned technical specifications
```

This is a modular monolith, with an independently hosted runner planned later. Authentication policy and its provider adapter are now separated from UI. Future feature-owned domain logic belongs under `src/domain`, use cases under `src/application`, and server-only providers under `src/infrastructure`. Future private loaders/services must call `requireOwner()`; cookie-authenticated POST handlers must call `requireOwnerMutation(request)` from `src/server/auth.ts` independently of route/layout protection. Domain logic must stay independent of React/Next.js/providers; routes and future MCP handlers must call the same application services. Empty modules and generic service frameworks remain absent. The Supabase client is request-scoped and server-only.

## Required workflow and milestone boundary

[Technical specification v0.2](docs/architecture/technical-spec-v0.2.md) remains the architectural baseline. Its documentation-only status describes the original draft, not the current branch; Issue #4 and the completed M1.2 scope establish the persistence slice; M1.2.1 preserves those boundaries. Required workflow/authority rules remain intact; provisional provider choices are not implemented by installing this app.

The seven task stages will be **Backlog → Specification → Pending review → Ready → In progress → Review → Done**. **On Hold** remains a separate manual condition projected as an extra lane. Dependency guards and explicit transitions must apply through every interface. Human approvals bind to exact revisions; execution grants are separate. Agents cannot approve their own work, authorize execution or bypass acceptance/integration gates.

- **M1:** owner-only login, persistent projects/tasks, Kanban, specifications, approvals and audit/outbox foundations.
- **M2:** normal Codex planning through scoped MCP and shared application services. Agents never receive database credentials.
- **M3 onward:** separately isolated execution, GitHub App integration, independent reviews and production readiness.

Supabase owns workflow records; GitHub owns repository/PR/CI facts. M1.2 adds only owner identity, project, repository and task persistence. Workflow transitions, audit/outbox, specifications and decisions follow in M1.3/M1.4. MCP, runner, orchestration and GitHub App integration remain excluded. M1.2.1 makes no changes to cloud resources, hosted schema or settings.

## Independent OAuth experiment

The separate [`spike/remote-mcp-auth` branch / PR #1](https://github.com/c4rl0s04/ai-development-workspace/pull/1) demonstrated GitHub browser sign-in, Supabase OAuth consent and an authenticated remote Codex CLI `connection_test` call. A later successful call was owner-reported; refresh internals were not independently traced. Local resource-server tests and a corrected Vercel Preview build passed. Non-owner/denial, revocation, token claims/lifetime, key rotation and Desktop parity remain open before production adoption. Its implementation and credentials are not copied into this foundation.

The authenticated M1.2 dashboard is deployed separately at <https://ai-development-workspace-preview.vercel.app> in Vercel project `ai-development-workspace-preview` (Root Directory `.`). The owner confirms Production authentication and persistence work. Issue #7 retains outstanding live security validation; automated fixtures do not replace those checks.

The existing `ai-development-workspace` Vercel project still serves the OAuth experiment from its last successful deployment at <https://ai-development-workspace-tan.vercel.app>. **Its Git integration was intentionally disconnected before merging M0** to prevent automatic builds from branches that do not include `spikes/remote-mcp`. The production deployment, aliases and authentication configuration were preserved. The MCP project remains an isolated reference and is not the M0 application's deployment target.

The `ai-development-workspace-preview` Vercel project remains connected to the repository and uses `main` as its production branch. A future authorized merge into `main` will deploy the root dashboard **only to the dashboard project**; feature pushes can also trigger Preview builds. Do not push/deploy M1.2.1 or change hosted configuration without separate approval. Do not reconnect or repoint the isolated MCP project; integrating MCP into the real app is separate work for M2.

See [AGENTS.md](AGENTS.md) for contributor commands and invariants. Changes to persistence and hosted configuration remain subject to human review. The owner chose to reuse the existing Supabase Auth project; the exact setup and real-world checks are in [the auth guide](docs/guides/owner-auth.md).

## M1.2 database verification

Follow [the local database guide](docs/guides/persistence.md) to start Docker PostgreSQL, apply the two checked migrations and configure the local runtime role. Then run `npm run test:db` with the documented local TEST_DATABASE_URL after the production build. CI runs this integration suite as well as all commands above. The suite verifies RLS with the actual non-owner runtime role, concurrent numbering, stale edits, rollback and persistence across Next.js process restarts. Destructive deletion is deliberately absent.

M1.2.1 local validation (Node 24.21.0 / npm 11.19.0): clean installation, formatting, lint, typecheck and production build passed. **20 unit/render/DOM tests, 2 Auth HTTP scenarios and 11 PostgreSQL TAP tests passed.** RLS, atomic task numbering, revision conflicts, rollback and persistence across process restarts remain covered. Hosted CI and live browser/OAuth were not rerun for this unpushed branch. See [frontend changes, measurements and validation limits](docs/guides/frontend-foundation.md).

## Graphite frontend

The application UI uses the approved graphite/steel Liquid Glass foundation:
frosted navigation/tools with solid server-rendered records and native forms.
See [DESIGN.md](DESIGN.md), [component reuse](docs/design-system/README.md), and
[local migration validation](docs/guides/visual-redesign.md). Experimental fixtures,
design-lab routes and the conceptual Kanban are not part of this application.
Existing authentication, persistence and validation commands remain unchanged.
