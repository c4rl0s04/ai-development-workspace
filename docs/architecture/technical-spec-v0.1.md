# AI Development Workspace — Technical Specification v0.1

| Field | Value |
| --- | --- |
| Status | Draft for human review; documentation foundation only |
| Date | 2026-10-16 |
| Initial policy | Supervised automation |
| Architecture | Modular monolith with a separate agent runner |
| Related documents | [README](../../README.md), [project instructions](../../AGENTS.md) |

## 1. Purpose and decision status

AI Development Workspace is a project-management and AI agent coordination system. Users manage multiple software projects and their tasks through a modern Kanban interface, while retaining direct use of Codex through its normal CLI or desktop application. The platform connects task intent to versioned specifications, human decisions, execution evidence, independent review, and GitHub integration.

This document is the architectural source of truth for implementation after human review. **Required** rules describe product behavior, authority, ownership, and security invariants. **Proposed** choices describe the initial implementation direction; provider capabilities, costs, deployment limits, and integration APIs must be validated before adoption. Listing a technology here does not authorize installation, provisioning, or execution.

The present deliverable is documentation only. Application scaffolding, packages, credentials, cloud resources, and functionality are outside this execution. M0 is not accepted merely because these files exist: architecture review and authorization to begin implementation remain outstanding.

## 2. Product scope and first useful outcome

### Required capabilities

- Projects contain tasks and may link to multiple software repositories.
- A Kanban board shows the seven workflow states, relevant blockers, and pending human actions.
- A task has versioned specifications, explicit approval evidence, dependencies, execution history, artifacts, and an audit timeline.
- Planner, Developer, and Reviewer agents operate with different capabilities and bounded task context.
- Users can authorize work locally through their normal Codex interface or, later, launch supervised runs from the platform.
- Permitted progress reporting and submissions are automated after authorization. Automation does not approve specifications, grant execution authority, or accept implementation.

### First major end-to-end objective

**Create task in web → Ask Codex to plan → Submit specification through MCP → Automatically enter Pending review → Human approval → Ready.**

M1 supplies persistent tasks and human approval. M2 completes this objective through MCP and normal Codex usage. It does not depend on hosted execution, durable orchestration, or full GitHub synchronization.

### Initial exclusions

No autonomous merging, unattended implementation starts, GitHub Projects status synchronization, marketplace for agents, distributed microservice decomposition, or generalized workflow designer is required. Optional autonomy is reserved for M6 and must not weaken mandatory approval or security boundaries silently.

## 3. Architecture and ownership

### Proposed components

| Component | Responsibility | Boundary |
| --- | --- | --- |
| Next.js web application | Project/task UI, Kanban, specification comparison, human decisions, run visibility | Authenticated requests into application services |
| Application services | Authorization, state transitions, approvals, dependencies, run coordination, artifact metadata | Sole business-rule entry point; typed inputs and outputs |
| PostgreSQL, preferably Neon | Durable structured records, concurrency control, audit and outbox | Accessed by server-side services, never agents |
| Drizzle ORM and Zod | Schema/query integration and runtime boundary validation | Proposed libraries, validated when implementation begins |
| Custom MCP server | Agent-facing discovery, context, submissions, and reporting | Delegates to the same authorized services as web |
| Inngest | Durable dispatch, retries, timeouts, recovery coordination | Proposed orchestrator; database remains authoritative |
| Separate agent runner | Execute authorized runs with Codex SDK/CLI | Isolated execution; no public unrestricted shell endpoint |
| GitHub integration | GitHub App/API calls and verified webhook ingestion | Provider adapter with installation-scoped access |
| Private object storage | Large logs, diffs, reports, and other artifact contents | Scoped upload/download; no public default access |
| Vercel | Proposed web hosting | Runner placement separately validated |

TypeScript and Tailwind CSS are proposed for the web application. GitHub authentication identifies users; GitHub App installation permissions separately govern repository access. Signing in with GitHub does not imply access to every project or permission to install an app.

