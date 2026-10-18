import { z } from 'zod';

export const statuses = [
  'backlog',
  'specification',
  'pending_review',
  'ready',
  'in_progress',
  'review',
  'done',
] as const;
export const statusLabels: Record<(typeof statuses)[number], string> = {
  backlog: 'Backlog',
  specification: 'Specification',
  pending_review: 'Pending review',
  ready: 'Ready',
  in_progress: 'In progress',
  review: 'Review',
  done: 'Done',
};
const name = z.string().trim().min(1, 'Enter a name.').max(100);
const description = z.string().trim().max(10000).default('');
export const repositoryUrl = z
  .string()
  .trim()
  .max(300)
  .transform((value, ctx) => {
    if (!value) return null;
    const match =
      /^https:\/\/github\.com\/([a-z\d](?:[a-z\d-]{0,38}))\/([a-z\d_.-]{1,100}?)\/?$/i.exec(
        value,
      );
    const repo = match?.[2].replace(/\.git$/i, '');
    if (!match || !repo || repo === '.' || repo === '..') {
      ctx.addIssue({
        code: 'custom',
        message:
          'Use https://github.com/owner/repository without query, fragment or credentials.',
      });
      return z.NEVER;
    }
    return `https://github.com/${match[1].toLowerCase()}/${repo.toLowerCase()}`;
  });
export const projectInput = z
  .object({
    name,
    key: z
      .string()
      .trim()
      .toUpperCase()
      .regex(
        /^[A-Z][A-Z0-9]{1,9}$/,
        'Use 2–10 letters/digits, starting with a letter.',
      ),
    description,
    repositoryUrl: repositoryUrl.prefault(''),
  })
  .strict();
export const projectEdit = projectInput
  .omit({ key: true })
  .extend({ revision: z.number().int().positive() })
  .strict();
export const taskInput = z
  .object({
    title: z.string().trim().min(1, 'Enter a title.').max(200),
    description,
  })
  .strict();
export const taskEdit = taskInput
  .extend({ revision: z.number().int().positive() })
  .strict();
export const opaqueId = z.uuid();
export const pageInput = z.coerce.number().int().min(1).max(10000).default(1);
export const pageSize = 20;
export type ProjectInput = z.output<typeof projectInput>;
export type ProjectEdit = z.output<typeof projectEdit>;
export type TaskInput = z.output<typeof taskInput>;
export type TaskEdit = z.output<typeof taskEdit>;
export type Project = {
  id: string;
  ownerId: string;
  key: string;
  name: string;
  description: string;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  repositoryUrl: string | null;
};
export type Task = {
  id: string;
  projectId: string;
  number: number;
  title: string;
  description: string;
  status: (typeof statuses)[number];
  revision: number;
  createdAt: Date;
  updatedAt: Date;
};
export type Page<T> = { items: T[]; hasMore: boolean };
export type ProjectDetails = { project: Project; tasks: Page<Task> };

export class WorkspaceError extends Error {
  constructor(
    public readonly code:
      | 'validation'
      | 'conflict'
      | 'unique_conflict'
      | 'not_found'
      | 'unavailable',
    message: string,
    public readonly fields: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
export function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success)
    throw new WorkspaceError(
      'validation',
      'Check the highlighted fields.',
      z.flattenError(result.error).fieldErrors as Record<string, string[]>,
    );
  return result.data;
}
export function taskKey(
  project: Pick<Project, 'key'>,
  task: Pick<Task, 'number'>,
) {
  return `${project.key}-${task.number}`;
}
