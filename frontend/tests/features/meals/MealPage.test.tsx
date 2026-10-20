import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, type AxiosResponse } from 'axios';
import { ToastProvider } from '@/components/ui';
import type { AiAnalysis, Meal, MealAnalysis } from '@/features/meals/api';

const analyse = vi.fn();
const changeConsent = vi.fn();
let query: { data?: Meal; isPending: boolean; isError: boolean; error?: unknown } = { isPending: true, isError: false };

vi.mock('@/features/meals/api', () => ({
  useMeal: () => ({ ...query, refetch: vi.fn() }),
  useAnalyseMeal: () => ({ mutateAsync: analyse, isPending: false }),
  useDeleteMeal: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/features/profile/api', () => ({
  useTargets: () => ({ data: [{ nutrient: 'sodium', dailyMax: 2000, unit: 'mg', source: 'patient_entered', note: null, since: '' }] }),
  useChangeConsent: () => ({ mutateAsync: changeConsent, isPending: false }),
}));

const { MealPage } = await import('@/features/meals/MealPage');

const none = { value: null, source: 'missing' as const };
const nutrients = (sodium: number, potassium: number, phosphorus: number, protein: number) => ({
  sodium: { value: sodium, source: 'estimated' as const },
  potassium: { value: potassium, source: 'estimated' as const },
  phosphorus: { value: phosphorus, source: 'estimated' as const },
  protein: { value: protein, source: 'estimated' as const },
});

const aiOutput: AiAnalysis = {
  score: 6,
  scoreReasons: [
    { title: 'Sodium is over your target', detail: 'Today about 2,203 mg of your 2,000 mg target.', deduction: 2 },
    { title: 'Conflicts with a restriction you entered', detail: 'Your profile says “Low-salt diet”.', deduction: 2 },
    { title: 'Phosphorus not scored', detail: 'You have not entered a phosphorus target.', deduction: null },
  ],
  summary: 'A filling lunch with most of its sodium from patis.',
  observations: ['Calamansi on its own keeps the flavour with less sodium.'],
  concerns: ['Today’s sodium is above the target you entered.'],
  clinicianQuestions: ['Is 2,000 mg still the right sodium target for me?'],
  dataQuality: 'Amounts came from what you typed.',
  usedInputs: ['meal', 'day', 'target.sodium', 'restrictions'],
};

const analysis = (over: Partial<MealAnalysis> = {}): MealAnalysis => ({
  id: 'a1',
  version: 1,
  engineVersion: 'nutrition-engine@1',
  createdAt: '2026-10-16T04:35:00Z',
  totals: {
    sodium: { value: 403.2, unit: 'mg', source: 'estimated', complete: false },
    potassium: { value: 63, unit: 'mg', source: 'estimated', complete: false },
    phosphorus: { value: 64.5, unit: 'mg', source: 'estimated', complete: false },
    protein: { value: 5.1, unit: 'g', source: 'estimated', complete: false },
  },
  items: [
    {
      kind: 'food',
      label: 'kanin',
      quantity: 1,
      unit: 'tasa',
      grams: 160,
      preparation: null,
      amountGuessed: false,
      match: { foodId: 'f1', name: 'Kanin', source: 'custom', sourceRef: 'sample:kanin', verified: false, confidence: 1 },
      nutrients: nutrients(3.2, 48, 64, 4.8),
    },
    {
      kind: 'condiment',
      label: 'patis',
      quantity: 1,
      unit: 'tsp',
      grams: 5,
      preparation: null,
      amountGuessed: false,
      match: { foodId: 'f2', name: 'Patis', source: 'custom', sourceRef: 'sample:patis', verified: false, confidence: 1 },
      nutrients: nutrients(400, 15, 0.5, 0.3),
    },
    { kind: 'food', label: 'balut', quantity: 1, unit: 'piraso', grams: null, preparation: null, amountGuessed: false, match: null, nutrients: { sodium: none, potassium: none, phosphorus: none, protein: none } },
  ],
  notes: [{ code: 'unmatched', items: ['balut'], message: 'Not counted, because we could not find these in the food tables: balut.' }],
  day: {
    date: '2026-10-16',
    earlierMeals: 1,
    totalsBeforeMeal: { sodium: 1800, potassium: 400, phosphorus: 300, protein: 20 },
    totalsWithMeal: { sodium: 2203.2, potassium: 463, phosphorus: 364.5, protein: 25.1 },
  },
  score: 6,
  scoreBand: 'mixed',
  parser: 'gemini:gemini-2.5-flash@v1',
  ai: { status: 'ok', reason: null, output: aiOutput, model: 'gemini-2.5-flash', promptVersion: 'v1' },
  ...over,
});

