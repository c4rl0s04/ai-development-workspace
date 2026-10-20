# M1.2.1 — frontend foundation and validation

Historical M1.2.1 record. See [M1.2.2](visual-redesign.md) for later fixture-browser
evidence; live provider/device validation remains separate.

Based on main `d5b357c` and the independent frontend audit. No new dependencies,
provider settings, schema changes or workflow transitions are introduced.

## Implementation

- `requireOwner()` still authorizes every service call. React `cache` shares only
  the verified identity during one Server Component render. Proxy remains an
  independent pre-render check. Mutation checks stay fresh and writable; there is
  no process-wide, persistent or cross-request principal cache.
- Project/repository reads use one left join, retaining ownership predicates,
  restricted runtime role checks and transaction-local RLS context. Project edit
  and new-task pages use `getProjectSummary`, which does not query tasks. Project
  detail still loads a bounded, paginated task list. No parallel queries are
  issued outside the guarded transaction.
- Compact headers accept actions. Shared breadcrumbs connect records and forms;
  tasks precede collapsible project metadata. Workspace views have room for a
  future board; forms remain narrow. Overview/Approvals make no new feature claims.
- Loading boundaries show a static, accessible placeholder. Global links show
  pending navigation without shifting layout. Form fields/cancellation lock while
  saving/navigating. Errors receive focus and preserve input. Duplicate-key
  recovery, stale-revision locks and uncertain-create reconciliation remain.
- `router.push()` plus `router.refresh()` is intentionally retained inside a
  transition. A Route Handler invalidation does not immediately clear the client
  Router Cache; removing refresh requires a browser regression proving fresh
  previously visited/prefetched destination records. No exactly-once create claim.

## Controlled before/after measurements

2026-10-18, same Mac, Node 24.21.0/npm 11.19.0, optimized Next.js builds.
Baseline source is M1.2 (source-equivalent to main `d5b357c`); comparison uses this
branch. No production records were created or edited.

Auth harness: loopback HTTP, ES256 fixture session, local mock Auth with 100ms
per-response delay; three requests per route (first discarded for warm medians).
No throttled browser/device emulation and no configured database. Projects shows
its safe storage-unavailable state. These are HTTP measurements, not real OAuth
or browser navigation/Web Vitals. Warm TTFB medians from two samples per run are too few
and too close to establish a meaningful latency improvement.

| Operation | Before | After |
| --- | ---: | ---: |
| Projects Auth requests, warm | 3 | 2 |
| New project Auth requests, warm | 3 | 2 |
| Overview/Approvals Auth requests, warm | 2 | 2 |
| Projects TTFB, warm median | 225.5ms | 217ms; repeat 246ms |
| New project TTFB, warm median | 217.5ms | 216ms; repeat 218.5ms |

A repeat after the final UI changes retained the reduced request count, with
variable local timings (including background checks). There is no demonstrated
TTFB improvement; the confirmed result is less redundant work.

PostgreSQL: one isolated disposable local PostgreSQL 17 database, synthetic
project/task, same runtime connection, warm-up both adapters, five interleaved
samples per version/operation. Counts include BEGIN, role check, owner context
and COMMIT. No remote credentials or data are used. Local timing gains cannot be
extrapolated to Vercel/Supabase latency.

| Read | Statements before → after | Median duration before → after |
| --- | --- | --- |
| Project + task list | 7 → 6 | 3.68ms → 3.36ms |
| Task detail | 7 → 6 | 3.59ms → 3.32ms |
| Edit-project/new-task context | 7 → 5 | 3.96ms → 3.01ms |

Build artifact comparison (sum of first-load chunks, gzip level 6; estimates,
not browser transfer measurements): Projects 142,813 → 142,955 bytes; New project
145,038 → 145,313 bytes. Small increases provide pending/focus/save behavior;
no component library, global state framework or additional hydration boundary.

The audit observed Vercel `iad1` versus Supabase `eu-west-1`, with approximately
41ms per warm simple SQL round trip from the audit machine. This supports reducing
sequential statements, but does not measure Vercel-to-Supabase RTT. Regions,
pooler, TLS and connection limits remain unchanged. Production traces are needed
before proposing infrastructure changes.

## Verification and remaining review

- Clean install, format check, lint, typecheck and production build passed.
- `npm test`: 20/20, including DOM regression for save locking, duplicate submits,
  error focus, duplicate-key recovery and ambiguous acknowledgements.
- `npm run test:http`: 2/2. Built-server regression counts HS256 fixture identity
  requests (6 → 4 on Projects/New project) and retains anonymous/RSC/API,
  wrong-owner, expiry/refresh, callback, mutation Origin and fail-closed coverage.
- `npm run test:db`: 11/11, including focused-read statement counts, real RLS,
  cross-project isolation, atomic numbering, revision conflicts, rollback and
  HTTP persistence across process restarts. Run after the build, not concurrently
  with it. Tests create/drop only their isolated local database.
- Browser control was unavailable during this milestone: `Sky Computer Use native pipe startup failed`.
  Visual desktop/mobile, real keyboard/screen reader behavior, authenticated
  browser navigation, LCP/INP/CLS and live OAuth remain unverified here. See the M1.2.2 guide for later browser evidence; DOM/HTTP fixtures are not live authentication evidence.

M1.3 owns board/card interactions, seven-state transition rules, On Hold
projection, dependencies and history. Do not add unrestricted status controls,
optimistic task creation, drag-and-drop or speculative board abstractions here.
The existing page-level storage-unavailable HTTP 200 limitation remains deferred.
