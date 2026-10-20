# AI Development Workspace — project instructions

## Current foundation

- The root Next.js 16 / React / TypeScript / Tailwind application has an M1.1 owner-only Supabase/GitHub browser auth boundary on M0. `src/app/(workspace)` protects the dashboard; M1.1 is merged and Production login is owner-confirmed. M1.2 implements PostgreSQL project/task persistence, merged and deployed with owner-confirmed behavior; Approvals remains a placeholder. No MCP or runner is implemented. Issue #7 live hardening remains a hosted-private-data prerequisite.
- [Technical specification v0.2](docs/architecture/technical-spec-v0.2.md) is the architectural source of truth. Distinguish its required invariants from provisional provider choices and historical milestone status. Read the sections relevant to a change before implementation and surface architectural conflicts before proceeding.
- Work through the specification's focused, independently verifiable milestones. Update documented decisions and real validation commands as implementation makes them concrete. New infrastructure, dependencies, or abstractions require a current milestone need; keep unrelated work out of scope.

## Implementation boundaries

- Preserve the modular monolith and separate runner boundary. Keep workflow and authorization in application services shared by web and MCP; agents never access the database directly.
- Use explicit TypeScript contracts and boundary validation for service, MCP, runner, and provider interactions. Keep modules understandable and independently testable; prioritize tests of transition permissions, stale approvals, concurrency, retries, and external failures.
- Supabase PostgreSQL owns workflow, holds, dependencies, specifications, human decisions, execution grants, and run metadata. Use relational constraints for core state and JSONB only for extensible data. GitHub owns repository/PR/CI facts; Supabase Storage is the preferred private artifact candidate. Never mirror an authoritative workflow state into GitHub Projects.

## Workflow and authority

- Enforce the seven-state transition matrix, dependency guards, and separate manual On Hold condition for every interface. Show held tasks in an additional projected lane without losing their underlying stage. Do not allow free drag-and-drop to bypass transition rules. Commit state changes, audit events, and required outbox records atomically with concurrency checks.
- Human approvals/decisions bind to exact specification or implementation revisions; execution grants are separate revocable, attempt-scoped records. Superseding a specification blocks further implementation until the new version is approved and execution is authorized.
- Supervised automation is the initial policy. Human approval of a specification and human authorization to execute implementation are separate actions. Agents may submit specifications, progress, implementation evidence, and independent review results only within their assigned scope.
- An implementation agent cannot approve its own work. Agent output, prompts, tool results, and GitHub events never substitute for human authorization or bypass approval gates. Done requires current review, acceptance, and applicable integration evidence.
- This is a single-owner application: GitHub login through Supabase Auth must be gated by the configured stable owner ID; do not build team or member administration. Interactive authenticated Codex may start low-risk planning through MCP without a separate per-task dashboard approval; implementation still requires explicit human authority. Prefer a stateless remote MCP endpoint hosted with Next.js on Vercel, validate Supabase OAuth 2.1 server interoperability before relying on it. Enforce authorization and least privilege on every operation. Keep provider credentials outside agent contexts, verify GitHub webhooks, and isolate executions. A worktree alone is not a security sandbox; untrusted execution requires process/environment isolation.

Use relevant installed global skills when they materially support the milestone; do not copy their manuals or reinstall them here. Global engineering instructions continue to apply.

## Local implementation and checks

