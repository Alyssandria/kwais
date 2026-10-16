import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import type { Meal, RecentMeal } from '@/features/meals/api';

const create = vi.fn();
const update = vi.fn();
let recent: RecentMeal[] = [];
let latestDraft: Meal | null = null;

vi.mock('@/features/meals/api', () => ({
  useRecentMeals: () => ({ data: recent }),
  useLatestDraft: () => ({ data: latestDraft }),
  useMeal: () => ({ data: undefined }),
  useCreateMeal: () => ({ mutateAsync: create, isPending: false }),
  useUpdateMeal: () => ({ mutateAsync: update, isPending: false }),
  useDeleteMeal: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const { LogMealPage } = await import('@/features/meals/LogMealPage');

const saved = (over: Partial<Meal> = {}): Meal => ({
  id: 'm1',
  category: 'lunch',
  eatenAt: new Date().toISOString(),
  rawText: '1 tasa kanin',
  condiments: [],
  drinks: [],
  cookingMethods: [],
  notes: null,
  status: 'saved',
  createdAt: '',
  updatedAt: '',
  analysis: null,
  ...over,
});

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/patient/meals/new']}>
        <Routes>
          <Route path="/patient/meals/new" element={<LogMealPage />} />
          <Route path="/patient/meals/:id" element={<p>Meal page</p>} />
          <Route path="/patient/dashboard" element={<p>Dashboard page</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

const foodBox = () => screen.getByLabelText(/what you ate/i);

beforeEach(() => {
  vi.clearAllMocks();
  recent = [];
  latestDraft = null;
});

describe('LogMealPage', () => {
  it('reads back exactly what will be saved', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('radio', { name: /Dinner/ }));
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('What did you have for dinner?');

    await userEvent.type(foodBox(), '1 tasa kanin, inihaw na liempo');
    const condiments = screen.getByRole('group', { name: 'Condiments' });
    await userEvent.click(within(condiments).getByRole('button', { name: /Toyo-mansi/ }));
    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Amount of Toyo-mansi' })).getByRole('radio', { name: '1 tsp' }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Drinks' })).getByRole('button', { name: /Tubig/ }));
    await userEvent.click(within(screen.getByRole('group', { name: 'Cooking methods' })).getByRole('button', { name: /Inihaw/ }));

    const summary = screen.getByRole('region', { name: 'Check before saving' });
    expect(summary).toHaveTextContent(
      'Dinner: 1 tasa kanin, inihaw na liempo; with Toyo-mansi (1 tsp); drinks: tubig; cooked: inihaw.',
    );
  });

  it('asks for the food before saving', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /save and analyse/i }));
    expect(screen.getByText('Tell us what you ate')).toBeInTheDocument();
    expect(foodBox()).toHaveAttribute('aria-invalid', 'true');
    expect(create).not.toHaveBeenCalled();
  });

  it('saves and opens the analysis', async () => {
    create.mockResolvedValue(saved({ id: 'm9', status: 'analysed' }));
    renderPage();
    await userEvent.type(foodBox(), '2 pandesal');
    await userEvent.click(within(screen.getByRole('group', { name: 'Drinks' })).getByRole('button', { name: /Kape/ }));
    await userEvent.click(screen.getByRole('button', { name: /save and analyse/i }));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ rawText: '2 pandesal', drinks: ['kape'], condiments: [], status: 'saved', analyse: true, notes: null }),
    );
    expect(await screen.findByText('Meal page')).toBeInTheDocument();
  });

  it('can save without analysis', async () => {
    create.mockResolvedValue(saved());
    renderPage();
    await userEvent.type(foodBox(), '1 tasa kanin');
    await userEvent.click(screen.getByRole('switch', { name: /analyse with ai/i }));
    expect(screen.getByRole('switch', { name: /analyse with ai/i })).toHaveAttribute('aria-checked', 'false');
    await userEvent.click(screen.getByRole('button', { name: 'Save meal' }));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ status: 'saved', analyse: false }));
    expect(await screen.findByText('Dashboard page')).toBeInTheDocument();
  });

  it('fills the form from a past meal', async () => {
    recent = [
      {
        mealId: 'old',
        category: 'dinner',
        eatenAt: new Date().toISOString(),
        rawText: 'Sinigang na baboy, 1 tasa kanin',
        condiments: [{ name: 'patis', amount: 'tsp' }],
        drinks: ['tubig'],
        cookingMethods: ['nilaga'],
      },
    ];
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /Sinigang na baboy, 1 tasa kanin/ }));
    expect(foodBox()).toHaveValue('Sinigang na baboy, 1 tasa kanin');
    expect(screen.getByRole('radio', { name: /Dinner/ })).toHaveAttribute('aria-checked', 'true');
    expect(within(screen.getByRole('group', { name: 'Condiments' })).getByRole('button', { name: /Patis/ })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('region', { name: 'Check before saving' })).toHaveTextContent('with Patis (1 tsp); drinks: tubig; cooked: nilaga.');
  });

  it('saves a draft, then updates the same draft', async () => {
    create.mockResolvedValue(saved({ id: 'd1', status: 'draft' }));
    update.mockResolvedValue(saved({ id: 'd1', status: 'draft' }));
    renderPage();
    expect(screen.getByRole('button', { name: 'Save as draft' })).toBeDisabled();

    await userEvent.type(foodBox(), 'kanin');
    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    expect(create).toHaveBeenCalledWith(expect.objectContaining({ status: 'draft', analyse: false }));
    expect(await screen.findByText(/^Draft saved/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Save as draft' }));
    expect(update).toHaveBeenCalledWith({ id: 'd1', input: expect.objectContaining({ status: 'draft' }) });
  });

  it('offers to continue an unfinished draft', () => {
    latestDraft = saved({ id: 'd2', status: 'draft', rawText: 'lugaw' });
    renderPage();
    expect(screen.getByText('You have an unfinished draft')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue draft' })).toBeInTheDocument();
  });
});
