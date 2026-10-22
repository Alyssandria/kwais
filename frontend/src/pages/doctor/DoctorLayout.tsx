import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/components/layout/nav';
import { useAuth } from '@/features/auth/AuthProvider';

export function DoctorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      nav={doctorNav}
      user={{ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' }}
      onSignOut={signOut}
      notificationsTo={null}
      profileTo="/doctor/profile"
      addTo={null}
    >
      <Outlet />
    </AppShell>
  );
}
