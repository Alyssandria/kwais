import type { Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import type { DoctorProfileUpdate } from '../schemas/doctor.schemas.js';
import { requestMeta } from '../services/audit.service.js';
import { DoctorPatientsService } from '../services/doctor-patients.service.js';
import { DoctorProfileService } from '../services/doctor-profile.service.js';

const userIdOf = (req: Request) => {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth.userId;
};

export const DoctorProfileController = {
  async get(req: Request, res: Response) {
    res.json({ data: await DoctorProfileService.get(userIdOf(req)) });
  },
  async update(req: Request, res: Response) {
    res.json({ data: await DoctorProfileService.update(userIdOf(req), req.body as DoctorProfileUpdate, requestMeta(req)) });
  },
};

export const DoctorPatientsController = {
  async list(req: Request, res: Response) {
    res.json({ data: await DoctorPatientsService.list(userIdOf(req)) });
  },
};
