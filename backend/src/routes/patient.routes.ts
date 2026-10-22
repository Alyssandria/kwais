import { Router } from 'express';
import { PatientCareController } from '../controllers/care.controller.js';
import { ConsentController, LabController, ProfileController, TargetController } from '../controllers/patient.controller.js';
import { careRequestLimiter } from '../middleware/rate-limits.js';
import { requirePatient } from '../middleware/require-patient.js';
import { validateBody } from '../middleware/validate.js';
import {
  ConsentChangeSchema,
  LabCreateSchema,
  LabUpdateSchema,
  ProfileUpdateSchema,
  TargetSchema,
} from '../schemas/patient.schemas.js';
import { CareInviteSchema } from '../schemas/care.schemas.js';

export const patientMeRoutes = Router();
patientMeRoutes.use(requirePatient);
patientMeRoutes.get('/profile', ProfileController.get);
patientMeRoutes.patch('/profile', validateBody(ProfileUpdateSchema), ProfileController.update);
patientMeRoutes.post('/onboarding/complete', ProfileController.completeOnboarding);
patientMeRoutes.get('/targets', TargetController.list);
patientMeRoutes.put('/targets/:nutrient', validateBody(TargetSchema), TargetController.set);
patientMeRoutes.delete('/targets/:nutrient', TargetController.remove);
patientMeRoutes.get('/consents', ConsentController.current);
patientMeRoutes.post('/consents', validateBody(ConsentChangeSchema), ConsentController.change);
patientMeRoutes.get('/care', PatientCareController.overview);
patientMeRoutes.post('/care/invites', careRequestLimiter, validateBody(CareInviteSchema), PatientCareController.invite);
patientMeRoutes.post('/care/invites/:id/cancel', PatientCareController.cancelInvite);
patientMeRoutes.post('/care/links/:id/:action', PatientCareController.act);

export const labRoutes = Router();
labRoutes.use(requirePatient);
labRoutes.get('/', LabController.list);
labRoutes.post('/', validateBody(LabCreateSchema), LabController.create);
labRoutes.patch('/:id', validateBody(LabUpdateSchema), LabController.update);
labRoutes.delete('/:id', LabController.remove);
