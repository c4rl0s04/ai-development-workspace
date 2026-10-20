import { test as base, expect } from '@playwright/test';
import {
  randomBytes,
  randomUUID,
  createHmac,
  timingSafeEqual,
} from 'node:crypto';
import { createServer, type Server } from 'node:http';
import { once } from 'node:events';
import { spawn } from 'node:child_process';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

const owner = '159822857';
const subject = '8ccaa7af-909f-44e7-84cb-67cdccb56be6';

async function listen(server: Server) {
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string')
    throw new Error('Local listener required');
  return `http://127.0.0.1:${address.port}`;
}

type Backend = {
  origin: string;
  cookie: string;
  holdProjectReads(): Promise<() => Promise<void>>;
};

export const test = base.extend<object, { backend: Backend }>({
  backend: [
    async ({ browserName }, use) => {
      let source: URL;
      try {
        source = new URL(process.env.TEST_DATABASE_URL ?? '');
        if (
          !['localhost', '127.0.0.1', '[::1]'].includes(source.hostname) ||
          !['postgres:', 'postgresql:'].includes(source.protocol) ||
          source.search ||
          source.hash
        )
          throw new Error();
      } catch {
        throw new Error(
          'Browser tests require TEST_DATABASE_URL on local PostgreSQL.',
        );
      }
      const admin = postgres(source.toString(), { onnotice: () => {} });
      const database = `browser_test_${browserName}_${randomUUID().replaceAll('-', '')}`;
      await admin.unsafe(`CREATE DATABASE ${database}`);
      const url = new URL(source);
      url.pathname = `/${database}`;
      const migrator = postgres(url.toString(), { onnotice: () => {} });
      let issuer: Server | undefined;
      let child: ReturnType<typeof spawn> | undefined;
      try {
        await migrate(drizzle(migrator), { migrationsFolder: './drizzle' });
        await migrator.unsafe(
          "ALTER ROLE workspace_app LOGIN PASSWORD 'local-only-not-a-secret'",
        );
        url.username = 'workspace_app';
        url.password = 'local-only-not-a-secret';
        const key = randomBytes(32);
        const identity = {
          id: subject,
          aud: 'authenticated',
          role: 'authenticated',
          is_anonymous: false,
          identities: [{ id: owner, user_id: subject, provider: 'github' }],
          app_metadata: {},
          user_metadata: {},
          created_at: new Date().toISOString(),
        };
        const encode = (value: unknown) =>
          Buffer.from(JSON.stringify(value)).toString('base64url');
        const data = `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode({
          sub: subject,
          aud: 'authenticated',
          role: 'authenticated',
          is_anonymous: false,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        })}`;
        const token = `${data}.${createHmac('sha256', key).update(data).digest('base64url')}`;
        issuer = createServer((request, response) => {
          try {
            const logout = request.url?.startsWith('/auth/v1/logout');
            if (request.url !== '/auth/v1/user' && !logout) throw new Error();
            const [header, payload, signature] = (
              request.headers.authorization ?? ''
            )
              .replace('Bearer ', '')
              .split('.');
            const expected = createHmac('sha256', key)
              .update(`${header}.${payload}`)
              .digest();
            const actual = Buffer.from(signature, 'base64url');
            if (
              actual.length !== expected.length ||
              !timingSafeEqual(actual, expected)
            )
              throw new Error();
            const claims = JSON.parse(
              Buffer.from(payload, 'base64url').toString(),
            );
            if (claims.sub !== subject || claims.exp <= Date.now() / 1000)
              throw new Error();
            if (logout) {
              response.writeHead(204);
              response.end();
              return;
            }
            response.setHeader('Content-Type', 'application/json');
            response.end(JSON.stringify(identity));
          } catch {
            response.writeHead(401);
            response.end('{}');
          }
        });
        const authOrigin = await listen(issuer);
        const probe = createServer();
        const origin = await listen(probe);
        await new Promise<void>((resolve) => probe.close(() => resolve()));
        child = spawn(
          process.execPath,
          [
            'node_modules/next/dist/bin/next',
            'start',
            '--hostname',
            '127.0.0.1',
            '--port',
            new URL(origin).port,
          ],
          {
            env: {
              ...process.env,
              APP_URL: origin,
              SUPABASE_URL: authOrigin,
              SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock',
              OWNER_GITHUB_ID: owner,
              DATABASE_URL: url.toString(),
              DATABASE_CA_CERT: '',
            },
            stdio: 'ignore',
          },
        );
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          if (child.exitCode !== null) break;
          try {
            if ((await fetch(`${origin}/login`)).ok) {
              ready = true;
              break;
            }
          } catch {}
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
        if (!ready)
          throw new Error(
            'Local browser server failed to start; run npm run build first.',
          );
        const cookie = `base64-${encode({
          access_token: token,
          refresh_token: 'fixture-only',
          token_type: 'bearer',
          expires_in: 3600,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          user: identity,
        })}`;
        await use({
          origin,
          cookie,
          async holdProjectReads() {
            const lock = await migrator.reserve();
            await lock`begin`;
            await lock`lock table workspace.projects in access exclusive mode`;
            return async () => {
              await lock`rollback`;
              lock.release();
            };
          },
        });
      } finally {
        if (child && child.exitCode === null) {
          const exited = once(child, 'exit');
          child.kill();
          await exited;
        }
        if (issuer?.listening)
          await new Promise<void>((resolve) => issuer?.close(() => resolve()));
        await migrator.end();
        await admin.unsafe(`DROP DATABASE ${database} WITH (FORCE)`);
        await admin.end();
      }
    },
    { scope: 'worker' },
  ],
  context: async ({ browser, backend }, use) => {
    const context = await browser.newContext({ baseURL: backend.origin });
    await context.addCookies([
      {
        name: 'aw-auth',
        value: backend.cookie,
        url: backend.origin,
        httpOnly: true,
        sameSite: 'Lax',
      },
    ]);
    try {
      await use(context);
    } finally {
      await context.close();
    }
  },
});

export { expect };
