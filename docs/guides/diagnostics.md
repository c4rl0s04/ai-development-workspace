# Sanitized server diagnostics

Workspace HTTP handlers and record-page error boundaries emit one JSON `server_failure` event for an unexpected failure. Adapters attach sanitized classification to normalized errors; they do not log. Expected validation, uniqueness/revision conflicts, not-found and denied/expired-session outcomes do not emit events. Authorization, transaction rollback, safe messages and HTTP statuses are unchanged.

## Event contract

Only these fields are emitted:

- `event`: fixed `server_failure`.
- `correlationId`: a server-generated random UUID for this handled failure; incoming headers are never trusted or echoed.
- `operation`: a fixed identifier: `projects.list/get/summary/create/edit` or `tasks.get/create/edit`; invalid identifiers become `unknown`.
- `category`: `database_connection`, `database_tls`, `database_permission`, `database_timeout`, `database_query`, `database_failure`, `database_configuration`, `database_role`, `authentication_unavailable` or `unexpected`.
- Optional `sqlState`: only `08006`, `28P01`, `42501`, `57014`, `55P03`, `42601`, `42P01`, `42703`, `23503` or `23514`.

The implementation in `src/infrastructure/diagnostics.ts` reads only own data properties for driver codes and up to four nested causes. Unknown codes fall back to `database_failure`; unknown exceptions to `unexpected`. Raw causes are not retained on normalized errors. Messages, stacks, SQL, query parameters, connection strings, identities, headers, bodies, cookies, tokens and provider responses are never serialized. Do not add arbitrary fields or serialize error objects when extending this mechanism.

## Operator lookup

1. For a failed workspace JSON request, obtain the opaque `X-Correlation-ID` response header. Record pages display the same kind of opaque reference beneath the safe unavailable message.
2. Search the server's stderr/runtime logs for that exact UUID and `event=server_failure` (JSON field). The event identifies the operation/category and, where allowlisted, SQLSTATE.
3. Use deployment health/configuration and repeatable local tests to investigate that category. Do not request session cookies or paste database URLs/driver errors into issues.

HTTP bodies retain their existing safe contract. References contain no identity or resource information and are not authorization credentials. Existing page-level unavailable responses can still be HTTP 200; this change does not alter Next.js rendering/status behavior.

## Scope and limitations

This is best-effort operational logging, not a business audit/outbox, tracing system or durable delivery guarantee. Platform retention/access controls apply; a failed console write cannot change the application's error response. There is no process-wide request or identity cache. Each handling gets a fresh reference; no correlation across separate requests or retries is promised.

Only workspace HTTP/page boundaries are instrumented. Auth Proxy/login/callback/logout and failures outside these boundaries are unchanged. A workspace authentication outage is categorized, but a page's existing login redirect does not carry its reference. Nested database helpers do not emit additional events. Future adapters should report once at their own final response boundary, keeping application/domain services free of logging dependencies.

Tests exercise allowlists/redaction, safe public contracts, actual built HTTP reference propagation, and failures against disposable local PostgreSQL. No hosted failure injection or hosted log-retention verification is performed.
