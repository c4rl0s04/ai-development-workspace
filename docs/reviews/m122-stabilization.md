# PR #12 — final local stabilization

2026-10-20. Base: `8b7209c5e71fbbc5f4f82a7c37d735330a98b570`.
Starting PR head: `93be299`. This report describes the subsequent local changes;
it does not authorize publication, merge or deployment.

## Confirmed problems and corrections

| Problem | Correction / evidence |
| --- | --- |
| Missing records could nest root NotFound's main inside the protected shell and duplicate the skip target | Shared NotFoundContent plus a workspace-specific boundary. Root unknown URLs retain their own main. Unit composition and real missing-project/task browser cases verify exactly one main, H1 and target. |
| White primary-hover labels were 4.26:1 against #607d9f | Restrained darker #5b7799 gives approximately 4.62:1; browser checks use actual computed background/text. This is a specific color-pair check, not WCAG certification. |
| Valid unbroken project names could overflow the task heading description on mobile | Shared heading description wraps; real CRUD smoke uses a 100-character name and checks 1440/390/320px reflow. |
| Busy Cancel links blocked navigation but retained an enabled appearance | The existing aria-disabled state now uses disabled control feedback; browser checks hold the actual save request until the assertions complete. No arbitrary delay or mutation behavior change. |
| Static logout loaded the interactive client Button factory | Native POST button uses the identical shared recipe. Measured byte reduction below; shared Base UI/Liqui Button remains available and has keyboard/native-submit regression coverage. |
| Obsolete worktree/push gates and milestone descriptions conflicted | Root/nested instructions audited; historical evidence remains in guides, durable security rules and task-specific publication authority remain explicit. Removed one obsolete lab color-token reference. |

Main files: root AGENTS/README/PRODUCT and auth/persistence/frontend guides;
NotFound route/content adapters, PageHeading, WorkspaceShell, theme CSS;
Playwright config/fixtures/spec, Button and page tests, package lock, CI and ignores.
No domain, application-service, server, database-adapter, migration, Auth or API logic changed.

## Automated and rendered verification

Node 24.21.0 / npm 11.19.0, Apple M2 / macOS 26.6.2 arm64. Clean installation with
scripts disabled, format, lint, TypeScript, 24 unit/render/DOM passes, production
build, 2 built HTTP passes and 11 PostgreSQL TAP passes. Local PostgreSQL is
17.11; CI retains its isolated 17.7 service. The new suite has 8 browser cases
(4 per Chromium/WebKit), one worker and no retries. See [running it](../guides/browser-smoke.md).
The GitHub Actions workflow is updated locally; it has **not** run on these unpushed commits.

New browser cases verify actual application navigation, project/task create/edit,
repository normalization, reload persistence, native validation, server-error focus,
save locks, native logout/post-logout denial, mobile/long-content reflow, missing-record boundaries and real streamed
loading while a local PostgreSQL lock delays a read. A separate intercepted 503
checks uncertain-create UI recovery; it is not a live outage test. Existing HTTP/DB
suites retain the detailed authorization, expiry, revision and transaction matrix.

Additional rendered checks observed, rather than inherited from earlier reports:

