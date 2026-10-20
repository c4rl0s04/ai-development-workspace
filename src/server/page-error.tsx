import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { AccessError } from '../application/auth/owner';
import { WorkspaceError } from '../domain/workspace';
import { RecordUnavailable } from '../components/workspace-records';
import { reportFailure, type Operation } from '../infrastructure/diagnostics';
export function pageError(error: unknown, operation: Operation) {
  const correlationId = reportFailure(error, operation);
  if (error instanceof AccessError)
    redirect(
      `/login?error=${error.reason === 'forbidden' ? 'denied' : error.reason === 'unauthenticated' ? 'expired' : 'unavailable'}`,
    );
  if (error instanceof WorkspaceError && error.code === 'not_found') notFound();
  return (
    <RecordUnavailable
      message={error instanceof WorkspaceError ? error.message : undefined}
      reference={correlationId}
    />
  );
}
