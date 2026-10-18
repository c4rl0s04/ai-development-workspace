import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connectDatabase } from '../src/infrastructure/db/connection';

// Deliberately local-only: hosted changes require a separately reviewed runbook.
const url = process.env.DATABASE_MIGRATION_URL;
if (
  !url ||
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
)
  throw new Error('Migration command accepts only a local PostgreSQL URL.');
const connection = connectDatabase(url);
try {
  await migrate(connection.db, { migrationsFolder: './drizzle' });
  console.log('Local migrations complete.');
} catch {
  process.exitCode = 1;
  console.error(
    'Local migration failed. Inspect local schema and migration history.',
  );
} finally {
  await connection.client.end();
}
