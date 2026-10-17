import Link from 'next/link';

export default function NotFound() {
  return (
    <>
      <h1 className="text-3xl font-semibold tracking-tight">Page not found</h1>
      <p className="mt-4 text-muted">This page is not part of the workspace.</p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center font-medium text-accent underline"
      >
        Return to overview
      </Link>
    </>
  );
}