```mermaid
flowchart LR
    Human[Human user] --> Web[Web interface]
    Local[Local Codex CLI or desktop] --> MCP[Custom MCP server]
    Web --> Services[Authorized application services]
    MCP --> Services
    Services --> DB[(PostgreSQL and outbox)]
    DB --> Dispatch[Outbox dispatcher]
    Dispatch --> Orchestrator[Durable orchestration]
    Orchestrator --> Runner[Isolated agent runner]
    Runner --> MCP
    Services --> GH[GitHub adapter]
    GH <--> GitHub[GitHub]
    Services --> Storage[Private object storage]
```

The diagram shows logical dependencies, not a required count of deployments. Web, MCP, and background service entry points may share server-side modules. Long-running agents must not rely on a web request remaining open. A separate runner may use a worktree within an isolated process/container environment; a worktree alone only isolates files and branches.

### Required source-of-truth boundaries

| Authority | Owns | What the platform retains |
| --- | --- | --- |
| PostgreSQL | Projects, tasks, specifications, approvals, workflow states, execution metadata | Authoritative business records |
| GitHub | Repositories, branches, commits, pull requests, CI results | External IDs, observed snapshots, timestamps, and evidence references |
| Object storage | Large artifact contents | Database metadata, checksum, ownership, retention and storage key |

GitHub observations are reconciled facts, not independent workflow commands. A merged PR does not itself make a task Done. GitHub Projects must not become a duplicate authoritative task-status store. Orchestrator history and local Codex chat history likewise do not replace platform records.

## 4. Task workflow

### States and entry meaning

| State | Meaning and entry conditions |
| --- | --- |
| Backlog | Captured task; scope may be incomplete; no execution implied |
| Specification | Requirements are being clarified and a specification is being prepared |
| Pending review | A complete, immutable specification version has been submitted for human review |
| Ready | An authorized human approved the current exact specification version; execution has not started |
| In progress | Explicitly authorized implementation has begun against that version |
| Review | Implementation evidence has been submitted against a fixed revision; acceptance is pending |
| Done | Applicable independent review, human acceptance, verification, and integration conditions are satisfied |

### Allowed transitions

All transitions below require project access, the current task revision, and a recorded reason or evidence. Any unlisted transition is rejected. Agent capabilities are scoped to assigned tasks/runs; no generic agent `set_status` capability exists.

| From → To | Permitted actor | Guard and effect |
| --- | --- | --- |
| Backlog → Specification | Authorized human | Define planning intent; authorize any requested planning invocation separately |
| Specification → Backlog | Authorized human | Defer with reason; stop any active planning grant/run |
| Specification → Pending review | Assigned Planner or authorized human | Submit a valid immutable specification version; store version and transition atomically |
| Pending review → Specification | Authorized human | Reject/request changes with reason; retain rejected version and decision |
| Pending review → Ready | Authorized human only | Approve the exact current submitted version; approval and transition are atomic |
| Ready → Specification | Authorized human | Scope revision or withdrawal; invalidate execution eligibility and retain prior approval history |
| Ready → In progress | Authorized service acting on a human execution grant | Approved version still current; dependencies satisfied; grant valid; runner start acknowledged; one active implementation run |
| In progress → Review | Assigned Developer or authorized human | Submit implementation revision, acceptance mapping, tests and artifacts; freeze review target |
| In progress → Ready | Authorized human | Stop/retry without scope change; revoke current grant and fence the run before transition; fresh authorization needed |
| In progress → Specification | Authorized human | Scope change; revoke grants, cancel/fence active run, supersede specification eligibility |
| Review → In progress | Authorized human execution/rework grant, applied by service | Record rejection/rework reason; same approved scope; bind fresh grant to new attempt |
| Review → Specification | Authorized human | Review uncovers scope change; supersede eligibility and require a new specification approval |
| Review → Done | Authorized human only | All completion guards below pass against the current review target |
| Done → Specification | Authorized human | Reopen with reason for reassessment; old completion evidence remains historical |

