import { expect, test } from '@playwright/test';
import { createDoctor, expectNoSeriousA11yIssues, fullFlow, fullFlowReason, signIn } from './helpers';

test.describe('signed-in doctor', () => {
  test.skip(!fullFlow, fullFlowReason);

  test('every doctor page passes the accessibility scan, and patient pages are closed', async ({ page, request }) => {
    const doctor = await createDoctor(request);
    await signIn(page, doctor, '/doctor/dashboard');
    for (const path of ['/doctor/dashboard', '/doctor/profile', '/doctor/settings']) {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
      await expectNoSeriousA11yIssues(page, path);
    }
    await page.goto('/patient/dashboard');
    await expect(page).toHaveURL(/\/doctor\/dashboard/);
  });

  test('updates the profile patients will see', async ({ page, request }) => {
    const doctor = await createDoctor(request);
    await signIn(page, doctor, '/doctor/dashboard');
    await page.goto('/doctor/profile');
    await page.getByLabel(/Clinic or hospital/).fill('Philippine General Hospital');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile saved')).toBeVisible();
    await page.goto('/doctor/dashboard');
    await expect(page.getByRole('region', { name: 'What patients see about you' })).toContainText('Philippine General Hospital');
  });
});
