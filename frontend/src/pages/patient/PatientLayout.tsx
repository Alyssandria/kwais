import { Outlet } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { patientNav } from '@/components/layout/nav';

/**
 * Wraps every /patient/* page in the app shell.
 * Section 3 puts this behind the sign-in guard and reads the real user;
 * until then it shows a fictional sample patient.
 */
export function PatientLayout() {
  return (
    <AppShell nav={patientNav} user={{ firstName: 'Maria', lastName: 'Santos' }} unreadCount={2}>
      <Outlet />
    </AppShell>
  );
}
