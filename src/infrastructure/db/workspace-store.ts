import { and, eq, isNull, sql, desc } from 'drizzle-orm';
import type { WorkspaceStore } from '../../application/workspace';
import { WorkspaceError, pageSize, type Project } from '../../domain/workspace';
import { users, projects, repositories, tasks } from './schema';
import type { connectDatabase } from './connection';
import { databaseFailure, markFailure } from '../diagnostics';

type Database = ReturnType<typeof connectDatabase>['db'];
type Tx = Parameters<Parameters<Database['transaction']>[0]>[0];
const notFound = () =>
  new WorkspaceError('not_found', 'This record was not found.');
const conflict = () =>
  new WorkspaceError(
    'conflict',
    'This record changed. Reload it before editing again. Your changes have not been saved.',
  );

function projectRecord(
  row: typeof projects.$inferSelect,
  repositoryUrl: string | null,
): Project {
  return {
    id: row.id,
    ownerId: row.ownerId,
    key: row.key,
    name: row.name,
    description: row.description,
    revision: row.revision,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    repositoryUrl,
  };
}

export function postgresWorkspaceStore(db: Database): WorkspaceStore {
  async function scoped<T>(owner: string, work: (tx: Tx) => Promise<T>) {
    try {
      return await db.transaction(async (tx) => {
        const role = await tx.execute<{ role: string; unsafe: boolean }>(
          sql`select current_user as role, (rolsuper or rolbypassrls) as unsafe from pg_roles where rolname=current_user`,
        );
        if (role[0]?.role !== 'workspace_app' || role[0]?.unsafe)
          throw markFailure(
            new WorkspaceError(
              'unavailable',
              'Storage role is not configured safely.',
            ),
            'database_role',
          );
        // Transaction-local context cannot leak when a pooled connection is reused.
        await tx.execute(
          sql`select set_config('workspace.owner_github_id',${owner},true)`,
        );
        return work(tx);
      });
    } catch (error) {
      if (error instanceof WorkspaceError) throw error;
      const cause =
        error && typeof error === 'object' && 'cause' in error
          ? error.cause
          : error;
      if (
        cause &&
        typeof cause === 'object' &&
        'code' in cause &&
        cause.code === '23505'
      )
        throw new WorkspaceError(
          'unique_conflict',
          'That project key or repository association already exists. Choose a unique key or reload.',
        );
      throw databaseFailure(
        new WorkspaceError(
          'unavailable',
          'Storage is temporarily unavailable. The save could not be confirmed; reload before retrying.',
        ),
        error,
      );
    }
  }
  const owned = (owner: string) =>
    eq(
      projects.ownerId,
      sql`(select id from workspace.users where github_provider_id = ${owner})`,
    );
  async function project(tx: Tx, owner: string, id: string): Promise<Project> {
    const [row] = await tx
      .select({ project: projects, repositoryUrl: repositories.url })
      .from(projects)
      .leftJoin(
        repositories,
        and(
          eq(repositories.projectId, projects.id),
          isNull(repositories.retiredAt),
        ),
      )
      .where(and(eq(projects.id, id), owned(owner)));
    if (!row) throw notFound();
    return projectRecord(row.project, row.repositoryUrl);
  }

  async function repository(tx: Tx, projectId: string, url: string | null) {
    const [current] = await tx
      .select()
      .from(repositories)
      .where(
        and(
          eq(repositories.projectId, projectId),
          isNull(repositories.retiredAt),
        ),
      );
    if ((current?.url ?? null) === url) return;
    if (current)
      await tx
        .update(repositories)
        .set({ retiredAt: new Date() })
        .where(eq(repositories.id, current.id));
    if (url) await tx.insert(repositories).values({ projectId, url });
  }
  return {
    listProjects: (owner, page) =>
      scoped(owner, async (tx) => {
        const rows = await tx
          .select({ project: projects, repositoryUrl: repositories.url })
          .from(projects)
          .leftJoin(
            repositories,
            and(
              eq(repositories.projectId, projects.id),
              isNull(repositories.retiredAt),
            ),
          )
          .where(owned(owner))
          .orderBy(desc(projects.createdAt), desc(projects.id))
          .limit(pageSize + 1)
          .offset((page - 1) * pageSize);
        return {
          items: rows
            .slice(0, pageSize)
            .map((r) => projectRecord(r.project, r.repositoryUrl)),
          hasMore: rows.length > pageSize,
        };
      }),
    getProjectSummary: (owner, id) =>
      scoped(owner, (tx) => project(tx, owner, id)),
    getProject: (owner, id, page) =>
      scoped(owner, async (tx) => {
        const found = await project(tx, owner, id);
        const rows = await tx
          .select()
          .from(tasks)
          .where(eq(tasks.projectId, id))
          .orderBy(desc(tasks.number))
          .limit(pageSize + 1)
          .offset((page - 1) * pageSize);
        return {
          project: found,
          tasks: {
            items: rows.slice(0, pageSize),
            hasMore: rows.length > pageSize,
          },
        };
      }),
    createProject: (owner, input) =>
      scoped(owner, async (tx) => {
        await tx
          .insert(users)
          .values({ githubProviderId: owner })
          .onConflictDoNothing();
        const [user] = await tx
          .select()
          .from(users)
          .where(eq(users.githubProviderId, owner));
        const [row] = await tx
          .insert(projects)
          .values({
            ownerId: user.id,
            key: input.key,
            name: input.name,
            description: input.description,
          })
          .returning();
        await repository(tx, row.id, input.repositoryUrl);
        return projectRecord(row, input.repositoryUrl);
      }),
    editProject: (owner, id, input) =>
      scoped(owner, async (tx) => {
        const [row] = await tx
          .update(projects)
          .set({
            name: input.name,
            description: input.description,
            revision: sql`${projects.revision}+1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(projects.id, id),
              owned(owner),
              eq(projects.revision, input.revision),
            ),
          )
          .returning();
        if (!row) {
          await project(tx, owner, id);
          throw conflict();
        }
        await repository(tx, id, input.repositoryUrl);
        return projectRecord(row, input.repositoryUrl);
      }),
    getTask: (owner, projectId, id) =>
      scoped(owner, async (tx) => {
        const found = await project(tx, owner, projectId);
        const [task] = await tx
          .select()
          .from(tasks)
          .where(and(eq(tasks.id, id), eq(tasks.projectId, projectId)));
        if (!task) throw notFound();
        return { project: found, task };
      }),
    createTask: (owner, projectId, input) =>
      scoped(owner, async (tx) => {
        const [counter] = await tx
          .update(projects)
          .set({ nextTaskNumber: sql`${projects.nextTaskNumber}+1` })
          .where(and(eq(projects.id, projectId), owned(owner)))
          .returning({ number: sql<number>`${projects.nextTaskNumber}-1` });
        if (!counter) throw notFound();
        const [task] = await tx
          .insert(tasks)
          .values({
            projectId,
            number: counter.number,
            title: input.title,
            description: input.description,
          })
          .returning();
        return task;
      }),
    editTask: (owner, projectId, id, input) =>
      scoped(owner, async (tx) => {
        await project(tx, owner, projectId);
        const [task] = await tx
          .update(tasks)
          .set({
            title: input.title,
            description: input.description,
            revision: sql`${tasks.revision}+1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(tasks.id, id),
              eq(tasks.projectId, projectId),
              eq(tasks.revision, input.revision),
            ),
          )
          .returning();
        if (!task) {
          const [exists] = await tx
            .select({ id: tasks.id })
            .from(tasks)
            .where(and(eq(tasks.id, id), eq(tasks.projectId, projectId)));
          if (!exists) throw notFound();
          throw conflict();
        }
        return task;
      }),
  };
}
