import Link from 'next/link';
import type { ReactNode } from 'react';
export const actionClass =
  'inline-flex min-h-11 items-center rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover';
export function RecordPanel({ children }: { children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-white p-6 sm:p-8">
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