A Reviewer submits findings and a recommendation while the task remains Review. Findings never directly approve, merge, or start rework. Human rejection of implementation may leave the task in Review with requested changes until a human authorizes rework, or return it to Specification when scope changes.

### Approval and execution invariants

1. A specification approval references its immutable version ID and content hash. Approval of version N never authorizes N+1. A new submitted version requires returning through Specification; submitted content cannot be silently edited in Pending review or Ready.
2. Ready indicates specification approval, not permission to run. A separate human grant specifies task, approved version, agent role/profile, repositories, allowed operations, time limits, and execution attempt. Approval and authorization may share a UI flow only if they remain explicit, separate recorded actions.
3. A grant is consumed for one run/attempt. Delivery retries reuse that run and do not create another authorization. New attempts or rework require fresh authorization under the initial policy.
4. Pending dependencies block execution, even if a specification is approved. Dependency completion must be checked at dispatch and runner start. A later dependency reopen blocks further submissions/completion until a human resolves the impact.
5. A run that fails, expires, or is canceled does not silently rewind the task. An In progress task remains visibly blocked with a terminal run outcome until a human authorizes the documented recovery path.
6. Specification supersession and revocation are enforced server-side even if a runner or local session continues. Such a run may report its terminal status, but cannot submit accepted implementation against the stale grant.

### Done criteria

- The submitted implementation maps to the approved specification and acceptance criteria.
- Required verification has current evidence; failing, missing, or stale evidence blocks completion. Before CI integration, explicitly recorded local verification may fulfill the task's declared checks.
- An independent Reviewer has evaluated changes, tests, criteria, and risks; unresolved blocking findings prevent acceptance. An agent review is advisory; an authorized human records final acceptance.
- Review and acceptance refer to the exact submitted commit/diff digest. Any change invalidates those decisions until re-review; a new PR head or incompatible integration result must be reassessed.
- All required dependencies are satisfied.
- For code tasks requiring GitHub integration, required checks and reviews pass and the approved work is merged into the designated target branch. The observed merge and revision mapping are recorded. No automatic merge authority is assumed.
- For documentation, planning, or other tasks where integration does not apply, the human records why the criterion is not applicable and which deliverable was accepted. Applicability is declared in the specification, not inferred by an agent after a failed check.

## 5. Roles, identity, and execution lifecycle

| Role | Responsibilities | Restrictions |
| --- | --- | --- |
| Planner | Read requirements and permitted repository context; produce and submit technical specifications | Cannot approve specifications or authorize implementation |
| Developer | Implement the approved specification in an isolated workspace; report progress and verification evidence | Cannot approve its specification or implementation; cannot expand granted repository/tool scope |
| Reviewer | Independently assess the fixed implementation revision, tests, acceptance criteria, and risks | Must not be the implementation run/identity; findings are not human acceptance |

Initial human permissions are project owner and project member; an explicit project permission controls approval and execution authorization. Exact UI role labels are provisional. Access checks are server-side and scoped through project membership/ownership, including for every record ID supplied by a client. Until a team model is implemented, ownership alone must enforce this boundary; projects are not public by default.

A local agent invocation must be explicitly requested by the user. Its MCP credential is restricted to the intended project/task and allowed role. The platform records the initiating human and task-scoped planning grant/session before accepting writes. External Codex activity that has not registered an authorized session is not assumed to be managed or observable by the platform.

### Agent-run status (separate from task state)

Proposed run states: `queued`, `starting`, `running`, `cancel_requested`, `succeeded`, `failed`, `canceled`, `timed_out`. Normal progression is queued → starting → running → succeeded/failed. Any nonterminal run may receive a cancellation request and finish canceled; deadline expiry produces timed_out after fencing the execution. Startup failures can end failed without reaching running.

Run success means its output was validly submitted, not that a human accepted the task. A Planner run can succeed when a task enters Pending review; a Developer run can succeed while a task is in Review. Status updates must follow the run lifecycle, carry a monotonic sequence, and reject stale or illegal terminal-state rewrites.

