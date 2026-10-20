---
version: 1
slug: "src-components-workspace-shell-tsx"
primary_target: "src/components/workspace-shell.tsx"
related_targets: ["src/components/record-form.tsx","src/components/workspace-records.tsx","src/app/(workspace)/projects/page.tsx"]
---

# Authenticated graphite workspace

Mode: Operate. Web application for one owner managing real projects/repositories
and Backlog tasks. Technical specification and authorized services own behavior.
Current work is selective presentation migration, not workflow implementation.

Graphite/charcoal, quiet steel-blue, system typography, frosted navigation/tools
and opaque reading/form surfaces are established. Canonical tokens and production
recipes live in src/components/design-system/theme. DESIGN.md is visual authority.

Primary job: navigate Projects, inspect task context and create/edit records with
clear pending/validation/concurrency feedback. Preserve durable route URLs,
server-rendered authorized reads, pagination and native form safety. Only genuine
working controls appear; Approvals remains explicit about its unavailable inbox.

Reuse Base UI/Liqui/Button, material provider and universal Badge/Skeleton, shared
page/record/form adapters. No fixture or design-lab import, new framework/font,
agent control or conceptual board. No schema/provider/cloud changes.

Browser evidence must cover actual persisted synthetic local data through the
same auth/services/RLS boundary; fixture identity is not live OAuth validation.
Run desktop/mobile/focus/errors/reduced-motion plus the existing unit/HTTP/PG/build
checks. Preserve before/pass1/final evidence and report cost/limitations honestly.
