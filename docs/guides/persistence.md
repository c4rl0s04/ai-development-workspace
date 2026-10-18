# M1.2 persistence

M1.1 is merged at `53b7d7b`; the owner reports real Production GitHub authentication working. M1.2 is local-only. No hosted migration, data write, deployment, environment change or Git push is part of this milestone's implementation. Specification v0.2 remains unchanged.

## Schema and decisions

All application tables live in the private `workspace` schema, separate from Supabase `auth` and the exposed `public` schema. Do not expose it through the Supabase Data API.

| Table | Purpose / integrity |
| --- | --- |
| `users` | UUID audit identity plus unique stable GitHub provider ID; created on the first authorized project creation. No email, credentials, Supabase account coupling or memberships. |
| `projects` | UUID, owner FK, name, immutable short key, description, revision, next task number, timestamptz creation/update times. Unique `(owner_id, key)`. |
| `project_repositories` | UUID, project FK, normalized URL, creation and retirement times. Partial unique index permits at most one non-retired link per project. Replacing/clearing a URL retires the old association in the project edit transaction. |
| `tasks` | UUID, project FK, project-local positive number, title, description, seven-state enum, revision, timestamptz creation/update times. Unique `(project_id, number)`. Ownership is inherited relationally through the project, avoiding conflicting duplicated owner columns. |

Project keys are normalized uppercase, 2–10 letters/digits beginning with a letter, and immutable. The displayed task key is the project's key plus its immutable number (ELS-1); no redundant mutable string is stored. Repository URLs accept only credential-free `https://github.com/owner/repository`, normalize case, remove trailing slash/`.git`, reject query/fragment/subpaths, and are not fetched. Existence, stable GitHub repository ID and access permissions are deferred to GitHub integration.

Task creation atomically increments the project's counter with `UPDATE ... RETURNING` inside the same transaction as insertion. The row lock serializes concurrent creates; a failed insertion rolls back allocation. Task creation does not change the project's editable revision. Project edits (including repository changes) and task detail edits compare the expected revision in SQL and increment it; stale input returns 409 without a partial update. Project/task lists use 20-row pages. Offset pagination can shift when records are concurrently added; it does not affect identifiers or revisions.

New tasks enter Backlog; a database trigger rejects any other initial status. The enum includes all seven specification states, with On Hold deliberately absent. The runtime role cannot update status, project keys, task numbers, ownership or project relationships. M1.3 must add explicit guarded transitions and audit together; no generic state-change endpoint exists.

No permanent deletion is implemented. FK deletions are restricted and the runtime role has no DELETE privilege. A reviewed retention/export/archive/purge policy, backup/restore and audit requirements are prerequisites to destructive APIs. Retiring repository associations preserves their history. M1.2 has no general audit timeline yet: M1.3 owns workflow audit and M1.4 owns immutable specifications/decisions and required outbox intent. No execution infrastructure is introduced.

## Services and security

`src/domain/workspace.ts` defines records, Zod schemas and predictable errors. `src/application/workspace.ts` owns feature-specific use cases and a small persistence port. Every read explicitly calls the server-owned `requireOwner()` dependency; every mutation calls `requireOwnerMutation(request)` before private access. `src/server/workspace.ts` supplies M1.1's real authorization and lazy server-only database composition. Request-supplied IDs are UUID-validated; client-supplied owner/status/key overrides are rejected. Cross-project task queries include both IDs and verify project ownership.

`src/infrastructure/db` uses parameterized Drizzle queries and request-independent connection pooling. All operations run in transactions with `set_config('workspace.owner_github_id', verified_id, true)`. Context is transaction-local so it cannot leak through connection reuse. RLS policies traverse owner → projects → tasks/repositories; both USING and WITH CHECK apply. The adapter refuses runtime connections unless `current_user` is the non-superuser/non-BYPASSRLS `workspace_app` role. Do not use `postgres`, table-owner, service-role or migration credentials at runtime.

RLS is defense in depth for the tested dedicated role, **not** a claim that elevated Supabase/migrator roles are protected. The server role can set the owner context: a stolen database credential or compromised server is outside this identity boundary. Keep it inaccessible to browsers and agents, restrict network access, inspect effective role memberships/privileges and protect the credential in Vercel. NOINHERIT and column grants reduce accidental privilege expansion. The migration role remains separate. No table/user password is stored in application data.

The private schema has no PUBLIC access. Do not grant schema usage to `anon` or `authenticated`. On Supabase, inspect default grants and ensure no unintended role inherits `workspace_app`. Migrations neither touch Auth nor modify existing hooks, OAuth clients or callbacks.

