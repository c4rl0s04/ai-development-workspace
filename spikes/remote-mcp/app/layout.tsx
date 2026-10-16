import type { ReactNode } from 'react';

export const metadata = { title: 'Remote MCP compatibility spike', robots: { index: false, follow: false } };
export default function Layout({ children }: { children: ReactNode }) {
  return <html lang="en"><body><main>{children}</main></body></html>;
}
