# AI Development Workspace

AI Development Workspace is a planned web platform for managing software projects and coordinating AI coding agents. Its vision is to connect requirements, approved technical specifications, isolated agent executions, independent reviews, and GitHub integration in one auditable workflow.

**Status:** architecture and initial repository setup. This repository contains documentation only; no application, integrations, dependencies, or infrastructure have been implemented. The technical specification is a draft awaiting human review before M0 implementation begins.

## Planned capabilities and workflow

- Manage multiple projects (initially zero or one repository each), task dependencies, related tickets, manual On Hold pauses, and a Kanban board with a separate On Hold view.
- Version technical specifications and record human approval of the exact version.
- Coordinate Planner, Developer, and Reviewer agents with scoped permissions.
- Track executions, verification evidence, artifacts, and audit events.
- Link implementation to GitHub pull requests, CI results, and integration evidence.

The seven task states are **Backlog → Specification → Pending review → Ready → In progress → Review → Done**. **On Hold** is a separate manual pause condition displayed as an extra board lane; dependency-blocked tasks keep their underlying stage. Rejections and rework follow explicit paths defined in the [technical specification](docs/architecture/technical-spec-v0.2.md#4-task-workflow). Board movements must enforce the same rules as every other interface.

The initial policy is **Supervised automation**: a human explicitly authorizes agent execution; permitted progress reporting and result submission then happen automatically. Only an authorized human can approve a specification. Implementation agents cannot approve their own work.

The first major end-to-end objective is:

**Create task in web → Ask Codex to plan → Submit specification through MCP → Automatically enter Pending review → Human approval → Ready.**

Users will be able to keep using the normal Codex CLI or desktop application. A remotely hosted, stateless MCP endpoint will expose authorized platform operations: Codex can begin low-risk planning directly from its authenticated connection and submit a specification without an extra per-task dashboard confirmation. A separate runner will later support supervised execution using the Codex SDK/CLI. Neither integration grants agents direct database access or permission to bypass human gates.

## Proposed stack

| Area | Proposed technology |
| --- | --- |
| Web | Next.js, TypeScript, Tailwind CSS |
| Structured data | Supabase PostgreSQL, selective JSONB; Drizzle ORM; Zod validation |
| User identity | Supabase Auth with GitHub sign-in, restricted to one owner |
| Business rules and agent interface | Application services shared by web and stateless remote MCP endpoint on Vercel; Supabase OAuth 2.1 MCP auth to be validated |
| Durable orchestration | Inngest |
| Agent execution | Codex SDK/CLI in isolated worktrees or sandboxes; separate runner |
| Repository integration | GitHub App, GitHub API, verified webhooks |
| Artifacts and hosting | Supabase Storage candidate; Vercel web + MCP hosting; separate future agent runner |

The architectural direction is a modular monolith with a separate agent runner. The current decision baseline is [technical specification v0.2](docs/architecture/technical-spec-v0.2.md); [v0.1](docs/architecture/technical-spec-v0.1.md) is retained as the initial draft. External providers and runtime integration details remain provisional until validated. PostgreSQL will own task workflow; GitHub will own repository and CI facts; object storage will hold large artifact contents.

## Planned milestones

| Milestone | Deliverable |
| --- | --- |
| M0 | Review architecture and establish the repository foundation |
| M1 | Projects, Kanban, PostgreSQL, versioned specifications, human approvals |
| M2 | Codex through MCP, including automatic specification submission |
| M3 | Supervised execution and durable orchestration |
| M4 | GitHub integration, pull requests, CI, independent review |
| M5 | Production security, observability, recovery, and operational readiness |
| M6 | Optional configurable autonomy and additional agent providers |

See the [engineering specification](docs/architecture/technical-spec-v0.2.md) for contracts, workflow rules, security boundaries, open decisions, and [milestone acceptance criteria](docs/architecture/technical-spec-v0.2.md#12-development-milestones). Repository-specific contributor instructions are in [AGENTS.md](AGENTS.md).

There are no install, development, build, or test commands yet. Implementation will begin only after the documentation review and a separate implementation request.