Remote connections require verified TLS; URL query options cannot override SSL settings. `prepare:false` supports transaction poolers. Small pools, connection/statement/lock timeouts bound failures. Errors never return SQL, URLs or driver details. Unknown save outcomes instruct the user to reload before retrying; there is no automatic mutation retry or false success acknowledgement. A lost acknowledgement may still mean a transaction committed: create-request idempotency remains an explicit future improvement.

Proxy/layout protection remains defense in depth. JSON routes call the same authorized services. Private responses use no-store. The browser sends POST/JSON with exact-Origin validation, displays escaped text, retains unsaved input on errors and disables saving after a revision conflict. Future sensitive loaders must independently authorize before querying/serializing data.

## Local PostgreSQL only

Use Node 24.21.0 and npm 11.19.0. Docker must be running. These credentials are deliberately disposable local fixtures, never hosted credentials. Port 55432 binds loopback only; the named volume preserves data across container/app restarts.

```sh
npm ci --ignore-scripts
npm run db:up
DATABASE_MIGRATION_URL=postgresql://workspace_migrator:local-only-not-a-secret@127.0.0.1:55432/workspace_local npm run db:migrate
DATABASE_MIGRATION_URL=postgresql://workspace_migrator:local-only-not-a-secret@127.0.0.1:55432/workspace_local npm run db:local-role
```

Add only a local runtime `DATABASE_URL` to ignored `.env.local` alongside the existing four Auth variables:

```dotenv
DATABASE_URL=postgresql://workspace_app:local-only-not-a-secret@127.0.0.1:55432/workspace_local
```

`npm run dev` loads `.env.local`. Standalone migration/test scripts read exported process variables, not `.env.local`; the examples above set them explicitly. `db:migrate` and `db:local-role` deliberately reject non-loopback databases. Neither builds nor app startup run migrations. `npm run db:stop` stops the container without deleting its volume. Do not use `down -v` to clear persisted work without approval.

## Migrations and tests

- `drizzle/0000_m12_foundation.sql`: relational schema, enum, FKs, checks, unique constraints and indexes, generated with pinned Drizzle Kit.
- `drizzle/0001_m12_access.sql`: reviewed custom role, grants, RLS policies and Backlog insertion guard. No password or hosted credentials. RLS enablement in the schema/snapshot describes the final result of both migrations; policies/grants/triggers remain reviewed SQL, not inferred by Kit.
- `drizzle/meta`: migration journal and snapshot. `npm run db:generate` creates future diffs; inspect every diff and keep custom access SQL consistent. Never use push/introspection against the hosted project in this workflow. Never edit migrations after hosted application.

```sh
npm run format:check
npm run lint
npm run typecheck
npm test
npm run build
npm run test:http
TEST_DATABASE_URL=postgresql://workspace_migrator:local-only-not-a-secret@127.0.0.1:55432/workspace_local npm run test:db
```

The PostgreSQL suite requires a **local** administrative fixture connection that can create disposable databases/roles. It creates a randomly named database, applies migrations twice, runs through the actual non-owner runtime role and removes only its test database in cleanup. It never truncates the development database. CI provisions the same PostgreSQL version as a service and runs the same commands, including `.test.ts` suites. Auth HTTP tests remain credential-free with ephemeral local mock Auth; database HTTP tests restart production Next.js processes and verify real stored records survive.

Drizzle Kit's old transitive esbuild has a development-server advisory. An exact nested override to esbuild 0.25.12 removes the audit finding; migration generation is verified with that override. Runtime packages are pinned independently.

## Hosted rollout plan — approval required, not executed

