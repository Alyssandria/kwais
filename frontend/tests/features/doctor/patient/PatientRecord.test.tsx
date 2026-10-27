import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, type AxiosResponse } from 'axios';
import { ToastProvider } from '@/components/ui';
import type { PatientDashboard } from '@/features/dashboard/types';
import type { PatientRecord } from '@/features/doctor/patient/api';
import type { Meal, MealAnalysis } from '@/features/meals/api';
import type { Lab, Target } from '@/features/profile/api';
import type { Note } from '@/features/notes/api';

type Query<T> = { data?: T; isPending: boolean; isError: boolean; error?: unknown };
let record: Query<PatientRecord>;
let meal: Query<Meal>;
const act = vi.fn();
const scopes: (string | null)[] = [];

vi.mock('@/features/doctor/patient/api', () => ({ usePatientRecord: () => ({ ...record, refetch: vi.fn() }) }));
vi.mock('@/features/care/api', () => ({ useCareAction: () => ({ mutateAsync: act, isPending: false }) }));
vi.mock('@/features/dashboard/useDashboard', async () => {
  const { usePatientScope } = await import('@/lib/patient-scope');
  return {
    useDashboard: () => {
      scopes.push(usePatientScope());
      return { data: dashboard, isPending: false, isError: false, refetch: vi.fn() };
    },
  };
});
vi.mock('@/features/profile/api', () => ({
  useTargets: () => ({ data: targets, isPending: false, isError: false, refetch: vi.fn() }),
  useLabs: () => ({ data: labs, isPending: false, isError: false, refetch: vi.fn() }),
}));
vi.mock('@/features/meals/api', () => ({ useMeal: () => ({ ...meal, refetch: vi.fn() }) }));

const setStage = vi.fn();
const setTarget = vi.fn();
const addLab = vi.fn();
const verifyLab = vi.fn();
const addNote = vi.fn();
const deleteNote = vi.fn();
let notes: Note[] = [];
vi.mock('@/features/doctor/patient/clinical', () => ({
  useSetStage: () => ({ mutateAsync: setStage }),
  useSetPatientTarget: () => ({ mutateAsync: setTarget }),
  useAddPatientLab: () => ({ mutateAsync: addLab }),
  useCorrectPatientLab: () => ({ mutateAsync: vi.fn() }),
  useVerifyPatientLab: () => ({ mutateAsync: verifyLab }),
  usePatientNotes: () => ({ data: notes, isPending: false, isError: false, refetch: vi.fn() }),
  useAddNote: () => ({ mutateAsync: addNote, isPending: false }),
  useEditNote: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteNote: () => ({ mutateAsync: deleteNote, isPending: false }),
}));

const { PatientRecordLayout } = await import('@/features/doctor/patient/PatientRecordLayout');
const { OverviewTab } = await import('@/features/doctor/patient/OverviewTab');
const { MealDetailPage } = await import('@/features/doctor/patient/MealDetailPage');
const { LabsTab } = await import('@/features/doctor/patient/LabsTab');
const { NotesTab } = await import('@/features/doctor/patient/NotesTab');

const PID = 'p1';

const ramon: PatientRecord = {
  linkId: 'link-1',
  since: '2026-09-02T00:00:00Z',
  patient: { patientId: PID, name: 'Ramon dela Cruz', patientCode: 'KW-001042', ckdStage: { value: '4', source: 'patient_entered' }, dialysisStatus: 'none' },
  days: [],
  daysLogged: 6,
  loggedToday: true,
  lastMealAt: '2026-10-27T04:30:00Z',
  daysSinceLastMeal: 0,
  sodium: { average: 2640, limit: 2000, limitSource: 'target', daysWithData: 7, daysOver: 6, status: 'above' },
  lab: null,
  unverifiedTargets: 1,
  flags: [{ kind: 'sodium_over', severity: 'bad', text: 'Sodium over target 6 of 7 days' }],
  attention: 2,
  profile: {
    patientCode: 'KW-001042',
    firstName: 'Ramon',
    lastName: 'dela Cruz',
    birthYear: 1962,
    sex: 'male',
    dietaryPreferences: [],
    allergies: ['Shrimp'],
    restrictions: ['Low-salt diet'],
    ckdStage: { value: '4', source: 'patient_entered', verified: null },
    dialysisStatus: 'none',
    reminderTime: null,
    timezone: 'Asia/Manila',
    onboarding: { step: 5, complete: true },
    updatedAt: '',
  },
};

