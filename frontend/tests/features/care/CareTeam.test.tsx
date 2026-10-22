import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '@/components/ui';
import type { PatientCare } from '@/features/care/api';

const act = vi.fn();
const invite = vi.fn();
const cancelInvite = vi.fn();
let care: PatientCare;

vi.mock('@/features/care/api', async (original) => ({
  ...(await original<typeof import('@/features/care/api')>()),
  usePatientCare: () => ({ data: care, isPending: false, isError: false }),
  useCareAction: () => ({ mutateAsync: act, isPending: false }),
  useInviteDoctor: () => ({ mutateAsync: invite }),
  useCancelInvite: () => ({ mutateAsync: cancelInvite }),
}));

const { CareTeam } = await import('@/features/care/CareTeam');

const reyes = { name: 'Dr. Jose Reyes', specialty: 'Nephrology', clinic: 'Philippine General Hospital', prcLicense: '0123456' };
const mendoza = { name: 'Dr. Ana Mendoza', specialty: 'Renal nutrition', clinic: null, prcLicense: null };

const renderIt = () =>
  render(
    <ToastProvider>
      <MemoryRouter>
        <CareTeam />
      </MemoryRouter>
    </ToastProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  care = {
    requests: [{ id: 'l1', doctor: reyes, message: 'From your 14 Oct check-up', createdAt: '2026-10-22T00:00:00Z' }],
    team: [{ id: 'l2', doctor: mendoza, since: '2026-09-02T00:00:00Z' }],
    waiting: [{ id: 'i1', kind: 'invite', label: 'new.doctor@example.com', createdAt: '2026-10-21T00:00:00Z', expiresAt: '2026-11-04T00:00:00Z' }],
  };
});

describe('CareTeam', () => {
  it('shows a request with the doctor’s self-reported details and a warning', () => {
    renderIt();
    const req = screen.getByRole('region', { name: 'Request from Dr. Jose Reyes' });
    expect(req).toHaveTextContent('Nephrology · Philippine General Hospital · PRC 0123456');
    expect(req).toHaveTextContent('“From your 14 Oct check-up”');
    expect(req).toHaveTextContent('K-WAIS has not checked them');
  });

  it('approves a request', async () => {
    act.mockResolvedValue(undefined);
    renderIt();
    await userEvent.click(within(screen.getByRole('region', { name: 'Request from Dr. Jose Reyes' })).getByRole('button', { name: 'Approve' }));
    expect(act).toHaveBeenCalledWith({ id: 'l1', action: 'approve' });
    expect(await screen.findByText('Dr. Jose Reyes can now see your records')).toBeInTheDocument();
  });

  it('asks before stopping sharing', async () => {
    act.mockResolvedValue(undefined);
    renderIt();
    await userEvent.click(screen.getByRole('button', { name: 'Stop sharing' }));
    const dialog = screen.getByRole('dialog', { name: 'Stop sharing with Dr. Ana Mendoza?' });
    expect(act).not.toHaveBeenCalled();
    await userEvent.click(within(dialog).getByRole('button', { name: 'Stop sharing' }));
    expect(act).toHaveBeenCalledWith({ id: 'l2', action: 'end' });
  });

  it('cancels an email invitation', async () => {
    cancelInvite.mockResolvedValue(undefined);
    renderIt();
    expect(screen.getByText('new.doctor@example.com')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Cancel invitation' }));
    expect(cancelInvite).toHaveBeenCalledWith('i1');
  });

  it('invites a doctor by email', async () => {
    invite.mockResolvedValue({ message: 'Invitation sent. Sharing starts once your doctor accepts.' });
    renderIt();
    await userEvent.click(screen.getByRole('button', { name: 'Send invite' }));
    expect(await screen.findByText('Enter your doctor’s email')).toBeInTheDocument();
    expect(invite).not.toHaveBeenCalled();
    await userEvent.type(screen.getByLabelText('Your doctor’s email'), 'dr.reyes@example.com');
    await userEvent.click(screen.getByRole('button', { name: 'Send invite' }));
    expect(invite).toHaveBeenCalledWith({ email: 'dr.reyes@example.com' });
    expect(await screen.findByText('Invitation sent. Sharing starts once your doctor accepts.')).toBeInTheDocument();
  });

  it('says when nothing is shared', () => {
    care = { requests: [], team: [], waiting: [] };
    renderIt();
    expect(screen.getByText('You’re not sharing your records with anyone.')).toBeInTheDocument();
  });
});
