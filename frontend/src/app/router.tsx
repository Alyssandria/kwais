import { Navigate, createBrowserRouter, type RouteObject } from 'react-router-dom';
import { HomePage } from '@/pages/public/HomePage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';
import { PatientLayout } from '@/pages/patient/PatientLayout';
import { ComingSoonPage } from '@/pages/patient/ComingSoonPage';
import { ComponentGallery } from '@/pages/dev/ComponentGallery';

/** /patient/* — each page is a placeholder until its section lands. */
const patientRoutes: RouteObject = {
  path: '/patient',
  element: <PatientLayout />,
  children: [
    { index: true, element: <Navigate to="dashboard" replace /> },
    { path: 'dashboard', element: <ComingSoonPage title="Dashboard" section={4} /> },
    { path: 'meals', element: <ComingSoonPage title="Meal history" section={8} /> },
    { path: 'meals/new', element: <ComingSoonPage title="Log a meal" section={6} /> },
    { path: 'meals/:id', element: <ComingSoonPage title="Meal analysis" section={7} /> },
    { path: 'analytics', element: <ComingSoonPage title="Analytics" section={8} /> },
    { path: 'labs', element: <ComingSoonPage title="Lab results" section={5} /> },
    { path: 'notifications', element: <ComingSoonPage title="Notifications" section={8} /> },
    { path: 'profile', element: <ComingSoonPage title="Profile" section={5} /> },
    { path: 'settings', element: <ComingSoonPage title="Settings" section={9} /> },
  ],
};

const routes: RouteObject[] = [
  { path: '/', element: <HomePage /> },
  patientRoutes,
  // Development-only component gallery
  ...(import.meta.env.DEV ? [{ path: '/dev/components', element: <ComponentGallery /> }] : []),
  { path: '*', element: <NotFoundPage /> },
];

export const router = createBrowserRouter(routes);
