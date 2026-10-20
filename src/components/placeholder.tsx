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
      className="production-panel production-empty"
    >
      <div
        className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-canvas text-accent"
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
        className="workspace-button workspace-button--primary mt-8"
      >
        Back to overview
      </Link>
    </section>
  );
}
