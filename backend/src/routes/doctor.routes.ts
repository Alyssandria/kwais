import { Router } from 'express';
import { DoctorCareController } from '../controllers/care.controller.js';
import { DoctorProfileController } from '../controllers/doctor.controller.js';
import { careRequestLimiter } from '../middleware/rate-limits.js';
import { requireDoctor } from '../middleware/require-doctor.js';
import { validateBody } from '../middleware/validate.js';
import { CareClaimSchema, CareRequestSchema } from '../schemas/care.schemas.js';
import { DoctorProfileUpdateSchema } from '../schemas/doctor.schemas.js';

export const doctorMeRoutes = Router();
doctorMeRoutes.use(requireDoctor);
doctorMeRoutes.get('/profile', DoctorProfileController.get);
doctorMeRoutes.patch('/profile', validateBody(DoctorProfileUpdateSchema), DoctorProfileController.update);
doctorMeRoutes.get('/care', DoctorCareController.overview);
doctorMeRoutes.post('/care/requests', careRequestLimiter, validateBody(CareRequestSchema), DoctorCareController.request);
doctorMeRoutes.get('/care/invites/:token', DoctorCareController.previewInvite);
doctorMeRoutes.post('/care/invites/claim', validateBody(CareClaimSchema), DoctorCareController.claimInvite);
doctorMeRoutes.post('/care/links/:id/:action', DoctorCareController.act);
