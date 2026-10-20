# Independent architecture audit — Reviewer B

Reviewed `feature/m1-visual-redesign` at `166bf15`, with visual-change baseline
`8b7209c5e71fbbc5f4f82a7c37d735330a98b570`. This is a whole-application source
audit, with new versus inherited concerns distinguished below. No other reviewer's
report was read. No application source, cloud configuration or Git history was
changed. Tests/builds belong to the parent review's validation record, not this
audit.

## Judgment

The existing modular monolith is appropriate for the implemented M1.1/M1.2 scope.
The visual migration preserves the important boundaries. No architectural blocker
was found for a **local visual PR**. This is not approval of hosted private-data
rollout: the documented Issue #7 live authentication checks and hosted database
role/migration verification remain prerequisites.

Two inherited debt items merit deliberate treatment at their next relevant
milestone; neither requires a framework or broad refactor now. No new security
boundary violation was found in the visual diff.

## Actual dependency map and responsibilities

```text
app pages / JSON routes ──> server/workspace composition
                                  │
                                  v
                           application/workspace
                             │             │
                         domain       WorkspaceStore port
                                           ^
                                           │ implements
                                  infrastructure/db adapter
                                           │
                                  Drizzle / PostgreSQL

server/auth ──> application/auth owner policy
     │
     └───────> infrastructure/auth Supabase + cookies

app pages ──> shared server presentation ──> domain display records
workspace shell ──> small client material islands + client navigation
record form ──> JSON routes (no direct provider/database access)
```

- `domain/workspace.ts` contains provider-independent records, validation and
  errors. Its only runtime library is Zod. It imports neither Next nor React.
- `application/workspace.ts` owns per-use-case authorization and validation and
  defines the small persistence port. Infrastructure implements that port;
  application code does not import the adapter.
- `infrastructure/db` owns schema, SQL transactions, persistence mapping and
  connection policy. `server/workspace.ts` performs lazy composition after
  authorization; a pooled connection is shared, identity is not.
- `server/auth.ts` owns server-bound identity acquisition and composition.
  Verified-owner policy remains independently testable in application code.
- `app` loads authorized records and handles transport; `components` presents
  them. `server/page-error.tsx` is a presentation error adapter despite its
  directory name; its dependency on a component is not a domain-layer inversion.
- The material wrapper receives Server Component children. That does not convert
  the underlying records into client fetching or hand the database to the client.
  Badge/Skeleton remain hook-free; forms keep native semantics.

## Findings and bounded debt

### B1 — P3: cookie/HTTP mutation contract is embedded in the application service

