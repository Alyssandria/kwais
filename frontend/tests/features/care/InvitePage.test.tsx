import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, type AxiosResponse } from 'axios';
import { ToastProvider } from '@/components/ui';

const claim = vi.fn();
let preview: { data?: unknown; isPending: boolean; isError: boolean; error?: unknown };

vi.mock('@/features/care/api', async (original) => ({
  ...(await original<typeof import('@/features/care/api')>()),
  useInvitePreview: () => ({ ...preview, refetch: vi.fn() }),
  useClaimInvite: () => ({ mutateAsync: claim, isPending: false, isError: false }),
}));

const { InvitePage } = await import('@/features/care/InvitePage');

const renderAt = (path: string) =>
  render(
    <ToastProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/doctor/invite" element={<InvitePage />} />
          <Route path="/doctor/dashboard" element={<p>Doctor home</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  preview = { data: { patientName: 'Liza Santos', message: 'Hi doc', expiresAt: '2026-11-04T00:00:00Z' }, isPending: false, isError: false };
});

describe('InvitePage', () => {
  it('accepts the invitation and goes to the patient list', async () => {
    claim.mockResolvedValue({ linkId: 'l1', patient: { name: 'Liza Santos' } });
    renderAt('/doctor/invite?token=abcdefghijklmnopqrstuvwxyz');
    expect(screen.getByText('Liza Santos invited you')).toBeInTheDocument();
    expect(screen.getByText('“Hi doc”')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Accept and start following' }));
    expect(claim).toHaveBeenCalledWith('abcdefghijklmnopqrstuvwxyz');
    expect(await screen.findByText('Doctor home')).toBeInTheDocument();
  });

  it('explains when the link is used up or expired', () => {
    preview = { isPending: false, isError: true, error: new AxiosError('gone', '404', undefined, undefined, { status: 404 } as AxiosResponse) };
    renderAt('/doctor/invite?token=abcdefghijklmnopqrstuvwxyz');
    expect(screen.getByText('This invitation can’t be used')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Accept/ })).not.toBeInTheDocument();
  });

  it('explains when the link has no token', () => {
    renderAt('/doctor/invite');
    expect(screen.getByText('This invitation can’t be used')).toBeInTheDocument();
  });
});
