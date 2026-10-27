import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { PatientAnalytics } from '@/features/analytics/api';
import { PatientScopeProvider } from '@/lib/patient-scope';

const ranges: number[] = [];
let data: PatientAnalytics;

vi.mock('@/features/analytics/api', () => ({
  useAnalytics: (range: number) => {
    ranges.push(range);
    return { data, isPending: false, isError: false, refetch: vi.fn() };
  },
}));

const { AnalyticsPage } = await import('@/features/analytics/AnalyticsPage');

const nutrient = (over: Partial<PatientAnalytics['summary']['nutrients']['sodium']> = {}) => ({
  unit: 'mg' as const,
  averagePerDay: 1800,
  daysWithData: 4,
  target: null,
  daysOverTarget: null,
  ...over,
});

function analytics(over: Partial<PatientAnalytics['summary']> = {}): PatientAnalytics {
  return {
    range: 30,
    from: '2026-09-17',
    to: '2026-10-16',
    days: [{ date: '2026-10-16', meals: 2, analysedMeals: 2, score: 7, totals: { sodium: 2500, potassium: 600, phosphorus: 400, protein: 40 } }],
    summary: {
      daysLogged: 5,
      mealsLogged: 9,
      analysedMeals: 7,
      averageScore: 6,
      scoreBands: { good: 2, mixed: 4, attention: 1 },
      nutrients: {
        sodium: nutrient({ averagePerDay: 2100, target: 2000, daysOverTarget: 3 }),
        potassium: nutrient(),
        phosphorus: nutrient(),
        protein: { ...nutrient({ averagePerDay: 42.5 }), unit: 'g' },
      },
      ...over,
    },
  };
}

const renderPage = () =>
  render(
    <MemoryRouter>
      <AnalyticsPage />
    </MemoryRouter>,
  );

beforeEach(() => {
  ranges.length = 0;
  data = analytics();
});

describe('AnalyticsPage', () => {
  it('summarises the period', () => {
    renderPage();
    expect(screen.getByText('Days logged').parentElement).toHaveTextContent('5 of 30');
    expect(screen.getByRole('img', { name: 'Score 6 out of 10, Mixed' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Scored meals by band' })).toHaveTextContent('Mixed (5–7)4');
  });

  it('compares averages only with targets the patient entered', () => {
    renderPage();
    const sodium = screen.getByRole('article', { name: 'Sodium' });
    expect(sodium).toHaveTextContent('2,100 mg');
    expect(sodium).toHaveTextContent('105% of your 2,000 mg target');
    expect(sodium).toHaveTextContent('Over target on 3 of 4 days');
    expect(screen.getByRole('article', { name: 'Potassium' })).toHaveTextContent('No target set');
    expect(screen.getByRole('article', { name: 'Protein' })).toHaveTextContent('42.5 g');
  });

  it('switches the period and the charted series', async () => {
    renderPage();
    expect(ranges[0]).toBe(30);
    await userEvent.click(screen.getByRole('radio', { name: '7 days' }));
    expect(ranges[ranges.length - 1]).toBe(7);
    await userEvent.click(screen.getByRole('button', { name: 'Score' }));
    expect(screen.getByRole('button', { name: 'Score', pressed: true })).toBeInTheDocument();
  });

  it('has an empty state', () => {
    data = analytics({ mealsLogged: 0 });
    renderPage();
    expect(screen.getByText('No meals in this period')).toBeInTheDocument();
  });

  it('speaks about the patient when a doctor views it', () => {
    render(
      <MemoryRouter>
        <PatientScopeProvider patientId="p1">
          <AnalyticsPage />
        </PatientScopeProvider>
      </MemoryRouter>,
    );
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Trends' })).toBeInTheDocument();
    expect(screen.getByRole('article', { name: 'Sodium' })).toHaveTextContent('105% of the 2,000 mg target');
  });

  it('offers no logging link to a doctor when the period is empty', () => {
    data = analytics({ mealsLogged: 0 });
    render(
      <MemoryRouter>
        <PatientScopeProvider patientId="p1">
          <AnalyticsPage />
        </PatientScopeProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('Trends appear once the patient logs meals.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Log a meal' })).not.toBeInTheDocument();
  });
});
