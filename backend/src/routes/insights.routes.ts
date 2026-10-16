import { Router } from 'express';
import { AnalyticsController, DashboardController, NotificationController } from '../controllers/insights.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePatient } from '../middleware/require-patient.js';

export const dashboardRoutes = Router();
dashboardRoutes.get('/patient', requirePatient, DashboardController.patient);

export const analyticsRoutes = Router();
analyticsRoutes.get('/me', requirePatient, AnalyticsController.me);

export const notificationRoutes = Router();
notificationRoutes.use(authenticate);
notificationRoutes.get('/', NotificationController.list);
notificationRoutes.post('/read-all', NotificationController.readAll);
notificationRoutes.post('/:id/read', NotificationController.read);
