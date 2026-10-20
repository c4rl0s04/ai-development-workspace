import type { Metadata } from 'next';
import { authConfig } from '../../server/auth';

export const metadata: Metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';
const messages: Record<string, string> = {
  denied:
    'This account cannot access the workspace. Sign in with the configured owner account.',
  failed:
    'Sign-in was cancelled, expired or could not be verified. Please try again.',
  expired: 'Your session is missing or expired. Sign in to continue.',
  unavailable:
    'Authentication is temporarily unavailable. Please try again later.',
  logout:
    'The local session was cleared, but remote sign-out could not be confirmed.',
};

export default async function Login({
  searchParams,
}: {
  searchParams: Promise<{ error?: string | string[] }>;
}) {
  let configured = true;
  try {
    authConfig();
  } catch {
    configured = false;
  }
  const error = (await searchParams).error;
  const message = configured
    ? typeof error === 'string' && Object.hasOwn(messages, error)
      ? messages[error]
      : undefined
    : messages.unavailable;
  return (
    <main id="main-content" className="workspace-login">
      <p className="mb-6 text-xs font-medium uppercase tracking-widest text-muted">
        AI Development Workspace
      </p>
      <h1 className="text-3xl font-semibold tracking-tight">
        Sign in to your workspace
      </h1>
      <p className="mt-5 leading-7 text-muted">
        Use GitHub to sign in. Access is restricted to the configured workspace
        owner.
      </p>
      {message ? (
        <p
          role="alert"
          className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm leading-6"
        >
          {message}
        </p>
      ) : null}
      {configured ? (
        <form action="/auth/login" method="post" className="mt-8">
          <button
            type="submit"
            className="workspace-button workspace-button--primary w-full"
          >
            Continue with GitHub
          </button>
        </form>
      ) : null}
      <p className="mt-8 text-sm leading-6 text-muted">
        Project management and specification approvals are still under
        development.
      </p>
    </main>
  );
}
