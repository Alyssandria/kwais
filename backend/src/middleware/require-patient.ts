import type { Request, RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.js';
import { PatientProfileModel } from '../models/patient-profile.model.js';
import { authenticate, requireRole } from './authenticate.js';

/**
 * For /patients/me, /labs and other patient-owned routes:
 * signed in + role patient + resolves the patient's own profile id onto req.patientId.
 * Every query below this point filters by req.patientId, so a patient can only ever
 * reach their own records.
 */
const loadPatientId: RequestHandler = async (req, _res, next) => {
  const profileId = await PatientProfileModel.findIdByUserId(req.auth!.userId);
  if (!profileId) return next(HttpError.forbidden('No patient profile for this account'));
  req.patientId = profileId;
  next();
};

export const requirePatient: RequestHandler[] = [authenticate, requireRole('patient'), loadPatientId];

/** Reads req.patientId inside controllers, failing loudly if the middleware was forgotten. */
export function patientIdOf(req: Request): string {
  if (!req.patientId) throw HttpError.unauthorized();
  return req.patientId;
}
