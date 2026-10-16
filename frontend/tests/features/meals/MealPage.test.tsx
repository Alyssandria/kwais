import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, type AxiosResponse } from 'axios';
import { ToastProvider } from '@/components/ui';
import type { Meal, MealAnalysis } from '@/features/meals/api';

const analyse = vi.fn();
let query: { data?: Meal; isPending: boolean; isError: boolean; error?: unknown } = { isPending: true, isError: false };

vi.mock('@/features/meals/api', () => ({
  useMeal: () => ({ ...query, refetch: vi.fn() }),
  useAnalyseMeal: () => ({ mutateAsync: analyse, isPending: false }),
  useDeleteMeal: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('@/features/profile/api', () => ({
  useTargets: () => ({ data: [{ nutrient: 'sodium', dailyMax: 2000, unit: 'mg', source: 'patient_entered', note: null, since: '' }] }),
}));

const { MealPage } = await import('@/features/meals/MealPage');

const none = { value: null, source: 'missing' as const };
const analysis: MealAnalysis = {
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
      nutrients: {
        sodium: { value: 3.2, source: 'estimated' },
        potassium: { value: 48, source: 'estimated' },
        phosphorus: { value: 64, source: 'estimated' },
        protein: { value: 4.8, source: 'estimated' },
      },
    },
    { kind: 'food', label: 'balut', quantity: 1, unit: 'piraso', grams: null, preparation: null, amountGuessed: false, match: null, nutrients: { sodium: none, potassium: none, phosphorus: none, protein: none } },
  ],
  notes: [{ code: 'unmatched', items: ['balut'], message: 'Not counted, because we could not find these in the food tables: balut.' }],
  score: null,
  scoreBand: null,
  ai: { status: 'unavailable', output: null },
};

const meal = (over: Partial<Meal> = {}): Meal => ({
  id: 'm1',
  category: 'lunch',
  eatenAt: new Date().toISOString(),
  rawText: '1 tasa kanin, 1 piraso balut',
  condiments: [{ name: 'patis', amount: 'tsp' }],
  drinks: ['tubig'],
  cookingMethods: [],
  notes: null,
  status: 'analysed',
  createdAt: '',
  updatedAt: '',
  analysis,
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
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/^Lunch · today/);
  });

  it('shows totals with their source, as a floor when something was not counted', () => {
    renderPage();
    const sodium = screen.getByRole('article', { name: 'Sodium' });
    expect(sodium).toHaveTextContent('at least 403 mg');
    expect(within(sodium).getByText('Estimated')).toBeInTheDocument();
    expect(sodium).toHaveTextContent('20% of your daily target (2,000 mg)');
    expect(screen.getByRole('article', { name: 'Potassium' })).toHaveTextContent('No daily target set');
    expect(screen.getByRole('article', { name: 'Protein' })).toHaveTextContent('5.1 g');
  });

  it('lists each food, the unmatched ones, and the data notes', () => {
    renderPage();
    const table = screen.getByRole('table', { name: /nutrients for each food/i });
    expect(within(table).getByRole('rowheader', { name: 'balut' })).toBeInTheDocument();
    expect(within(table).getByText('Not found · not counted')).toBeInTheDocument();
    expect(screen.getByText(/could not find these in the food tables: balut/)).toBeInTheDocument();
  });

  it('never presents the estimate as AI output', () => {
    renderPage();
    const ai = screen.getByRole('region', { name: /score and suggestions/i });
    expect(ai).toHaveTextContent(/aren’t available for this meal yet/);
    expect(ai).toHaveTextContent(/come from the food tables, not from AI/);
  });

  it('offers analysis for a meal saved without it', async () => {
    query = { data: meal({ status: 'saved', analysis: null }), isPending: false, isError: false };
    analyse.mockResolvedValue(meal());
    renderPage();
    expect(screen.getByText('Saved · not analysed')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Analyse now' }));
    expect(analyse).toHaveBeenCalledWith('m1');
  });

  it('says when a meal does not exist', () => {
    const error = new AxiosError('nf', '404', undefined, undefined, { status: 404 } as AxiosResponse);
    query = { isPending: false, isError: true, error };
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent('We couldn’t find this meal');
  });
});
