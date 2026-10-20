import type { Metadata } from 'next';
import Link from 'next/link';
import { workspace } from '@/server/workspace';
import { pageError } from '@/server/page-error';
import { parse, pageInput, taskKey } from '@/domain/workspace';
import { PageHeading } from '@/components/page-heading';
import {
  actionClass,
  Breadcrumbs,
  RecordPanel,
  Pagination,
  RepositoryLink,
  StatusBadge,
} from '@/components/workspace-records';
type Props = {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<{ page?: string }>;
};
export const metadata: Metadata = { title: 'Project' };
export default async function ProjectPage({ params, searchParams }: Props) {
  let result: Awaited<ReturnType<typeof workspace.getProject>>;
  let page = 1;
  try {
    page = parse(pageInput, (await searchParams).page ?? 1);
    result = await workspace.getProject((await params).projectId, page);
  } catch (error) {
    return pageError(error);
  }
  const { project, tasks } = result;
  const href = `/projects/${project.id}`;
  return (
    <>
      <Breadcrumbs
        items={[
          { label: 'Projects', href: '/projects' },
          { label: project.key },
        ]}
      />
      <PageHeading
        title={project.name}
        description={project.key}
        actions={
          <>
            <Link href={`${href}/tasks/new`} className={actionClass}>
              New task
            </Link>
            <Link
              href={`${href}/edit`}
              className="workspace-button workspace-button--secondary"
            >
              Edit project
            </Link>
          </>
        }
      />
      <div className="mb-6">
        <RepositoryLink url={project.repositoryUrl} />
      </div>
      <section aria-labelledby="tasks-title">
        <h2 id="tasks-title" className="mb-3 text-lg font-semibold">
          Tasks
        </h2>
        <RecordPanel>
          {tasks.items.length ? (
            <ul className="divide-y divide-line">
              {tasks.items.map((task) => (
                <li
                  key={task.id}
                  className="production-record-row flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <Link
                    href={`${href}/tasks/${task.id}`}
                    className="inline-flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-4 gap-y-1 break-words text-sm font-medium hover:text-accent"
                  >
                    <span className="production-record-key">
                      {taskKey(project, task)}
                    </span>
                    <span className="min-w-0 break-words">{task.title}</span>
                  </Link>
                  <StatusBadge status={task.status} />
                </li>
              ))}
            </ul>
          ) : (
            <>
              <h3 className="font-medium">No tasks yet</h3>
              <p className="mt-2 text-sm text-muted">
                Capture a task to add it to Backlog. Workflow transitions are
                not available yet.
              </p>
            </>
          )}
        </RecordPanel>
        <Pagination page={page} hasMore={tasks.hasMore} href={href} />
      </section>
      <details className="production-panel mt-6">
        <summary className="cursor-pointer font-medium">
          Project details
        </summary>
        <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-muted">
          {project.description || 'No description yet.'}
        </p>
      </details>
    </>
  );
}
