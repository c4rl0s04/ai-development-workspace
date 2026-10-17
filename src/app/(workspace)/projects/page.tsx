import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeading } from '@/components/page-heading';
import {
  actionClass,
  Pagination,
  RecordPanel,
} from '@/components/workspace-records';
import { workspace } from '@/server/workspace';
import { pageError } from '@/server/page-error';
import { parse, pageInput } from '@/domain/workspace';
export const metadata: Metadata = { title: 'Projects' };
export default async function Projects({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  let result: Awaited<ReturnType<typeof workspace.listProjects>>;
  let page = 1;
  try {
    page = parse(pageInput, (await searchParams).page ?? 1);
    result = await workspace.listProjects(page);
  } catch (error) {
    return pageError(error);
  }
  return (
    <>
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <PageHeading
          title="Projects"
          description="Your projects, their repositories and the work ahead."
        />
        <Link href="/projects/new" className={actionClass}>
          New project
        </Link>
      </div>
      <RecordPanel>
        {result.items.length ? (
          <ul className="divide-y divide-line">
            {result.items.map((project) => (
              <li key={project.id} className="py-5 first:pt-0 last:pb-0">
                <Link
                  href={`/projects/${project.id}`}
                  className="text-lg font-semibold underline decoration-line hover:decoration-accent"
                >
                  {project.name}
                </Link>
                <span className="ml-3 rounded bg-canvas px-2 py-1 text-xs font-medium">
                  {project.key}
                </span>
                <p className="mt-2 line-clamp-2 whitespace-pre-wrap text-sm leading-6 text-muted">
                  {project.description || 'No description yet.'}
                </p>
                {project.repositoryUrl ? (
                  <p className="mt-2 break-all text-sm text-muted">
                    {project.repositoryUrl}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <>
            <h2 className="text-xl font-semibold">No projects yet</h2>
            <p className="mt-3 text-muted">
              Create your first project to start capturing tasks.
            </p>
          </>
        )}
      </RecordPanel>
      <Pagination page={page} hasMore={result.hasMore} href="/projects" />
    </>
  );
}
