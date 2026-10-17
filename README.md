# AI Development Workspace

A workspace for connecting software projects, versioned specifications, human decisions and supervised coding agents.

**Current implementation: M0 foundation.** The root Next.js application provides a responsive shell with Overview, Projects and Approvals pages. Navigation works; the pages explicitly identify product functionality as unimplemented. No sample projects, accounts, approval actions or agent connections are simulated.

## Run locally

Use Node **24.21.0** (`.node-version`) and npm **11.19.0** (`packageManager`). No environment variables or provider accounts are required.

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

`npm run format` applies Biome formatting. `typecheck` generates Next.js route types before checking TypeScript, so it works on a fresh checkout. Tests cover honest placeholder content, navigation and the separation of approval from execution authority. The HTTP check starts an ephemeral loopback production server and verifies all routes, active navigation, assets, 404 behavior and security headers. It requires a successful build. CI uses the same commands with read-only GitHub permissions and no provider credentials.

To serve the build locally, run `npm start`. The foundation sets anti-framing, content-type, referrer and permissions headers, disables the powered-by header and asks crawlers not to index it. Its CSP constrains framing, objects, base URLs and forms; it is not a complete script policy or an authentication mechanism. Routes contain public placeholder content only. Owner authentication and a stricter deployment-specific policy belong to later milestones, before private data is introduced.

Local verification on 2026-10-17 with Node `v24.21.0` / npm `11.19.0`: clean installation, formatting, lint, typecheck and production build passed; **4 component tests and 1 built-server HTTP test passed**. The dependency audit reported zero vulnerabilities. The shell was inspected in a desktop browser and at a 320px viewport. These commands are also the GitHub Actions CI checks; inspect the current PR for hosted results.

## Structure and boundaries

```text
src/
  app/                 Next.js layout, styles and route adapters
    page.tsx           Overview (/)
    projects/page.tsx  Projects placeholder
    approvals/page.tsx Approvals placeholder
  components/          Shared presentation and active navigation
tests/                 Component rendering and built-server checks
.github/workflows/     Local-check parity in GitHub Actions
docs/architecture/     Versioned technical specifications
```

This is a modular monolith, with an independently hosted runner planned later. Only the UI layer exists today. Add `src/domain` for feature-owned business rules, `src/application` for authorized use cases, and `src/infrastructure` for server-only provider adapters when a milestone needs real behavior. Domain logic must stay independent of React/Next.js/providers; routes and future MCP handlers must call the same application services. Empty directories, generic service frameworks and provider clients are deliberately absent.

## Required workflow and milestone boundary

[Technical specification v0.2](docs/architecture/technical-spec-v0.2.md) remains the architectural baseline. Its documentation-only status describes the original draft, not the current branch; Issue #2 and the explicit M0 request authorize this foundation. Required workflow/authority rules remain intact; provisional provider choices are not implemented by installing this app.

The seven task stages will be **Backlog → Specification → Pending review → Ready → In progress → Review → Done**. **On Hold** remains a separate manual condition projected as an extra lane. Dependency guards and explicit transitions must apply through every interface. Human approvals bind to exact revisions; execution grants are separate. Agents cannot approve their own work, authorize execution or bypass acceptance/integration gates.

- **M1:** owner-only login, persistent projects/tasks, Kanban, specifications, approvals and audit/outbox foundations.
- **M2:** normal Codex planning through scoped MCP and shared application services. Agents never receive database credentials.
- **M3 onward:** separately isolated execution, GitHub App integration, independent reviews and production readiness.

Supabase owns workflow records; GitHub owns repository/PR/CI facts. No application database tables, OAuth, MCP tools, runner, orchestration or GitHub App integration are included in M0. No cloud resources or settings are required or changed.

## Independent OAuth experiment

The separate [`spike/remote-mcp-auth` branch / PR #1](https://github.com/c4rl0s04/ai-development-workspace/pull/1) demonstrated GitHub browser sign-in, Supabase OAuth consent and an authenticated remote Codex CLI `connection_test` call. A later successful call was owner-reported; refresh internals were not independently traced. Local resource-server tests and a corrected Vercel Preview build passed. Non-owner/denial, revocation, token claims/lifetime, key rotation and Desktop parity remain open before production adoption. Its implementation and credentials are not copied into this foundation.

The M0 dashboard is deployed separately at <https://ai-development-workspace-preview.vercel.app> in Vercel project `ai-development-workspace-preview` (Root Directory `.`). This is a public placeholder deployment, not a production-ready authenticated application.

The existing `ai-development-workspace` Vercel project still serves the OAuth experiment from its last successful deployment at <https://ai-development-workspace-tan.vercel.app>. **Its Git integration was intentionally disconnected before merging M0** to prevent automatic builds from branches that do not include `spikes/remote-mcp`. The production deployment, aliases and authentication configuration were preserved. The MCP project remains an isolated reference and is not the M0 application's deployment target.

The `ai-development-workspace-preview` Vercel project remains connected to the repository and uses `main` as its production branch. Merging M0 into `main` therefore triggers a deployment of the root Next.js dashboard **only to the dashboard project**. This is a public M0 placeholder app, not an authenticated production-ready workspace. Do not reconnect or repoint the isolated MCP project as part of M0; integrating MCP into the real app is separate work for M2.

See [AGENTS.md](AGENTS.md) for contributor commands and invariants. Final M0 acceptance and deployment architecture remain subject to human review.
