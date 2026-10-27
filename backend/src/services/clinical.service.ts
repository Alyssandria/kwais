import type { Nutrient } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { CareModel } from '../models/care.model.js';
import { PatientProfileModel } from '../models/patient-profile.model.js';
import type { LabCreate, LabUpdate, TargetBody } from '../schemas/patient.schemas.js';
import type { RequestMeta } from './audit.service.js';
import { LabService, type LabView } from './lab.service.js';
import { NoteService, type NoteView } from './note.service.js';
import { NotificationService, type NewNotification } from './notification.service.js';
import { ProfileService, type ProfileView } from './profile.service.js';
import { TargetService, type TargetView } from './target.service.js';
import { doctorDisplayName, type Clinician } from './verification.js';

const NUTRIENT: Record<Nutrient, string> = { sodium: 'sodium', potassium: 'potassium', phosphorus: 'phosphorus', protein: 'protein' };
const number = (n: number) => new Intl.NumberFormat('en-PH', { maximumFractionDigits: 2 }).format(n);
const day = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export function preview(text: string, max = 140): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length <= max ? flat : `${flat.slice(0, max - 1).trimEnd()}…`;
}

async function clinicianFor(userId: string): Promise<Clinician> {
  const doctor = await CareModel.doctorByUserId(userId);
  if (!doctor) throw HttpError.forbidden('No doctor profile for this account');
  return { userId, doctorId: doctor.id, name: doctorDisplayName(doctor) };
}

async function tell(patientId: string, n: Omit<NewNotification, 'type'>): Promise<void> {
  const userId = await PatientProfileModel.userIdById(patientId);
  if (userId) await NotificationService.notify(userId, { type: 'care_team', ...n });
}

export const ClinicalService = {
  async setStage(userId: string, patientId: string, stage: string, meta: RequestMeta): Promise<ProfileView> {
    const c = await clinicianFor(userId);
    const before = await ProfileService.get(patientId);
    const profile = await ProfileService.setStage(patientId, stage, c, meta);
    const confirmed = before.ckdStage?.value === stage;
    await tell(patientId, {
      title: `${c.name} ${confirmed ? 'confirmed' : 'set'} your CKD stage`,
      body: `Stage ${stage}. Meal analyses use it from now on.`,
      link: '/patient/profile',
    });
    return profile;
  },

  async setTarget(userId: string, patientId: string, nutrient: Nutrient, body: TargetBody, meta: RequestMeta): Promise<TargetView> {
    const c = await clinicianFor(userId);
    const before = (await TargetService.listActive(patientId)).find((t) => t.nutrient === nutrient);
    const target = await TargetService.set(patientId, nutrient, body, userId, meta, c);
    const confirmed = before?.dailyMax === target.dailyMax;
    await tell(patientId, {
      title: `${c.name} ${confirmed ? 'verified' : 'set'} your ${NUTRIENT[nutrient]} target`,
      body: `${number(target.dailyMax)} ${target.unit} a day${target.note ? `. Note: ${preview(target.note, 100)}` : ''}. New meal analyses use it.`,
      link: '/patient/profile',
    });
    return target;
  },

  async addLab(userId: string, patientId: string, body: LabCreate, meta: RequestMeta): Promise<LabView> {
    const c = await clinicianFor(userId);
    const lab = await LabService.create(patientId, body, userId, meta, c);
    await tell(patientId, {
      title: `${c.name} added a ${lab.label} result`,
      body: `${number(lab.value)} ${lab.unit}, collected ${day(lab.collectedOn)}.`,
      link: '/patient/labs',
    });
    return lab;
  },

  async correctLab(userId: string, patientId: string, id: string, body: LabUpdate, meta: RequestMeta): Promise<LabView> {
    const c = await clinicianFor(userId);
    const lab = await LabService.update(patientId, id, body, userId, meta, c);
    await tell(patientId, {
      title: `${c.name} corrected your ${lab.label} result`,
      body: `It now reads ${number(lab.value)} ${lab.unit}, collected ${day(lab.collectedOn)}.`,
      link: '/patient/labs',
    });
    return lab;
  },

  async verifyLab(userId: string, patientId: string, id: string, meta: RequestMeta): Promise<LabView> {
    const c = await clinicianFor(userId);
    const lab = await LabService.verify(patientId, id, c, meta);
    await tell(patientId, {
      title: `${c.name} verified your ${lab.label} result`,
      body: `${number(lab.value)} ${lab.unit}, collected ${day(lab.collectedOn)}.`,
      link: '/patient/labs',
    });
    return lab;
  },

  async notes(userId: string, patientId: string): Promise<NoteView[]> {
    const c = await clinicianFor(userId);
    return NoteService.list(patientId, c.doctorId);
  },

  async addNote(userId: string, patientId: string, body: string, meta: RequestMeta): Promise<NoteView> {
    const c = await clinicianFor(userId);
    const note = await NoteService.create(patientId, body, c, meta);
    await tell(patientId, { title: `${c.name} left you a note`, body: preview(body), link: '/patient/notes' });
    return note;
  },

  async editNote(userId: string, patientId: string, id: string, body: string, meta: RequestMeta): Promise<NoteView> {
    return NoteService.update(patientId, id, body, await clinicianFor(userId), meta);
  },

  async removeNote(userId: string, patientId: string, id: string, meta: RequestMeta): Promise<void> {
    await NoteService.remove(patientId, id, await clinicianFor(userId), meta);
  },
};
