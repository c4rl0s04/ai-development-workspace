import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AccessError } from '../../application/auth/owner';
import { requireOwner } from '../../server/auth';
import { WorkspaceShell } from '../../components/workspace-shell';

export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({
  children,
}: {
  children: ReactNode;
}) {
  try {
    await requireOwner();
  } catch (error) {
    const reason = error instanceof AccessError ? error.reason : 'unavailable';
    redirect(
      `/login?error=${reason === 'forbidden' ? 'denied' : reason === 'unauthenticated' ? 'expired' : 'unavailable'}`,
    );
  }
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