const n = (value: number, target: number | null, unit: 'mg' | 'g' = 'mg') => ({ value, unit, target, targetSource: target ? ('patient_entered' as const) : null, hasEstimates: true });
const dashboard: PatientDashboard = {
  isSample: false,
  sampleInsights: false,
  generatedAt: '',
  today: {
    date: '2026-10-27',
    mealsLogged: [{ category: 'breakfast', eatenAt: '2026-10-27T00:30:00Z' }],
    streakDays: 3,
    averageScore: 5,
    scoredMeals: 1,
    nutrients: { sodium: n(1100, 2000), potassium: n(500, null), phosphorus: n(300, null), protein: n(20, null, 'g') },
    byMeal: [],
  },
  week: [
    { date: '2026-10-26', score: 4, totals: { sodium: 2900, potassium: 1400, phosphorus: 700, protein: 55 } },
    { date: '2026-10-27', score: 5, totals: { sodium: 1100, potassium: 500, phosphorus: 300, protein: 20 } },
  ],
  labs: [{ test: 'potassium', label: 'Potassium', unit: 'mmol/L', refLow: 3.5, refHigh: 5.1, source: 'patient_entered', history: [{ collectedOn: '2026-10-03', value: 5.8 }] }],
  consistency: [],
  recentMeals: [{ id: 'm1', category: 'breakfast', eatenAt: '2026-10-27T00:30:00Z', summary: 'Sinangag at tuyo', score: 5, status: 'analysed' }],
  insights: [],
};

const targets: Target[] = [{ nutrient: 'sodium', dailyMax: 2000, unit: 'mg', source: 'patient_entered', note: null, since: '2026-09-02T00:00:00Z', verified: null }];
const labs: Lab[] = [
  { id: 'l1', test: 'potassium', label: 'Potassium', value: 5.8, refLow: 3.5, refHigh: 5.1, unit: 'mmol/L', collectedOn: '2026-10-03', labName: 'Sample Lab', source: 'clinician_verified', verified: { by: 'Dr. Ana Reyes', at: '2026-10-05T00:00:00Z' }, createdAt: '' },
];

const analysis: MealAnalysis = {
  id: 'a1',
  version: 1,
  engineVersion: 'nutrition-engine@1',
  createdAt: '2026-10-27T00:35:00Z',
  totals: {
    sodium: { value: 900, unit: 'mg', source: 'estimated', complete: true },
    potassium: { value: 200, unit: 'mg', source: 'estimated', complete: true },
    phosphorus: { value: 150, unit: 'mg', source: 'estimated', complete: true },
    protein: { value: 12, unit: 'g', source: 'estimated', complete: true },
  },
  items: [],
  notes: [],
  day: null,
  score: null,
  scoreBand: null,
  parser: 'rules',
  ai: { status: 'unavailable', reason: 'no_consent', output: null, model: null, promptVersion: null },
};

const breakfast: Meal = {
  id: 'm1',
  category: 'breakfast',
  eatenAt: '2026-10-27T00:30:00Z',
  rawText: 'Sinangag at tuyo',
  condiments: [],
  drinks: [],
  cookingMethods: [],
  notes: null,
  status: 'analysed',
  createdAt: '',
  updatedAt: '',
  analysis,
};

function open(path: string) {
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/doctor/dashboard" element={<p>Patient list</p>} />
          <Route path="/doctor/patients/:patientId" element={<PatientRecordLayout />}>
            <Route index element={<OverviewTab />} />
            <Route path="meals/:mealId" element={<MealDetailPage />} />
            <Route path="labs" element={<LabsTab />} />
            <Route path="notes" element={<NotesTab />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  scopes.length = 0;
  record = { data: ramon, isPending: false, isError: false };
  meal = { data: breakfast, isPending: false, isError: false };
  notes = [];
  labs.length = 1;
});

