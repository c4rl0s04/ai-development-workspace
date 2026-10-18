'use client';
export default function ProjectError({ reset }: { reset: () => void }) {
  return (
    <section
      role="alert"
      className="rounded-xl border border-line bg-white p-8"
    >
      <h2 className="text-xl font-semibold">This page could not be loaded</h2>
      <p className="mt-3 text-muted">
        No successful save is assumed. Reload before retrying a save.
      </p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 min-h-11 rounded bg-accent px-4 text-white"
      >
        Try loading again
      </button>
    </section>
  );
}
