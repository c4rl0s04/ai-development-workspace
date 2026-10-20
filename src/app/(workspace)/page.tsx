import Link from 'next/link';
import { PageHeading } from '@/components/page-heading';

export default function Overview() {
  return (
    <>
      <PageHeading
        title="Overview"
        description="Projects and tasks now persist in PostgreSQL. Workflow transitions and approvals are not available yet."
      />
      <section
        aria-labelledby="workspace-title"
        className="overflow-hidden rounded-2xl border border-line bg-surface"
      >
        <div className="border-b border-line px-5 py-4">
          <h2 id="workspace-title" className="text-lg font-semibold">
            Continue your work
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Manage projects and capture tasks. Approvals are a preview of future
            work.
          </p>
        </div>
        <Link
          href="/projects"
          className="production-overview-link group flex items-center justify-between gap-5 px-5 py-4 hover:bg-canvas"
        >
          <div>
            <h3 className="font-semibold">Projects</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              A home for each project and its tasks.
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium text-accent">
            Explore <span aria-hidden="true">→</span>
          </span>
        </Link>
        <Link
          href="/approvals"
          className="production-overview-link flex items-center justify-between gap-5 border-t border-line px-5 py-4 hover:bg-canvas"
        >
          <div>
            <h3 className="font-semibold">Approvals</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              Planned: review decisions. The inbox is not implemented yet.
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium text-accent">
            Explore <span aria-hidden="true">→</span>
          </span>
        </Link>
      </section>
      <section
        aria-labelledby="next-title"
        className="mt-6 grid gap-4 border-t border-line pt-5 sm:grid-cols-[1fr_2fr]"
      >
        <h2 id="next-title" className="text-sm font-semibold">
          What comes next
        </h2>
        <div>
          <p className="max-w-2xl text-sm leading-7 text-muted">
            Owner sign-in protects this workspace. Persistent projects and tasks
            are available. Workflow transitions and versioned approvals follow
            in M1. MCP planning follows in M2. No agent connections are active
            yet.
          </p>
          <p className="mt-4 text-sm font-medium">
            Human approval and execution authorization will remain separate
            decisions.
          </p>
        </div>
      </section>
    </>
  );
}
