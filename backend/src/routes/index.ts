import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { labRoutes, patientMeRoutes } from './patient.routes.js';

/**
 * Mounts every route file under /api/v1.
 * Later sections add: /auth, /patients, /labs, /meals, /analyses, /analytics, /dashboard …
 */
export const apiRoutes = Router();

apiRoutes.use('/health', healthRoutes);
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/patients/me', patientMeRoutes);
apiRoutes.use('/labs', labRoutes);