A lease token/generation identifies the current runner attempt. Heartbeats update liveness; they do not authorize longer execution or additional tools. Terminal runs retain results and failure classification. A new execution attempt is a new run linked to its predecessor and fresh human grant, while transport retries preserve run identity.

## 6. Data model and integrity

IDs are opaque stable identifiers. Records use UTC timestamps, explicit ownership, foreign keys, and indexed access paths appropriate to project/task queries. Exact physical schema and indexing will be chosen with migrations in the implementing milestone; the following responsibilities and relationships are required.

| Entity | Responsibilities and key relationships |
| --- | --- |
| `users` | Internal identity and unique GitHub subject; links human decisions and initiation to stable identities rather than mutable usernames |
| `projects` | Name, owner, settings and access boundary; owns tasks, repository links, and agent profile scope |
| `project_repositories` | Project ↔ GitHub repository mapping with stable provider repository ID, installation reference, target branch, and access state; unique mapping per project/repository |
| `tasks` | Project, title, requirements, seven-state status, optimistic revision, current specification and review target references; optional assigned actors; not a copy of PR status |
| `task_specifications` | Task, monotonically increasing version, immutable submitted content/hash, author and submission time; unique `(task_id, version)`; includes criteria, non-goals, plan, tests, risks, affected repositories, integration applicability |
| `approvals` | Immutable human decisions and execution grants; kind, decision, actor, task, exact specification FK/hash, reason, time, scope/expiry and optional run/review target; implementation acceptance also binds revision/digest; revocations are new linked decisions |
| `agent_profiles` | Planner/Developer/Reviewer identity, permitted capabilities and runtime configuration; no plaintext secrets; runs snapshot the selected configuration |
| `agent_runs` | Task, role/profile snapshot, exact specification when applicable, human initiation/grant, lifecycle, lease, heartbeat, deadline, repository baseline, output revision, error summary and predecessor; no task-state substitution |
| `task_events` | Append-only audit timeline: actor identity/type, action, before/after state/revision, specification/run IDs, reason, correlation/idempotency key and timestamp; stores references rather than unredacted sensitive payloads |
| `task_dependencies` | Directed task → prerequisite edges within a project initially; reject self-links, duplicates and cycles; creation/removal auditable |
| `github_links` | Task/run ↔ repository, branch, commit or PR references, observed head/merge/check facts and last reconciliation time; external authority remains GitHub |
| `artifacts` | Task/run, content type, size, checksum, storage key or controlled external reference, producer, upload/verification state and retention; large contents remain outside PostgreSQL |
| `outbox_events` | Transactionally recorded integration/orchestration intent, event type/schema version, aggregate/revision, delivery attempts, availability and delivery outcome; not a replacement for audit events |

Supporting project membership and credential/session records may be added when the access model is implemented; they must preserve project isolation. Prefer explicit typed decision/grant variants over ambiguous approval booleans. Cross-record checks must prevent a specification, repository, run, or approval from another task/project being attached by ID.

### Transactional rules

- State mutation reads the expected task revision and relevant approval/dependency evidence, then writes the task revision increment, audit event, and required outbox event in one transaction. Optimistic conflicts return a conflict result; clients refresh instead of overwriting.
- Enforce at most one active Developer run per task. Consume an execution grant and create its run/outbox intent atomically. A unique constraint backs the service check.
- Dependency graph edits require serialization within the project so simultaneous additions cannot create a cycle. Execution guards and changes to eligibility use a consistent locking/revision scheme to prevent a check-then-start race.
- Version allocation and specification submission are transactional. An approval request includes the reviewed version and expected revision; concurrent submissions or revocations cannot approve an unseen version.
- Preserve historical approvals and specifications. Mutable eligibility pointers do not erase history. Retention/deletion semantics must be settled before production personal-data handling.

## 7. MCP interface

### Transport and authority

