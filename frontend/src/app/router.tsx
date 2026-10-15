import { createBrowserRouter } from 'react-router-dom';
import { HomePage } from '@/pages/public/HomePage';
import { NotFoundPage } from '@/pages/public/NotFoundPage';

/**
 * Route table. Later sections add the public site, auth pages and the
 * /patient/* area behind a protected layout.
 */
export const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '*', element: <NotFoundPage /> },
]);
