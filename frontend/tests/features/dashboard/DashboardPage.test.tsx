import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { buildSampleDashboard } from '@/features/dashboard/sampleDashboard';
import type { PatientDashboard } from '@/features/dashboard/types';

const refetch = vi.fn();
let query: { data?: PatientDashboard; isPending: boolean; isError: boolean; error?: unknown } = {
  isPending: true,
  isError: false,
};

vi.mock('@/features/dashboard/useDashboard', () => ({ useDashboard: () => ({ ...query, refetch }) }));
vi.mock('@/features/notes/api', () => ({ useMyNotes: () => ({ data: [] }) }));
vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { firstName: 'Maria', onboardingComplete: true } }),
}));

const { DashboardPage } = await import('@/features/dashboard/DashboardPage');

function renderPage() {
  return render(
    <MemoryRouter>
      <DashboardPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  query = { data: buildSampleDashboard(), isPending: false, isError: false };
});

describe('DashboardPage', () => {
  it('shows a loading state', () => {
    query = { isPending: true, isError: false };
    renderPage();
    expect(screen.getByRole('status')).toHaveTextContent(/loading your dashboard/i);
  });

  it('shows an error with retry', async () => {
    query = { isPending: false, isError: true, error: new Error('x') };
    renderPage();
    expect(screen.getByRole('alert')).toHaveTextContent(/couldn’t load your dashboard/i);
    await userEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it('labels sample data and greets the patient', () => {
    renderPage();
    expect(screen.getByText(/fictional sample data/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/, Maria$/);
    expect(screen.getByText(/2 meals logged today · Breakfast, Lunch/)).toBeInTheDocument();
  });

  it('judges nutrients only against targets the patient entered', () => {
    renderPage();
    const sodium = screen.getByRole('article', { name: 'Sodium' });
    expect(within(sodium).getByText('2,060')).toBeInTheDocument();
    expect(within(sodium).getByText('Above your target (103%)')).toBeInTheDocument();

    const phosphorus = screen.getByRole('article', { name: 'Phosphorus' });
    expect(within(phosphorus).getByText('Estimate only · no target set')).toBeInTheDocument();
    expect(within(phosphorus).queryByRole('progressbar')).not.toBeInTheDocument();

    const protein = screen.getByRole('article', { name: 'Protein' });
    expect(within(protein).getByText('Approaching your target (88%)')).toBeInTheDocument();
  });

  it('compares labs with the slip range and shows who entered them', () => {
    renderPage();
    const labs = screen.getByRole('region', { name: 'My lab results' });
    expect(within(labs).getAllByText('Above slip range')).toHaveLength(2);
    expect(within(labs).getByText('Below slip range')).toBeInTheDocument();
    expect(within(labs).getAllByText(/entered by you · not yet clinician-verified/i)).toHaveLength(4);
  });

  it('marks meals saved without AI', () => {
    renderPage();
    expect(screen.getByText('Saved · not analysed')).toBeInTheDocument();
  });

  it('switches the trend chart series', async () => {
    renderPage();
    const sodiumBtn = screen.getByRole('button', { name: 'Sodium', pressed: false });
    await userEvent.click(sodiumBtn);
    expect(screen.getByRole('button', { name: 'Sodium', pressed: true })).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /^Sodium over the last 7 days:/ })).toBeInTheDocument();
    const table = screen.getByRole('table', { name: 'Estimated sodium per day, mg' });
    expect(within(table).getByRole('columnheader', { name: 'Sodium' })).toBeInTheDocument();
    expect(within(table).getByRole('cell', { name: '2060' })).toBeInTheDocument();
  });

  it('shows live data without the sample notice', () => {
    query = { data: { ...buildSampleDashboard(), isSample: false, sampleInsights: false }, isPending: false, isError: false };
    renderPage();
    expect(screen.queryByText(/fictional sample data/i)).not.toBeInTheDocument();
    const ai = screen.getByRole('region', { name: /suggestions from your recent meals/i });
    expect(within(ai).getByText('AI-generated')).toBeInTheDocument();
  });

  it('shows "no score yet" when nothing has been scored', () => {
    const d = buildSampleDashboard();
    d.today.averageScore = null;
    d.today.scoredMeals = 0;
    query = { data: d, isPending: false, isError: false };
    renderPage();
    expect(screen.getByText('No score yet')).toBeInTheDocument();
  });

  it('labels AI suggestions', () => {
    renderPage();
    const ai = screen.getByRole('region', { name: /suggestions from your recent meals/i });
    expect(within(ai).getByText('Sample text, not AI')).toBeInTheDocument();
  });
});
