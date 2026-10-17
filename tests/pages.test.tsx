import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import Overview from '../src/app/(workspace)/page';
import { RecordPanel } from '../src/components/workspace-records';
import Approvals from '../src/app/(workspace)/approvals/page';
import NotFound from '../src/app/not-found';

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