Required: AI agents communicate through the custom MCP server, never with database credentials or direct SQL. MCP handlers validate inputs and invoke the same application services as the web interface, with a server-derived principal and project/task scope. IDs and actor names supplied by a model do not establish identity.

**Local STDIO:** the user configures a local MCP process in their normal Codex environment. Local process transport is not authentication. It uses a scoped, revocable credential/session to reach platform services; credential storage belongs to the user/OS environment, not repository files or prompt context. Initial planning session registration binds the user's explicit planning request to the task. The exact registration UX is an M2 validation decision.

**Remote MCP:** use authenticated encrypted transport with short-lived, audience-bound credentials, explicit scopes and revocation. Validate the current MCP authorization requirements before selecting a protocol/library. Remote access must not trust a forwarded user ID or an unauthenticated client. Hosting/streaming compatibility on the proposed web host remains provisional.

### Common contract

All tool inputs and outputs have runtime schemas and typed service equivalents. Discovery uses bounded pagination and project-scoped filters. Mutations require an idempotency key; state-affecting operations also require `expected_task_revision`. Server identity determines actor, assignment, and permissions. Run writes include `run_id` and a valid lease/session binding; timestamps alone are not ordering tokens.

Successful results return relevant IDs, current revision, status, and durable receipt/event ID. Errors distinguish `invalid_input`, `unauthenticated`, `forbidden`, `not_found`, `conflict`, `precondition_failed`, `rate_limited`, and retryable `unavailable`. Do not disclose inaccessible records through error details. Reusing an idempotency key with a different payload is a conflict; exact retries return the original receipt.

### Initial tools

| Proposed tool | Required input | Output and service effect |
| --- | --- | --- |
| `list_projects` | Optional cursor and bounded limit | Accessible project summaries and next cursor; read only |
| `list_tasks` | Project ID; optional state/cursor/limit | Accessible task summaries, blockers and revisions; read only |
| `get_task_context` | Task ID; optional artifact/context pagination | Requirements, workflow/revision, current specification/version, dependency blockers, repository references, scoped evidence and allowed next actions |
| `submit_specification` | Task ID, expected revision, idempotency key, authorized planning session/run, structured specification | Validate completeness, persist immutable version, move Specification → Pending review atomically; return version/hash/revision |
| `get_approved_specification` | Task ID; optional requested version/run | Exact approved content/hash and effective approval/eligibility; no eligible approval returns a precondition error; historical retrieval is clearly labeled and never implies execution permission |
| `report_execution_progress` | Task/run IDs, lease/session binding, monotonic sequence, idempotency key, lifecycle/progress message | Persist bounded progress/heartbeat and permitted run lifecycle changes; never arbitrary task-state mutation |
| `submit_implementation` | Task/run IDs, lease, expected task revision, idempotency key, specification version, revision/diff digest, acceptance mapping, verification and artifact references | Validate current grant and evidence; persist result and move In progress → Review atomically; mark Developer run succeeded |
| `submit_review_result` | Task/review-run IDs, lease/session binding, expected task revision, idempotency key, reviewed digest, findings, checks and recommendation | Persist independent review against fixed target; complete Reviewer run; task remains Review |
| `register_artifact` | Task/run IDs, idempotency key, kind, size/type/checksum, permitted upload reference | Create/confirm artifact metadata and scoped upload intent; only verified completed uploads become accepted evidence |

Specification payload requires problem, scope/non-goals, acceptance criteria, affected repositories, proposed approach, verification, risks, and integration applicability. Missing mandatory content fails validation without changing state. Tool descriptions and errors must tell agents which human action is needed when a gate blocks them.

No initial MCP tool can approve a specification, grant implementation, mark Done, merge, or broaden permissions. Human actions use authenticated human application flows. Artifact registration cannot fetch arbitrary model-supplied URLs or trust an upload's claimed checksum without verification.

## 8. Supervised execution and orchestration

