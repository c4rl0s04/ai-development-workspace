import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import Overview from '../src/app/(workspace)/page';
import Projects from '../src/app/(workspace)/projects/page';
import Approvals from '../src/app/(workspace)/approvals/page';
import NotFound from '../src/app/not-found';

test('overview provides real navigation and clearly states the foundation boundary', () => {
  const html = renderToStaticMarkup(<Overview />);
  assert.match(html, /href="\/projects"/);
  assert.match(html, /href="\/approvals"/);
  assert.match(html, /project management is not implemented yet/);
  assert.doesNotMatch(html, /<button|<form/);
});

test('project and approval placeholders do not pretend to be live empty inboxes', () => {
  for (const Page of [Projects, Approvals]) {
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
