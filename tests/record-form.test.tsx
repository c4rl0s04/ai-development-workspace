import assert from 'node:assert/strict';
import { test } from 'node:test';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { JSDOM } from 'jsdom';
import { AppRouterContext } from 'next/dist/shared/lib/app-router-context.shared-runtime';
import { RecordForm } from '../src/components/record-form';

test('record form recovery preserves input and prevents unsafe retries', async (t) => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const saved = {
    window: globalThis.window,
    self: globalThis.self,
    document: globalThis.document,
    FormData: globalThis.FormData,
    fetch: globalThis.fetch,
  };
  Object.assign(globalThis, {
    window: dom.window,
    self: dom.window,
    document: dom.window.document,
    FormData: dom.window.FormData,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const element = document.getElementById('root');
  assert.ok(element);
  const container: HTMLElement = element;
  const root = createRoot(container);
  const locations: string[] = [];
  const router = {
    bfcacheId: 'test',
    push: (path: string) => locations.push(path),
    replace() {},
    refresh() {},
    back() {},
    forward() {},
    prefetch: async () => {},
  };
  let mountCount = 0;
  async function mount(
    initial?: {
      description: string;
      revision: number;
      name: string;
    },
    kind: 'project' | 'task' = 'project',
  ) {
    await act(async () =>
      root.render(
        <AppRouterContext.Provider value={router}>
          <RecordForm
            key={String(mountCount++)}
            kind={kind}
            endpoint="/api/projects"
            cancelHref="/projects"
            initial={initial}
          />
        </AppRouterContext.Provider>,
      ),
    );
    (
      container.querySelector('[name=name], [name=title]') as HTMLInputElement
    ).value = 'Retained name';
  }
  const save = () =>
    container.querySelector('button[type=submit]') as HTMLButtonElement;
  async function submit() {
    await act(async () => {
      container
        .querySelector('form')
        ?.dispatchEvent(
          new dom.window.Event('submit', { bubbles: true, cancelable: true }),
        );
    });
  }
  try {
    await t.test(
      'duplicate key can be corrected and successfully resubmitted',
      async () => {
        await mount();
        let calls = 0;
        globalThis.fetch = async (_url, options) => {
          calls++;
          if (calls === 1)
            return Response.json(
              {
                error: {
                  code: 'unique_conflict',
                  message: 'Choose a unique key.',
                },
              },
              { status: 409 },
            );
          assert.equal(JSON.parse(String(options?.body)).key, 'NEW');
          return Response.json(
            { location: '/projects/saved' },
            { status: 201 },
          );
        };
        await submit();
        assert.equal(save().disabled, false);
        assert.equal(
          (
            container.querySelector(
              '[name=name], [name=title]',
            ) as HTMLInputElement
          ).value,
          'Retained name',
        );
        (container.querySelector('[name=key]') as HTMLInputElement).value =
          'NEW';
        await submit();
        assert.equal(calls, 2);
        assert.equal(locations.at(-1), '/projects/saved');
      },
    );
    for (const failure of [
      'lost response',
      'unavailable response',
      'invalid acknowledgement',
    ]) {
      await t.test(
        `${failure} requires explicit reconciliation before another create`,
        async () => {
          await mount();
          let calls = 0;
          globalThis.fetch = async () => {
            calls++;
            if (failure === 'lost response') throw new Error('Disconnected');
            return failure === 'unavailable response'
              ? Response.json(
                  { error: { code: 'unavailable' } },
                  { status: 503 },
                )
              : Response.json({});
          };
          await submit();
          assert.equal(save().disabled, true);
          await submit();
          assert.equal(calls, 1);
          assert.match(container.textContent ?? '', /may have succeeded/);
          assert.equal(
            container.querySelector('a[target=_blank]')?.getAttribute('href'),
            '/projects',
          );
          assert.equal(
            (
              container.querySelector(
                '[name=name], [name=title]',
              ) as HTMLInputElement
            ).value,
            'Retained name',
          );
          const allow = container.querySelector(
            'button[type=button]',
          ) as HTMLButtonElement;
          assert.equal(allow.disabled, true);
          await act(async () =>
            (
              container.querySelector(
                'input[type=checkbox]',
              ) as HTMLInputElement
            ).click(),
          );
          await act(async () => allow.click());
          assert.equal(save().disabled, false);
          globalThis.fetch = async () => {
            calls++;
            return Response.json({ location: '/projects/reconciled' });
          };
          await submit();
          assert.equal(calls, 2);
        },
      );
    }
    await t.test('stale edit remains locked', async () => {
      await mount({ name: 'Old', description: '', revision: 1 });
      let calls = 0;
      globalThis.fetch = async () => {
        calls++;
        return Response.json(
          { error: { code: 'conflict', message: 'Reload the record.' } },
          { status: 409 },
        );
      };
      await submit();
      assert.equal(save().disabled, true);
      await submit();
      assert.equal(calls, 1);
    });
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, saved);
    dom.window.close();
  }
});
