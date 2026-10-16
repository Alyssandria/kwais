import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { patientNav } from '@/components/layout/nav';
import { useAuth } from '@/features/auth/AuthProvider';

export function PatientLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      nav={patientNav}
      user={{ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' }}
      unreadCount={0}
      onSignOut={signOut}
    >
      <Outlet />
    </AppShell>
  );
}
