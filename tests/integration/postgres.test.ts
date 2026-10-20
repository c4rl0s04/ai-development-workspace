import assert from 'node:assert/strict';
import { randomUUID, createHmac } from 'node:crypto';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import postgres from 'postgres';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { connectDatabase } from '../../src/infrastructure/db/connection';
import { postgresWorkspaceStore } from '../../src/infrastructure/db/workspace-store';
import { workspaceService } from '../../src/application/workspace';
import { WorkspaceError, taskKey } from '../../src/domain/workspace';
import { reportFailure } from '../../src/infrastructure/diagnostics';

test('real PostgreSQL: migrations, constraints, RLS, concurrent writes, rollback and HTTP persistence', {
  timeout: 120000,
}, async (t) => {
  const adminUrl = process.env.TEST_DATABASE_URL;
  if (
    !adminUrl ||
    !['localhost', '127.0.0.1', '[::1]'].includes(new URL(adminUrl).hostname)
  )
    throw new Error(
      'TEST_DATABASE_URL must point to local PostgreSQL, never hosted Supabase.',
    );
  const admin = postgres(adminUrl, { onnotice: () => {} });
  const dbName = `m12_test_${randomUUID().replaceAll('-', '')}`;
  await admin.unsafe(`CREATE DATABASE ${dbName}`);
  const migrationUrl = new URL(adminUrl);
  migrationUrl.pathname = `/${dbName}`;
  const migrator = connectDatabase(migrationUrl.toString());
  let app: ReturnType<typeof connectDatabase> | undefined;
  try {
    await migrate(migrator.db, { migrationsFolder: './drizzle' });
    await migrate(migrator.db, { migrationsFolder: './drizzle' });
    await migrator.client.unsafe(
      "ALTER ROLE workspace_app LOGIN PASSWORD 'local-only-not-a-secret'",
    );
    const runtimeUrl = new URL(migrationUrl);
    runtimeUrl.username = 'workspace_app';
    runtimeUrl.password = 'local-only-not-a-secret';
    app = connectDatabase(runtimeUrl.toString());
    const runtime = app;
    const store = postgresWorkspaceStore(runtime.db);
    const owner = '159822857';
    const auth = {
      requireOwner: async () => ({
        userId: 'verified-user',
        githubProviderId: owner,
      }),
      requireOwnerMutation: async () => ({
        userId: 'verified-user',
        githubProviderId: owner,
      }),
    };
    const service = workspaceService(auth, () => store);
    const request = new Request('http://localhost', { method: 'POST' });
    const first = await service.createProject(request, {
      name: 'First project',
      key: 'ELS',
      description: 'Saved locally',
      repositoryUrl: 'https://github.com/OWNER/REPO.git',
    });
    const second = await service.createProject(request, {
      name: 'Second project',
      key: 'TWO',
    });
    await t.test(
      'project creation, retrieval, key uniqueness and invalid input',
      async () => {
        assert.equal((await service.listProjects()).items.length, 2);
        assert.equal(
          (await service.getProject(first.id)).project.repositoryUrl,
          'https://github.com/owner/repo',
        );
        await assert.rejects(
          () =>
            service.createProject(request, { name: 'Duplicate', key: 'els' }),
          (e: unknown) =>
            e instanceof WorkspaceError && e.code === 'unique_conflict',
        );
        await assert.rejects(
          () =>
            service.createTask(request, first.id, {
              title: '',
              status: 'done',
            }),
          WorkspaceError,
        );
        await assert.rejects(
          () =>
            service.createProject(request, {
              name: 'Bad',
              key: 'BAD',
              repositoryUrl: 'https://evil.example/a/b',
            }),
          WorkspaceError,
        );
      },
    );
    await t.test(
      'focused reads retain owner scope and avoid unnecessary task queries',
      async () => {
        const statements: string[] = [];
        runtime.client.options.debug = (_connection, query) => {
          statements.push(query);
        };
        try {
          assert.equal(
            (await service.getProjectSummary(first.id)).repositoryUrl,
            'https://github.com/owner/repo',
          );
          assert.equal(statements.length, 5);
          assert.ok(
            !statements.some((query) => query.includes('"workspace"."tasks"')),
          );
          statements.length = 0;
          await service.getProject(first.id);
          assert.equal(statements.length, 6);
          await assert.rejects(
            () => store.getProjectSummary('2', first.id),
            (error: unknown) =>
              error instanceof WorkspaceError && error.code === 'not_found',
          );
        } finally {
          runtime.client.options.debug = false;
        }
      },
    );
    const task = await service.createTask(request, first.id, {
      title: 'First task',
      description: 'Persistent details',
    });
    await t.test(
      'permission failures preserve safe diagnostics and roll back owner context',
      async () => {
        const events: string[] = [];
        const original = console.error;
        console.error = (event: string) => {
          events.push(event);
        };
        try {
          await migrator.client`revoke select on workspace.tasks from workspace_app`;
          await assert.rejects(
            () => service.getProject(first.id),
            (error: unknown) => {
              assert.ok(error instanceof WorkspaceError);
              assert.equal(error.code, 'unavailable');
              const reference = reportFailure(error, 'projects.get');
              assert.deepEqual(JSON.parse(events[0]), {
                event: 'server_failure',
                correlationId: reference,
                operation: 'projects.get',
                category: 'database_permission',
                sqlState: '42501',
              });
              assert.equal(error.cause, undefined);
              return true;
            },
          );
          assert.equal(events.length, 1);
          assert.equal(
            (await runtime.client`select * from workspace.projects`).length,
            0,
          );
        } finally {
          console.error = original;
          await migrator.client`grant select on workspace.tasks to workspace_app`;
        }
        assert.equal(
          (await service.getTask(first.id, task.id)).task.revision,
          1,
        );
      },
    );
    await t.test(
      'concurrent task allocation is unique, local and stable',
      async () => {
        assert.equal(taskKey(first, task), 'ELS-1');
        assert.equal(task.status, 'backlog');
        const created = await Promise.all(
          Array.from({ length: 16 }, (_, i) =>
            service.createTask(request, first.id, { title: `Concurrent ${i}` }),
          ),
        );
        assert.deepEqual(
          created.map((x) => x.number).sort((a, b) => a - b),
          Array.from({ length: 16 }, (_, i) => i + 2),
        );
        assert.equal(
          (
            await service.createTask(request, second.id, {
              title: 'Independent',
            })
          ).number,
          1,
        );
      },
    );
    await t.test(
      'optimistic project and task updates allow only one winner',
      async () => {
        const results = await Promise.allSettled(
          ['A', 'B'].map((name) =>
            service.editProject(request, first.id, {
              name,
              description: 'edited',
              repositoryUrl: 'https://github.com/owner/new',
              revision: first.revision,
            }),
          ),
        );
        assert.equal(results.filter((x) => x.status === 'fulfilled').length, 1);
        assert.equal(
          results.filter(
            (x) =>
              x.status === 'rejected' &&
              x.reason instanceof WorkspaceError &&
              x.reason.code === 'conflict',
          ).length,
          1,
        );
        const edits = await Promise.allSettled(
          ['A', 'B'].map((title) =>
            service.editTask(request, first.id, task.id, {
              title,
              description: 'edited',
              revision: task.revision,
            }),
          ),
        );
        assert.equal(edits.filter((x) => x.status === 'fulfilled').length, 1);
        assert.equal(
          edits.filter(
            (x) =>
              x.status === 'rejected' &&
              x.reason instanceof WorkspaceError &&
              x.reason.code === 'conflict',
          ).length,
          1,
        );
        assert.equal(
          (await service.getTask(first.id, task.id)).task.status,
          'backlog',
        );
      },
    );
    await t.test(
      'repository replacement retires history; one active association is constrained',
      async () => {
        const rows =
          await migrator.client`select * from workspace.project_repositories where project_id=${first.id}`;
        assert.equal(rows.length, 2);
        assert.equal(rows.filter((x) => x.retired_at === null).length, 1);
        await assert.rejects(
          () =>
            migrator.client`insert into workspace.project_repositories (project_id,url) values (${first.id},'https://github.com/a/b')`,
        );
        const current = (await service.getProject(first.id)).project;
        const cleared = await service.editProject(request, first.id, {
          name: current.name,
          description: current.description,
          repositoryUrl: '',
          revision: current.revision,
        });
        assert.equal(cleared.repositoryUrl, null);
        assert.equal(
          (
            await migrator.client`select * from workspace.project_repositories where project_id=${first.id} and retired_at is null`
          ).length,
          0,
        );
      },
    );
    await t.test(
      'cross-project IDs and other owner cannot read or edit resources',
      async () => {
        await assert.rejects(
          () => service.getTask(second.id, task.id),
          (e: unknown) => e instanceof WorkspaceError && e.code === 'not_found',
        );
        await assert.rejects(
          () =>
            service.editTask(request, second.id, task.id, {
              title: 'Cross project',
              description: '',
              revision: 2,
            }),
          WorkspaceError,
        );
        assert.equal((await store.listProjects('2', 1)).items.length, 0);
        await assert.rejects(
          () => store.getProject('2', first.id, 1),
          WorkspaceError,
        );
        await assert.rejects(
          () =>
            store.createTask('2', first.id, {
              title: 'Wrong owner',
              description: '',
            }),
          WorkspaceError,
        );
        await assert.rejects(
          () =>
            store.editProject('2', first.id, {
              name: 'Wrong',
              description: '',
              repositoryUrl: null,
              revision: 3,
            }),
          WorkspaceError,
        );
      },
    );
    await t.test(
      'failed transactions roll back task counter, project edit and repository retirement',
      async () => {
        const before = (
          await migrator.client`select next_task_number,revision from workspace.projects where id=${first.id}`
        )[0];
        await assert.rejects(
          () =>
            store.createTask(owner, first.id, { title: '', description: '' }),
          WorkspaceError,
        );
        const after = (
          await migrator.client`select next_task_number from workspace.projects where id=${first.id}`
        )[0];
        assert.equal(after.next_task_number, before.next_task_number);
        const p = (await service.getProject(first.id)).project;
        await assert.rejects(
          () =>
            store.editProject(owner, first.id, {
              name: 'Should roll back',
              description: '',
              repositoryUrl: 'invalid-url',
              revision: p.revision,
            }),
          WorkspaceError,
        );
        assert.equal((await service.getProject(first.id)).project.name, p.name);
        assert.equal(
          (await service.getProject(first.id)).project.revision,
          p.revision,
        );
        assert.equal(
          (
            await service.createTask(request, first.id, {
              title: 'After rollback',
            })
          ).number,
          before.next_task_number,
        );
      },
    );
    await t.test(
      'RLS is active for runtime role, context is reset, and dangerous SQL privileges are absent',
      async () => {
        const role = (
          await runtime.client`select rolsuper,rolbypassrls from pg_roles where rolname=current_user`
        )[0];
        assert.equal(role.rolsuper, false);
        assert.equal(role.rolbypassrls, false);
        assert.equal(
          (await runtime.client`select * from workspace.projects`).length,
          0,
        );
        await assert.rejects(
          () => runtime.client`delete from workspace.projects`,
        );
        await assert.rejects(
          () => runtime.client`update workspace.tasks set status='done'`,
        );
        await assert.rejects(
          () => runtime.client`update workspace.projects set key='NEW'`,
        );
        await assert.rejects(
          () =>
            migrator.client`insert into workspace.tasks (project_id,number,title,status) values (${first.id},999,'Invalid state','done')`,
        );
        await assert.rejects(
          () =>
            migrator.client`insert into workspace.tasks (project_id,number,title,status) values (${first.id},999,'Invalid state','on_hold')`,
        );
        await assert.rejects(
          () =>
            migrator.client`insert into workspace.tasks (project_id,number,title) values (${randomUUID()},1,'Orphan')`,
        );
        await assert.rejects(
          () => postgresWorkspaceStore(migrator.db).listProjects(owner, 1),
          WorkspaceError,
        );
      },
    );
    await t.test(
      'pool reconnect preserves records and database failures never claim success',
      async () => {
        const reconnect = connectDatabase(runtimeUrl.toString());
        try {
          assert.equal(
            (
              await postgresWorkspaceStore(reconnect.db).getTask(
                owner,
                first.id,
                task.id,
              )
            ).task.id,
            task.id,
          );
        } finally {
          await reconnect.client.end();
        }
        const badUrl = new URL(runtimeUrl);
        badUrl.port = '1';
        const broken = connectDatabase(badUrl.toString());
        const events: string[] = [];
        const original = console.error;
        console.error = (event: string) => {
          events.push(event);
        };
        try {
          await assert.rejects(
            () =>
              postgresWorkspaceStore(broken.db).createTask(owner, first.id, {
                title: 'Unavailable',
                description: '',
              }),
            (e: unknown) => {
              assert.ok(e instanceof WorkspaceError);
              assert.equal(e.code, 'unavailable');
              const reference = reportFailure(e, 'tasks.create');
              assert.deepEqual(JSON.parse(events[0]), {
                event: 'server_failure',
                correlationId: reference,
                operation: 'tasks.create',
                category: 'database_connection',
              });
              assert.ok(!e.message.includes('postgres://'));
              return true;
            },
          );
          assert.equal(events.length, 1);
        } finally {
          console.error = original;
          await broken.client.end();
        }
      },
    );
    await t.test(
      'built HTTP application saves through auth boundary and retains data across process restarts',
      async () => {
        const subject = '00000000-0000-4000-8000-000000000001';
        const signingKey = randomUUID();
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
        const issuer = createServer((_req, res) => {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(identity));
        });
        issuer.listen(0, '127.0.0.1');
        await once(issuer, 'listening');
        const addr = issuer.address();
        assert.ok(addr && typeof addr !== 'string');
        const header = Buffer.from(
          JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
        ).toString('base64url');
        const payload = Buffer.from(
          JSON.stringify({
            sub: subject,
            aud: 'authenticated',
            role: 'authenticated',
            is_anonymous: false,
            exp: Math.floor(Date.now() / 1000) + 3600,
            iat: Math.floor(Date.now() / 1000),
          }),
        ).toString('base64url');
        const signature = createHmac('sha256', signingKey)
          .update(`${header}.${payload}`)
          .digest('base64url');
        const cookie = `aw-auth=base64-${Buffer.from(JSON.stringify({ access_token: `${header}.${payload}.${signature}`, refresh_token: 'fixture-only', user: identity, expires_at: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url')}`;
        const start = async () => {
          const probe = createServer();
          probe.listen(0, '127.0.0.1');
          await once(probe, 'listening');
          const a = probe.address();
          assert.ok(a && typeof a !== 'string');
          const origin = `http://127.0.0.1:${a.port}`;
          await new Promise<void>((r) => probe.close(() => r()));
          const child = spawn(
            process.execPath,
            [
              'node_modules/next/dist/bin/next',
              'start',
              '--hostname',
              '127.0.0.1',
              '--port',
              String(a.port),
            ],
            {
              env: {
                ...process.env,
                APP_URL: origin,
                SUPABASE_URL: `http://127.0.0.1:${addr.port}`,
                SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_mock',
                OWNER_GITHUB_ID: owner,
                DATABASE_URL: runtimeUrl.toString(),
              },
              stdio: 'ignore',
            },
          );
          for (let i = 0; i < 100; i++) {
            try {
              if ((await fetch(`${origin}/login`)).ok) return { child, origin };
            } catch {}
            await new Promise((r) => setTimeout(r, 100));
          }
          child.kill();
          throw new Error('Build required for HTTP integration test');
        };
        let server = await start();
        const stop = async () => {
          server.child.kill();
          await once(server.child, 'exit');
        };
        try {
          const post = async (
            path: string,
            input: unknown,
            session = cookie,
            origin = server.origin,
          ) =>
            fetch(`${server.origin}${path}`, {
              method: 'POST',
              headers: {
                Cookie: session,
                Origin: origin,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(input),
              redirect: 'manual',
            });
          assert.equal(
            (
              await fetch(`${server.origin}/api/projects`, {
                redirect: 'manual',
              })
            ).status,
            401,
          );
          assert.equal(
            (
              await post(
                '/api/projects',
                { name: 'Spoof', key: 'SP' },
                cookie,
                'https://attacker.example',
              )
            ).status,
            403,
          );
          const created = await post('/api/projects', {
            name: 'HTTP persisted',
            key: 'HTTP',
          });
          assert.equal(created.status, 201);
          const saved = await created.json();
          const newTask = await post(
            `/api/projects/${saved.project.id}/tasks`,
            { title: 'From HTTP', description: '<script>not HTML</script>' },
          );
          assert.equal(newTask.status, 201);
          const savedTask = await newTask.json();
          const stale = await post(`/api/projects/${saved.project.id}`, {
            name: 'Changed',
            description: '',
            repositoryUrl: '',
            revision: 99,
          });
          assert.equal(stale.status, 409);
          await stop();
          server = await start();
          const page = await fetch(
            `${server.origin}/projects/${saved.project.id}`,
            { headers: { Cookie: cookie } },
          );
          assert.equal(page.status, 200);
          assert.match(await page.text(), /HTTP persisted/);
          const taskPage = await fetch(
            `${server.origin}${savedTask.location}`,
            { headers: { Cookie: cookie } },
          );
          const html = await taskPage.text();
          assert.equal(taskPage.status, 200);
          assert.match(html, /HTTP-1/);
          assert.ok(!html.includes('<script>not HTML</script>'));
          const mismatch = await fetch(
            `${server.origin}/api/projects/${second.id}/tasks/${savedTask.task.id}`,
            { headers: { Cookie: cookie }, redirect: 'manual' },
          );
          assert.equal(mismatch.status, 404);
          const denied = await fetch(`${server.origin}${savedTask.location}`, {
            headers: { Cookie: 'aw-auth=invalid' },
            redirect: 'manual',
          });
          assert.equal(denied.status, 307);
          assert.doesNotMatch(await denied.text(), /From HTTP|not HTML/);
        } finally {
          await stop();
          await new Promise<void>((r) => issuer.close(() => r()));
        }
      },
    );
  } finally {
    await app?.client.end();
    await migrator.client.end();
    // Only this test's randomly named disposable local database is removed.
    await admin.unsafe(`DROP DATABASE ${dbName} WITH (FORCE)`);
    await admin.end();
  }
});
