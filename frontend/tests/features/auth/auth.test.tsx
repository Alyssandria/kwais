import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { AuthUser } from '@/lib/api';

const login = vi.fn();
const registerFn = vi.fn();
let authState: { status: 'loading' | 'signedIn' | 'signedOut'; user: AuthUser | null } = { status: 'signedOut', user: null };

vi.mock('@/features/auth/AuthProvider', () => ({
  useAuth: () => ({ ...authState, login, register: registerFn, logout: vi.fn() }),
  homeFor: (u: AuthUser) => (u.role === 'doctor' ? '/doctor/dashboard' : '/patient/dashboard'),
}));

const { LoginPage } = await import('@/pages/auth/LoginPage');
const { RegisterPage } = await import('@/pages/auth/RegisterPage');
const { RequireAuth, safeNext } = await import('@/features/auth/guards');

const maria: AuthUser = {
  id: 'u1', email: 'maria@example.com', role: 'patient', firstName: 'Maria', lastName: 'Santos',
  patientCode: 'KW-000123', onboardingComplete: false,
};

function at(path: string, element: ReactNode) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={element} />
        <Route path="/register" element={element} />
        <Route path="/patient/*" element={<RequireAuth role="patient"><p>Patient area</p></RequireAuth>} />
        <Route path="/patient/dashboard" element={<p>Dashboard page</p>} />
        <Route path="/doctor/dashboard" element={<p>Doctor home</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  authState = { status: 'signedOut', user: null };
});

describe('LoginPage', () => {
  it('shows field errors without calling the API', async () => {
    at('/login', <LoginPage />);
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByText('Enter your email')).toBeInTheDocument();
    expect(screen.getByText('Enter your password')).toBeInTheDocument();
    expect(login).not.toHaveBeenCalled();
  });

  it('shows the server message when sign-in fails', async () => {
    login.mockRejectedValue(new Error('nope'));
    at('/login', <LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), 'maria@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'wrong-password-1');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/something went wrong/i);
  });

  it('signs in with trimmed values', async () => {
    login.mockResolvedValue(maria);
    at('/login', <LoginPage />);
    await userEvent.type(screen.getByLabelText('Email'), '  maria@example.com ');
    await userEvent.type(screen.getByLabelText('Password'), 'kidney-care-2026');
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(login).toHaveBeenCalledWith({ email: 'maria@example.com', password: 'kidney-care-2026' });
  });
});

describe('RegisterPage', () => {
  it('requires matching passwords and both consents', async () => {
    at('/register', <RegisterPage />);
    await userEvent.type(screen.getByLabelText('First name'), 'Maria');
    await userEvent.type(screen.getByLabelText('Last name'), 'Santos');
    await userEvent.type(screen.getByLabelText('Email'), 'maria@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'kidney-care-2026');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'kidney-care-2027');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(screen.getByText('You need to accept the terms to continue')).toBeInTheDocument();
    expect(screen.getByText(/needs this consent/)).toBeInTheDocument();
    expect(registerFn).not.toHaveBeenCalled();
  });

  it('signs up a doctor without the patient health-data consent', async () => {
    registerFn.mockResolvedValue({ ...maria, id: 'd1', role: 'doctor', patientCode: null, onboardingComplete: true });
    at('/register', <RegisterPage />);
    await userEvent.click(screen.getByRole('radio', { name: /A doctor or dietitian/ }));
    expect(screen.queryByLabelText(/store and process my health information/)).not.toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('First name'), 'Jose');
    await userEvent.type(screen.getByLabelText('Last name'), 'Reyes');
    await userEvent.type(screen.getByLabelText('Email'), 'dr.reyes@example.com');
    await userEvent.type(screen.getByLabelText('Password'), 'kidney-care-2026');
    await userEvent.type(screen.getByLabelText('Confirm password'), 'kidney-care-2026');
    await userEvent.type(screen.getByLabelText(/PRC licence number/), 'abc');
    await userEvent.click(screen.getByRole('checkbox', { name: /terms of use/ }));
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Enter the digits of your PRC licence number')).toBeInTheDocument();
    expect(registerFn).not.toHaveBeenCalled();

    await userEvent.clear(screen.getByLabelText(/PRC licence number/));
    await userEvent.type(screen.getByLabelText(/PRC licence number/), '0123456');
    await userEvent.type(screen.getByLabelText(/Specialty/), 'Nephrology');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(registerFn).toHaveBeenCalledWith(expect.objectContaining({ role: 'doctor', prcLicense: '0123456', specialty: 'Nephrology', clinic: '' }));
    expect(await screen.findByText('Doctor home')).toBeInTheDocument();
  });

  it('starts on the doctor option when the link asks for it', () => {
    at('/register?role=doctor', <RegisterPage />);
    expect(screen.getByRole('radio', { name: /A doctor or dietitian/ })).toBeChecked();
    expect(screen.getByLabelText(/PRC licence number/)).toBeInTheDocument();
  });

  it('rejects weak passwords', async () => {
    at('/register', <RegisterPage />);
    await userEvent.type(screen.getByLabelText('Password'), 'onlyletters');
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(await screen.findByText('Include at least one letter and one number')).toBeInTheDocument();
  });
});

describe('RequireAuth', () => {
  it('sends signed-out visitors to sign in', () => {
    at('/patient/labs', null);
    expect(screen.queryByText('Patient area')).not.toBeInTheDocument();
  });

  it('shows the page to a signed-in patient', () => {
    authState = { status: 'signedIn', user: maria };
    at('/patient/labs', null);
    expect(screen.getByText('Patient area')).toBeInTheDocument();
  });

  it('waits while the session is restored', () => {
    authState = { status: 'loading', user: null };
    at('/patient/labs', null);
    expect(screen.getByRole('status')).toHaveTextContent(/loading/i);
  });
});

describe('safeNext', () => {
  it('only follows links inside the app', () => {
    expect(safeNext('%2Fpatient%2Flabs', '/home')).toBe('/patient/labs');
    expect(safeNext('https://evil.example', '/home')).toBe('/home');
    expect(safeNext('//evil.example', '/home')).toBe('/home');
    expect(safeNext(null, '/home')).toBe('/home');
  });
});
