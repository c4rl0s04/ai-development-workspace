'use client';
import { useState, type FormEvent } from 'react';
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [fields, setFields] = useState<Record<string, string[]>>({});
  const [conflict, setConflict] = useState(false);
  const titleField = kind === 'project' ? 'name' : 'title';
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
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
        setConflict(response.status === 409);
        setError(
          data.error?.message ??
            'The save could not be confirmed. Reload before retrying.',
        );
        setFields(data.error?.fields ?? {});
        return;
      }
      router.push(data.location);
      router.refresh();
    } catch {
      setError(
        'The save could not be confirmed. Your input is still here; reload the record before retrying.',
      );
    } finally {
      setPending(false);
    }
  }
  const fieldClass =
    'mt-2 block w-full rounded-lg border border-line bg-white px-3 py-2.5 text-ink';
  function errors(key: string) {
    return fields[key]?.length ? (
      <p id={`${key}-error`} className="mt-2 text-sm text-red-800">
        {fields[key].join(' ')}
      </p>
    ) : null;
  }
  return (
    <form onSubmit={submit} className="max-w-2xl space-y-6" aria-busy={pending}>
      {error ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-900"
        >
          <p>{error}</p>
          {conflict ? (
            <Link href={cancelHref} className="mt-2 inline-block underline">
              View the latest saved record
            </Link>
          ) : null}
        </div>
      ) : null}
      <div>
        <label htmlFor={titleField} className="font-medium">
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
          <label htmlFor="key" className="font-medium">
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
          <p id="key-hint" className="mt-2 text-sm text-muted">
            2–10 letters or digits. The key cannot change; task identifiers will
            use it, for example ELS-1.
          </p>
          {errors('key')}
        </div>
      ) : null}
      <div>
        <label htmlFor="description" className="font-medium">
          Description {kind === 'project' ? '(optional)' : ''}
        </label>
        <textarea
          id="description"
          name="description"
          rows={6}
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
          <label htmlFor="repositoryUrl" className="font-medium">
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
          <p id="repository-hint" className="mt-2 text-sm text-muted">
            Association only. No repository permissions or GitHub API access are
            requested. Clear this field to retire the current link.
          </p>
          {errors('repositoryUrl')}
        </div>
      ) : (
        <p className="text-sm text-muted">
          New tasks enter Backlog. Status transitions and approvals arrive in
          later milestones.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={pending || conflict}
          className="min-h-11 rounded-lg bg-accent px-5 py-2.5 font-medium text-white hover:bg-accent-hover disabled:opacity-60"
        >
          {pending ? 'Saving…' : initial ? 'Save changes' : `Create ${kind}`}
        </button>
        <Link
          href={cancelHref}
          className="inline-flex min-h-11 items-center underline"
        >
          Cancel
        </Link>
        <span role="status" className="text-sm text-muted">
          {pending ? 'Saving your changes…' : ''}
        </span>
      </div>
    </form>
  );
}
