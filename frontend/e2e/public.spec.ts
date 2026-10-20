import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yIssues } from './helpers';

const PAGES = [
  { path: '/', heading: /kidney/i },
  { path: '/login', heading: /welcome back/i },
  { path: '/register', heading: /account/i },
  { path: '/forgot-password', heading: /password/i },
  { path: '/privacy', heading: /privacy/i },
  { path: '/terms', heading: /terms/i },
  { path: '/disclaimer', heading: /./ },
];

for (const p of PAGES) {
  test(`${p.path} loads and passes the accessibility scan`, async ({ page }) => {
    await page.goto(p.path);
    await expect(page.getByRole('heading', { level: 1, name: p.heading })).toBeVisible();
    await expectNoSeriousA11yIssues(page, p.path);
  });
}

test('unknown pages show the not-found page', async ({ page }) => {
  await page.goto('/this-page-does-not-exist');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expectNoSeriousA11yIssues(page, 'not found');
});

test('patient pages send signed-out visitors to sign in', async ({ page }) => {
  await page.goto('/patient/settings');
  await expect(page).toHaveURL(/\/login\?next=/);
});

test('the sign-in form can be completed with the keyboard and reports errors in words', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel('Email').focus();
  await page.keyboard.type('not-an-email');
  await page.keyboard.press('Enter');
  const email = page.getByLabel('Email');
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Enter a valid email address')).toBeVisible();
});
