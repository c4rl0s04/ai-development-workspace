import Link from 'next/link';
import type { ReactNode } from 'react';
export const actionClass =
  'inline-flex min-h-11 items-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover';
export function RecordPanel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line bg-white p-4 sm:p-5">
      {children}
    </section>
  );
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
    <nav
      aria-label="Pagination"
      className="mt-6 flex items-center gap-6 text-sm"
    >
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
}: {
  message?: string;
}) {
  return (
    <RecordPanel>
      <h2 className="text-xl font-semibold">Unable to load this record</h2>
      <p role="alert" className="mt-3 text-muted">
        {message}
      </p>
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
    <nav aria-label="Breadcrumb" className="mb-4 text-sm text-muted">
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
        <div className="h-8 w-48 rounded bg-line" />
        <div className="rounded-xl border border-line bg-white p-5">
          {[1, 2, 3].map((row) => (
            <div
              key={row}
              className="flex h-16 items-center gap-4 border-b border-line last:border-0"
            >
              <div className="h-4 w-16 rounded bg-line" />
              <div className="h-4 w-1/2 rounded bg-sidebar" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
