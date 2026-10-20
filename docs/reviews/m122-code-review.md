# M1.2.2 engineering review — Reviewer A

Reviewed HEAD `166bf15ee29bc832d3d1f62fea67d07ddd1cdcd9` against fixed base `8b7209c5e71fbbc5f4f82a7c37d735330a98b570` using the full three-dot migration diff and relevant callers. Read root/component AGENTS.md, PRODUCT.md, DESIGN.md, technical-spec v0.2 architecture/authority/milestone requirements, and the installed code-review skill. This is an independent engineering assessment, not human acceptance or deployment authorization.

## Standards findings

### A1 — P3, resolved: loading skeleton geometry was overridden by unlayered defaults

- Location: `src/components/design-system/theme/components.css:90–95`; callers: `src/components/workspace-records.tsx:92,99–100`.
- Scenario/evidence: during workspace/project loading, the heading requests `h-8 w-48`, and each row requests `h-4 w-16` / `h-4 w-1/2`. The newly introduced `.ws-skeleton` declares unconditional `height:14px; width:100%` outside any CSS layer. Tailwind utilities are layered, so these defaults win regardless of class order. The heading becomes a full-width 14px bar and the two row skeletons both request full row width, then flex-shrink equally. The intended heading/key/title shapes are lost.
- Final status: resolved by removing only the default height/width; every current caller supplies dimensions. Existing background, radius and static behavior are preserved. The new regression renders the real loading component and applies the actual material rule after sizing rules; it failed before the correction and passed afterward. Estimated complexity: **S**.

No other concrete standards/security/correctness finding identified. No baseline code-smell finding warrants adding an abstraction.

## Spec findings

No missing capability or scope violation found within this visual milestone. The broader M1 workflow requirements remain explicitly deferred, consistent with this bounded migration. No changes enter API handlers, domain/application services, auth/proxy, database adapters or migrations.

## Strengths and boundaries

- Server record adapters remain universal; actual records flow through Server Components. Material context is a client island receiving server-rendered children. No new browser data-fetch path or identity cache was introduced.
- Owner checks remain in existing services and the workspace layout. Native POST logout is preserved by explicitly selecting the solid/native Button variant. RecordForm's in-flight guard, native fieldset locking, field validation/error focus, revision conflict handling and uncertain-create reconciliation are unchanged.
- Repository links retain validated domain data, noopener/noreferrer and accessible new-tab disclosure. Status presentation remains read-only. Real navigation and pending feedback survive; experimental controls/routes are excluded.
- Focus, reduced-motion, opaque-preference and forced-color rules are present. Formal assistive-technology/device validation remains a declared release limitation rather than an unsupported accessibility claim.
- Six UI dependencies are pinned. Copied Liqui Button has a retained MIT notice/license and source provenance; installed glass package declares MIT and imports its structural CSS itself. No remote fonts, motion engine or second dashboard framework appears. No full license/security audit was performed.
- The reported client-byte increase is explicit (+8.54% emitted JS, +12.60% cold transfer), with no claim that transfer size proves runtime performance. No evidence of data/security boundaries being weakened for performance.

## Tests and evidence

Reviewed added server-rendered status/repository assertions and HTTP HTML/RSC lab-route 404 checks, alongside existing page/auth/form recovery/service coverage. They support preserved behavior but do not catch the CSS cascade finding. The migration guide records broader local integration/browser/performance results; those recorded results were not independently rerun for this review. Parent owns mechanical checks; this reviewer ran source/diff/package inspection only, with no build, cloud action, source edit or commit. The only written file is this report.

Parent subsequently reported independently rerunning Node24.21.0/npm11.19.0 formatting, lint, typecheck, 21 unit/render tests, production build, 2 HTTP tests and 11 PostgreSQL tests: all passed. These are parent-reported checks, not executions by Reviewer A. Auth coverage uses local fixture authentication, not live GitHub/Supabase evidence. Green mechanical checks do not constitute review or owner approval. Fresh parent browser verification was still underway when this report was written.

