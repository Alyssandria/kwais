import { expect, test } from '@playwright/test';
import { createDoctor, createPatient, expectNoSeriousA11yIssues, fullFlow, fullFlowReason, signIn } from './helpers';

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

  test('a doctor asks by code, the patient approves, and either can stop', async ({ page, request, browser }) => {
    const doctor = await createDoctor(request);
    const patient = await createPatient(request);
    await signIn(page, doctor, '/doctor/dashboard');

    await page.getByRole('button', { name: 'Add a patient' }).click();
    const dialog = page.getByRole('dialog', { name: 'Add a patient' });
    await dialog.getByLabel('Patient code').fill(patient.patientCode!);
    await dialog.getByRole('button', { name: 'Send request' }).click();
    await expect(page.getByText(`Waiting for ${patient.patientCode} to approve`)).toBeVisible();

    const other = await browser.newContext();
    const patientPage = await other.newPage();
    await signIn(patientPage, patient);
    await patientPage.goto('/patient/settings');
    const req = patientPage.getByRole('region', { name: /Request from Dr\. Jose Reyes/ });
    await expect(req).toContainText('K-WAIS has not checked them');
    await expectNoSeriousA11yIssues(patientPage, 'settings with a care team request');
    await req.getByRole('button', { name: 'Approve' }).click();
    await expect(patientPage.getByRole('region', { name: 'Care team' })).toContainText('Since');

    await page.reload();
    const list = page.getByRole('region', { name: 'Your patients' });
    await expect(list).toContainText(`${patient.firstName} Santos`);
    await expectNoSeriousA11yIssues(page, 'doctor home with a patient');

    await patientPage.getByRole('button', { name: 'Stop sharing' }).click();
    await patientPage.getByRole('dialog').getByRole('button', { name: 'Stop sharing' }).click();
    await page.reload();
    await expect(page.getByRole('region', { name: 'Your patients' })).toContainText('No patients yet');
    await page.goto('/doctor/notifications');
    await expect(page.getByText(/stopped sharing/)).toBeVisible();
    await other.close();
  });
});
