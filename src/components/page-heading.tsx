export function PageHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <header className="mb-10 flex flex-wrap items-start justify-between gap-5 sm:mb-14">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
          {description}
        </p>
      </div>
      <span className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-medium text-muted">
        M0 · Foundation
      </span>
    </header>
  );
}
