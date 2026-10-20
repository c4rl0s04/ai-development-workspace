import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { WorkspaceError } from '../src/domain/workspace';
import { AccessError } from '../src/application/auth/owner';

test('HTTP/page boundaries correlate sanitized failures without changing public error contracts', async () => {
  // Permit server-only imports in this Node unit process; built HTTP tests use the actual Next runtime.
  const loader = registerHooks({
    resolve(name, context, next) {
      if (name === 'server-only')
        return { url: 'data:text/javascript,export{}', shortCircuit: true };
      return next(name, context);
    },
  });
  const logs: string[] = [];
  const original = console.error;
  console.error = (value) => {
    logs.push(value);
  };
  try {
    const { respond } = await import('../src/server/workspace-http');
    const { pageError } = await import('../src/server/page-error');
    const secret = 'sensitive-payload-token-cookie-provider-sentinel';
    const response = await respond('tasks.create', async () => {
      throw new Error(secret, { cause: { secret } });
    });
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), {
      error: { message: 'The request could not be completed.' },
    });
    assert.equal(
      response.headers.get('x-correlation-id'),
      JSON.parse(logs[0]).correlationId,
    );
    assert.match(response.headers.get('cache-control') ?? '', /no-store/);
    assert.equal(logs.length, 1);
    const html = renderToStaticMarkup(
      pageError(new Error(secret), 'projects.get'),
    );
    assert.ok(html.includes(JSON.parse(logs[1]).correlationId));
    assert.ok(html.includes('Storage is temporarily unavailable.'));
    assert.ok(!html.includes(secret));
    assert.ok(!logs.join('').includes(secret));
    assert.equal(logs.length, 2);
    for (const [code, status] of [
      ['validation', 400],
      ['conflict', 409],
      ['unique_conflict', 409],
      ['not_found', 404],
    ] as const) {
      const expected = await respond('projects.edit', async () => {
        throw new WorkspaceError(code, 'Safe business message.');
      });
      assert.equal(expected.status, status);
      assert.equal(expected.headers.get('x-correlation-id'), null);
    }
    for (const [reason, status] of [
      ['unauthenticated', 401],
      ['origin', 403],
      ['forbidden', 403],
    ] as const) {
      const expected = await respond('tasks.edit', async () => {
        throw new AccessError(reason);
      });
      assert.equal(expected.status, status);
    }
    assert.throws(
      () =>
        pageError(new WorkspaceError('not_found', 'Missing.'), 'projects.get'),
      /NEXT_HTTP_ERROR_FALLBACK;404/,
    );
    assert.throws(
      () => pageError(new AccessError('forbidden'), 'tasks.get'),
      /NEXT_REDIRECT/,
    );
    assert.equal(logs.length, 2);
  } finally {
    console.error = original;
    loader.deregister();
  }
});
