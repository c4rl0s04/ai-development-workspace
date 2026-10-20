import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
export const metadata: Metadata = {
  title: {
    default: 'Overview · AI Development Workspace',
    template: '%s · AI Development Workspace',
  },
  description:
    'A private workspace for projects, specifications and human decisions.',
  robots: { index: false, follow: false },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="workspace-theme">{children}</body>
    </html>
  );
}
