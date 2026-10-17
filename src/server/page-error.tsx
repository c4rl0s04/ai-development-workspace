import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { AccessError } from '../application/auth/owner';
import { WorkspaceError } from '../domain/workspace';
import { RecordUnavailable } from '../components/workspace-records';
export function pageError(error: unknown) {
  if (error instanceof AccessError)
    redirect(
      `/login?error=${error.reason === 'forbidden' ? 'denied' : error.reason === 'unauthenticated' ? 'expired' : 'unavailable'}`,
    );
  if (error instanceof WorkspaceError && error.code === 'not_found') notFound();
  return (
    <RecordUnavailable
      message={error instanceof WorkspaceError ? error.message : undefined}
    />
  );
}
