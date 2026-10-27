import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { Meal } from '@/features/meals/api';
import { PatientScopeProvider } from '@/lib/patient-scope';

const fetchNextPage = vi.fn();
const calls: unknown[] = [];
let pages: Meal[][] = [];
let hasNextPage = false;

vi.mock('@/features/meals/api', () => ({
  useMealHistory: (filters: unknown) => {
    calls.push(filters);
    return { data: { pages }, isPending: false, isError: false, hasNextPage, fetchNextPage, isFetchingNextPage: false, refetch: vi.fn() };
  },
}));

const { HistoryPage } = await import('@/features/meals/HistoryPage');

const at = (daysAgo: number, h: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, 0, 0, 0);
  return d.toISOString();
};

const meal = (over: Partial<Meal>): Meal => ({
  id: 'm',
  category: 'lunch',
  eatenAt: at(0, 12),
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

const renderPage = () =>
  render(
    <MemoryRouter>
      <HistoryPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  calls.length = 0;
  hasNextPage = false;
  pages = [
    [
      meal({ id: 'a', status: 'analysed', analysis: { score: 8 } as Meal['analysis'] }),
      meal({ id: 'b', category: 'breakfast', eatenAt: at(0, 7) }),
      meal({ id: 'c', category: 'dinner', eatenAt: at(1, 19), rawText: 'sinigang' }),
    ],
  ];
});

describe('HistoryPage', () => {
  it('groups meals by day and links to each one', () => {
    renderPage();
    const today = screen.getByRole('region', { name: 'Today' });
    expect(within(today).getAllByRole('link')).toHaveLength(2);
    expect(within(today).getAllByRole('link')[0]).toHaveAttribute('href', '/patient/meals/a');
    expect(within(today).getByText('Score')).toBeInTheDocument();
    expect(within(today).getByText('Saved · not analysed')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: 'Yesterday' })).getByText('sinigang')).toBeInTheDocument();
  });

  it('filters by status and meal', async () => {
    renderPage();
    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Show' })).getByRole('radio', { name: 'Drafts' }));
    await userEvent.click(within(screen.getByRole('radiogroup', { name: 'Meal' })).getByRole('radio', { name: 'Dinner' }));
    expect(calls[calls.length - 1]).toEqual({ status: 'draft', category: 'dinner' });
  });

  it('opens drafts in the log form', () => {
    pages = [[meal({ id: 'd', status: 'draft', rawText: '' })]];
    renderPage();
    expect(screen.getByRole('link', { name: /No food text yet/ })).toHaveAttribute('href', '/patient/meals/new?draft=d');
  });

  it('loads older meals', async () => {
    hasNextPage = true;
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Show older meals' }));
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it('has an empty state', () => {
    pages = [[]];
    renderPage();
    expect(screen.getByText('No meals yet')).toBeInTheDocument();
  });

  it('lets a doctor browse without drafts or logging, linking into the patient record', () => {
    pages = [[meal({ id: 'm1', status: 'analysed' })]];
    render(
      <MemoryRouter>
        <PatientScopeProvider patientId="p1">
          <HistoryPage />
        </PatientScopeProvider>
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 2, name: 'Meals' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Log a meal/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('radio', { name: 'Drafts' })).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lunch/ })).toHaveAttribute('href', '/doctor/patients/p1/meals/m1');
  });
});
