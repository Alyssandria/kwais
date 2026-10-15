import { Router } from 'express';
import { HealthController } from '../controllers/health.controller.js';

export const healthRoutes = Router();

/** Liveness: the process is up. */
healthRoutes.get('/', HealthController.api);
/** Readiness: the database answers. */
healthRoutes.get('/db', HealthController.db);
