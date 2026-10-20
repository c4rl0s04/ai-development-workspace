import type { Metadata } from 'next';
import Link from 'next/link';
import { PageHeading } from '@/components/page-heading';
import {
  actionClass,
  Pagination,
  RecordPanel,
  RepositoryLink,
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
      <PageHeading
        title="Projects"
        description="Projects, repositories and tasks."
        actions={
          <Link href="/projects/new" className={actionClass}>
            New project
          </Link>
        }
      />
      <RecordPanel>
        {result.items.length ? (
          <ul className="divide-y divide-line">
            {result.items.map((project) => (
              <li
                key={project.id}
                className="production-record-row production-project-row"
              >
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="production-record-key">{project.key}</span>
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex min-h-11 min-w-0 items-center break-words text-base font-semibold hover:text-accent"
                  >
                    {project.name}
                  </Link>
                </div>
                <p className="mt-1 max-w-3xl line-clamp-2 whitespace-pre-wrap break-words text-sm leading-6 text-muted">
                  {project.description || 'No description yet.'}
                </p>
                <div className="mt-2">
                  <RepositoryLink url={project.repositoryUrl} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <>
            <h2 className="text-xl font-semibold">
              {page === 1 ? 'No projects yet' : 'No projects on this page'}
            </h2>
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
