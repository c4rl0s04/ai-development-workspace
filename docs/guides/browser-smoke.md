# Local browser smoke tests

Use Node 24.21.0 / npm 11.19.0. Playwright Test 1.58.2 is pinned as a development
dependency; it is not shipped in the application. No hosted configuration or
credentials are needed. Start local PostgreSQL as described in [persistence](persistence.md).

```sh
npm ci --ignore-scripts
npx --no-install playwright install chromium webkit
npm run build
# Export TEST_DATABASE_URL using the local administrative fixture connection.
npm run test:browser
```

`TEST_DATABASE_URL` must use a loopback host, with permission to create disposable
databases and provision the local runtime role. Hosted URLs are rejected.
The fixture creates a randomly named `browser_test_*` database per browser worker,
applies checked-in migrations, and launches the actual production build with the
restricted runtime role. It drops only that database during teardown. Use an
isolated PostgreSQL development/test cluster, not a database containing private data.
The local `workspace_app` role uses the documented test-only password; do not run
the suite concurrently with a different role-provisioning test on the same cluster.

Each browser gets a loopback mock Auth issuer with an ephemeral signing key.
Supabase SSR, owner services, HTTP requests, PostgreSQL and RLS remain the actual
application path. This does **not** verify GitHub/Supabase interoperability. No
test bypass or fixture route exists in the application; session state is in memory.
The suite never accepts a hosted base URL.

Four cases per engine cover:

- Real navigation and persisted project/task create/edit/reload, repository
  normalization, validation focus, saving locks and long-content mobile reflow.
- Unknown URL/missing project/task content: one main landmark and skip target.
- Actual streamed loading while a disposable-database table lock delays the read;
  recovery after releasing it, with computed skeleton sizes.
- Keyboard/skip navigation, native logout and post-logout denial, reduced-motion/opaque/forced-color
  fallbacks and visible recovery after a deliberately intercepted 503 response.

The error-recovery case is a browser-layer fault injection, not an actual database
outage. SQL constraints/authorization/concurrency and full OAuth failure matrices
remain in the existing unit/HTTP/PostgreSQL suites rather than being repeated here.
WebKit uses Option+Tab for link keyboard navigation in its default desktop mode.

CI runs one worker, no retries, with a three-minute suite limit. It uses its existing
PostgreSQL 17 service, installs Chromium/WebKit system dependencies and runs the same
production build. This follows [Playwright's CI guidance](https://playwright.dev/docs/ci).
`test-results/` is ignored; failure screenshots contain only synthetic local UI.
Traces, videos, cookie files and storage-state exports are disabled. Never upload
credentials or raw provider/driver output as artifacts.

Run one engine with `npm run test:browser -- --project=chromium`. Browser assertions
do not certify screen-reader, physical-device or live provider behavior.
