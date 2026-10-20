import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { JSDOM } from 'jsdom';
import { renderToStaticMarkup } from 'react-dom/server';
import Overview from '../src/app/(workspace)/page';
import {
  RecordPanel,
  WorkspaceLoading,
} from '../src/components/workspace-records';
import Approvals from '../src/app/(workspace)/approvals/page';
import NotFound from '../src/app/not-found';

test('loading skeleton material preserves caller-supplied heading and row sizes', () => {
  const css = readFileSync(
    new URL(
      '../src/components/design-system/theme/components.css',
      import.meta.url,
    ),
    'utf8',
  );
  const material = css.match(/\.ws-skeleton\s*\{[^}]*\}/)?.[0];
  assert.ok(material);
  // Put the real material rule last: it must not override utility dimensions.
  const dom = new JSDOM(`<style>
    .h-8 { height: 32px; } .w-48 { width: 192px; }
    .h-4 { height: 16px; } .w-16 { width: 64px; }
    .w-1\\/2 { width: 50%; }
    ${material}
  </style>${renderToStaticMarkup(<WorkspaceLoading />)}`);
  try {
    const skeletons = dom.window.document.querySelectorAll('.ws-skeleton');
    assert.equal(skeletons.length, 7);
    assert.deepEqual(
      [...skeletons].map((element) => {
        assert.equal(element.getAttribute('aria-hidden'), 'true');
        const style = dom.window.getComputedStyle(element);
        return [style.width, style.height];
      }),
      [
        ['192px', '32px'],
        ...Array.from({ length: 3 }, () => [
          ['64px', '16px'],
          ['50%', '16px'],
        ]).flat(),
      ],
    );
    assert.ok(
      dom.window.document.querySelector(
        '[role="status"][aria-label="Loading workspace"]',
      ),
    );
  } finally {
    dom.window.close();
  }
});

test('overview provides real navigation and clearly states the foundation boundary', () => {
  const html = renderToStaticMarkup(<Overview />);
  assert.match(html, /href="\/projects"/);
  assert.match(html, /href="\/approvals"/);
  assert.match(html, /Projects and tasks now persist in PostgreSQL/);
  assert.doesNotMatch(html, /<button|<form/);
});

test('approvals remains an honest placeholder while record panels preserve accessible markup', () => {
  assert.match(
    renderToStaticMarkup(
      <RecordPanel>
        <h2>No projects yet</h2>
      </RecordPanel>,
    ),
    /No projects yet/,
  );
  for (const Page of [Approvals]) {
    const html = renderToStaticMarkup(<Page />);
    assert.match(html, /not implemented yet/);
    assert.match(html, /Planned for M1/);
    assert.match(html, /href="\/"/);
    assert.doesNotMatch(html, /<button|<form/);
  }
});

test('approval copy keeps approval and execution authorization distinct', () => {
  assert.match(
    renderToStaticMarkup(<Approvals />),
    /Approval alone will not authorize implementation/,
  );
});

test('unknown-page component offers a route back into the workspace', () => {
  assert.match(renderToStaticMarkup(<NotFound />), /href="\/"/);
});

test('server record presentation keeps status read-only and repository context accessible', async () => {
  const { StatusBadge, RepositoryLink } = await import(
    '../src/components/workspace-records'
  );
  const status = renderToStaticMarkup(<StatusBadge status="backlog" />);
  assert.match(status, /data-status="backlog"/);
  assert.match(status, /Backlog/);
  assert.doesNotMatch(status, /<button|<select/);
  const repository = renderToStaticMarkup(
    <RepositoryLink url="https://github.com/example/workspace" />,
  );
  assert.match(repository, /href="https:\/\/github.com\/example\/workspace"/);
  assert.match(repository, /noopener noreferrer/);
  assert.match(repository, /opens in a new tab/);
  assert.match(
    renderToStaticMarkup(<RepositoryLink url={null} />),
    /No repository associated/,
  );
});
