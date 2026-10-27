import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PatientList as List, PatientRow } from '@/features/doctor/patients';

let data: List | undefined;
vi.mock('@/features/doctor/patients', async (original) => ({
  ...(await original<typeof import('@/features/doctor/patients')>()),
  useDoctorPatients: () => ({ data, isPending: false, isError: false, refetch: vi.fn() }),
}));

const { PatientList, labText, lastMealText, sodiumText } = await import('@/features/doctor/PatientList');

const week = (logged: boolean[]) => logged.map((l, i) => ({ date: `2026-10-${21 + i}`, logged: l }));

const row = (over: Partial<PatientRow> & { name: string; code: string }): PatientRow => ({
  linkId: `link-${over.code}`,
  since: '2026-09-02T00:00:00Z',
  patient: { patientId: `p-${over.code}`, name: over.name, patientCode: over.code, ckdStage: { value: '3b', source: 'patient_entered' }, dialysisStatus: 'none' },
  days: week([true, true, true, true, true, true, true]),
  daysLogged: 7,
  loggedToday: true,
  lastMealAt: '2026-10-27T04:30:00Z',
  daysSinceLastMeal: 0,
  sodium: { average: 1500, limit: 2000, limitSource: 'target', daysWithData: 7, daysOver: 0, status: 'within' },
  lab: null,
  unverifiedTargets: 0,
  flags: [{ kind: 'on_track', severity: 'ok', text: 'On track' }],
  attention: 0,
  ...over,
});

const ramon = row({
  name: 'Ramon dela Cruz',
  code: 'KW-001042',
  sodium: { average: 2640, limit: 2000, limitSource: 'target', daysWithData: 7, daysOver: 6, status: 'above' },
  lab: { label: 'Potassium', value: 5.8, unit: 'mmol/L', refLow: 3.5, refHigh: 5.1, collectedOn: '2026-10-03', status: 'above', source: 'patient_entered' },
  flags: [
    { kind: 'sodium_over', severity: 'bad', text: 'Sodium over target 6 of 7 days' },
    { kind: 'lab_out_of_range', severity: 'bad', text: 'Potassium above range' },
  ],
  attention: 4,
});
const teresita = row({
  name: 'Teresita Bautista',
  code: 'KW-000874',
  days: week([true, true, true, false, false, false, false]),
  daysLogged: 3,
  loggedToday: false,
  daysSinceLastMeal: 4,
  flags: [{ kind: 'not_logging', severity: 'warn', text: 'No meals for 4 days' }],
  attention: 1,
});
const arnel = row({ name: 'Arnel Villanueva', code: 'KW-003317', patient: { patientId: 'p3', name: 'Arnel Villanueva', patientCode: 'KW-003317', ckdStage: null, dialysisStatus: 'hemodialysis' } });

const onAdd = vi.fn();
const onStop = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  data = { summary: { total: 3, needsAttention: 2, loggedToday: 2, targetsUnverified: 0 }, patients: [ramon, teresita, arnel] };
});

const table = () => screen.getByRole('table');
const show = () =>
  render(
    <MemoryRouter>
      <PatientList onAdd={onAdd} onStop={onStop} />
    </MemoryRouter>,
  );

describe('PatientList', () => {
  it('shows the summary and each patient with why they are flagged, in the server’s order', () => {
    show();
    expect(screen.getByText('Needs attention').closest('div')).toHaveTextContent('2');
    expect(screen.getByText('Logged a meal today').closest('div')).toHaveTextContent('2 of 3');
    const rows = within(table()).getAllByRole('row').slice(1);
    expect(rows.map((r) => within(r).getByRole('rowheader').textContent)).toEqual([
      expect.stringContaining('Ramon dela Cruz'),
      expect.stringContaining('Teresita Bautista'),
      expect.stringContaining('Arnel Villanueva'),
    ]);
    expect(rows[0]).toHaveTextContent('▲ 2,640 of 2,000 mg target');
    expect(rows[0]).toHaveTextContent('▲ Potassium 5.8 mmol/L');
    expect(rows[0]).toHaveTextContent('Sodium over target 6 of 7 days');
    expect(within(rows[1]!).getByRole('img', { name: '3 of the last 7 days logged' })).toBeInTheDocument();
    expect(rows[1]).toHaveTextContent('Last meal 4 days ago');
    expect(within(rows[0]!).getByRole('link', { name: 'Ramon dela Cruz' })).toHaveAttribute('href', '/doctor/patients/p-KW-001042');
  });

  it('filters and searches', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Needs attention · 2' }));
    expect(within(table()).getAllByRole('rowheader')).toHaveLength(2);
    await userEvent.click(screen.getByRole('button', { name: 'On dialysis · 1' }));
    expect(within(table()).getAllByRole('rowheader').map((r) => r.textContent)).toEqual([expect.stringContaining('Arnel')]);
    await userEvent.click(screen.getByRole('button', { name: 'All · 3' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search patients' }), 'kw-000874');
    expect(within(table()).getAllByRole('rowheader').map((r) => r.textContent)).toEqual([expect.stringContaining('Teresita')]);
    await userEvent.clear(screen.getByRole('searchbox', { name: 'Search patients' }));
    await userEvent.type(screen.getByRole('searchbox', { name: 'Search patients' }), 'nobody');
    expect(screen.getByText('No patients match. Try another filter or search.')).toBeInTheDocument();
  });

  it('asks the parent to add or stop following', async () => {
    show();
    await userEvent.click(screen.getByRole('button', { name: 'Add a patient' }));
    expect(onAdd).toHaveBeenCalled();
    await userEvent.click(within(table()).getByRole('button', { name: 'Stop following Teresita Bautista' }));
    expect(onStop).toHaveBeenCalledWith('link-KW-000874', 'Teresita Bautista');
  });

  it('offers to add a first patient when there are none', () => {
    data = { summary: { total: 0, needsAttention: 0, loggedToday: 0, targetsUnverified: 0 }, patients: [] };
    show();
    expect(screen.getByRole('region', { name: 'Your patients' })).toHaveTextContent('No patients yet');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});

describe('row text', () => {
  it('describes sodium against a target or general guidance', () => {
    expect(sodiumText({ average: 1480, limit: 2000, limitSource: 'guidance', daysWithData: 5, daysOver: 0, status: 'within' })).toBe('✓ 1,480 mg · general guidance 2,000');
    expect(sodiumText({ average: null, limit: 2000, limitSource: 'target', daysWithData: 0, daysOver: 0, status: 'none' })).toBe('– No analysed meals this week');
  });

  it('describes the last meal and labs without a range', () => {
    expect(lastMealText({ lastMealAt: null, daysSinceLastMeal: null })).toBe('No meals logged yet');
    expect(lastMealText({ lastMealAt: '2026-10-26T04:00:00Z', daysSinceLastMeal: 1 })).toBe('Last meal yesterday');
    expect(labText({ label: 'eGFR', value: 19, unit: 'mL/min', refLow: null, refHigh: null, collectedOn: '2026-10-03', status: 'none', source: 'clinician_verified' })).toBe('eGFR 19 mL/min');
  });
});
