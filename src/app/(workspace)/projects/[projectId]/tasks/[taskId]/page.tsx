import type { Metadata } from 'next';
import Link from 'next/link';
import { workspace } from '@/server/workspace';
import { pageError } from '@/server/page-error';
import { taskKey, statusLabels } from '@/domain/workspace';
import { PageHeading } from '@/components/page-heading';
import { actionClass, RecordPanel } from '@/components/workspace-records';
export const metadata: Metadata = { title: 'Task' };
export default async function TaskPage({
  params,
}: {
  params: Promise<{ projectId: string; taskId: string }>;
}) {
  let result: Awaited<ReturnType<typeof workspace.getTask>>;
  try {
    const p = await params;
    result = await workspace.getTask(p.projectId, p.taskId);
  } catch (error) {
    return pageError(error);
  }
  const { project, task } = result;
  const href = `/projects/${project.id}/tasks/${task.id}`;
  return (
    <>
      <Link
        href={`/projects/${project.id}`}
        className="mb-6 inline-flex min-h-11 items-center text-sm underline"
      >
        Back to {project.key}
      </Link>
      <PageHeading
        title={task.title}
        description={`${taskKey(project, task)} · ${statusLabels[task.status]} · Revision ${task.revision}`}
      />
      <Link href={`${href}/edit`} className={`${actionClass} mb-8`}>
        Edit task
      </Link>
      <RecordPanel>
        <h2 className="text-lg font-semibold">Description</h2>
        <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-muted">
          {task.description || 'No description yet.'}
        </p>
        <p className="mt-8 text-sm text-muted">
          Created {task.createdAt.toISOString()} · Updated{' '}
          {task.updatedAt.toISOString()}
        </p>
      </RecordPanel>
      <p className="mt-6 text-sm text-muted">
        State changes, dependencies and approvals are not implemented in M1.2.
        Editing does not change task status.
      </p>
    </>
  );
}