describe('patient record for doctors', () => {
  it('shows who the patient is and what needs attention', () => {
    open(`/doctor/patients/${PID}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Ramon dela Cruz' })).toBeInTheDocument();
    expect(screen.getByText(/KW-001042 · Stage 4 · entered by patient/)).toBeInTheDocument();
    expect(screen.getByText('Shrimp')).toBeInTheDocument();
    expect(within(screen.getByRole('navigation', { name: 'Patient record' })).getByRole('link', { name: 'Overview' })).toHaveAttribute('aria-current', 'page');

    const glance = screen.getByRole('region', { name: 'At a glance' });
    expect(glance).toHaveTextContent('Sodium over target 6 of 7 days');
    expect(glance).toHaveTextContent('1 entered by the patient, not verified');
    expect(screen.getByRole('region', { name: 'Today so far' })).toHaveTextContent('55% of 2,000 mg · entered by patient');
    expect(screen.getByRole('region', { name: 'Latest labs' })).toHaveTextContent('5.8 mmol/L · Above slip range');
    expect(screen.getByRole('table', { name: /last 7 days/ })).toHaveTextContent('2,900 (over target)');
    expect(screen.getByRole('link', { name: /Sinangag at tuyo/ })).toHaveAttribute('href', `/doctor/patients/${PID}/meals/m1`);
    expect(scopes).toContain(PID);
  });

  it('says so when the patient no longer shares', () => {
    const response = { status: 404, data: {} } as AxiosResponse;
    record = { isPending: false, isError: true, error: new AxiosError('Not found', '404', undefined, undefined, response) };
    open(`/doctor/patients/${PID}`);
    expect(screen.getByText('This patient isn’t sharing with you')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: 'Patient record' })).not.toBeInTheDocument();
  });

  it('stops following after confirming, then returns to the list', async () => {
    act.mockResolvedValue(undefined);
    open(`/doctor/patients/${PID}`);
    await userEvent.click(screen.getByRole('button', { name: 'Stop following Ramon dela Cruz' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Stop following Ramon dela Cruz?' })).getByRole('button', { name: 'Stop following' }));
    expect(act).toHaveBeenCalledWith({ id: 'link-1', action: 'end' });
    expect(await screen.findByText('Patient list')).toBeInTheDocument();
  });

  it('shows a meal read-only, in the doctor’s words', () => {
    open(`/doctor/patients/${PID}/meals/m1`);
    expect(screen.getByRole('region', { name: 'What the patient logged' })).toHaveTextContent('Sinangag at tuyo');
    expect(screen.getByText('No AI analysis: the patient has AI processing off')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Allow AI|Analyse again|Delete meal/ })).not.toBeInTheDocument();
  });

  it('lists targets and labs with where each value came from', () => {
    open(`/doctor/patients/${PID}/labs`);
    const targetsTable = screen.getByRole('table', { name: 'The patient’s daily nutrient targets' });
    expect(targetsTable).toHaveTextContent('Sodium2,000 mg');
    expect(targetsTable).toHaveTextContent('Entered by patient');
    const labsTable = screen.getByRole('table', { name: 'The patient’s lab results' });
    expect(labsTable).toHaveTextContent('5.8 mmol/L');
    expect(labsTable).toHaveTextContent('3.5–5.1');
    expect(labsTable).toHaveTextContent('Verified');
  });
});

describe('clinical actions', () => {
  it('verifies the stage and the patient’s target as they are', async () => {
    setStage.mockResolvedValue({});
    setTarget.mockResolvedValue({});
    open(`/doctor/patients/${PID}/labs`);
    expect(screen.getByRole('region', { name: 'CKD stage' })).toHaveTextContent('Stage 4Entered by patient');
    await userEvent.click(screen.getByRole('button', { name: 'Verify Stage 4' }));
    expect(setStage).toHaveBeenCalledWith('4');
    await userEvent.click(screen.getByRole('button', { name: 'Verify sodium target' }));
    expect(setTarget).toHaveBeenCalledWith({ nutrient: 'sodium', dailyMax: 2000, note: null });
  });

  it('offers to verify only results the patient entered', async () => {
    labs.push({ ...labs[0]!, id: 'l2', label: 'Creatinine', test: 'creatinine', unit: 'mg/dL', value: 3.1, source: 'patient_entered', verified: null });
    verifyLab.mockResolvedValue({});
    open(`/doctor/patients/${PID}/labs`);
    expect(screen.queryByRole('button', { name: /Verify Potassium result/ })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /Verify Creatinine result/ }));
    expect(verifyLab).toHaveBeenCalledWith('l2');
    expect(screen.getByRole('button', { name: /Correct Potassium result/ })).toBeInTheDocument();
  });

  it('adds a lab result for the patient', async () => {
    open(`/doctor/patients/${PID}/labs`);
    await userEvent.click(screen.getByRole('button', { name: 'Add a result' }));
    expect(screen.getByRole('dialog', { name: 'Add a result for Ramon dela Cruz' })).toHaveTextContent('marked as verified by you');
  });

  it('sends a note and lets the author manage only their own', async () => {
    addNote.mockResolvedValue({});
    notes = [
      { id: 'n1', body: 'Keep sodium low this week.', author: 'Dr. Jose Reyes', createdAt: '2026-10-26T02:00:00Z', updatedAt: '2026-10-26T02:00:00Z', edited: false, mine: true },
      { id: 'n2', body: 'Repeat potassium next month.', author: 'Dr. Ana Cruz', createdAt: '2026-10-20T02:00:00Z', updatedAt: '2026-10-20T02:00:00Z', edited: false, mine: false },
    ];
    open(`/doctor/patients/${PID}/notes`);
    await userEvent.type(screen.getByRole('textbox', { name: 'Note' }), '  Bring your lab slip.  ');
    await userEvent.click(screen.getByRole('button', { name: 'Send note' }));
    expect(addNote).toHaveBeenCalledWith('Bring your lab slip.');

    const mine = screen.getByRole('article', { name: 'Note from Dr. Jose Reyes' });
    const theirs = screen.getByRole('article', { name: 'Note from Dr. Ana Cruz' });
    expect(within(mine).getByRole('button', { name: 'Delete' })).toBeInTheDocument();
    expect(within(theirs).queryByRole('button')).not.toBeInTheDocument();

    deleteNote.mockResolvedValue(undefined);
    await userEvent.click(within(mine).getByRole('button', { name: 'Delete' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Delete this note?' })).getByRole('button', { name: 'Delete note' }));
    expect(deleteNote).toHaveBeenCalledWith('n1');
  });
});

