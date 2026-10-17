import postgres from 'postgres';
const url = process.env.DATABASE_MIGRATION_URL;
if (
  !url ||
  !['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname)
)
  throw new Error('Local database URL required.');
const client = postgres(url, { onnotice: () => {} });
try {
  // Disposable local credential only. Remote role provisioning is separately reviewed.
  await client.unsafe(
    "ALTER ROLE workspace_app LOGIN PASSWORD 'local-only-not-a-secret'",
  );
  console.log('Local runtime role ready.');
} catch {
  console.error('Run local migrations before local role setup.');
  process.exitCode = 1;
} finally {
  await client.end();
}