1. A human chooses a task, approved version, Developer profile, repositories, and bounded execution scope. The service checks permission, state and dependencies and records the execution grant, queued run, audit event, and dispatch outbox event atomically.
2. The dispatcher publishes the run intent to the proposed orchestrator. Delivery can repeat; `(event_id, run_id)` deduplication prevents duplicate execution.
3. The runner claims a lease and rechecks grant validity, current version, dependencies, installation access, deadline and baseline. A canceled or superseded run cannot start on a delayed message.
4. Create an isolated workspace at recorded base commits, with bounded credentials, tools, filesystem/network access and resource limits. Bind callback credentials to the run. The service enters In progress only when the authorized start is acknowledged; queued/starting runs remain visible separately.
5. Execute Codex through a validated SDK/CLI integration. Stream redacted, bounded progress and store large logs privately. Report only facts that the runner can substantiate.
6. Submit the exact result revision/digest, criteria mapping, checks, artifacts and known limitations through services/MCP. Atomically enter Review and finish the run. Submission does not merge or accept work.
7. A separately authorized Reviewer invocation evaluates that target. The human handles findings, authorizes rework if needed, and records acceptance/integration decisions before Done.

Inngest is the proposed durable orchestration engine, not an authorization authority. Its retry policy must distinguish safe delivery retries from starting another billable execution. The runner must not execute an unbounded task merely because an orchestration retry fired.

Direct local Codex use and hosted execution share contracts but have different control boundaries. The platform can revoke local MCP writes; it cannot guarantee termination of an independently launched local process. The UI must show this distinction and avoid claiming local execution isolation that the platform does not control.

## 9. GitHub integration

Use GitHub authentication for identity and a GitHub App for repository permissions. Select minimum installation permissions needed by each milestone; exact permission names/scopes and token lifetimes are validated during M4. Do not hand an installation-wide credential to an agent when a narrower runner/service operation suffices.

Persist stable installation/repository/PR IDs and reconcile renamed repositories. Link each implementation to its base commit, branch, head revision and target branch. PR creation and updates require the run's granted scope; merging remains a separately authorized human operation. A provider outage or revoked installation blocks integration and completion, while preserving local evidence.

Webhook ingestion verifies the signature over raw bytes before parsing or acting, limits payload size, validates event type and installation/project mapping, and deduplicates delivery IDs. A valid signature authenticates provider delivery, not permission for arbitrary workflow transitions. Persist relevant receipt/effect atomically and acknowledge promptly; process expensive reconciliation asynchronously.

Refresh authoritative PR/check state before final acceptance. Out-of-order webhook deliveries must not overwrite newer observations. A PR head change invalidates prior review evidence. A merged PR must be mapped to the reviewed changes and designated target; unexpected merge content or target changes require human reassessment. Periodic/on-demand reconciliation repairs missed webhooks.

## 10. Reliability, security, and recovery

| Concern | Required behavior and verification target |
| --- | --- |
| Human gates | Human-only decision endpoints verify current identity, permission, reviewed version and expected revision; test agent attempts and stale approval rejection |
| Authentication and authorization | Enforce project/resource checks for web, MCP, runner callbacks and artifact access; protect cookie-authenticated mutations against CSRF; verify cross-project denial |
| Agent credentials | Short-lived task/run/role scope, server-side revocation, no raw database/admin tokens in prompts, logs or repository; test revoked/expired scope |
| Isolation | Worktree for Git separation plus enforceable process/sandbox controls for untrusted execution; bound filesystem, network, secrets, resources and cleanup; validate runner escape boundaries before hosted use |
| Idempotency | Persist mutation key and payload identity with its effect; unique consumer receipts; retry duplicate grants, submissions, webhooks and dispatch without duplicate work |
| Retry policy | Bounded backoff for transient transport/provider errors; no blind retry of authorization, validation, or unknown non-idempotent outcomes; reconcile external outcomes before repeating |
| Concurrency | Revision checks, unique active-run constraint, serialized dependency changes, lease fencing and atomic eligibility checks; test simultaneous approvals, starts and supersession |
| Transactional publication | Commit outbox intent alongside state/audit; dispatcher retries until acknowledged, consumers deduplicate; expose exhausted delivery for recovery |
| Audit | Append-only business events for transitions, decisions, grants, revocations, run outcomes and provider actions; correlate human/task/run/event; redact secrets and restrict audit access |
| Cancellation/timeouts | Record intent, revoke capability/lease, request cooperative stop then terminate controlled processes at deadline; stop accepting fenced output; preserve partial evidence safely |
| Sensitive data | Encrypt transit and provider-managed storage, minimize retained prompts/logs, redact before persistence, use private signed artifact access; establish retention/export/deletion policy before production |
| Webhooks | Verify raw-body signatures and installation scope, deduplicate, tolerate reordering; invalid delivery has no business effect |
| Recovery | Detect expired heartbeat/lease, reconcile durable run and external effects, preserve evidence, terminalize uncertain attempts and require human authorization for a new execution |