- Chromium **actual 200% browser zoom** using a temporary extension's
  chrome.tabs.setZoom(2), independently confirmed by getZoom. CSS viewport changed
  1440 → 720px; Overview, Projects, project creation and Approvals retained one main
  and no horizontal document overflow. Screenshots captured through CDP without
  a clip (Playwright's default clip cropped the zoomed viewport). No CSS zoom or
  device-scale substitution was used. Extension/profile remain outside Git.
- Both engines matched forced-colors and preferred-contrast media, showed readable
  system-color/opaque surfaces, and reduced motion to zero-duration navigation
  transitions. Chromium CDP additionally matched reduced-transparency directly;
  WebKit's direct reduced-transparency preference was not independently emulated.
- Non-native glass Button Enter/Space activation, disabled denial and native solid
  form submission pass using the actual components in JSDOM. CSS is not rendered
  by that unit test; rendered production submit controls are native buttons.

Screenshots/JSON/tooling: `~/Documents/Projects/ai-development-workspace-reviews/m1-visual-redesign/`
under `stabilization-accessibility/` and `stabilization-performance/`. They contain
synthetic UI/metrics, never cookies, tokens or connection strings.

## Reproducible production comparison

Baseline was extracted with `git archive 8b7209c`, then independently installed
with `npm ci --ignore-scripts` and built. Three sequential batches compare base,
preoptimization PR and final native-logout build, with equivalent loopback Auth
fixtures and synthetic local database. No hosted traffic or records.

Playwright 1.58.2; bundled Chromium 145.0.7632.6 and WebKit 26.0; headless desktop
1440×1000/DPR1, no CPU/network throttling. Seven fresh-cache contexts per browser
and build; discard sample0 for startup, retain six. Each flow loads Overview,
settles network +500ms, clicks Projects and waits for its heading plus two frames.
All 42 sampled flows had HTTP200 and zero page/HTTP errors. Timing values below
are medians in ms; full ranges/raw results and exact scripts accompany the evidence.

| Metric | Base | Preoptimization | Final |
| --- | ---: | ---: | ---: |
| Emitted static JS, all chunks (bytes) | 592,057 | not re-counted | 604,995 |
| Loaded Overview JS, decoded bytes | 466,004 | 516,633 | 479,030 |
| Chromium Overview JS transferred bytes, including headers | 142,309 | 160,233 | 147,492 |
| WebKit Overview JS transferred bytes | 142,488 | 160,435 | 147,672 |
| Chromium request-to-response TTFB | 12.40 | 40.55 | 16.45 |
| Chromium FCP / LCP | 74 / 74 | 188 / 188 | 130 / 130 |
| Chromium cumulative script / main-thread task time | 21.34 / 91.96 | 53.46 / 179.85 | 40.64 / 155.38 |
| Chromium click-to-heading-plus-two-frames | 133.2 | 160.0 | 147.6 |
| WebKit TTFB / FCP / LCP | 37 / 122.5 / 122.5 | 18.5 / 74.5 / 74.5 | 36 / 134.5 / 134.5 |
| WebKit click-to-heading-plus-two-frames | 868.5 | 871.5 | 867.0 |
| Observed CLS, both browsers | 0 | 0 | 0 |
| Additional Projects-navigation JS bytes, both browsers | 0 | 0 | 0 |

Final transfer is +3.6% versus base, reduced from +12.6%; native logout saves
37,603 loaded decoded bytes and 12,741 Chromium transferred bytes. All-chunk JS is
+12,938 bytes (+2.2%) versus base. These exact byte savings justify the bounded
optimization without removing approved glass materials or security checks.

Timing is less conclusive: Chromium base/final FCP ranges were 64–152/104–320ms,
and WebKit 39–176/94–169ms. Sequential local batches have overlapping ranges and
cross-browser variation. Final medians still cost more than the base; do not claim
the new frontend is faster. Chromium Long Task median count was0 final, but range
0–2 (up to114ms total). CDP script/task time includes runtime/hydration/browser
work; **exclusive hydration is unmeasured**. The click metric includes Playwright
input overhead and is **not INP**. WebKit Long Tasks/CDP are unavailable, not zero.
Prefetch/cache behavior contributes to zero additional navigation JS.

For an exact rerun on this machine, start equivalent fixture issuers/app processes
for each separately built checkout, then run the archived `measure-portable.mjs`
from a checkout with Playwright installed:

```sh
PERF_OUTPUT_DIR=/path/to/results node /path/to/measure-portable.mjs LABEL APP_PORT FIXTURE_PORT
```

It only constructs loopback URLs. FIXTURE_PORT serves an ephemeral fixture session
in memory; never use real session material. `method.md` records setup and observer
definitions; `comparison.md` includes medians/ranges. This is reproducible local
lab evidence, not a CDN/region/real-user benchmark.

## Remaining limits and release decision

Locally ready for human code/visual review, with no new blocker identified. No
publication or merge performed. Real GitHub login/non-owner/revocation validation
(#7), physical Safari/devices, screen readers, Firefox and low-end GPU/throttled
performance remain unverified here. Frosted chrome is limited to two surfaces;
there is no per-record optical lens, animated blur or new animation dependency.
Opaque/system-color fallbacks work in the observed engines; their presence does
not prove glass is cheap on every GPU.

Inherited #10 (mandatory before MCP writes), #11 diagnostics, page-level unavailable
200 responses and non-idempotent creates remain out of scope. Safe uncertain-create
reconciliation is preserved; exactly-once creation is not promised. Production
configuration, independent MCP and hosted data were untouched.
