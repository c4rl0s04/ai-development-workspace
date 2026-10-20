# Production graphite component system

- Reuse shared graphite/steel tokens, native semantic form recipes and Base UI/Liqui
  primitives. `materials/chrome.tsx` is the small client island for navigation and
  tools; dense server-rendered data remains on solid reading surfaces.
- UI compositions accept presentation data, never import providers, fixtures or
  database services. Preserve owner checks, RLS, revision/error/retry contracts.
- Do not import experimental design-lab/workflow code. Status is read-only until
  M1.3; there is no production Kanban, agent execution or fake data.
- See DESIGN.md and docs/guides/visual-redesign.md for reuse, acquisition, licensing,
  motion and browser evidence. New components need a concrete use case; no second
  framework, copied registry globals or dependencies without review.
- Preserve reduced-motion/transparency/high-contrast fallback on portal roots as
  well as descendants. Forms keep native fields/fieldset and submit behavior.
