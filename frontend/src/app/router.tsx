import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { RedirectIfSignedIn, RequireAuth } from '@/features/auth/guards';
import { PublicLayout } from '@/pages/public/PublicLayout';
import { LandingPage } from '@/pages/public/LandingPage';
import { DisclaimerPage, PrivacyPage, TermsPage } from '@/pages/public/LegalPages';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { LoginPage } from '@/pages/auth/LoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from '@/pages/auth/ResetPasswordPage';
import { PatientLayout } from '@/pages/patient/PatientLayout';
import { ComingSoonPage } from '@/pages/patient/ComingSoonPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { OnboardingPage } from '@/features/profile/OnboardingPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { LabsPage } from '@/features/labs/LabsPage';
import { ComponentGallery } from '@/pages/dev/ComponentGallery';
import { StatusPage } from '@/pages/dev/StatusPage';

const publicRoutes: RouteObject = {
  element: <PublicLayout />,
  children: [
    { path: '/', element: <LandingPage /> },
    { path: '/privacy', element: <PrivacyPage /> },
    { path: '/terms', element: <TermsPage /> },
    { path: '/disclaimer', element: <DisclaimerPage /> },
  ],
};

const authRoutes: RouteObject[] = [
  { path: '/login', element: <RedirectIfSignedIn><LoginPage /></RedirectIfSignedIn> },
  { path: '/register', element: <RedirectIfSignedIn><RegisterPage /></RedirectIfSignedIn> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
];

/** /patient/* — signed-in patients only. Pages are placeholders until their section lands. */
const patientRoutes: RouteObject = {
  path: '/patient',
  element: (
    <RequireAuth role="patient">
      <PatientLayout />
    </RequireAuth>
  ),
  children: [
    { index: true, element: <Navigate to="dashboard" replace /> },
    { path: 'dashboard', element: <DashboardPage /> },
    { path: 'meals', element: <ComingSoonPage title="Meal history" section={8} /> },
    { path: 'meals/new', element: <ComingSoonPage title="Log a meal" section={6} /> },
    { path: 'meals/:id', element: <ComingSoonPage title="Meal analysis" section={7} /> },
    { path: 'analytics', element: <ComingSoonPage title="Analytics" section={8} /> },
    { path: 'labs', element: <LabsPage /> },
    { path: 'notifications', element: <ComingSoonPage title="Notifications" section={8} /> },
    { path: 'profile', element: <ProfilePage /> },
    { path: 'settings', element: <ComingSoonPage title="Settings" section={9} /> },
  ],
};

/** Full-screen guided setup, signed-in patients only, outside the app shell. */
const onboardingRoute: RouteObject = {
  path: '/patient/onboarding',
  element: (
    <RequireAuth role="patient">
      <OnboardingPage />
    </RequireAuth>
  ),
};

const devRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      { path: '/dev/components', element: <ComponentGallery /> },
      { path: '/dev/status', element: <StatusPage /> },
    ]
  : [];

export const router = createBrowserRouter([
  publicRoutes,
  ...authRoutes,
  onboardingRoute,
  patientRoutes,
  ...devRoutes,
  { path: '*', element: <NotFoundPage /> },
]);
