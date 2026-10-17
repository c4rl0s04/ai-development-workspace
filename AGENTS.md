# AI Development Workspace — project instructions

## Current foundation

- M0 is a root-level Next.js 16 / React / TypeScript / Tailwind application. `src/app` contains routes/layout/styles; `src/components` contains reusable presentation. Overview, Projects and Approvals are honest placeholders; no auth, persistence, MCP or runner is implemented.
- [Technical specification v0.2](docs/architecture/technical-spec-v0.2.md) is the architectural source of truth. It is a draft awaiting human review; distinguish its required invariants from provisional provider choices. Read the sections relevant to a change before implementation and surface architectural conflicts before proceeding.
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
- `npm run format` applies Biome formatting; `npm run lint` checks recommended accessibility/React/TypeScript rules. CI runs the same checks, including built-server HTTP checks. Unit tests live in `tests/pages.test.tsx`; HTTP tests start an ephemeral local production server and require the build.
- Keep `src/app` and `src/components` as UI adapters. When M1 needs them, add feature-owned domain logic under `src/domain`, authorization/use cases under `src/application`, and server-only provider/database adapters under `src/infrastructure`. Do not create empty modules or put workflow rules in components. Domain code must not depend on React, Next.js or provider SDKs; UI must call application services for future mutations.
- No environment variables are needed for M0. Never copy OAuth-spike configuration into this app. The independent `spike/remote-mcp-auth` branch and its Vercel project remain separate; do not import spike modules, provision resources, change its Root Directory, or push/deploy without explicit authorization.
- Completion requires focused tests and a production build, honest placeholder copy, accessible responsive navigation, no secrets or generated artifacts, and preservation of the workflow/authority rules above.
