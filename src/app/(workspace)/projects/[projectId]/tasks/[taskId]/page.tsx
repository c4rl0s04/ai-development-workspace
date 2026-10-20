import type { Metadata } from 'next';
import Link from 'next/link';
import { workspace } from '@/server/workspace';
import { pageError } from '@/server/page-error';
import { taskKey } from '@/domain/workspace';
import { PageHeading } from '@/components/page-heading';
import {
  actionClass,
  Breadcrumbs,
  RecordPanel,
  StatusBadge,
} from '@/components/workspace-records';
const dateLabel = (date: Date) =>
  new Intl.DateTimeFormat('en', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(date);
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
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project.key, href: `/projects/${project.id}` },
          { label: taskKey(project, task) },
        ]}
      />
      <PageHeading
        title={task.title}
        description={`Task in ${project.name}`}
        actions={
          <Link href={`${href}/edit`} className={actionClass}>
            Edit task
          </Link>
        }
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <span className="production-record-key">{taskKey(project, task)}</span>
        <StatusBadge status={task.status} />
      </div>
      <RecordPanel>
        <h2 className="text-lg font-semibold">Description</h2>
        <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-muted">
          {task.description || 'No description yet.'}
        </p>
        <p className="production-detail-meta mt-8 border-t border-line pt-5 leading-6">
          Created{' '}
          <time dateTime={task.createdAt.toISOString()}>
            {dateLabel(task.createdAt)}
          </time>{' '}
          · Updated{' '}
          <time dateTime={task.updatedAt.toISOString()}>
            {dateLabel(task.updatedAt)}
          </time>{' '}
          (UTC)
        </p>
      </RecordPanel>
      <p className="mt-6 text-sm text-muted">
        State changes, dependencies and approvals are not implemented in M1.2.
        Editing does not change task status.
      </p>
    </>
  );
}
