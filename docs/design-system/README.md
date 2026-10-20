# Production graphite system

This is a selective migration from the approved Liquid Glass spike, not a merge
of its experimental branch. Canonical colors/materials/spacing/motion are in
`src/components/design-system/theme/tokens.css`; production recipes/adapters are
in `theme/production.css`. `theme/components.css` retains the approved primitive
recipes. All theme values are scoped to `workspace-theme`, including public login
and portal roots; do not inject a registry's global light/dark reset.

## Runtime composition

`WorkspaceShell` is a Server Component. Its authorized page children remain
server-rendered. Small client islands provide the material context, sidebar and
toolbar surfaces; the existing Navigation component retains `useLinkStatus` and
active real route links. `ChromeSurface` consumes the provider's glass preference,
so the owning shell registers accessibility media preferences once. Frosted
chrome is deliberate; dense records/form fields never receive optical lenses.

Imported/adapted source:

- Approved graphite token values, material provider, utils, Liqui Button and MIT
  notice, CVA Badge and static Skeleton implementations.
- `ui/primitives.tsx` is a universal subset with no client hooks. It excludes the
  unneeded switch/menu/demo families and avoids hydrating each status/loader.
- `workspace-records.tsx` adapts actual domain statuses and validated repository
  URLs into read-only SSR presentation. PageHeading/Breadcrumbs/Pagination remain
  shared route adapters. Forms retain native input/fieldset/textarea semantics
  and use the same semantic control recipes rather than a second form engine.

Only six pinned UI dependencies were added, matching the tested spike:
Base UI1.9.0, Liqui0.5.0, CVA0.7.1, clsx2.1.1, tailwind-merge3.7.0, Lucide1.59.0.
Button is attributed in `registry-sources.json` and `ui/LICENSE.liqui`; other
package licenses remain in their npm distributions. No registry command, global
replacement, font service, animation engine or dashboard framework was installed.

## Reuse and acquisition

Use native links for navigation and the shared action classes for link actions;
use native form controls with the shared recipes for static POST actions, or
Button's solid/native variant when its interactive behavior is needed. The
static logout form does not load the client Button factory. Default glass Button is
not a native submit control. Reuse native form recipes and existing RecordForm
state/validation before adding fields. Never replace uncertain acknowledgement,
revision conflicts or busy locks with optimistic visual feedback.

Acquire another Base UI-compatible registry component only when a real feature
needs it. Review source/dependencies/license/style diff and keyboard/contrast of used variants; preserve the scoped theme
and helper, pin versions and record source hash/attribution. Do not copy the full
spike or duplicate an existing control.

## Intentionally excluded

No design-lab routes, fixtures, search/demo state helper, conceptual board/cards,
seven-state transition UI, synthetic activity, agent controls, fake create actions,
material demo toggles, showcase or experimental background scene was migrated.
Task detail remains a real URL/page; a demo inspector was not bolted onto records.
Unused dialogs/popovers/selectors can be acquired later for an actual approved use
case rather than making every form modal.

See DESIGN.md and [migration verification](../guides/visual-redesign.md).