- Use Node `24.21.0` (`.node-version`) and npm `11.19.0`; `.npmrc` enforces the toolchain and disables dependency scripts. Run from the repository root: `npm ci --ignore-scripts`, `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, then `npm run test:http`. `npm run dev` and `npm start` bind loopback by default.
- `npm run format` applies Biome formatting; `npm run lint` checks recommended accessibility/React/TypeScript rules. CI runs the same checks, including built-server HTTP checks. Render/policy tests live in `tests/pages.test.tsx` and `tests/auth.test.tsx`; `tests/http.test.ts` uses ephemeral local Next.js and mock Auth servers and requires the build. No real Supabase traffic or credentials are needed for tests/build.
- Keep `src/app` and `src/components` as UI adapters. `src/application/auth` owns policy, `src/infrastructure/auth` implements Supabase/cookies, and `src/server/auth.ts` composes server-only request-bound entry points. Project/task records and validation live under `src/domain`; future workflow invariants belong there too. Do not create empty modules or put workflow rules in components. Domain code must not depend on React, Next.js or provider SDKs; UI must call application services for future mutations.
- Every future private service/loader must call `requireOwner()` and cookie-authenticated POST mutations must call `requireOwnerMutation(request)` from `src/server/auth.ts`. Neither a protected layout nor Proxy is sufficient authorization for data operations. Never accept a caller-supplied principal; never authorize from `getSession()` or mutable metadata.
- Auth runtime requires `APP_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY` and `OWNER_GITHUB_ID`, all server-only. Build succeeds without them; runtime access fails closed. Use `.env.example` and [owner-auth setup](docs/guides/owner-auth.md). Do not log tokens, codes, cookies or provider responses. Never copy OAuth-spike configuration into this app. The independent `spike/remote-mcp-auth` branch and its Vercel project remain separate; do not import spike modules, provision resources, change its Root Directory, or push/deploy without explicit authorization.
- Completion requires focused tests and a production build, honest placeholder copy, accessible responsive navigation, no secrets or generated artifacts, and preservation of the workflow/authority rules above.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## M1.2 persistence

- `src/domain/workspace.ts` owns records/Zod invariants; `src/application/workspace.ts` authorizes every use case; `src/infrastructure/db` holds schema/connection/Drizzle adapter; `src/server/workspace.ts` composes server-only services. Pages/JSON handlers use these services, never direct database queries. Client identities/status overrides are not trusted.
- Migrations live under `drizzle/`; the second is hand-reviewed access SQL. Runtime uses only the non-owner `workspace_app` role, verified TLS remotely and transaction-local owner context. RLS/column grants are defense in depth, never a substitute for requireOwner/requireOwnerMutation. Never configure migration/postgres/service-role credentials as DATABASE_URL.
- Project keys and task numbers are immutable. Task number allocation and insert share a transaction; revision-checked edits include repository changes atomically. Tasks enter Backlog; no status transitions, permanent deletion, team tables or agent infrastructure in M1.2. Repository replacements retire associations.
- See [persistence guide](docs/guides/persistence.md) for Docker/local-only migration commands, role setup, environment variables and hosted approval checklist. Run `npm run test:db` (local TEST_DATABASE_URL) after the existing build/HTTP checks. Ordinary `.test.ts` files under tests/unit and PostgreSQL `.test.ts` files under tests/integration are explicitly included in npm/CI. Test databases are randomly named and isolated; never truncate development or hosted data.
- Do not introduce real private data remotely until Issue #7 live second-account, expiry/revocation and cookie/cache boundaries are reviewed. Report fixture-tested behavior separately from live evidence. M1.3/M1.4 add workflow audit and specification/decision/outbox behavior.

## Frontend foundation

- `requireOwner()` deduplicates verified identity with React `cache` within one Server Component render only; retain every service authorization call. Proxy, HTTP handlers outside React rendering, and writable mutation checks remain independent. Never replace this with a process-wide identity cache.
- Use `getProjectSummary` for project edit/new-task context; `getProject` includes a paginated task list. Keep role checks, transaction-local owner context, RLS and revision guards intact.
- Shared page headers accept actions; breadcrumbs and loading markup live in `workspace-records`. Keep forms narrow and workspace views wide. See `DESIGN.md` and [frontend validation](docs/guides/frontend-foundation.md).

## Production visual foundation (M1.2.2)

- The approved production presentation is graphite/steel Liquid Glass; DESIGN.md
  and src/components/design-system/theme own tokens/material/control rules. Read
  docs/design-system/README.md before introducing a component. Reuse Base UI/Liqui,
  server record adapters and native form recipes; do not add a second framework.
- Keep server routes and all existing auth/service/DB boundaries. Material chrome
  is a small client island; actual records remain Server Components. No fixture,
  design-lab route/helper, conceptual board or demo action belongs in production.
- Preserve native form locking, validation/focus, duplicate-key correction,
  revision denial and uncertain-create reconciliation. Use read-only status until
  M1.3; do not expose arbitrary transitions through a new visual control.
- For substantial visual changes, use Impeccable and preserve the established
  Operate direction. Review rendered desktop/mobile, keyboard and error states.
  Evidence and limits live in docs/guides/visual-redesign.md.
- Publication (push/PR), merge, deployment and cloud changes require authorization
  in the current task; local implementation does not imply it. Preserve the
  shared Supabase project and independent MCP service configuration.
- Browser smoke tests use only local PostgreSQL and fixture authentication; see
  docs/guides/browser-smoke.md. Keep test issuers and data out of application routes.
