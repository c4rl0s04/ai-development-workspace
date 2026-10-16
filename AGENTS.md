# AI Development Workspace — project instructions

## Current foundation

- This repository currently contains documentation only. There are no application entry points, dependencies, or validated build/test commands. Do not invent commands or scaffold the application during the documentation phase.
- [Technical specification v0.1](docs/architecture/technical-spec-v0.1.md) is the architectural source of truth. It is a draft awaiting human review; distinguish its required invariants from provisional provider choices. Read the sections relevant to a change before implementation and surface architectural conflicts before proceeding.
- Work through the specification's focused, independently verifiable milestones. Update documented decisions and real validation commands as implementation makes them concrete. New infrastructure, dependencies, or abstractions require a current milestone need; keep unrelated work out of scope.

## Implementation boundaries

- Preserve the modular monolith and separate runner boundary. Keep workflow and authorization in application services shared by web and MCP; agents never access the database directly.
- Use explicit TypeScript contracts and boundary validation for service, MCP, runner, and provider interactions. Keep modules understandable and independently testable; prioritize tests of transition permissions, stale approvals, concurrency, retries, and external failures.
- PostgreSQL owns workflow, specifications, approvals, and execution metadata. GitHub owns repository/PR/CI facts. Private object storage owns large artifacts. Do not create another authoritative task status in GitHub Projects.

## Workflow and authority

- Enforce the seven-state transition matrix in the specification for every interface, including Kanban actions. Commit state changes, audit events, and required outbox records atomically with concurrency checks.
- Approvals bind to exact specification versions; implementation grants bind to the approved version and execution scope. Superseding a specification blocks further implementation until the new version is approved and execution is authorized.
- Supervised automation is the initial policy. Human approval of a specification and human authorization to execute implementation are separate actions. Agents may submit specifications, progress, implementation evidence, and independent review results only within their assigned scope.
- An implementation agent cannot approve its own work. Agent output, prompts, tool results, and GitHub events never substitute for human authorization or bypass approval gates. Done requires current review, acceptance, and applicable integration evidence.
- Enforce project access and least privilege on every operation. Keep provider credentials outside agent contexts, verify GitHub webhooks, and isolate executions. A worktree alone is not a security sandbox; untrusted execution requires process/environment isolation.

Use relevant installed global skills when they materially support the milestone; do not copy their manuals or reinstall them here. Global engineering instructions continue to apply.
