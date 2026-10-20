import { Router } from 'express';
import { ConsentController, LabController, ProfileController, TargetController } from '../controllers/patient.controller.js';
import { PrivacyController } from '../controllers/privacy.controller.js';
import { credentialLimiter, exportLimiter } from '../middleware/rate-limits.js';
import { requirePatient } from '../middleware/require-patient.js';
import { validateBody } from '../middleware/validate.js';
import {
  ConsentChangeSchema,
  LabCreateSchema,
  LabUpdateSchema,
  ProfileUpdateSchema,
  TargetSchema,
} from '../schemas/patient.schemas.js';
import { DeleteAccountSchema } from '../schemas/privacy.schemas.js';

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
patientMeRoutes.get('/export', exportLimiter, PrivacyController.exportData);
patientMeRoutes.get('/activity', PrivacyController.activity);
patientMeRoutes.post('/delete-account', credentialLimiter, validateBody(DeleteAccountSchema), PrivacyController.deleteAccount);

export const labRoutes = Router();
labRoutes.use(requirePatient);
labRoutes.get('/', LabController.list);
labRoutes.post('/', validateBody(LabCreateSchema), LabController.create);
labRoutes.patch('/:id', validateBody(LabUpdateSchema), LabController.update);
labRoutes.delete('/:id', LabController.remove);
