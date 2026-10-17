import Link from 'next/link';
import { PageHeading } from '@/components/page-heading';

export default function Overview() {
  return (
    <>
      <PageHeading
        title="A place for the work ahead."
        description="Bring projects, specifications and human decisions into one considered workflow. This is the application foundation; project management is not implemented yet."
      />
      <section
        aria-labelledby="workspace-title"
        className="overflow-hidden rounded-2xl border border-line bg-white"
      >
        <div className="border-b border-line px-6 py-7 sm:px-8">
          <h2 id="workspace-title" className="text-lg font-semibold">
            Your workspace, taking shape
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Explore the shell. These pages show where future work will live.
          </p>
        </div>
        <Link
          href="/projects"
          className="group flex items-center justify-between gap-5 px-6 py-7 hover:bg-canvas sm:px-8"
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
          className="flex items-center justify-between gap-5 border-t border-line px-6 py-7 hover:bg-canvas sm:px-8"
        >
          <div>
            <h3 className="font-semibold">Approvals</h3>
            <p className="mt-2 text-sm leading-6 text-muted">
              A dedicated place for deliberate human decisions.
            </p>
          </div>
          <span className="shrink-0 text-sm font-medium text-accent">
            Explore <span aria-hidden="true">→</span>
          </span>
        </Link>
      </section>
      <section
        aria-labelledby="next-title"
        className="mt-10 grid gap-5 border-t border-line pt-8 sm:mt-14 sm:grid-cols-[1fr_2fr]"
      >
        <h2 id="next-title" className="text-sm font-semibold">
          What comes next
        </h2>
        <div>
          <p className="max-w-2xl text-sm leading-7 text-muted">
            Owner sign-in protects this workspace. Persistent projects, task
            workflows and versioned approvals are next in M1. MCP planning
            follows in M2. No project data or agent connections are active yet.
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
