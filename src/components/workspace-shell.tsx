import type { ReactNode } from 'react';
import { Navigation } from './navigation';

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <>
      {' '}
      <a href="#main-content" className="skip-link">
        Skip to content
      </a>
      <div className="min-h-dvh lg:grid lg:grid-cols-[224px_1fr]">
        <aside className="border-b border-line bg-sidebar px-4 py-5 sm:px-6 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0 lg:py-6">
          <div className="mb-5 flex items-center gap-3 lg:mb-8">
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink text-white"
              aria-hidden="true"
            >
              <svg
                aria-hidden="true"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
              >
                <path d="M4 17 12 3l8 14H4Z M7 12h10 M12 12v9" />
              </svg>
            </div>
            <p className="text-sm leading-5 font-semibold">
              AI Development
              <br />
              Workspace
            </p>
          </div>
          <Navigation />
        </aside>
        <div className="min-w-0">
          <div className="flex min-h-14 flex-wrap items-center justify-between gap-x-4 gap-y-1 border-b border-line px-4 text-xs text-muted sm:px-6 lg:px-8">
            <span>Personal workspace</span>
            <form action="/auth/logout" method="post">
              <button
                type="submit"
                className="min-h-11 px-2 font-medium text-accent"
              >
                Sign out
              </button>
            </form>
          </div>
          <main
            id="main-content"
            tabIndex={-1}
            className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8"
          >
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
