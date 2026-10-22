import AxeBuilder from '@axe-core/playwright';
import { expect, type APIRequestContext, type Page } from '@playwright/test';

export const fullFlow = process.env.E2E_FULL === '1';
export const fullFlowReason = 'Set E2E_FULL=1 with the API running (AI_PROVIDER=mock) to run the signed-in flows';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page: Page) {
  await page.waitForLoadState('networkidle');
  try {
    return await new AxeBuilder({ page }).withTags(TAGS).analyze();
  } catch (err) {
    if (!String(err).includes('Execution context was destroyed')) throw err;
    await page.waitForLoadState('networkidle');
    return new AxeBuilder({ page }).withTags(TAGS).analyze();
  }
}

export async function expectNoSeriousA11yIssues(page: Page, label: string) {
  const results = await scan(page);
  const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  const report = serious.map((v) => `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`);
  expect(report, `Accessibility problems on ${label}`).toEqual([]);
}

export interface TestPatient {
  email: string;
  password: string;
  firstName: string;
  patientCode?: string;
}

export async function createPatient(request: APIRequestContext, opts: { finishOnboarding?: boolean } = {}): Promise<TestPatient> {
  const patient = {
    email: `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`,
    password: 'e2e-Password-123',
    firstName: 'Liza',
  };
  const res = await request.post('/api/v1/auth/register', {
    data: { ...patient, lastName: 'Santos', acceptTerms: true, acceptHealthData: true },
  });
  expect(res.status(), await res.text()).toBe(201);
  const { data } = (await res.json()) as { data: { accessToken: string; user: { patientCode: string } } };
  if (opts.finishOnboarding ?? true) {
    const done = await request.post('/api/v1/patients/me/onboarding/complete', { headers: { Authorization: `Bearer ${data.accessToken}` } });
    expect(done.ok()).toBe(true);
  }
  return { ...patient, patientCode: data.user.patientCode };
}

export async function createDoctor(request: APIRequestContext): Promise<TestPatient> {
  const doctor = {
    email: `e2e-dr-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`,
    password: 'e2e-Password-123',
    firstName: 'Jose',
  };
  const res = await request.post('/api/v1/auth/register', {
    data: { ...doctor, role: 'doctor', lastName: 'Reyes', acceptTerms: true, specialty: 'Nephrology' },
  });
  expect(res.status(), await res.text()).toBe(201);
  return doctor;
}

export async function signIn(page: Page, account: TestPatient, home = '/patient/dashboard') {
  await page.goto('/login');
  await page.getByLabel('Email').fill(account.email);
  await page.getByLabel('Password', { exact: true }).fill(account.password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(new RegExp(home));
}
