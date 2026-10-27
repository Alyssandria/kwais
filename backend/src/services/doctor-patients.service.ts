import { HttpError } from '../lib/http-error.js';
import { lastLocalDays } from '../lib/time.js';
import { CareModel, type CareLinkRecord } from '../models/care.model.js';
import { MealModel } from '../models/meal.model.js';
import { toPatientCard, type PatientCard } from './care.service.js';
import { LabService } from './lab.service.js';
import { toFacts } from './meal-summary.js';
import { buildPriorities, type PatientPriorities } from './patient-priorities.js';
import { ProfileService, type ProfileView } from './profile.service.js';
import { TargetService } from './target.service.js';

export interface PatientListRow extends PatientPriorities {
  linkId: string;
  since: string;
  patient: PatientCard;
}

export interface PatientList {
  summary: { total: number; needsAttention: number; loggedToday: number; targetsUnverified: number };
  patients: PatientListRow[];
}

async function rowFor(l: CareLinkRecord, now: Date): Promise<PatientListRow> {
  const p = l.patient;
  const { start } = lastLocalDays(now, p.timezone, 7);
  const [summaries, recent, targets, labs] = await Promise.all([
    MealModel.summariesBetween(p.id, start, new Date(now.getTime() + 86_400_000)),
    MealModel.recentSaved(p.id, 1),
    TargetService.listActive(p.id),
    LabService.list(p.id),
  ]);
  const priorities = buildPriorities({
    now,
    timeZone: p.timezone,
    meals: summaries.map((m) => toFacts(m, p.timezone)),
    lastMealAt: recent[0]?.eatenAt ?? null,
    targets,
    labs,
    hasCkdStage: p.ckdStage != null && p.ckdStage !== 'not_sure',
  });
  return { linkId: l.id, since: (l.respondedAt ?? l.createdAt).toISOString(), patient: toPatientCard(p), ...priorities };
}

export interface PatientRecord extends PatientListRow {
  profile: ProfileView;
}

export const DoctorPatientsService = {
  async one(doctorUserId: string, patientId: string, now = new Date()): Promise<PatientRecord> {
    const doctor = await CareModel.doctorByUserId(doctorUserId);
    const link = doctor ? await CareModel.findOpenBetween(patientId, doctor.id) : null;
    if (!link || link.status !== 'active') throw HttpError.notFound('Patient not found');
    const [row, profile] = await Promise.all([rowFor(link, now), ProfileService.get(patientId)]);
    return { ...row, profile };
  },

  async list(doctorUserId: string, now = new Date()): Promise<PatientList> {
    const doctor = await CareModel.doctorByUserId(doctorUserId);
    if (!doctor) throw HttpError.forbidden('No doctor profile for this account');
    const links = (await CareModel.linksForDoctor(doctor.id)).filter((l) => l.status === 'active');

    const patients = await Promise.all(links.map((l) => rowFor(l, now)));

    patients.sort((a, b) => b.attention - a.attention || a.patient.name.localeCompare(b.patient.name));
    return {
      summary: {
        total: patients.length,
        needsAttention: patients.filter((r) => r.attention > 0).length,
        loggedToday: patients.filter((r) => r.loggedToday).length,
        targetsUnverified: patients.filter((r) => r.unverifiedTargets > 0).length,
      },
      patients,
    };
  },
};
