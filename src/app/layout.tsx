import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Navigation } from '@/components/navigation';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Overview · AI Development Workspace',
    template: '%s · AI Development Workspace',
  },
  description:
    'The application foundation for a workspace connecting projects, specifications and human decisions.',
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div className="min-h-dvh lg:grid lg:grid-cols-[248px_1fr]">
          <aside className="border-b border-line bg-sidebar px-4 py-5 sm:px-6 lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col lg:border-r lg:border-b-0 lg:py-9">
            <div className="mb-5 flex items-center gap-3 lg:mb-12">
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
            <div className="mt-auto hidden border-t border-line pt-6 lg:block">
              <p className="text-sm font-medium">Built for deliberate work.</p>
              <p className="mt-2 text-xs leading-5 text-muted">
                Specifications first.
                <br />
                Human decisions at every gate.
              </p>
            </div>
          </aside>
          <div className="min-w-0">
            <div className="flex min-h-16 items-center justify-between gap-4 border-b border-line px-6 text-xs text-muted sm:px-10 lg:px-14">
              <span>Personal workspace</span>
              <span className="flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-accent"
                  aria-hidden="true"
                />
                Foundation preview
              </span>
            </div>
            <main
              id="main-content"
              tabIndex={-1}
              className="mx-auto w-full max-w-7xl px-6 py-10 sm:px-10 sm:py-14 lg:px-14"
            >
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
