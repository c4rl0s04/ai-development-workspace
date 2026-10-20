import Link from 'next/link';

export function NotFoundContent() {
  return (
    <section className="mx-auto max-w-2xl rounded-2xl bg-surface p-6 sm:mt-12 sm:p-10">
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 text-muted">This page is not part of the workspace.</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center font-medium text-accent underline"
      >
        Return to overview
      </Link>
    </section>
  );
}
