import { sql } from 'drizzle-orm';
import {
  pgSchema,
  uuid,
  text,
  integer,
  timestamp,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { statuses } from '../../domain/workspace';

export const workspaceSchema = pgSchema('workspace');
export const taskStatus = workspaceSchema.enum('task_status', statuses);
const timestamps = () => ({
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
export const users = workspaceSchema
  .table(
    'users',
    {
      id: uuid().primaryKey().defaultRandom(),
      githubProviderId: text('github_provider_id').notNull().unique(),
      createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    },
    (t) => [
      check('github_id_format', sql`${t.githubProviderId} ~ '^[1-9][0-9]*$'`),
    ],
  )
  .enableRLS();
export const projects = workspaceSchema
  .table(
    'projects',
    {
      id: uuid().primaryKey().defaultRandom(),
      ownerId: uuid('owner_id')
        .notNull()
        .references(() => users.id, { onDelete: 'restrict' }),
      key: text().notNull(),
      name: text().notNull(),
      description: text().notNull().default(''),
      revision: integer().notNull().default(1),
      nextTaskNumber: integer('next_task_number').notNull().default(1),
      ...timestamps(),
    },
    (t) => [
      uniqueIndex('projects_owner_key').on(t.ownerId, t.key),
      index('projects_owner_created').on(t.ownerId, t.createdAt, t.id),
      check('project_key_format', sql`${t.key} ~ '^[A-Z][A-Z0-9]{1,9}$'`),
      check(
        'project_name_length',
        sql`length(btrim(${t.name})) between 1 and 100`,
      ),
      check(
        'project_description_length',
        sql`length(${t.description}) <= 10000`,
      ),
      check(
        'project_positive_counters',
        sql`${t.revision} > 0 and ${t.nextTaskNumber} > 0`,
      ),
    ],
  )
  .enableRLS();
export const repositories = workspaceSchema
  .table(
    'project_repositories',
    {
      id: uuid().primaryKey().defaultRandom(),
      projectId: uuid('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'restrict' }),
      url: text().notNull(),
      createdAt: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
      retiredAt: timestamp('retired_at', { withTimezone: true }),
    },
    (t) => [
      uniqueIndex('one_active_repository')
        .on(t.projectId)
        .where(sql`${t.retiredAt} is null`),
      index('repository_project').on(t.projectId),
      check(
        'repository_url_format',
        sql`${t.url} ~ '^https://github[.]com/[a-z0-9][a-z0-9-]{0,38}/[a-z0-9_.-]{1,100}$'`,
      ),
    ],
  )
  .enableRLS();
export const tasks = workspaceSchema
  .table(
    'tasks',
    {
      id: uuid().primaryKey().defaultRandom(),
      projectId: uuid('project_id')
        .notNull()
        .references(() => projects.id, { onDelete: 'restrict' }),
      number: integer().notNull(),
      title: text().notNull(),
      description: text().notNull().default(''),
      status: taskStatus().notNull().default('backlog'),
      revision: integer().notNull().default(1),
      ...timestamps(),
    },
    (t) => [
      uniqueIndex('tasks_project_number').on(t.projectId, t.number),
      check(
        'task_title_length',
        sql`length(btrim(${t.title})) between 1 and 200`,
      ),
      check('task_description_length', sql`length(${t.description}) <= 10000`),
      check('task_positive_counters', sql`${t.number}>0 and ${t.revision}>0`),
    ],
  )
  .enableRLS();