### Failure handling and operational behavior

- If the database is unavailable, refuse mutations; do not acknowledge a submission that was not committed.
- If publishing fails after a transaction, leave the outbox pending and retry delivery. If acknowledgement is lost, deduplication resolves the repeated event.
- If a runner disappears, fence its lease and show an interrupted/failed or timed-out run after reconciliation. Never run two Developers because a heartbeat was delayed.
- If an external API succeeded but the response was lost, reconcile using recorded provider identifiers before attempting creation again. Surface unresolved outcomes for human recovery.
- Uploads remain pending until content/size/checksum verification succeeds. Clean orphan uploads through a retention policy; incomplete content cannot satisfy acceptance evidence.
- Cancellation racing with completion is serialized by the current run/task revision and lease. A rejected late submission remains diagnostic evidence, not accepted implementation.
- Persist integration/check freshness. Unknown, missing, stale, or pending checks are not successful checks.

Observability should expose run durations, failures, queue/outbox lag, webhook errors, conflicts, and permission denials with correlation IDs. User-visible status distinguishes waiting for human action, blocked dependencies, queued work, failed execution, and failed integration without adding extra task states. Alerts and recovery actions must be actionable and avoid sensitive payloads.

Before production, validate backups and restore with a documented recovery exercise; set explicit retention, recovery time/data-loss objectives, budgets, and timeout/resource limits. These values require operational evidence rather than invented guarantees in this draft.

## 11. Validation strategy

Validation is introduced with the milestone that implements the behavior. There are no test commands in this documentation-only repository yet.

- Service tests cover the transition matrix, actor permissions, specification versioning, evidence freshness, dependency rules and prohibited self-approval.
- PostgreSQL integration tests exercise approval/start races, transactional outbox writes, idempotency, tenant isolation and lease fencing using actual constraints.
- MCP contract tests cover schema errors, scoped discovery, forbidden human operations, exact retry receipts, and submission-driven transitions.
- End-to-end tests first prove task creation → local Codex planning → MCP submission → Pending review → human approval → Ready. Rejected and superseded versions must fail the corresponding guards.
- Runner/provider tests exercise interrupted starts, duplicate delivery, cancellation, stale callbacks, lost API responses, webhook forgery/reordering, and recovery.
- UI verification includes keyboard-accessible Kanban alternatives, clear transition failures, specification version comparison, explicit human actions, and honest loading/error/blocked states.

Mocks can isolate provider adapters, but do not prove actual Codex, MCP, Inngest, Neon, Vercel, or GitHub interoperability. Each adopted provider requires a bounded integration validation in its milestone.

## 12. Development milestones

Each milestone is independently reviewable. Implementation begins only after a separate request following specification review. Changes should establish the smallest working path with its verification, then stop for review before expanding scope.

