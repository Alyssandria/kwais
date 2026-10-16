import { Router } from 'express';
import { healthRoutes } from './health.routes.js';
import { authRoutes } from './auth.routes.js';
import { foodRoutes, mealRoutes } from './meal.routes.js';
import { labRoutes, patientMeRoutes } from './patient.routes.js';

export const apiRoutes = Router();

apiRoutes.use('/health', healthRoutes);
apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/patients/me', patientMeRoutes);
apiRoutes.use('/labs', labRoutes);
apiRoutes.use('/meals', mealRoutes);
apiRoutes.use('/foods', foodRoutes);
