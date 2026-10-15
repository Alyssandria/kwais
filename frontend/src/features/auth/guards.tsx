import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Spinner } from '@/components/ui';
import { homeFor, useAuth } from './AuthProvider';

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas">
      <Spinner label="Loading K-WAIS" />
    </div>
  );
}

/**
 * Lets a page render only for a signed-in user with the right role.
 * Signed-out visitors go to /login and come back afterwards (?next=).
 * This is a convenience for the UI; the API enforces access on every request.
 */
export function RequireAuth({ role, children }: { role: 'patient' | 'doctor'; children: ReactNode }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <FullPageLoader />;
  if (status === 'signedOut' || !user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (user.role !== role) return <Navigate to={homeFor(user)} replace />;
  return <>{children}</>;
}

/** Sign-in and sign-up pages: already signed-in users are sent to their home. */
export function RedirectIfSignedIn({ children }: { children: ReactNode }) {
  const { status, user } = useAuth();
  if (status === 'loading') return <FullPageLoader />;
  if (status === 'signedIn' && user) return <Navigate to={homeFor(user)} replace />;
  return <>{children}</>;
}

/** Only follow ?next= links that stay inside the app. */
export function safeNext(next: string | null, fallback: string): string {
  if (!next) return fallback;
  try {
    const decoded = decodeURIComponent(next);
    return decoded.startsWith('/') && !decoded.startsWith('//') ? decoded : fallback;
  } catch {
    return fallback;
  }
}
