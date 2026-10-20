'use client';
export default function ProjectError({ reset }: { reset: () => void }) {
  return (
    <section role="alert" className="production-panel">
      <h2 className="text-xl font-semibold">This page could not be loaded</h2>
      <p className="mt-3 text-muted">
        No successful save is assumed. Reload before retrying a save.
      </p>
      <button
        type="button"
        onClick={reset}
        className="workspace-button workspace-button--primary mt-6"
      >
        Try loading again
      </button>
    </section>
  );
}
