import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AxiosError, type AxiosResponse } from 'axios';
import { ToastProvider } from '@/components/ui';

const changePassword = vi.fn();
const logoutAll = vi.fn();
const deleteAccount = vi.fn();
const download = vi.fn();
let role: 'patient' | 'doctor' = 'patient';
const acceptSession = vi.fn();
const endSession = vi.fn();

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { email: 'ana@example.com', patientCode: role === 'patient' ? 'KW-000123' : null, role }, acceptSession, endSession }),
}));
vi.mock('@/features/profile/api', () => ({
  useConsents: () => ({
    isPending: false,
    isError: false,
    data: {
      terms: { granted: true, policyVersion: '2026-10', at: '2026-10-01T02:00:00Z' },
      health_data: { granted: true, policyVersion: '2026-10', at: '2026-10-01T02:00:00Z' },
      ai_processing: { granted: false, policyVersion: '2026-10', at: '2026-10-02T02:00:00Z' },
      reminders: null,
    },
  }),
}));
vi.mock('@/features/settings/api', () => ({
  useActivity: () => ({
    isPending: false,
    isError: false,
    data: [
      { id: 'a1', action: 'login', resourceType: 'user', at: '2026-10-20T01:00:00Z', byYou: true, actorRole: 'patient', device: 'Chrome on Windows' },
      { id: 'a2', action: 'login_failed', resourceType: 'user', at: '2026-10-19T01:00:00Z', byYou: false, actorRole: null, device: null },
    ],
  }),
  useChangePassword: () => ({ mutateAsync: changePassword }),
  useLogoutEverywhere: () => ({ mutateAsync: logoutAll, isPending: false }),
  useDeleteAccount: () => ({ mutateAsync: deleteAccount }),
  useDownloadMyData: () => ({ mutateAsync: download, isPending: false }),
}));

const { SettingsPage } = await import('@/features/settings/SettingsPage');

const apiError = (status: number, code: string, message: string) =>
  new AxiosError(message, String(status), undefined, undefined, { status, data: { error: { code, message } } } as AxiosResponse);

function renderPage() {
  return render(
    <ToastProvider>
      <MemoryRouter initialEntries={['/patient/settings']}>
        <Routes>
          <Route path="/patient/settings" element={<SettingsPage />} />
          <Route path="/login" element={<p>Login page</p>} />
          <Route path="/" element={<p>Home page</p>} />
        </Routes>
      </MemoryRouter>
    </ToastProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  role = 'patient';
});

describe('SettingsPage', () => {
  it('shows the account, consents and activity', () => {
    renderPage();
    expect(screen.getByRole('heading', { level: 1, name: 'Settings' })).toBeInTheDocument();
    expect(screen.getByText('ana@example.com')).toBeInTheDocument();
    const privacy = screen.getByRole('region', { name: 'Privacy choices' });
    expect(within(privacy).getByText('AI meal analysis')).toBeInTheDocument();
    expect(within(privacy).getByText(/Never asked/)).toBeInTheDocument();
    const activity = screen.getByRole('region', { name: 'Account activity' });
    expect(within(activity).getByText('Signed in')).toBeInTheDocument();
    expect(within(activity).getByText(/Chrome on Windows/)).toBeInTheDocument();
    expect(within(activity).getByText('Failed sign-in attempt')).toBeInTheDocument();
  });

  it('changes the password and keeps this device signed in', async () => {
    const session = { accessToken: 't', expiresIn: 900, user: {} };
    changePassword.mockResolvedValue(session);
    renderPage();
    await userEvent.type(screen.getByLabelText('Current password'), 'old-password-1');
    await userEvent.type(screen.getByLabelText('New password'), 'new-password-2');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-password-2');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(changePassword).toHaveBeenCalledWith({ currentPassword: 'old-password-1', newPassword: 'new-password-2' });
    expect(acceptSession).toHaveBeenCalledWith(session);
  });

  it('puts a wrong current password on its field', async () => {
    changePassword.mockRejectedValue(apiError(400, 'invalid_password', 'That password is not correct.'));
    renderPage();
    await userEvent.type(screen.getByLabelText('Current password'), 'wrong-password-1');
    await userEvent.type(screen.getByLabelText('New password'), 'new-password-2');
    await userEvent.type(screen.getByLabelText('Confirm new password'), 'new-password-2');
    await userEvent.click(screen.getByRole('button', { name: 'Change password' }));
    expect(await screen.findByText('That password is not correct')).toBeInTheDocument();
    expect(screen.getByLabelText('Current password')).toHaveAttribute('aria-invalid', 'true');
  });

  it('downloads the data', async () => {
    download.mockResolvedValue('kwais-export-KW-000123-2026-10-20.json');
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Download my data' }));
    expect(download).toHaveBeenCalled();
    expect(await screen.findByText(/Downloaded kwais-export-KW-000123/)).toBeInTheDocument();
  });

  it('signs out everywhere after confirming', async () => {
    logoutAll.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Sign out on every device' }));
    await userEvent.click(screen.getByRole('button', { name: 'Sign out everywhere' }));
    expect(logoutAll).toHaveBeenCalled();
    expect(endSession).toHaveBeenCalled();
    expect(await screen.findByText('Login page')).toBeInTheDocument();
  });

  it('only deletes after the password and DELETE are given', async () => {
    deleteAccount.mockResolvedValue(undefined);
    renderPage();
    await userEvent.click(screen.getByRole('button', { name: 'Delete my account' }));
    const dialog = screen.getByRole('dialog', { name: 'Delete your account?' });
    await userEvent.type(within(dialog).getByLabelText('Your password'), 'pw');
    await userEvent.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'delete');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everything' }));
    expect(await within(dialog).findByText('Type DELETE in capital letters')).toBeInTheDocument();
    expect(deleteAccount).not.toHaveBeenCalled();

    await userEvent.clear(within(dialog).getByLabelText('Type DELETE to confirm'));
    await userEvent.type(within(dialog).getByLabelText('Type DELETE to confirm'), 'DELETE');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete everything' }));
    expect(deleteAccount).toHaveBeenCalledWith({ password: 'pw', confirm: 'DELETE' });
    expect(endSession).toHaveBeenCalled();
    expect(await screen.findByText('Home page')).toBeInTheDocument();
  });

  it('leaves out patient-only sections for doctors', () => {
    role = 'doctor';
    renderPage();
    expect(screen.queryByRole('region', { name: 'Privacy choices' })).not.toBeInTheDocument();
    expect(screen.queryByText('Patient code')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Your data' })).toHaveTextContent('your doctor profile');
    expect(screen.getByRole('region', { name: 'Delete account' })).toHaveTextContent('deletes your account and doctor profile');
  });
});
