import type { ReactNode } from 'react';
export function PageHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="production-page-heading flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0 max-w-full">
        <h1 className="break-words text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl break-words text-sm leading-6 text-muted">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-3">
          {actions}
        </div>
      ) : null}
    </header>
  );
}
