import Link from 'next/link';

export function Placeholder({
  title,
  description,
  next,
}: {
  title: string;
  description: string;
  next: string;
}) {
  return (
    <section
      aria-labelledby="placeholder-title"
      className="rounded-2xl border border-line bg-white px-6 py-12 sm:px-10 sm:py-16"
    >
      <div
        className="mb-8 flex h-14 w-14 items-center justify-center rounded-xl bg-canvas text-accent"
        aria-hidden="true"
      >
        <svg
          aria-hidden="true"
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M8 3H4v4 M16 3h4v4 M20 17v4h-4 M8 21H4v-4 M9 12h6 M12 9v6" />
        </svg>
      </div>
      <h2 id="placeholder-title" className="text-xl font-semibold">
        {title}
      </h2>
      <p className="mt-4 max-w-xl leading-7 text-muted">{description}</p>
      <p className="mt-6 max-w-xl text-sm leading-6 text-muted">
        <strong className="font-medium text-ink">Planned for M1.</strong> {next}
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-11 items-center rounded-lg bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
      >
        Back to overview
      </Link>
    </section>
  );
}
