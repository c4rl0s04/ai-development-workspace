# M1.2.2 production frontend migration

## Scope and architecture

Feature `feature/m1-visual-redesign` starts from fetched origin/main8b7209c
(M1.2.1). This selectively migrates the approved graphite Liquid Glass system,
not the experimental branch. The original spike worktree and its uncommitted
artifacts are retained. No migration/API/domain/application/server/auth/proxy/DB
adapter source change is part of this feature.

Real routes retain the authorized loaders and persistence services. Shell,
headings, breadcrumbs, panels, status/repository adapters and loaders are shared.
Project/task create/edit still use native RecordForm fields and its original
submission/reconciliation/concurrency code. Project detail retains pagination,
repository disclosure and read-only task state. Task details remain durable pages,
not a demo inspector. Overview and Approvals explicitly state milestone limits.
Login and not-found receive matching presentation without changing authentication.

`WorkspaceShell` remains server-rendered; material provider/frosted chrome and
existing navigation/form behavior are small client islands. The glass preference
subscription is owned once and read through Liqui's context. No unnecessary
client fetch, global state library, remote font or animation package was added.
Use DESIGN.md and docs/design-system/README.md for reuse/attribution.

## Component selection

Reused: semantic graphite tokens and primitive recipes, material preferences,
Liqui/Button with Base UI and license notice, CVA Badge, static Skeleton and utils.
Adapted: server-native record/link/status presentation, existing shell/navigation,
form appearance, responsive structure and public login/errors. The primitive
subset is universal, so status rows and loading markup do not need hydration.

Excluded: all design-lab routes/fixtures/helpers, conceptual Kanban, workflow card
projection, synthetic activity, demo create/search/material controls, showcase,
unused dialog/popover/select families and the experimental background scene.
Additional components should be acquired only for a real approved use case.

## Validation setup and evidence

Node24.21.0/npm11.19.0. Clean baseline `npm ci --ignore-scripts`, matching pinned
UI dependencies and lockfile. Tests/build use no hosted credentials. A temporary,
isolated PostgreSQL17 cluster was created outside Git for integration/browser
checks; it is distinct from existing Docker volumes and hosted Supabase.

Browser sessions use an ephemeral local fixture issuer and the actual server
owner boundary, HTTP routes, workspace_app role, RLS and persisted synthetic rows.
This is not a real GitHub/Supabase login test and must never be described as one.
No provider secrets/cookies/local environment files belong in Git or this report.

External evidence directory:
`~/Documents/Projects/ai-development-workspace-reviews/m1-visual-redesign/`.
`before/` captures actual baseline routes. `after-pass1/` preserves the first
migrated pass; `after/` contains final evidence and browser assertions. Pages cover
Overview, Projects, project detail/edit/create, task detail/edit/create, Approvals
and login at1440/390; deeper checks add320 and native WebKit. All records are
synthetic but genuinely persisted locally, not production demo data.

Independent Impeccable AssessmentA inspected screenshots/source without detector
output and scored29/40 (qualitative first-pass judgment, not a release certificate).
It found Approvals'4px panel inset and overly spacious project rows. The bounded
correction uses28px empty-panel padding (16px mobile) and desktop grid rows with
repository context alongside content. Mobile rows stack. AssessmentB returned
zero source-detector findings; rendered browser detection reported an intentional
quiet atmospheric radial treatment and two advisory single-word wraps in narrow
help copy. These are not contrast violations or grounds for automatic redesign.
No broad detector ignores were added. Final screenshots confirm the corrections.

## Checks

- `npm run format:check`, `npm run lint`, `npm run typecheck`: pass.
- `npm test`:21passed, including the original auth/service and form recovery
  regressions plus server record presentation tests.
- `npm run build`:pass. No design-lab routes appear in the route output.
- `npm run test:http`:2passed. Covers auth SSR/cookies/session/Origin boundaries,
  unconfigured fail-closed behavior and production HTML/RSC404 for lab paths.
- `npm run test:db`:11passed on isolated PostgreSQL17: constraints, RLS/context,
  unique atomic numbering, focused-read query shape, concurrent optimistic edits,
  repository history, cross-project denial, rollback, failure behavior and real
  built-HTTP persistence across server restarts.

Chromium and cached Playwright WebKit browser checks exercise real project and
task create/edit/reload, repository association replacement, duplicate-key
correction, repository validation, error focus, save locks and stale revision
rejection.27route×width checks per engine at320/390/1440 found no horizontal
document overflow. Stable WebKit visible-link navigation returned no page errors
or failed requests. Rapid harness-driven page.goto sequences produced WebKit-only
aborted RSC prefetch diagnostics; they are retained separately rather than hidden
or generalized into a claim that every console observation was clean.

Keyboard focus/reduced-motion and existing loading/navigation feedback are checked;
no draggable task or fake async operation is introduced. Formal VoiceOver/NVDA,
physical Safari/iPhone, Firefox, actual200% browser zoom and low-end GPU testing
remain release checks. Headless screenshots do not prove those properties.

## Performance interpretation

Same local production-build procedure, native headless Chrome, fresh-context cold
Overview and cache-aware route navigation; no throttling. Baseline emitted JS
592,057bytes/11chunks; final migrated build642,598bytes/12chunks (+50,541,+8.54%).
Cold Overview JS transfer142,309→160,233bytes (+17,924,+12.60%). Form incremental
transfer2658→2543bytes in that run. Final confirmation retained the same total/cold bytes. These are observed transfer/build sizes, not a
claim of faster navigation, Core Web Vitals or hydration CPU. Final metrics JSON in the evidence directory records the confirmation. Only used client islands are introduced; no auth/request/query cache
or service boundaries were relaxed to offset the UI cost.

## Remaining review and release requirements

The local migration is a candidate for code/visual review after final confirmation,
not permission to push, merge or deploy. Review the measured UI byte increase,
actual owner GitHub login/logout on an approved environment, physical accessibility
and glass fallback/performance on target devices before production release.
Production environment variables, Supabase settings, roles/migrations and the
independent MCP service are unchanged. Existing page-level unavailable responses
remain the separately documented limitation; no data-access behavior changed.

The experimental workflow board and all M1.3 transitions/holds/dependencies remain
out of this migration. Do not later merge the entire spike to acquire a component.