1. Review/resolve Issue #7 before putting real private data remotely: second real GitHub account denial (including RSC/API payloads), expiry/refresh and residual access after revocation, HTTPS host-only cookie flags, multi-tab behavior, no accidental caching and cross-project denial. Local fixtures are not live evidence. Confirm Production M1.1 behavior and MCP connection before/after any hosted work.
2. Obtain separate approval for additive migrations to **existing project `tbifhoubudkmxeisvzhh` only**. Inspect PostgreSQL version, roles/default grants, existing schemas, connection mode/TLS CA, backups and restore procedure. Confirm `workspace` and `workspace_app` do not conflict with existing objects. Do not create another project, modify `auth`, expose the new schema through Data API or change OAuth/hooks/redirects.
3. Review both checked SQL files and the journal, run them first against disposable PostgreSQL with the same version. A separately approved release command should use Drizzle's PostgreSQL migrator with this exact folder and a migration credential retrieved privately. The checked-in local command intentionally cannot target Supabase; do not bypass its guard silently. Keep schema/grants and Drizzle migration history in sync; do not apply files through an untracked SQL console and then claim the migration journal is current.
4. In the approved migration session, create/use the dedicated non-owner `workspace_app` login with a generated credential stored only in the server secret manager. Verify NOSUPERUSER/NOCREATEROLE/NOBYPASSRLS/NOINHERIT, object ownership, effective privileges and all RLS policies. Use separate least-privilege runtime credentials, never the migration credential or Supabase service-role key. Run an RLS/unset-context/cross-project SQL smoke test through the real runtime role. No automatic production migrations.
5. Review the M1.2 branch's actual Vercel Preview alias and exact callback; configure only that branch's Preview Auth variables and DATABASE_URL. Preserve Site URL, existing redirects, MCP project and Production environment. Keep protection enabled. Do not guess aliases. Any callback addition needs authorization. Remember feature pushes may automatically deploy.
6. After authorized push/deployment, validate only synthetic records first: owner CRUD, unique keys, parallel task allocation, stale form conflicts, repository replacement, process/cold-start persistence, wrong-owner and cross-project denial, raw HTML/RSC/API payloads, Origin protection and outage errors. Inspect sanitized logs. Recheck MCP connection and unchanged Production alias/deployment.
7. Stop for PR/human approval. Production DATABASE_URL, grants/backup/restore acceptance and permission to merge/deploy require a separate review. Roll back application code without dropping new tables/history; destructive database rollback requires its own approved recovery plan.

No significant architectural deviation from specification v0.2 is required. Physical decisions above are scoped M1.2 choices; M1.3 adds guarded transitions, dependencies, holds and audit; M1.4 adds immutable specifications, decisions, approvals and transactional outbox primitives.

## Local validation record

On 2026-10-17 with Node 24.21.0/npm 11.19.0: clean install, formatter/lint/typecheck, production build, 13 unit/render tests, 2 Auth HTTP scenarios, and 10 PostgreSQL TAP passes (9 scenarios plus parent). The migration generator reports no schema drift and npm audit reports zero vulnerabilities. The two-axis code review found no material blockers. A real owner browser session created a synthetic local project and repository association, created LOCAL-1 in Backlog, edited it to revision 2 and reloaded the saved record. Application restart persistence is independently covered by the PostgreSQL/HTTP suite. No second-account live login, wall-clock expiry/revocation or hosted persistence is claimed. No push or hosted CI run occurred.

## Final review corrections

Uniqueness violations use the typed `unique_conflict` outcome (HTTP 409), distinct from stale-revision `conflict`. A corrected project key can be resubmitted without discarding the form; stale edits remain locked pending reload.

After a network failure, unreadable/invalid success acknowledgement or server 5xx on a create, the form retains input and blocks further creation. The owner must inspect the saved project/task list in a separate tab and explicitly confirm the record was not created before enabling another attempt. Check the project key or task title/description, including later list pages. If the outcome remains uncertain or storage is still unavailable, wait and reconcile rather than retry. This is an explicit manual safety gate, not persisted idempotency or exactly-once creation; a request may still be completing when checked.

**Deferred P3: unavailable page HTTP status.** JSON endpoints return 503 for unavailable storage. App Router pages render a safe unavailable state, potentially with HTTP 200: `projects/loading.tsx` starts streaming before the database result, fixing response headers. The installed Next.js loading documentation confirms this behavior. No supported arbitrary 503 setter exists for these Server Components. Moving private database reads into Proxy or replacing page rendering with route handlers solely to control status would duplicate authorization/data loading or disrupt streaming. Keep the current fail-closed UI and API 503 semantics; revisit with a deliberate rendering/availability design. No private data or success acknowledgement is returned by the unavailable state.

Final-correction validation on 2026-10-17, Node 24.21.0/npm 11.19.0: `npm ci --ignore-scripts`, `format:check`, `lint`, `typecheck`, `build` passed; `npm test` passed 19 TAP tests (including five interactive DOM regression scenarios and their parent); `test:http` passed 2 scenarios; `test:db` passed 10 TAP tests (nine PostgreSQL/HTTP scenarios and parent). Install audit reported zero vulnerabilities. M1.1 auth source, SQL migrations/schema, connection configuration, RLS and permissions are unchanged by these corrections. Existing atomic numbering, stale-revision denial and cross-project checks passed again. Hosted security prerequisites remain unchanged.

Hosted Session pooler connections may require `DATABASE_CA_CERT`, containing the official PEM root certificate downloaded from Supabase Database Settings. It is server-only trust configuration; TLS certificate and hostname verification remain enabled. M1.2 Preview uses Session mode on port 5432 to avoid the documented Postgres.js transaction-pooler pipelining risk.
