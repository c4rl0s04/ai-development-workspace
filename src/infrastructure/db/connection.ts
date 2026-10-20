import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { WorkspaceError } from '../../domain/workspace';
import { markFailure } from '../diagnostics';

export function connectDatabase(value: string | undefined) {
  try {
    const url = new URL(value ?? '');
    const local = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.username ||
      !url.password ||
      url.search ||
      url.hash
    )
      throw new Error();
    // Remote TLS is verified; URL options cannot silently disable it.
    const client = postgres(url.toString(), {
      prepare: false,
      max: 4,
      connect_timeout: 3,
      idle_timeout: 20,
      ssl: local
        ? false
        : { rejectUnauthorized: true, ca: process.env.DATABASE_CA_CERT },
      connection: { statement_timeout: 5000, lock_timeout: 3000 },
      onnotice: () => {},
    });
    return { client, db: drizzle(client) };
  } catch {
    throw markFailure(
      new WorkspaceError('unavailable', 'Storage is temporarily unavailable.'),
      'database_configuration',
    );
  }
}
