# AI Development Workspace — graphite interface

## Direction and authority

The real application uses the provisionally approved graphite/charcoal Liquid
Glass language: calm, compact, desktop-inspired and dark-first. Steel-blue is a
restrained action/focus cue; semantic green is not the brand. Technical
specification v0.2 governs capabilities/authorization. This frontend migration
adds no workflow, team, runner, MCP, agent or GitHub App behavior.

## Colors and materials

Canonical semantic values live in `src/components/design-system/theme/tokens.css`:
background #13161c, reading #20242c, raised #2a303a, primary text #edf0f5,
secondary #c7cfdb, muted #a7b2c3, focus #b7d2ff. Action fill #526b8b is distinct
from pale text links. Do not reuse a light text token as a white-text button fill.

Glass belongs in the navigation and toolbar, using actual Liqui frosted material.
Dense records, forms, errors and long text use stable opaque surfaces. No optical
lens per task row/input, animated blur, neon, arbitrary gradients or decorative
metrics. The quiet steel environment only supports material separation.

Theme scope is `workspace-theme` on the root body (including Login/error pages),
with matching scope required for future portals. Reduced-motion overrides cover
roots and descendants; reduced-transparency/contrast gets opaque fallbacks.
Forced-colors preserves Canvas/CanvasText/Highlight/visible control boundaries.

## Typography and geometry

Use the system sans stack. Page headings26px desktop/23px mobile; body/task14px,
metadata/hints12px with adequate line height. Keep text zoomable and long keys,
URLs and titles wrap-safe. No new display font or remote font service.

Desktop uses224px floating navigation,28px content separation and a small toolbar.
Below1024px all three real navigation routes remain visible in a horizontal row;
no menu toggle for three destinations. Content is fluid but bounded; forms42rem.
Panels16px, controls10px; group via proximity/separators before introducing cards.
Principal targets are44px. Compact visual density must not shrink hit areas.

## Components and states

Reuse shared PageHeading, RecordPanel, Breadcrumbs, Pagination, StatusBadge,
RepositoryLink and RecordForm. Links navigate; buttons submit or act. Only working
Overview/Projects/Approvals routes are interactive. Current tasks retain read-only
status. Approvals explicitly states its inbox is not implemented. No conceptual
Kanban, synthetic counters, fake search or demo callbacks ship.

The server shell passes actual authorized route content through small material
client islands. Do not turn records into client fetches or cache private identity
for style/performance. Keep owner authorization at every service boundary.

Forms keep native inputs, fieldset, textarea and submit semantics. Saving locks
fields/cancellation; errors receive focus while input remains. Duplicate-key
recovery, stale-revision denial and uncertain-create reconciliation are behavior
contracts, not optional styling details. No optimistic success without evidence.
Task detail remains a durable route, not a demo-only inspector.

## Motion and workflow

Operate mode: immediate focus/selection,120ms surface feedback, existing150ms
control press behavior; no page entrance choreography or skeleton shimmer.
Navigation keeps active-route and pending-link feedback. Static loading surfaces
reserve shape. Do not add motion dependencies or disguise structural reflow with
animation. Long task content must not require repeated modal interaction.

Use the installed Impeccable skill for independent critique, layout/type/motion
review and a bounded render→refine→confirm pass. Preserve before evidence, inspect
actual Chromium/WebKit desktop/mobile and keyboard/focus/error states. A clean
mechanical detector is not visual approval or WCAG certification. See
`docs/guides/visual-redesign.md` for the actual validation and limitations and
`docs/design-system/README.md` for acquisition/licensing. Production rollout and
live authentication validation require their own approval/evidence.
