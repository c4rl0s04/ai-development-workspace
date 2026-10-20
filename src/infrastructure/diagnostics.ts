import { randomUUID } from 'node:crypto';
import { AccessError } from '../application/auth/owner';
import { WorkspaceError } from '../domain/workspace';

const operations = [
  'projects.list',
  'projects.get',
  'projects.summary',
  'projects.create',
  'projects.edit',
  'tasks.get',
  'tasks.create',
  'tasks.edit',
] as const;
export type Operation = (typeof operations)[number];
const categories = [
  'database_connection',
  'database_tls',
  'database_permission',
  'database_timeout',
  'database_query',
  'database_failure',
  'database_configuration',
  'database_role',
  'authentication_unavailable',
  'unexpected',
] as const;
type Category = (typeof categories)[number];
type Detail = { category: Category; sqlState?: string };
const sqlStates: Record<string, Category> = {
  '08006': 'database_connection',
  '28P01': 'database_permission',
  '42501': 'database_permission',
  '57014': 'database_timeout',
  '55P03': 'database_timeout',
  '42601': 'database_query',
  '42P01': 'database_query',
  '42703': 'database_query',
  '23503': 'database_query',
  '23514': 'database_query',
};
const connectionCodes = [
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
  'CONNECT_TIMEOUT',
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
];
const tlsCodes = [
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
];
// Only sanitized metadata survives normalization; never retain a raw cause.
const details = new WeakMap<Error, Detail>();

function ownValue(value: object, key: string): unknown {
  try {
    return Object.getOwnPropertyDescriptor(value, key)?.value;
  } catch {
    return undefined;
  }
}

export function markFailure<T extends Error>(
  error: T,
  category: 'database_configuration' | 'database_role',
): T {
  details.set(error, { category });
  return error;
}

export function databaseFailure<T extends Error>(
  safeError: T,
  raw: unknown,
): T {
  let detail: Detail = { category: 'database_failure' };
  // Drizzle wraps driver errors. Bound traversal, including cyclic/malicious causes.
  for (let depth = 0; depth < 4 && raw && typeof raw === 'object'; depth++) {
    const code = ownValue(raw, 'code');
    if (typeof code === 'string') {
      if (Object.hasOwn(sqlStates, code)) {
        detail = { category: sqlStates[code], sqlState: code };
        break;
      }
      if (connectionCodes.includes(code)) {
        detail = { category: 'database_connection' };
        break;
      }
      if (tlsCodes.includes(code)) {
        detail = { category: 'database_tls' };
        break;
      }
    }
    raw = ownValue(raw, 'cause');
  }
  details.set(safeError, detail);
  return safeError;
}

export function reportFailure(
  error: unknown,
  operation: Operation,
): string | undefined {
  if (error instanceof WorkspaceError && error.code !== 'unavailable') return;
  if (error instanceof AccessError && error.reason !== 'unavailable') return;
  const detail = error instanceof Error ? details.get(error) : undefined;
  const category =
    detail?.category ??
    (error instanceof AccessError
      ? 'authentication_unavailable'
      : 'unexpected');
  const correlationId = randomUUID();
  // Construct from allowlists; no spreading/serialization of exceptions or requests.
  const event = {
    event: 'server_failure',
    correlationId,
    operation: operations.includes(operation) ? operation : 'unknown',
    category: categories.includes(category) ? category : 'unexpected',
    ...(detail?.sqlState && Object.hasOwn(sqlStates, detail.sqlState)
      ? { sqlState: detail.sqlState }
      : {}),
  };
  try {
    console.error(JSON.stringify(event));
  } catch {
    /* Diagnostic I/O must not change the failure response. */
  }
  return correlationId;
}
