import { Router } from 'express';
import { DoctorProfileController } from '../controllers/doctor.controller.js';
import { requireDoctor } from '../middleware/require-doctor.js';
import { validateBody } from '../middleware/validate.js';
import { DoctorProfileUpdateSchema } from '../schemas/doctor.schemas.js';

export const doctorMeRoutes = Router();
doctorMeRoutes.use(requireDoctor);
doctorMeRoutes.get('/profile', DoctorProfileController.get);
doctorMeRoutes.patch('/profile', validateBody(DoctorProfileUpdateSchema), DoctorProfileController.update);
