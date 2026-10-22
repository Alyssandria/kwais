import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AxiosError, type AxiosResponse } from 'axios';
import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui';
import type { DoctorProfile } from '@/features/doctor/api';

const update = vi.fn();
const refreshUser = vi.fn();
let profile: DoctorProfile = { firstName: 'Jose', lastName: 'Reyes', prcLicense: null, specialty: 'Nephrology', clinic: null, updatedAt: '2026-10-22T00:00:00Z' };

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ user: { role: 'doctor', firstName: 'Jose', lastName: 'Reyes' }, refreshUser }),
}));
vi.mock('@/features/care/DoctorCare', () => ({ DoctorCarePanels: () => <p>Care panels</p> }));
vi.mock('@/features/doctor/api', async (original) => ({
  ...(await original<typeof import('@/features/doctor/api')>()),
  useDoctorProfile: () => ({ data: profile, isPending: false, isError: false }),
  useUpdateDoctorProfile: () => ({ mutateAsync: update }),
}));

const { DoctorHomePage } = await import('@/features/doctor/DoctorHomePage');
const { DoctorProfilePage } = await import('@/features/doctor/DoctorProfilePage');

const page = (el: ReactNode) =>
  render(
    <ToastProvider>
      <MemoryRouter>{el}</MemoryRouter>
    </ToastProvider>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  profile = { firstName: 'Jose', lastName: 'Reyes', prcLicense: null, specialty: 'Nephrology', clinic: null, updatedAt: '2026-10-22T00:00:00Z' };
});

describe('DoctorHomePage', () => {
  it('shows how patients will see the doctor, and asks for missing details', () => {
    page(<DoctorHomePage />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Good day, Dr. Reyes');
    const seen = screen.getByRole('region', { name: 'What patients see about you' });
    expect(seen).toHaveTextContent('Dr. Jose Reyes');
    expect(seen).toHaveTextContent('Nephrology');
    expect(seen).toHaveTextContent('A PRC number and clinic help them recognise you');
    expect(screen.getByText('Care panels')).toBeInTheDocument();
  });

  it('drops the reminder once the profile is complete', () => {
    profile = { ...profile, prcLicense: '0123456', clinic: 'Philippine General Hospital' };
    page(<DoctorHomePage />);
    const seen = screen.getByRole('region', { name: 'What patients see about you' });
    expect(seen).toHaveTextContent('Nephrology · Philippine General Hospital · PRC 0123456');
    expect(seen).not.toHaveTextContent('help them recognise you');
  });
});

describe('DoctorProfilePage', () => {
  it('saves changes and refreshes the name shown in the top bar', async () => {
    update.mockResolvedValue({ ...profile, clinic: 'PGH', updatedAt: '2026-10-22T01:00:00Z' });
    page(<DoctorProfilePage />);
    expect(screen.getByRole('button', { name: 'Save changes' })).toBeDisabled();
    await userEvent.type(screen.getByLabelText(/Clinic or hospital/), 'PGH');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(update).toHaveBeenCalledWith({ firstName: 'Jose', lastName: 'Reyes', prcLicense: '', specialty: 'Nephrology', clinic: 'PGH' });
    expect(refreshUser).toHaveBeenCalled();
    expect(await screen.findByText('Profile saved')).toBeInTheDocument();
  });

  it('puts server field errors on the right field', async () => {
    update.mockRejectedValue(
      new AxiosError('bad', '400', undefined, undefined, {
        status: 400,
        data: { error: { code: 'validation_failed', message: 'Check the form', details: [{ path: 'clinic', message: 'Clinic or hospital is too long' }] } },
      } as AxiosResponse),
    );
    page(<DoctorProfilePage />);
    await userEvent.type(screen.getByLabelText(/Clinic or hospital/), 'PGH');
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }));
    expect(await screen.findByText('Clinic or hospital is too long')).toBeInTheDocument();
  });
});
