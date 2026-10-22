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
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { OnboardingPage } from '@/features/profile/OnboardingPage';
import { ProfilePage } from '@/features/profile/ProfilePage';
import { LabsPage } from '@/features/labs/LabsPage';
import { LogMealPage } from '@/features/meals/LogMealPage';
import { MealPage } from '@/features/meals/MealPage';
import { HistoryPage } from '@/features/meals/HistoryPage';
import { AnalyticsPage } from '@/features/analytics/AnalyticsPage';
import { NotificationsPage } from '@/features/notifications/NotificationsPage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { DoctorLayout } from '@/pages/doctor/DoctorLayout';
import { DoctorHomePage } from '@/features/doctor/DoctorHomePage';
import { DoctorProfilePage } from '@/features/doctor/DoctorProfilePage';
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
    { path: 'meals', element: <HistoryPage /> },
    { path: 'meals/new', element: <LogMealPage /> },
    { path: 'meals/:id', element: <MealPage /> },
    { path: 'analytics', element: <AnalyticsPage /> },
    { path: 'labs', element: <LabsPage /> },
    { path: 'notifications', element: <NotificationsPage /> },
    { path: 'profile', element: <ProfilePage /> },
    { path: 'settings', element: <SettingsPage /> },
  ],
};

const doctorRoutes: RouteObject = {
  path: '/doctor',
  element: (
    <RequireAuth role="doctor">
      <DoctorLayout />
    </RequireAuth>
  ),
  children: [
    { index: true, element: <Navigate to="dashboard" replace /> },
    { path: 'dashboard', element: <DoctorHomePage /> },
    { path: 'profile', element: <DoctorProfilePage /> },
    { path: 'settings', element: <SettingsPage /> },
  ],
};

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
  doctorRoutes,
  ...devRoutes,
  { path: '*', element: <NotFoundPage /> },
]);
