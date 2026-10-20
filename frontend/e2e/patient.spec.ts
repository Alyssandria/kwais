import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { createPatient, expectNoSeriousA11yIssues, fullFlow, fullFlowReason, signIn } from './helpers';

test.describe('signed-in patient', () => {
  test.skip(!fullFlow, fullFlowReason);
  test.describe.configure({ mode: 'serial' });

  test('every patient page passes the accessibility scan', async ({ page, request }) => {
    const patient = await createPatient(request);
    await signIn(page, patient);
    for (const path of ['/patient/dashboard', '/patient/meals', '/patient/meals/new', '/patient/analytics', '/patient/labs', '/patient/notifications', '/patient/profile', '/patient/settings']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await expectNoSeriousA11yIssues(page, path);
    }
  });

  test('log a meal, see it analysed, and find it in history', async ({ page, request }) => {
    const patient = await createPatient(request);
    await signIn(page, patient);
    await page.goto('/patient/meals/new');
    await page.getByLabel(/What you ate/).fill('1 tasa kanin, isang hita ng inihaw na manok');
    await page.getByRole('button', { name: 'Save and analyse' }).click();

    await expect(page).toHaveURL(/\/patient\/meals\/[0-9a-f-]{36}$/, { timeout: 30_000 });
    await expect(page.getByRole('heading', { level: 1, name: /analysed/ })).toBeVisible();
    await expectNoSeriousA11yIssues(page, 'analysed meal');

    await page.goto('/patient/meals');
    await expect(page.getByText(/kanin/).first()).toBeVisible();
  });

  test('download my data, then delete the account', async ({ page, request }) => {
    const patient = await createPatient(request);
    await signIn(page, patient);
    await page.goto('/patient/settings');

    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download my data' }).click()]);
    expect(download.suggestedFilename()).toMatch(/^kwais-export-KW-.+\.json$/);
    const exported = JSON.parse(await readFile((await download.path())!, 'utf8')) as { format: string; account: { email: string } };
    expect(exported.format).toBe('kwais-export');
    expect(exported.account.email).toBe(patient.email);

    await page.getByRole('button', { name: 'Delete my account' }).click();
    const dialog = page.getByRole('dialog', { name: 'Delete your account?' });
    await dialog.getByLabel('Your password').fill(patient.password);
    await dialog.getByLabel('Type DELETE to confirm').fill('DELETE');
    await dialog.getByRole('button', { name: 'Delete everything' }).click();
    await expect(page).toHaveURL(/\/$/);

    const login = await request.post('/api/v1/auth/login', { data: { email: patient.email, password: patient.password } });
    expect(login.status()).toBe(401);
  });

  test('changing the password signs out other sessions', async ({ page, request, browser }) => {
    const patient = await createPatient(request);
    await signIn(page, patient);
    const other = await browser.newContext();
    const otherPage = await other.newPage();
    await signIn(otherPage, patient);

    await page.goto('/patient/settings');
    await page.getByLabel('Current password').fill(patient.password);
    await page.getByLabel('New password', { exact: true }).fill('e2e-Changed-456');
    await page.getByLabel('Confirm new password').fill('e2e-Changed-456');
    await page.getByRole('button', { name: 'Change password' }).click();
    await expect(page.getByText(/Password changed/)).toBeVisible();

    await page.reload();
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

    await otherPage.reload();
    await expect(otherPage).toHaveURL(/\/login/);
    await other.close();
  });
});
