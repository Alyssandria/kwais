import { HttpError } from '../lib/http-error.js';
import { PatientProfileModel, type ProfileChanges, type ProfileRecord } from '../models/patient-profile.model.js';
import type { ProfileUpdate } from '../schemas/patient.schemas.js';
import { AuditService, type RequestMeta } from './audit.service.js';

export interface ProfileView {
  patientCode: string;
  firstName: string;
  lastName: string;
  birthYear: number | null;
  sex: string | null;
  dietaryPreferences: string[];
  allergies: string[];
  restrictions: string[];
  ckdStage: { value: string; source: 'patient_entered' | 'clinician_verified' } | null;
  dialysisStatus: 'none' | 'hemodialysis' | 'peritoneal' | 'unknown';
  reminderTime: string | null;
  timezone: string;
  onboarding: { step: number; complete: boolean };
  updatedAt: string;
}

export function toProfileView(p: ProfileRecord): ProfileView {
  return {
    patientCode: p.patientCode,
    firstName: p.firstName,
    lastName: p.lastName,
    birthYear: p.birthYear,
    sex: p.sex,
    dietaryPreferences: p.dietaryPreferences,
    allergies: p.allergies,
    restrictions: p.restrictions,
    ckdStage: p.ckdStage ? { value: p.ckdStage, source: p.ckdStageSource ?? 'patient_entered' } : null,
    dialysisStatus: p.dialysisStatus,
    reminderTime: p.reminderTime,
    timezone: p.timezone,
    onboarding: { step: p.onboardingStep, complete: Boolean(p.onboardingDoneAt) },
    updatedAt: p.updatedAt.toISOString(),
  };
}

export const ProfileService = {
  async get(patientId: string): Promise<ProfileView> {
    const p = await PatientProfileModel.findById(patientId);
    if (!p) throw HttpError.notFound('Profile not found');
    return toProfileView(p);
  },

  /**
   * Applies the patient's own edits. Anything clinical the patient types is recorded as
   * patient_entered; a stage a clinician verified becomes patient_entered again if the patient
   * changes it. Nothing is ever inferred from other fields.
   */
  async update(patientId: string, changes: ProfileUpdate, actorId: string, meta: RequestMeta): Promise<ProfileView> {
    const current = await PatientProfileModel.findById(patientId);
    if (!current) throw HttpError.notFound('Profile not found');

    const data: ProfileChanges = { ...changes };
    if ('ckdStage' in changes) {
      const stage = changes.ckdStage ?? null;
      if (stage !== current.ckdStage) {
        data.ckdStage = stage;
        data.ckdStageSource = stage ? 'patient_entered' : null;
      }
    }

    const updated = await PatientProfileModel.update(patientId, data);
    await AuditService.record('update', 'patient_profile', meta, {
      actorId,
      actorRole: 'patient',
      resourceId: patientId,
      patientId,
    });
    return toProfileView(updated);
  },

  async completeOnboarding(patientId: string, actorId: string, meta: RequestMeta): Promise<ProfileView> {
    const updated = await PatientProfileModel.update(patientId, { onboardingDoneAt: new Date() });
    await AuditService.record('update', 'onboarding', meta, { actorId, actorRole: 'patient', resourceId: patientId, patientId });
    return toProfileView(updated);
  },
};