const meal = (over: Partial<Meal> = {}): Meal => ({
  id: 'm1',
  category: 'lunch',
  eatenAt: new Date().toISOString(),
  rawText: '1 tasa kanin, 1 piraso balut',
  condiments: [{ name: 'patis', amount: 'tsp' }],
  drinks: [],
  cookingMethods: [],
  notes: null,
  status: 'analysed',
  createdAt: '',
  updatedAt: '',
  analysis: analysis(),
  ...over,
});

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/patient/meals/m1']}>
        <Routes>
          <Route path="/patient/meals/:id" element={<MealPage />} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  query = { data: meal(), isPending: false, isError: false };
});

describe('MealPage', () => {
  it('shows what was logged', () => {
    renderPage();
    const logged = screen.getByRole('region', { name: 'What you logged' });
    expect(logged).toHaveTextContent('1 tasa kanin, 1 piraso balut');
    expect(logged).toHaveTextContent('Patis (1 tsp)');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your lunch, analysed');
    expect(screen.getByText(/^Lunch · today/)).toBeInTheDocument();
  });

  it('shows the score with each deduction and labels the text as AI-written', () => {
    renderPage();
    const card = screen.getByRole('region', { name: 'Meal score' });
    expect(within(card).getByRole('img', { name: 'Score 6 out of 10, Mixed' })).toBeInTheDocument();
    expect(within(card).getAllByLabelText('2 points off')).toHaveLength(2);
    expect(within(card).getByLabelText('not scored')).toBeInTheDocument();
    expect(card).toHaveTextContent('Sodium is over your target.');
    expect(card).toHaveTextContent(/AI-generated/);
  });

  it('labels the offline mock as sample text', () => {
    query.data = meal({ analysis: analysis({ ai: { status: 'mock', reason: null, output: aiOutput, model: 'mock-rules', promptVersion: 'v1' } }) });
    renderPage();
    expect(within(screen.getByRole('region', { name: 'Meal score' })).getByText(/Sample text, not AI/)).toBeInTheDocument();
  });

  it('says what to add when there is no score', () => {
    query.data = meal({ analysis: analysis({ score: null, scoreBand: null, ai: { status: 'ok', reason: null, output: { ...aiOutput, score: null }, model: 'g', promptVersion: 'v1' } }) });
    renderPage();
    const card = screen.getByRole('region', { name: 'Meal score' });
    expect(card).toHaveTextContent('No score yet');
    expect(within(card).getByRole('link', { name: 'lab result' })).toHaveAttribute('href', '/patient/labs');
  });

  it('asks before sending anything to AI, then analyses', async () => {
    query.data = meal({ analysis: analysis({ score: null, scoreBand: null, ai: { status: 'unavailable', reason: 'no_consent', output: null, model: null, promptVersion: null } }) });
    changeConsent.mockResolvedValue({});
    analyse.mockResolvedValue(meal());
    renderPage();
    const card = screen.getByRole('region', { name: 'AI analysis is off' });
    expect(card).toHaveTextContent(/Your name and contact details are never sent/);
    await userEvent.click(within(card).getByRole('button', { name: 'Allow AI and analyse' }));
    expect(changeConsent).toHaveBeenCalledWith({ consentType: 'ai_processing', granted: true });
    expect(analyse).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
  });

  it('offers a retry when the AI failed, keeping the numbers', async () => {
    query.data = meal({ analysis: analysis({ score: null, ai: { status: 'unavailable', reason: 'ai_error', output: null, model: 'g', promptVersion: null } }) });
    renderPage();
    await userEvent.click(within(screen.getByRole('region', { name: /couldn’t run this time/ })).getByRole('button', { name: 'Try again' }));
    expect(analyse).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    expect(screen.getByRole('article', { name: 'Sodium' })).toHaveTextContent('at least 403 mg');
  });

  it('compares today’s total, including this meal, with the target', () => {
    renderPage();
    const sodium = screen.getByRole('article', { name: 'Sodium' });
    expect(sodium).toHaveTextContent('at least 403 mg');
    expect(within(sodium).getByText('Estimated')).toBeInTheDocument();
    expect(sodium).toHaveTextContent('Today 2,203 of 2,000 mg');
    expect(screen.getByRole('article', { name: 'Potassium' })).toHaveTextContent('Today 463 mg · no target set');
    expect(screen.getByText(/counts this meal and 1 earlier analysed meal/)).toBeInTheDocument();
  });

  it('shows what each food contributed', () => {
    renderPage();
    const contrib = screen.getByRole('region', { name: 'What each food contributed' });
    expect(contrib).toHaveTextContent('patis alone gave more than half of this meal’s sodium');
    expect(within(contrib).getByRole('img', { name: /^Sodium: kanin 1 percent, patis 99 percent$/ })).toBeInTheDocument();
  });

  it('lists each food, the unmatched ones, and how sure the numbers are', () => {
    renderPage();
    const table = screen.getByRole('table', { name: /nutrients for each food/i });
    expect(within(table).getByRole('rowheader', { name: 'balut' })).toBeInTheDocument();
    expect(within(table).getByText('Not found · not counted')).toBeInTheDocument();
    const dq = screen.getByRole('note', { name: 'How sure are these numbers?' });
    expect(dq).toHaveTextContent('Amounts came from what you typed.');
    expect(dq).toHaveTextContent(/could not find these in the food tables: balut/);
  });

  it('shows observations, concerns and questions', () => {
    renderPage();
    expect(screen.getByRole('region', { name: 'Observations and ideas' })).toHaveTextContent('Calamansi on its own');
    expect(screen.getByRole('region', { name: 'Worth raising with your care team' })).toHaveTextContent('above the target you entered');
    const q = screen.getByRole('region', { name: 'Questions to ask at your next visit' });
    expect(within(q).getByRole('listitem')).toHaveTextContent('Is 2,000 mg still the right sodium target for me?');
    expect(within(q).getByRole('button', { name: 'Copy questions' })).toBeInTheDocument();
  });

  it('offers analysis for a meal saved without it, with progress while it runs', async () => {
    query = { data: meal({ status: 'saved', analysis: null }), isPending: false, isError: false };
    let finish!: (m: Meal) => void;
    analyse.mockReturnValue(new Promise<Meal>((r) => (finish = r)));
    renderPage();
    expect(screen.getByText('Saved · not analysed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Analyse now' }));
    expect(analyse).toHaveBeenCalledWith(expect.objectContaining({ id: 'm1' }));
    const steps = within(screen.getByRole('dialog', { name: 'Analysing your lunch' })).getAllByRole('listitem');
    expect(steps[0]).toHaveTextContent(/^Reading what you ate$/);
    expect(steps).toHaveLength(4);

    finish(meal());
    expect(await screen.findByText('Analysis ready')).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: 'Analysing your lunch' })).not.toBeInTheDocument();
  });

  it('says when a meal does not exist', () => {
    const error = new AxiosError('nf', '404', undefined, undefined, { status: 404 } as AxiosResponse);
    query = { isPending: false, isError: true, error };
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t find this meal');
  });
});
