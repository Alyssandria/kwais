import { HttpError } from '../lib/http-error.js';
import { DoctorProfileModel, type DoctorProfileRecord } from '../models/doctor-profile.model.js';
import type { DoctorProfileUpdate } from '../schemas/doctor.schemas.js';
import { AuditService, type RequestMeta } from './audit.service.js';

export interface DoctorProfileView {
  firstName: string;
  lastName: string;
  prcLicense: string | null;
  specialty: string | null;
  clinic: string | null;
  updatedAt: string;
}

const toView = (r: DoctorProfileRecord): DoctorProfileView => ({ ...r, updatedAt: r.updatedAt.toISOString() });

export const DoctorProfileService = {
  async get(userId: string): Promise<DoctorProfileView> {
    const row = await DoctorProfileModel.findByUserId(userId);
    if (!row) throw HttpError.forbidden('No doctor profile for this account');
    return toView(row);
  },

  async update(userId: string, patch: DoctorProfileUpdate, meta: RequestMeta): Promise<DoctorProfileView> {
    const changes = Object.fromEntries(Object.entries(patch).filter(([, v]) => v !== undefined));
    const row = await DoctorProfileModel.update(userId, changes);
    await AuditService.record('update', 'doctor_profile', meta, { actorId: userId, actorRole: 'doctor', resourceId: userId });
    return toView(row);
  },
};
