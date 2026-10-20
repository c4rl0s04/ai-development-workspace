import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

async function noOverflow(page: Page) {
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
}

test('real project/task forms preserve validation, saving feedback and persisted edits', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const key = `T${randomUUID().replaceAll('-', '').slice(0, 8)}`.toUpperCase();
  await page.goto('/projects');
  await page.getByRole('link', { name: 'New project', exact: true }).click();
  const create = page.getByRole('button', {
    name: 'Create project',
    exact: true,
  });
  await create.hover();
  await expect(create).toHaveCSS('background-color', 'rgb(91, 119, 153)');
  const luminance = [91, 119, 153]
    .map((value) => {
      const channel = value / 255;
      return channel <= 0.04045
        ? channel / 12.92
        : ((channel + 0.055) / 1.055) ** 2.4;
    })
    .reduce(
      (sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index],
      0,
    );
  await expect(create).toHaveCSS('color', 'rgb(255, 255, 255)');
  expect(1.05 / (luminance + 0.05)).toBeGreaterThanOrEqual(4.5);
  await page
    .getByRole('button', { name: 'Create project', exact: true })
    .click();
  await expect(page.getByLabel('Project name', { exact: true })).toBeFocused();
  await page
    .getByLabel('Project name', { exact: true })
    .fill('Synthetic browser project');
  await page.getByLabel('Project key', { exact: true }).fill(key);
  await page
    .getByLabel('GitHub repository URL (optional)')
    .fill('https://example.invalid/wrong/repository');
  await page
    .getByRole('button', { name: 'Create project', exact: true })
    .click();
  await expect(page.locator('form').getByRole('alert')).toBeFocused();
  await expect(
    page.getByLabel('GitHub repository URL (optional)'),
  ).toHaveAttribute('aria-invalid', 'true');
  await page
    .getByLabel('GitHub repository URL (optional)')
    .fill('https://github.com/example/synthetic.git');
  let releasePost = () => {};
  const postGate = new Promise<void>((resolve) => {
    releasePost = resolve;
  });
  await page.route('**/api/projects', async (route) => {
    if (route.request().method() === 'POST') {
      await postGate;
    }
    await route.continue();
  });
  try {
    await page
      .getByRole('button', { name: 'Create project', exact: true })
      .click();
    await expect(
      page.getByLabel('Project name', { exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('button', { name: 'Saving…', exact: true }),
    ).toBeDisabled();
    await expect(
      page.getByRole('link', { name: 'Cancel', exact: true }),
    ).toHaveAttribute('aria-disabled', 'true');
    await expect(
      page.getByRole('link', { name: 'Cancel', exact: true }),
    ).toHaveCSS('opacity', '0.5');
  } finally {
    releasePost();
  }
  await page.waitForURL(/\/projects\/[0-9a-f-]+$/);
  const projectUrl = page.url();
  await expect(
    page.getByRole('link', { name: /example\/synthetic/ }),
  ).toHaveAttribute('href', 'https://github.com/example/synthetic');
  await page.getByRole('link', { name: 'Edit project', exact: true }).click();
  await page.getByLabel('Project name', { exact: true }).fill('P'.repeat(100));
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.waitForURL(projectUrl);
  await page.getByRole('link', { name: 'New task', exact: true }).click();
  await page.getByLabel('Task title', { exact: true }).fill('Synthetic task');
  await page
    .getByLabel('Description (optional)')
    .fill('Locally persisted task description');
  await page.getByRole('button', { name: 'Create task', exact: true }).click();
  await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
  await expect(
    page
      .getByRole('navigation', { name: 'Breadcrumb' })
      .getByText(`${key}-1`, { exact: true }),
  ).toBeVisible();
  await expect(page.getByText('Backlog', { exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Edit task', exact: true }).click();
  await page
    .getByLabel('Task title', { exact: true })
    .fill('Edited synthetic task');
  await page.getByRole('button', { name: 'Save changes', exact: true }).click();
  await page.waitForURL(/\/tasks\/[0-9a-f-]+$/);
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Edited synthetic task' }),
  ).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await noOverflow(page);
  }
  expect(errors).toEqual([]);
});

test('missing records and unknown URLs keep one main landmark and skip target', async ({
  page,
}) => {
  for (const url of [
    '/unknown-local-route',
    `/projects/${randomUUID()}`,
    `/projects/${randomUUID()}/tasks/${randomUUID()}`,
  ]) {
    await page.goto(url);
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();
    await expect(page.getByRole('main')).toHaveCount(1);
    await expect(page.locator('#main-content')).toHaveCount(1);
    await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  }
});

test('slow real reads expose correctly sized loading UI and recover', async ({
  page,
  backend,
}) => {
  await page.goto('/');
  // A local table lock delays the real read, not the UI or an API fixture response.
  const release = await backend.holdProjectReads();
  try {
    await page.goto('/projects', { waitUntil: 'commit' });
    await expect(
      page.getByRole('status', { name: 'Loading workspace' }),
    ).toBeVisible({ timeout: 2000 });
    const heading = page.locator('.ws-skeleton').first();
    await expect(heading).toHaveCSS('width', '192px');
    await expect(heading).toHaveCSS('height', '32px');
  } finally {
    await release();
  }
  await expect(
    page.getByRole('heading', { name: 'Projects', exact: true }),
  ).toBeVisible();
});

test('keyboard, native submit, fallback materials and error recovery remain usable', async ({
  page,
  browserName,
}) => {
  await page.goto('/');
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  await expect(
    page.getByRole('link', { name: 'Skip to content' }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('main')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveJSProperty(
    'tagName',
    'BUTTON',
  );
  await expect(page.getByRole('button', { name: 'Sign out' })).toHaveAttribute(
    'type',
    'submit',
  );
  await page.emulateMedia({ reducedMotion: 'reduce', contrast: 'more' });
  await expect(page.locator('.liqui-glass__backdrop').first()).toBeHidden();
  await expect(page.locator('.nav-link').first()).toHaveCSS(
    'transition-duration',
    '0s',
  );
  await page.emulateMedia({ forcedColors: 'active' });
  if (browserName === 'chromium') {
    expect(
      await page.evaluate(() => matchMedia('(forced-colors: active)').matches),
    ).toBe(true);
  }
  await expect(
    page.getByRole('link', { name: 'Overview', exact: true }).first(),
  ).toBeVisible();
  await page.emulateMedia({
    forcedColors: 'none',
    contrast: 'no-preference',
    reducedMotion: 'no-preference',
  });
  await page.goto('/projects/new');
  await page.getByLabel('Project name', { exact: true }).fill('Retained input');
  await page.getByLabel('Project key', { exact: true }).fill('ERR');
  await page.route('**/api/projects', (route) =>
    route.fulfill({
      status: 503,
      json: {
        error: {
          code: 'unavailable',
          message: 'Storage is temporarily unavailable.',
        },
      },
    }),
  );
  await page
    .getByRole('button', { name: 'Create project', exact: true })
    .click();
  await expect(page.locator('form').getByRole('alert')).toBeFocused();
  await expect(page.getByLabel('Project name', { exact: true })).toHaveValue(
    'Retained input',
  );
  await expect(
    page.getByRole('region', { name: 'Reconcile previous create' }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Create project', exact: true }),
  ).toBeDisabled();
  await page.getByRole('button', { name: 'Sign out', exact: true }).click();
  await page.waitForURL(/\/login(?:\?|$)/);
  await page.goto('/projects');
  await expect(page).toHaveURL(/\/login\?error=expired$/);
});
