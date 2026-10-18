import type { Metadata } from 'next';
import Link from 'next/link';
import { workspace } from '@/server/workspace';
import { pageError } from '@/server/page-error';
import { parse, pageInput, statusLabels, taskKey } from '@/domain/workspace';
import { PageHeading } from '@/components/page-heading';
import {
  actionClass,
  Breadcrumbs,
  RecordPanel,
  Pagination,
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
              className="inline-flex min-h-11 items-center text-sm underline"
            >
              Edit project
            </Link>
          </>
        }
      />
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
                  className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0"
                >
                  <Link
                    href={`${href}/tasks/${task.id}`}
                    className="inline-flex min-h-11 min-w-0 flex-1 flex-wrap items-center gap-x-3 break-words text-sm font-medium underline decoration-line hover:decoration-accent"
                  >
                    <span className="text-xs font-medium text-muted">
                      {taskKey(project, task)}
                    </span>
                    <span className="min-w-0 break-words">{task.title}</span>
                  </Link>
                  <span className="rounded bg-canvas px-3 py-1 text-xs font-medium">
                    {statusLabels[task.status]}
                  </span>
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
      <details className="mt-6 rounded-xl border border-line bg-white p-4 sm:p-5">
        <summary className="cursor-pointer font-medium">
          Project details and repository
        </summary>
        <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-muted">
          {project.description || 'No description yet.'}
        </p>
        {project.repositoryUrl ? (
          <a
            href={project.repositoryUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block break-all underline"
          >
            {project.repositoryUrl}
          </a>
        ) : (
          <p className="mt-4 text-sm text-muted">
            No GitHub repository associated.
          </p>
        )}
      </details>
    </>
  );
}
