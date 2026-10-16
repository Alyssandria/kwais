import type { Request, RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.js';
import { PatientProfileModel } from '../models/patient-profile.model.js';
import { authenticate, requireRole } from './authenticate.js';

const loadPatientId: RequestHandler = async (req, _res, next) => {
  const profileId = await PatientProfileModel.findIdByUserId(req.auth!.userId);
  if (!profileId) return next(HttpError.forbidden('No patient profile for this account'));
  req.patientId = profileId;
  next();
};

export const requirePatient: RequestHandler[] = [authenticate, requireRole('patient'), loadPatientId];

export function patientIdOf(req: Request): string {
  if (!req.patientId) throw HttpError.unauthorized();
  return req.patientId;
}
