import type { RequestHandler } from 'express';
import { HttpError } from '../lib/http-error.js';
import { AuditService, requestMeta } from '../services/audit.service.js';
import { CareService } from '../services/care.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const requireLinkedPatient: RequestHandler = async (req, _res, next) => {
  const id = String(req.params.patientId ?? '');
  if (!req.auth || !UUID.test(id)) return next(HttpError.notFound('Patient not found'));
  await CareService.assertActiveLink(req.auth.userId, id);
  req.patientId = id;
  next();
};

export function auditRead(resourceType: string, idParam?: string): RequestHandler {
  return async (req, _res, next) => {
    const resourceId = idParam ? String(req.params[idParam] ?? '') : undefined;
    await AuditService.record('read', resourceType, requestMeta(req), {
      actorId: req.auth!.userId,
      actorRole: 'doctor',
      patientId: req.patientId!,
      ...(resourceId ? { resourceId } : {}),
    });
    next();
  };
}
