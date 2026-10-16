import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Lab } from '@/features/profile/api';
import { ToastProvider } from '@/components/ui';

let labsQuery: { data?: Lab[]; isPending: boolean; isError: boolean } = { data: [], isPending: false, isError: false };
const create = vi.fn();

vi.mock('@/features/profile/api', () => ({
  useLabs: () => ({ ...labsQuery, refetch: vi.fn() }),
  useCreateLab: () => ({ mutateAsync: create }),
  useUpdateLab: () => ({ mutateAsync: vi.fn() }),
  useDeleteLab: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

const { LabsPage } = await import('@/features/labs/LabsPage');

const lab = (over: Partial<Lab>): Lab => ({
  id: 'l1',
  test: 'potassium',
  label: 'Potassium',
  value: 5.6,
  refLow: 3.5,
  refHigh: 5.1,
  unit: 'mmol/L',
  collectedOn: '2026-09-28',
  labName: null,
  source: 'patient_entered',
  createdAt: '2026-09-28T00:00:00Z',
  ...over,
});

const renderPage = () =>
  render(
    <ToastProvider>
      <LabsPage />
    </ToastProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  labsQuery = { data: [], isPending: false, isError: false };
});

describe('LabsPage', () => {
  it('invites a first result when there are none', () => {
    renderPage();
    expect(screen.getByText('No lab results yet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /add your first result/i })).toBeInTheDocument();
  });

  it('groups by test and compares with the slip range', () => {
    labsQuery.data = [
      lab({ id: 'k2', value: 5.6, collectedOn: '2026-09-28' }),
      lab({ id: 'k1', value: 5.0, collectedOn: '2026-06-20' }),
      lab({ id: 'e1', test: 'egfr', label: 'eGFR', value: 38, refLow: 60, refHigh: null, unit: 'mL/min/1.73m²' }),
    ];
    renderPage();
    const tests = screen.getByRole('navigation', { name: 'Tests' });
    expect(within(tests).getAllByRole('button')).toHaveLength(2);

    const detail = screen.getByRole('region', { name: 'Potassium' });
    expect(within(detail).getByText(/Above slip range ·/)).toBeInTheDocument();
    expect(within(detail).getAllByRole('row')).toHaveLength(3);
  });

  it('validates a new result before saving', async () => {
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /add a result/i }));
    await userEvent.click(screen.getByRole('button', { name: 'Save result' }));
    expect(screen.getByText('Enter the result')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Result'), '5.6');
    await userEvent.type(screen.getByLabelText(/^Range low/), '5');
    await userEvent.type(screen.getByLabelText(/^Range high/), '3');
    await userEvent.click(screen.getByRole('button', { name: 'Save result' }));
    expect(screen.getByText('The high end must be above the low end')).toBeInTheDocument();
    expect(create).not.toHaveBeenCalled();
  });

  it('saves a valid result with numbers, not text', async () => {
    create.mockResolvedValue(lab({}));
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: /add a result/i }));
    await userEvent.type(screen.getByLabelText('Result'), '5.6');
    await userEvent.type(screen.getByLabelText(/^Range low/), '3.5');
    await userEvent.type(screen.getByLabelText(/^Range high/), '5.1');
    await userEvent.click(screen.getByRole('button', { name: 'Save result' }));
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ test: 'potassium', value: 5.6, refLow: 3.5, refHigh: 5.1, unit: 'mmol/L' }),
    );
  });
});