| Milestone | Deliverables | Acceptance criteria |
| --- | --- | --- |
| **M0 — Architecture and repository foundation** | Reviewed specification, concise repository instructions, agreed implementation boundaries; minimal application/tooling setup only when subsequently authorized | Human review resolves blocking design questions; repository instructions reflect real structure and validated setup/build/check commands once created; no cloud provisioning implied by documentation acceptance |
| **M1 — Project and workflow foundation** | Authenticated project ownership/access, PostgreSQL migrations, projects/repository references, tasks, accessible Kanban, immutable specifications, human approvals, audit/outbox primitives | Two projects remain isolated; allowed transitions work and forbidden ones fail server-side; stale approval fails; human approval moves current submitted version to Ready; data survives restart; focused service/database tests pass |
| **M2 — Codex through MCP** | Scoped local STDIO MCP integration, validated initial tool schemas, planning session authorization, context retrieval and automatic specification submission; remote contract prepared, remote deployment only if needed | Demonstrate the first end-to-end objective using normal Codex CLI/desktop; invalid submission leaves state unchanged; exact retry creates one version/event; agent cannot approve; no agent database credentials |
| **M3 — Supervised execution** | Explicit human execution grants, separate isolated runner, Codex SDK/CLI adapter, proposed durable orchestration, leases, progress, private artifacts, cancellation and recovery | Approved task starts only with a valid human grant; duplicate dispatch runs once; stale version/revoked grant cannot start or submit; interrupted run is visible and recoverable; valid implementation enters Review without human acceptance |
| **M4 — GitHub and independent review** | GitHub App, verified webhooks, PR/revision/check links, separately authorized Reviewer runs, human acceptance and integration guards | Forged/repeated/out-of-order webhooks have safe effects; Developer cannot approve itself; changed head invalidates review; required failing CI or missing merge blocks Done; accepted, reviewed, integrated target can reach Done |
| **M5 — Production readiness** | Threat review, hardened deployments, access and secret lifecycle, operational metrics/alerts, backup/restore, retention, timeout/cancellation and failure recovery runbooks | Security boundary tests pass; restore and interrupted-run recovery are demonstrated; budgets/limits and operational objectives are agreed; private artifacts remain scoped; production deployment receives explicit authorization |
| **M6 — Optional autonomy and providers** | Explicit configurable policy boundaries and additional agent adapters only when justified | Human opts into specific capabilities; audit explains policy-based actions; default stays Supervised automation; cross-provider contracts and existing gates remain verifiable; no implied blanket merge or deployment authority |

M0 documentation preparation is the current activity, not evidence that M0 implementation or any later milestone has been delivered. M2 is the first major end-to-end product objective; M3–M6 are not prerequisites for that planning-and-approval loop.

## 13. Provisional decisions and review questions

| Decision to validate | Initial direction | Resolution point |
| --- | --- | --- |
| Project collaboration scope | Owner-first access; explicit membership/approval permissions if collaboration is needed | Before M1 schema and authorization implementation |
| Provider/runtime compatibility | Next.js, Neon, Drizzle, Zod, Tailwind and Vercel web; no versions pinned yet | M0 implementation setup |
| Local planning registration | Explicit human task-scoped session/grant; normal Codex invocation remains available | M2, before accepting agent writes |
| MCP deployment and auth | STDIO first; authenticated remote transport only as required; follow then-current protocol guidance | M2 integration validation |
| Hosted runner location and sandbox | Separate runner with enforceable isolation; worktrees inside that boundary | M3, before executing untrusted code |
| Durable orchestration | Inngest proposed; validate leases, retry/cancel behavior and hosting fit | M3 |
| Codex invocation API | SDK/CLI proposed; validate identity, headless execution, permissions and evidence capture | M2 for local, M3 for runner |
| GitHub permissions and merge evidence | Minimum GitHub App permissions; human merge authority; revision-bound checks/review | M4 |
| Storage and operations | Private provider undecided; retention, deletion, budgets and recovery objectives not yet set | M3 artifact adoption; finalized before M5 production |

Provider validation may revise a provisional choice through a documented human-reviewed change. It must not silently alter the required approval gates, source-of-truth boundaries, or supervised execution policy.
