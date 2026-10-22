import { Outlet, useNavigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { doctorNav } from '@/components/layout/nav';
import { useAuth } from '@/features/auth/AuthProvider';
import { useNotifications } from '@/features/notifications/api';

export function DoctorLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notifications = useNotifications({ poll: true });

  const signOut = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <AppShell
      nav={doctorNav}
      user={{ firstName: user?.firstName ?? '', lastName: user?.lastName ?? '' }}
      unreadCount={notifications.data?.unread ?? 0}
      onSignOut={signOut}
      notificationsTo="/doctor/notifications"
      profileTo="/doctor/profile"
      addTo={null}
    >
      <Outlet />
    </AppShell>
  );
}
