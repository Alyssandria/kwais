import { Router } from 'express';
import { DoctorPatientsController } from '../controllers/doctor.controller.js';
import { AnalyticsController, DashboardController } from '../controllers/insights.controller.js';
import { MealController } from '../controllers/meal.controller.js';
import { LabController, ProfileController, TargetController } from '../controllers/patient.controller.js';
import { auditRead, requireLinkedPatient } from '../middleware/require-linked-patient.js';

export const doctorPatientRoutes = Router({ mergeParams: true });
doctorPatientRoutes.use(requireLinkedPatient);
doctorPatientRoutes.get('/', auditRead('patient_record'), DoctorPatientsController.one);
doctorPatientRoutes.get('/dashboard', DashboardController.patient);
doctorPatientRoutes.get('/profile', ProfileController.get);
doctorPatientRoutes.get('/targets', TargetController.list);
doctorPatientRoutes.get('/labs', auditRead('lab_results'), LabController.list);
doctorPatientRoutes.get('/analytics', auditRead('trends'), AnalyticsController.me);
doctorPatientRoutes.get('/meals', auditRead('meal_history'), MealController.listShared);
doctorPatientRoutes.get('/meals/:id', auditRead('meal', 'id'), MealController.getShared);
