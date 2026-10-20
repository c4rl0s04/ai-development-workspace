'use client';
import {
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  kind: 'project' | 'task';
  endpoint: string;
  cancelHref: string;
  initial?: {
    name?: string;
    title?: string;
    description: string;
    repositoryUrl?: string | null;
    revision: number;
  };
};
export function RecordForm({ kind, endpoint, cancelHref, initial }: Props) {
  const router = useRouter();
  const alertRef = useRef<HTMLDivElement>(null);
  const inFlight = useRef(false);
  const [navigating, startNavigation] = useTransition();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [conflict, setConflict] = useState(false);
  const [uncertain, setUncertain] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);
  const busy = pending || navigating;
  const titleField = kind === 'project' ? 'name' : 'title';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || busy || conflict || uncertain) return;
    inFlight.current = true;
    const form = new FormData(event.currentTarget);
    const input: Record<string, unknown> = Object.fromEntries(form);
    if (initial) input.revision = initial.revision;
    setPending(true);
    setError('');
    setFields({});
    setConflict(false);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
        redirect: 'error',
      });
      const data = await response.json();
      if (!response.ok) {
        setConflict(data.error?.code === 'conflict');
        if (!initial && response.status >= 500) setUncertain(true);
        setError(
          data.error?.message ??
            'The save could not be confirmed. Reload before retrying.',
        );
        setFields(data.error?.fields ?? {});
        return;
      }
      if (
        typeof data.location !== 'string' ||
        !data.location.startsWith('/projects/')
      )
        throw new Error('Unconfirmed save');
      startNavigation(() => {
        router.push(data.location);
        // Keep the destination fresh when previously visited or prefetched.
        router.refresh();
      });
    } catch {
      if (!initial) setUncertain(true);
      setError(
        'The save could not be confirmed. Your input is still here; reload the record before retrying.',
      );
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  }
  const fieldClass = 'workspace-field';
  function errors(key: string) {
    return fields[key]?.length ? (
      <p id={`${key}-error`} className="workspace-field-error">
        {fields[key].join(' ')}
      </p>
    ) : null;
  }
  return (
    <form
      onSubmit={submit}
      className="workspace-form space-y-6"
      aria-busy={busy}
    >
      {error ? (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="workspace-alert workspace-alert--error"
        >
          <p>{error}</p>
          {conflict ? (
            <Link href={cancelHref} className="mt-2 inline-block underline">
              View the latest saved record
            </Link>
          ) : null}
        </div>
      ) : null}
      {uncertain ? (
        <section
          aria-label="Reconcile previous create"
          className="workspace-alert workspace-alert--warning space-y-3"
        >
          <p>
            The previous create may have succeeded. Do not submit again until
            you check the saved list for this project key or task title and
            description, including later list pages. If storage is unavailable
            or the request may still be completing, wait before confirming. Your
            input remains below.
          </p>
          <a
            href={cancelHref}
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            Check saved records in a new tab
          </a>
          <label className="block">
            <input
              type="checkbox"
              checked={checked}
              onChange={(event) => setChecked(event.target.checked)}
            />{' '}
            I checked the latest saved records and this record was not created.
          </label>
          <button
            type="button"
            disabled={!checked}
            onClick={() => {
              setUncertain(false);
              setChecked(false);
              setError('');
            }}
            className="underline disabled:opacity-60"
          >
            Allow another create attempt
          </button>
        </section>
      ) : null}
      <fieldset disabled={busy} className="min-w-0 space-y-5">
        <div>
          <label htmlFor={titleField} className="workspace-field-label">
            {kind === 'project' ? 'Project name' : 'Task title'}
          </label>
          <input
            id={titleField}
            name={titleField}
            required
            maxLength={kind === 'project' ? 100 : 200}
            defaultValue={initial?.name ?? initial?.title ?? ''}
            className={fieldClass}
            aria-invalid={!!fields[titleField]}
            aria-describedby={
              fields[titleField] ? `${titleField}-error` : undefined
            }
          />
          {errors(titleField)}
        </div>
        {kind === 'project' && !initial ? (
          <div>
            <label htmlFor="key" className="workspace-field-label">
              Project key
            </label>
            <input
              id="key"
              name="key"
              required
              pattern="[A-Za-z][A-Za-z0-9]{1,9}"
              minLength={2}
              maxLength={10}
              placeholder="ELS"
              className={fieldClass}
              aria-invalid={!!fields.key}
              aria-describedby={fields.key ? 'key-hint key-error' : 'key-hint'}
            />
            <p id="key-hint" className="workspace-field-hint">
              2–10 letters or digits. The key cannot change; task identifiers
              will use it, for example ELS-1.
            </p>
            {errors('key')}
          </div>
        ) : null}
        <div>
          <label htmlFor="description" className="workspace-field-label">
            Description (optional)
          </label>
          <textarea
            id="description"
            name="description"
            rows={4}
            maxLength={10000}
            defaultValue={initial?.description ?? ''}
            className={fieldClass}
            aria-invalid={!!fields.description}
            aria-describedby={
              fields.description ? 'description-error' : undefined
            }
          />
          {errors('description')}
        </div>
        {kind === 'project' ? (
          <div>
            <label htmlFor="repositoryUrl" className="workspace-field-label">
              GitHub repository URL (optional)
            </label>
            <input
              id="repositoryUrl"
              name="repositoryUrl"
              type="url"
              maxLength={300}
              placeholder="https://github.com/owner/repository"
              defaultValue={initial?.repositoryUrl ?? ''}
              className={fieldClass}
              aria-invalid={!!fields.repositoryUrl}
              aria-describedby={
                fields.repositoryUrl
                  ? 'repository-hint repositoryUrl-error'
                  : 'repository-hint'
              }
            />
            <p id="repository-hint" className="workspace-field-hint">
              Association only. No repository permissions or GitHub API access
              are requested. Clear this field to retire the current link.
            </p>
            {errors('repositoryUrl')}
          </div>
        ) : (
          <p className="workspace-field-hint">
            New tasks enter Backlog. Status transitions and approvals arrive in
            later milestones.
          </p>
        )}
        <div className="workspace-form-actions">
          <button
            type="submit"
            disabled={busy || conflict || uncertain}
            className="workspace-button workspace-button--primary"
          >
            {busy ? 'Saving…' : initial ? 'Save changes' : `Create ${kind}`}
          </button>
          <Link
            href={cancelHref}
            aria-disabled={busy || undefined}
            onClick={(event) => {
              if (busy) event.preventDefault();
            }}
            className="workspace-button workspace-button--secondary"
          >
            Cancel
          </Link>
          <span role="status" className="workspace-field-hint">
            {busy ? 'Saving your changes…' : ''}
          </span>
        </div>
      </fieldset>
    </form>
  );
}