**Evidence:** `src/application/workspace.ts:39` (auth port), `:71`, `:78`, `:94`
and `:102` (mutations); `src/application/auth/owner.ts:36` (POST/Origin policy).
**Inherited**, non-blocking for this PR; remediation **M**. Tracked as **P3** in
[Issue #10](https://github.com/c4rl0s04/ai-development-workspace/issues/10), an explicit
prerequisite before enabling any MCP writes. No authorization refactor is included here.

Every application mutation currently requires a browser `Request` and uses
`requireOwnerMutation`, whose real implementation acquires cookies and requires
the exact web Origin. This is correct for all current callers, but it cannot be
reused unchanged for scoped bearer-authenticated MCP submissions. Treating that
helper as universal authorization would either reject legitimate MCP traffic or
tempt a dangerous weakening of web CSRF checks. Browser owner authority is also
broader than a task-scoped planning capability.

At the first MCP use case, keep cookie/Origin checks in the web authorization
adapter and introduce only the service-owned authorization contract needed for
that operation. The MCP adapter must verify token audience, scope, task and
revocation before invoking it; it must never accept a request-supplied principal
as authority. Keep shared state changes and guards in application services and
their transaction boundary. Do not prebuild a general principal/permission
framework, fake an Origin, reuse browser session reads for agents, or expose the
database port to MCP. Add focused web-CSRF and MCP-scope denial tests together.

### B2 — P3: safe error normalization also discards actionable diagnostics

**Evidence:** `src/infrastructure/db/workspace-store.ts:52` and `:68`;
`src/server/workspace-http.ts:73`; `src/server/page-error.tsx:8`.
**Inherited**, non-blocking for this visual PR; remediation **S**, tracked as **P3**
in [Issue #11](https://github.com/c4rl0s04/ai-development-workspace/issues/11).
Schedule separately as operational hardening; no diagnostics changes are included here.

Database errors become a safe `unavailable` response without preserving a
sanitized diagnostic or cause, and unknown route/page errors are also absorbed.
An unsafe runtime role, TLS failure, SQL regression and database outage can
therefore look alike to the operator. This is good response redaction but weak
failure diagnosis. The technical specification's section 10 calls for correlated
failure visibility.

Add one server-side diagnostic boundary with a correlation ID, operation name
and allowlisted error category/SQLSTATE. Preserve safe generic browser messages.
Do not dump driver errors, SQL text, connection URLs, request bodies, cookies or
provider responses; no observability vendor is needed. Check that an unexpected
adapter failure produces a diagnostic while secrets remain absent. Workflow
audit/outbox events remain separate business records and must not be replaced by
logs.

## Security and consistency assessment

The inspected paths have complementary controls rather than relying on layout
protection:

- Every existing service operation explicitly authenticates; mutation services
  use the Origin guard. Proxy and protected layout add early denial, not the only
  check. The public login/logout routes use explicit Origin checks; callback
  identity is reverified after code exchange.
- Supabase identity combines claims checks with `getUser` and stable GitHub
  identity IDs. OAuth-client tokens are rejected by the browser identity reader.
  React `cache` is render-scoped; writable mutation checks remain independent.
- Strict Zod objects reject status/owner/project relationship overrides. IDs and
  pagination are bounded. JSON bodies are streamed with a 32 KB limit. Repository
  links normalize a constrained GitHub URL and are never fetched.
- SQL is parameterized. The runtime adapter checks the dedicated non-superuser,
  non-BYPASSRLS role and sets owner context transaction-locally. RLS is forced and
  traverses project ownership; unset context yields no owner. It protects against
  accidental query scoping omissions, not a compromised server credential able
  to select a different context. The guide states this limit accurately.
- Runtime update grants exclude ownership, project key, task number and status;
  no DELETE grant exists. The insert trigger constrains new tasks to Backlog.
  Remote TLS verification and local migration guards remain intact.
- Project edits compare revision and replace/retire repository associations in
  the same transaction. Task edits compare both route IDs and revision. Number
  allocation locks the project row and inserts the task in the same transaction;
  rollback cannot consume a task number. Counter updates intentionally do not
  invalidate project metadata edits.
- Creates are not durably idempotent. The existing uncertain-create UI is an
  honest manual reconciliation gate, not exactly-once execution. Keep that
  documented limit; persist deduplication before adding automatic retries or
  retryable MCP submissions.

These are source conclusions, not new proof of live provider behavior. The
PostgreSQL and HTTP suites contain relevant denial, rollback, context reuse,
parallel allocation and stale-edit scenarios; the parent must report actual
execution results separately.

## Next milestones: preserve the foundation, add only required behavior

**M1.3:** add transition commands, directional dependency/cycle rules and separate
hold records/guards. A projected On Hold lane must retain the underlying seven-state
status. Couple guarded state updates, expected revision and append-only audit in
one database transaction. Existing field-edit methods must not bypass guards
introduced for specifications or active execution. Grant the minimum new SQL
permissions needed; do not open a generic status setter.

**M1.4:** add immutable specification revisions, exact-version human decisions
and transactional outbox where publication is required. A task's editable
`revision` is concurrency control; it is not an approved specification digest or
implementation review target. Preserve these distinct identities and invalidate
eligibility on supersession. Approval and execution authorization stay separate.

**M2:** reuse application rules behind a separate verified, task-scoped MCP
adapter. Validate Supabase OAuth interoperability and token audiences with actual
clients. Prove exact-retry receipts transactionally before claiming idempotent
submissions. No provider/admin/database credentials belong in agent context.

**M3/M4:** the separate runner, leases/fencing, attempt-scoped grants, artifact
verification and GitHub integration are later work. A Next request or worktree is
not an execution sandbox. No orchestration package, generic agent framework,
repository interface hierarchy or distributed service split is justified now.

## Quality controls and durable instruction recommendations

Current controls are proportionate: pinned toolchain/dependencies, committed
lockfile, dependency scripts disabled, Biome, TypeScript, focused unit/render/DOM
checks, built HTTP checks and real PostgreSQL integration tests. CI mirrors these
checks with isolated PostgreSQL. Browser/performance/live-provider limitations are
explicitly separated in the guides. A passing mechanical/style check is not an
authorization review or accessibility certification.

The existing AGENTS rules already capture most important boundaries. Avoid adding
another architectural manual. Two small additions would be durable:

1. “Keep cookie/Origin validation in web authorization adapters; MCP authorization
   verifies audience and task capability. Both invoke the same transactional
   application rules; never relax browser CSRF for agent clients.” Add with M2.
2. “Normalize public errors, but emit sanitized correlated server diagnostics;
   never log raw provider/driver errors or request secrets.” Add when B2 is fixed.

Instruction hygiene: root AGENTS still includes M1.2-only worktree instructions
and an old auth-branch push restriction alongside the newer visual-worktree
section. The newer section resolves this task's scope, so this is not a current
blocker. At the next documentation cleanup, move historical branch/setup gates
into their milestone guides and keep the current no-cloud/no-push authority
explicit. The technical specification also retains its original documentation-only
status language; treat that as historical draft context, using AGENTS and current
guides for implementation evidence rather than silently claiming all M1 is done.

Installed skills should be selected by changed boundary: `api-and-interface-design`
for the first MCP contract, `security-and-hardening` for new auth/capabilities,
`diagnosing-bugs` for unclear failures, `tdd` when meaningful test-first work is
requested, and Impeccable for substantial interface work. Existing Ponytail
guidance keeps the solution bounded. Significant change reviews benefit from
the installed independent standards/spec review workflow; this architecture audit
is a separate lens, not a substitute for that or for actual validation. Do not
copy skill manuals into AGENTS or mandate every skill on every task.

## PR readiness and limits

Architecturally ready for local review. The parent independently reports Node
24.21.0/npm 11.19.0: formatting, lint, typecheck and production build passed;
21 unit/render tests, 2 HTTP scenarios and 11 PostgreSQL TAP passes succeeded.
The parent also confirmed the domain/service/auth/proxy/API/migration diff is empty
against the baseline. Fresh read-only Chrome and WebKit checks at 390px covered
Overview → Projects navigation with no page errors or horizontal document overflow.
Those are parent-supplied results, not commands run by this reviewer; auth remains
fixture-backed, with no new live GitHub/Supabase identity evidence.

No source-level blocker or
new security regression was identified. B1/B2 are inherited P3 debt. The documented
UI transfer increase, physical accessibility/glass performance checks and Issue #7
live authentication evidence remain release considerations, not hidden successes.

Skipped: builds/tests, hosted checks, browser/device certification and deployment;
no production readiness is claimed. Only this review document was written.

## Automated boundary checks: recommendation

There is no dedicated dependency-boundary or cycle checker in CI. Current source inspection shows the intended dependency direction; this is not a claim of exhaustive resolver-based cycle detection. A small assertion using the already-installed TypeScript resolver would be worthwhile when MCP introduces another transport: forbid domain/application imports from infrastructure/server/app/components and fail on internal cycles. Do not add a dependency-injection or architecture framework now. Existing TypeScript checks do not themselves enforce these boundaries.

The parent subsequently repeated browser checks on a fresh post-build local harness: both Chromium and WebKit had zero HTTP errors as well as zero page errors and no document overflow. Hosted configuration and Issue #7 status were not queried; historical documentation prerequisites must not be interpreted as proof that already-completed rollout work is still missing.

## Final PR preparation (2026-10-20)

A1 from the separate frontend review is fixed without changing architecture. Final local checks passed: format, lint, TypeScript, 22 unit/render tests, build, 2 HTTP tests and 11 PostgreSQL TAP passes. Six actual compiled-CSS loading-component browser cases passed in Chromium/WebKit at 1440/390/320px. The full diff still leaves domain/application/auth/database/server/API/migrations unchanged. B1 and B2 remain separate actionable issues (#10/#11), with risk and acceptance criteria; MCP writes must not be enabled before #10 is satisfied. No live provider or hosted configuration verification is claimed by this final correction.