## PR readiness

Engineering review: ready for PR review; A1 is fixed and verified. No P0/P1/P2 blocker identified. This does not approve merge/deployment or substitute for the pending independent visual review and owner acceptance.

Standards: 1 resolved P3, no open findings. Spec: 0 findings.

Skipped independent builds/tests, physical devices, screen readers and live provider authentication; release confidence remains limited to reviewed source and separately recorded evidence.

## Parent verification addendum

Fresh production-build fixture harness was started after the build, avoiding stale server asset references. Read-only Chromium and WebKit checks at 390px traversed Overview → Projects through visible navigation, with zero page errors, zero HTTP responses ≥400 and no horizontal document overflow. Authentication was local fixture-backed, not real GitHub. A temporary browser-DOM probe using the actual stylesheet and `ws-skeleton h-8 w-48` in a 400px parent measured **400 × 14px** in both engines, confirming A1 (requested utility shape: 192 × 32px). The probe did not modify application files or records.

No new dependency or skill is needed. The installed code-review workflow plus existing unit/HTTP/PostgreSQL checks are adequate for this review; a Superpowers installation was not investigated because it adds no demonstrated missing capability. Keep significant-change review independent from implementation.

## Final correction verification (2026-10-20)

Node 24.21.0 / npm 11.19.0: format, lint, TypeScript, 22 unit/render tests, production build, 2 built HTTP tests and 11 PostgreSQL TAP passes succeeded. No new dependencies or backend/security/migration changes were introduced by this correction.

Chromium and WebKit rendered the actual shared WorkspaceLoading SSR markup inside the fresh local production-build shell at 1440px, 390px and 320px. This component is exported by both workspace and Projects loading routes. All six checks confirmed a 192 × 32px heading, 64 × 16px keys and half-row-width × 16px titles, zero horizontal document overflow, page errors or HTTP errors. Screenshots were inspected at desktop and narrow mobile sizes. This is component-state validation with real compiled CSS and fixture authentication, not a live OAuth or navigation timing benchmark. External evidence: `~/Documents/Projects/ai-development-workspace-reviews/m1-visual-redesign/skeleton-fix/` (screenshots and results.json); no browser state or credentials are committed.

Inherited architecture findings remain outside this PR: [MCP write authorization prerequisite #10](https://github.com/c4rl0s04/ai-development-workspace/issues/10) and [sanitized diagnostics #11](https://github.com/c4rl0s04/ai-development-workspace/issues/11). Neither is implemented here.

## Local stabilization addendum — 2026-10-20

The subsequent stabilization pass found and fixed nested main/duplicate skip targets for missing records, insufficient primary-hover contrast and long project-name wrapping. Busy Cancel feedback now matches its existing disabled behavior. The static logout POST is server-rendered with the native form recipe, avoiding an unnecessary client Button factory without changing authentication.

These are newly observed source/browser results, not retroactive claims by the original independent reviewer. The implementing agent reran clean installation, format/lint/TypeScript, 24 unit/render/DOM tests, build, 2 HTTP tests and 11 PostgreSQL TAP passes. Eight Chromium/WebKit smoke cases now exercise real isolated CRUD, streamed loading, missing-record landmarks, keyboard, errors and fallback presentation; CI is wired locally but unpushed. Glass Button keyboard/disabled/native-submit semantics have focused component coverage.

Actual Chromium 200% browser zoom and contrast/reduced-motion/forced-color media were rendered separately. Independent performance measurements compare base/preoptimization/final with repeated production-build samples; native logout saves 37,603 loaded raw JS bytes. No universal speed or accessibility certification is claimed. Full methods, new findings, measured values, limitations and file groups: [stabilization report](m122-stabilization.md). Earlier test counts and byte measurements remain historical evidence, superseded for this local revision by that report. No new merge blocker found; human acceptance and publication authorization remain separate.
