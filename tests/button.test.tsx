import assert from 'node:assert/strict';
import { test } from 'node:test';
import { registerHooks } from 'node:module';
import { JSDOM } from 'jsdom';
import { act } from 'react';
import { createRoot } from 'react-dom/client';

test('glass actions are keyboard buttons; native solid controls submit forms', async () => {
  const loader = registerHooks({
    load(url, context, next) {
      // Node has no CSS renderer; test real component behavior, not its paint.
      if (url.endsWith('.css'))
        return { format: 'module', source: '', shortCircuit: true };
      return next(url, context);
    },
  });
  const { Button } = await import('../src/components/design-system/ui/button');
  const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
  const saved = {
    window: globalThis.window,
    document: globalThis.document,
    self: globalThis.self,
    HTMLElement: globalThis.HTMLElement,
    Element: globalThis.Element,
    Node: globalThis.Node,
  };
  Object.assign(globalThis, {
    window: dom.window,
    document: dom.window.document,
    self: dom.window,
    HTMLElement: dom.window.HTMLElement,
    Element: dom.window.Element,
    Node: dom.window.Node,
    IS_REACT_ACT_ENVIRONMENT: true,
  });
  const container = dom.window.document.getElementById('root');
  assert.ok(container);
  const root = createRoot(container);
  try {
    let actions = 0;
    let submits = 0;
    await act(async () =>
      root.render(
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submits++;
          }}
        >
          <Button
            variant="glass"
            onClick={() => {
              actions++;
            }}
          >
            Inspect
          </Button>
          <Button
            variant="glass"
            disabled
            onClick={() => {
              actions++;
            }}
          >
            Unavailable
          </Button>
          <Button variant="accent" type="submit">
            Save
          </Button>
        </form>,
      ),
    );
    const glass = container.querySelector<HTMLElement>('[role="button"]');
    assert.ok(glass);
    assert.notEqual(glass.tagName, 'BUTTON');
    assert.equal(glass.tabIndex, 0);
    glass.focus();
    for (const key of ['Enter', ' ']) {
      await act(async () => {
        glass.dispatchEvent(
          new dom.window.KeyboardEvent('keydown', { key, bubbles: true }),
        );
        glass.dispatchEvent(
          new dom.window.KeyboardEvent('keyup', { key, bubbles: true }),
        );
      });
    }
    assert.equal(actions, 2);
    assert.equal(submits, 0);
    const disabled =
      container.querySelectorAll<HTMLElement>('[role="button"]')[1];
    assert.equal(disabled.getAttribute('aria-disabled'), 'true');
    await act(async () => disabled.click());
    assert.equal(actions, 2);
    const submit = container.querySelector<HTMLButtonElement>(
      'button[type="submit"]',
    );
    assert.ok(submit);
    await act(async () => submit.click());
    assert.equal(submits, 1);
  } finally {
    await act(async () => root.unmount());
    Object.assign(globalThis, saved);
    dom.window.close();
    loader.deregister();
  }
});
