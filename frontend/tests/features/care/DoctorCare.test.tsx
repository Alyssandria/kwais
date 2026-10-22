import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import type { DoctorCare } from '@/features/care/api';

const act = vi.fn();
const request = vi.fn();
let care: DoctorCare;

vi.mock('@/features/care/api', async (original) => ({
  ...(await original<typeof import('@/features/care/api')>()),
  useDoctorCare: () => ({ data: care, isPending: false, isError: false }),
  useCareAction: () => ({ mutateAsync: act, isPending: false }),
  useRequestPatient: () => ({ mutateAsync: request }),
}));

const { DoctorCarePanels } = await import('@/features/care/DoctorCare');

const liza = { patientId: 'p1', name: 'Liza Santos', patientCode: 'KW-002318', ckdStage: { value: '3b', source: 'patient_entered' as const }, dialysisStatus: 'none' };
const ramon = { patientId: 'p2', name: 'Ramon dela Cruz', patientCode: 'KW-001042', ckdStage: { value: '4', source: 'clinician_verified' as const }, dialysisStatus: 'none' };

const renderIt = () =>
  render(
    <ToastProvider>
      <MemoryRouter>
        <DoctorCarePanels />
      </MemoryRouter>
    </ToastProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  care = {
    requests: [{ id: 'l1', patient: liza, message: null, createdAt: '2026-10-22T00:00:00Z' }],
    waiting: [{ id: 'l3', patientCode: 'KW-004215', createdAt: '2026-10-21T00:00:00Z' }],
    patients: [{ id: 'l2', patient: ramon, since: '2026-09-02T00:00:00Z' }],
  };
});

describe('DoctorCarePanels', () => {
  it('lists requests, showing only the code until a patient approves', () => {
    renderIt();
    const req = screen.getByRole('region', { name: 'Requests · 2' });
    expect(req).toHaveTextContent('Liza Santos invited you to follow their records');
    expect(req).toHaveTextContent('KW-002318 · Stage 3b · entered by patient');
    expect(req).toHaveTextContent('Waiting for KW-004215 to approve');
  });

  it('accepts an invitation and cancels a request', async () => {
    act.mockResolvedValue(undefined);
    renderIt();
    await userEvent.click(screen.getByRole('button', { name: 'Accept' }));
    expect(act).toHaveBeenCalledWith({ id: 'l1', action: 'approve' });
    await userEvent.click(screen.getByRole('button', { name: 'Cancel request' }));
    expect(act).toHaveBeenCalledWith({ id: 'l3', action: 'cancel' });
  });

  it('lists followed patients and asks before stopping', async () => {
    act.mockResolvedValue(undefined);
    renderIt();
    const list = screen.getByRole('region', { name: 'Your patients' });
    expect(list).toHaveTextContent('Ramon dela Cruz');
    expect(list).toHaveTextContent('KW-001042 · Stage 4 · verified');
    await userEvent.click(within(list).getByRole('button', { name: 'Stop following' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: 'Stop following Ramon dela Cruz?' })).getByRole('button', { name: 'Stop following' }));
    expect(act).toHaveBeenCalledWith({ id: 'l2', action: 'end' });
  });

  it('sends a request by patient code after checking its format', async () => {
    request.mockResolvedValue({ message: 'Request sent. The patient sees it next time they open K-WAIS.' });
    renderIt();
    await userEvent.click(screen.getByRole('button', { name: 'Add a patient' }));
    const dialog = screen.getByRole('dialog', { name: 'Add a patient' });
    await userEvent.type(within(dialog).getByLabelText('Patient code'), '12345');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));
    expect(await within(dialog).findByText('Patient codes look like KW-000123')).toBeInTheDocument();
    expect(request).not.toHaveBeenCalled();

    await userEvent.clear(within(dialog).getByLabelText('Patient code'));
    await userEvent.type(within(dialog).getByLabelText('Patient code'), 'kw-002318');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Send request' }));
    expect(request).toHaveBeenCalledWith({ patientCode: 'KW-002318' });
    expect(await screen.findByText('Request sent. The patient sees it next time they open K-WAIS.')).toBeInTheDocument();
  });

  it('offers to add a first patient when there are none', () => {
    care = { requests: [], waiting: [], patients: [] };
    renderIt();
    expect(screen.queryByRole('region', { name: /Requests/ })).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your patients' })).toHaveTextContent('No patients yet');
    expect(screen.getByRole('button', { name: 'Add a patient' })).toBeInTheDocument();
  });
});
