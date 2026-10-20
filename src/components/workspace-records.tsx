import { Badge, Skeleton } from './design-system/ui/primitives';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { statusLabels, type Task } from '@/domain/workspace';
export const actionClass = 'workspace-button workspace-button--primary';
export function RecordPanel({ children }: { children: ReactNode }) {
  return <section className="production-panel">{children}</section>;
}
export function Pagination({
  page,
  hasMore,
  href,
}: {
  page: number;
  hasMore: boolean;
  href: string;
}) {
  return (
    <nav aria-label="Pagination" className="production-pagination">
      {page > 1 ? (
        <Link href={`${href}?page=${page - 1}`} className="underline">
          Previous
        </Link>
      ) : null}
      <span>Page {page}</span>
      {hasMore ? (
        <Link href={`${href}?page=${page + 1}`} className="underline">
          Next
        </Link>
      ) : null}
    </nav>
  );
}
export function RecordUnavailable({
  message = 'Storage is temporarily unavailable. No successful save is assumed. Try reloading.',
  reference,
}: {
  message?: string;
  reference?: string;
}) {
  return (
    <RecordPanel>
      <h2 className="text-xl font-semibold">Unable to load this record</h2>
      <p role="alert" className="mt-3 text-muted">
        {message}
      </p>
      {reference ? (
        <p className="mt-3 break-words text-sm text-muted">
          Reference: {reference}
        </p>
      ) : null}
      <Link
        href="/projects"
        className="mt-5 inline-flex min-h-11 items-center underline"
      >
        Back to projects
      </Link>
    </RecordPanel>
  );
}

export function Breadcrumbs({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="Breadcrumb" className="production-breadcrumbs mb-3">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => (
          <li
            key={item.href ?? item.label}
            className="flex min-w-0 items-center gap-2"
          >
            {index ? <span aria-hidden="true">/</span> : null}
            {item.href ? (
              <Link
                href={item.href}
                className="inline-flex min-h-11 items-center underline"
              >
                {item.label}
              </Link>
            ) : (
              <span aria-current="page" className="break-words">
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
export function WorkspaceLoading() {
  return (
    <div role="status" aria-label="Loading workspace" className="space-y-6">
      <p className="text-sm text-muted">Loading workspace…</p>
      <div aria-hidden="true" className="space-y-4">
        <Skeleton className="h-8 w-48 rounded bg-line" />
        <div className="rounded-xl border border-line bg-surface p-5">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="flex h-16 items-center gap-4 border-b border-line last:border-0"
            >
              <Skeleton className="h-4 w-16 rounded bg-line" />
              <Skeleton className="h-4 w-1/2 rounded bg-sidebar" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function StatusBadge({ status }: { status: Task['status'] }) {
  return (
    <Badge className="production-status" data-status={status}>
      {statusLabels[status]}
    </Badge>
  );
}

export function RepositoryLink({ url }: { url: string | null }) {
  if (!url)
    return (
      <span className="production-repository">No repository associated</span>
    );
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="production-repository underline decoration-line underline-offset-4 hover:text-ink"
    >
      <span className="min-w-0 break-all">
        {url.replace('https://github.com/', '')}
      </span>
      <span aria-hidden="true">↗</span>
      <span className="sr-only"> (opens in a new tab)</span>
    </a>
  );
}
