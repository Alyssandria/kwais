import type { CareParty } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { randomToken, sha256 } from '../lib/tokens.js';
import { CareModel, type CareDoctor, type CareLinkRecord, type CarePatient } from '../models/care.model.js';
import { UserModel } from '../models/user.model.js';
import { AuditService, type RequestMeta } from './audit.service.js';
import { MailService } from './mail.service.js';
import { NotificationService } from './notification.service.js';

export const INVITE_VALID_DAYS = 14;

export type CareAction = 'approve' | 'decline' | 'cancel' | 'end';

export interface DoctorCard {
  name: string;
  specialty: string | null;
  clinic: string | null;
  prcLicense: string | null;
}

export interface PatientCard {
  patientId: string;
  name: string;
  patientCode: string;
  ckdStage: { value: string; source: string } | null;
  dialysisStatus: string;
}

export const doctorName = (d: Pick<CareDoctor, 'firstName' | 'lastName'>) => `Dr. ${d.firstName} ${d.lastName}`;
const patientName = (p: Pick<CarePatient, 'firstName' | 'lastName'>) => `${p.firstName} ${p.lastName}`;
const doctorDetails = (d: CareDoctor) => [d.specialty, d.clinic, d.prcLicense ? `PRC ${d.prcLicense}` : null].filter(Boolean).join(', ');

const toDoctorCard = (d: CareDoctor): DoctorCard => ({ name: doctorName(d), specialty: d.specialty, clinic: d.clinic, prcLicense: d.prcLicense });
const toPatientCard = (p: CarePatient): PatientCard => ({
  patientId: p.id,
  name: patientName(p),
  patientCode: p.patientCode,
  ckdStage: p.ckdStage ? { value: p.ckdStage, source: p.ckdStageSource ?? 'patient_entered' } : null,
  dialysisStatus: p.dialysisStatus,
});

const other = (party: CareParty): CareParty => (party === 'doctor' ? 'patient' : 'doctor');

// approve/decline belong to whoever did not send the request; cancel to whoever did; either side can end an active link
export function allowedAction(link: Pick<CareLinkRecord, 'status' | 'initiatedBy'>, party: CareParty, action: CareAction): boolean {
  if (action === 'end') return link.status === 'active';
  if (link.status !== 'pending') return false;
  if (action === 'cancel') return link.initiatedBy === party;
  return link.initiatedBy !== party;
}

const NEXT_STATUS = { approve: 'active', decline: 'declined', cancel: 'cancelled', end: 'ended' } as const;

const NOTIFY_TEXT: Record<CareAction, (actor: string) => { title: string; body: string } | null> = {
  approve: (actor) => ({ title: `${actor} accepted`, body: 'Sharing has started. Either of you can stop it at any time.' }),
  decline: (actor) => ({ title: `${actor} declined your request`, body: 'Nothing was shared.' }),
  cancel: () => null,
  end: (actor) => ({ title: `${actor} stopped sharing`, body: 'Records are no longer shared between you.' }),
};

const cleanMessage = (m: string | null | undefined) => (m?.trim() ? m.trim().slice(0, 300) : null);

async function patientOf(userId: string): Promise<CarePatient> {
  const p = await CareModel.patientByUserId(userId);
  if (!p) throw HttpError.forbidden('No patient profile for this account');
  return p;
}

async function doctorOf(userId: string): Promise<CareDoctor> {
  const d = await CareModel.doctorByUserId(userId);
  if (!d) throw HttpError.forbidden('No doctor profile for this account');
  return d;
}

async function audit(action: 'create' | 'update', link: { id: string }, patientId: string, actorId: string, actorRole: CareParty, meta: RequestMeta) {
  await AuditService.record(action, 'care_link', meta, { actorId, actorRole, resourceId: link.id, patientId });
}

export const CareService = {
  async requestByCode(doctorUserId: string, patientCode: string, message: string | null | undefined, meta: RequestMeta): Promise<void> {
    const doctor = await doctorOf(doctorUserId);
    const patient = await CareModel.patientByCode(patientCode.trim().toUpperCase());
    if (!patient) return;
    if (await CareModel.findOpenBetween(patient.id, doctor.id)) return;

    const link = await CareModel.createLink({ patientId: patient.id, doctorId: doctor.id, initiatedBy: 'doctor', message: cleanMessage(message) });
    await audit('create', link, patient.id, doctorUserId, 'doctor', meta);
    await NotificationService.notify(patient.userId, {
      type: 'care_team',
      title: `${doctorName(doctor)} wants to follow your records`,
      body: 'Approve or decline in Settings, under Care team. Nothing is shared unless you approve.',
      link: '/patient/settings',
    });
    const user = await UserModel.findPublicById(patient.userId);
    if (user) await MailService.sendCareRequestToPatient(user.email, patient.firstName, doctorName(doctor), doctorDetails(doctor), link.message);
  },

  async inviteByEmail(patientUserId: string, emailRaw: string, message: string | null | undefined, meta: RequestMeta, now = new Date()): Promise<void> {
    const patient = await patientOf(patientUserId);
    const email = emailRaw.trim().toLowerCase();
    const note = cleanMessage(message);
    const doctor = await CareModel.doctorByEmail(email);

    if (doctor) {
      if (await CareModel.findOpenBetween(patient.id, doctor.id)) return;
      const link = await CareModel.createLink({ patientId: patient.id, doctorId: doctor.id, initiatedBy: 'patient', message: note });
      await audit('create', link, patient.id, patientUserId, 'patient', meta);
      await NotificationService.notify(doctor.userId, {
        type: 'care_team',
        title: `${patientName(patient)} invited you to follow their records`,
        body: 'Accept or decline under Patients, in Requests.',
        link: '/doctor/dashboard',
      });
      await MailService.sendCareInviteToDoctor(email, patientName(patient), note);
      return;
    }

    if (await UserModel.emailExists(email)) return;

    const token = randomToken();
    const invite = await CareModel.createInvite({
      patientId: patient.id,
      email,
      tokenHash: sha256(token),
      message: note,
      expiresAt: new Date(now.getTime() + INVITE_VALID_DAYS * 86_400_000),
    });
    await AuditService.record('create', 'care_invite', meta, { actorId: patientUserId, actorRole: 'patient', resourceId: invite.id, patientId: patient.id });
    await MailService.sendCareInviteToNewDoctor(email, patientName(patient), token, INVITE_VALID_DAYS, note);
  },

  async act(party: CareParty, userId: string, linkId: string, action: CareAction, meta: RequestMeta, now = new Date()) {
    const self = party === 'doctor' ? await doctorOf(userId) : await patientOf(userId);
    const link = await CareModel.findLink(linkId);
    const mine = link && (party === 'doctor' ? link.doctor.id === self.id : link.patient.id === self.id);
    if (!link || !mine) throw HttpError.notFound('Care team link not found');
    if (!allowedAction(link, party, action)) throw HttpError.conflict('This request has already been answered or ended.');

    const updated = await CareModel.updateLink(link.id, {
      status: NEXT_STATUS[action],
      ...(action === 'end' ? { endedAt: now, endedBy: party } : { respondedAt: now }),
    });
    await audit('update', link, link.patient.id, userId, party, meta);

    const actor = party === 'doctor' ? doctorName(link.doctor) : patientName(link.patient);
    const text = NOTIFY_TEXT[action](actor);
    if (text) {
      const to = other(party) === 'doctor' ? link.doctor.userId : link.patient.userId;
      await NotificationService.notify(to, {
        type: 'care_team',
        ...text,
        link: other(party) === 'doctor' ? '/doctor/dashboard' : '/patient/settings',
      });
    }
    return { id: updated.id, status: updated.status };
  },

  async cancelInvite(patientUserId: string, inviteId: string, meta: RequestMeta): Promise<void> {
    const patient = await patientOf(patientUserId);
    if ((await CareModel.cancelInvite(patient.id, inviteId)) === 0) throw HttpError.notFound('Invitation not found');
    await AuditService.record('update', 'care_invite', meta, { actorId: patientUserId, actorRole: 'patient', resourceId: inviteId, patientId: patient.id });
  },

  async previewInvite(token: string, now = new Date()) {
    const invite = await CareModel.findInviteByHash(sha256(token));
    if (!invite || invite.claimedAt || invite.cancelledAt || invite.expiresAt <= now) {
      throw new HttpError(404, 'invite_unavailable', 'This invitation has expired, was cancelled, or was already used.');
    }
    return invite;
  },

  async claimInvite(doctorUserId: string, token: string, meta: RequestMeta, now = new Date()) {
    const doctor = await doctorOf(doctorUserId);
    const invite = await CareService.previewInvite(token, now);
    const existing = await CareModel.findOpenBetween(invite.patientId, doctor.id);
    let link: { id: string };
    if (!existing) {
      link = await CareModel.claimInvite(invite.id, { patientId: invite.patientId, doctorId: doctor.id, message: invite.message }, now);
    } else {
      link = existing.status === 'active' ? existing : await CareModel.updateLink(existing.id, { status: 'active', respondedAt: now });
      await CareModel.markInviteClaimed(invite.id, now);
    }
    await audit('update', link, invite.patientId, doctorUserId, 'doctor', meta);
    await NotificationService.notify(invite.patient.userId, {
      type: 'care_team',
      title: `${doctorName(doctor)} accepted your invitation`,
      body: 'They can now see your records. Stop sharing any time in Settings, under Care team.',
      link: '/patient/settings',
    });
    return { linkId: link.id, patient: toPatientCard(invite.patient) };
  },

  async forPatient(patientUserId: string, now = new Date()) {
    const patient = await patientOf(patientUserId);
    const [links, invites] = await Promise.all([CareModel.linksForPatient(patient.id), CareModel.openInvitesForPatient(patient.id, now)]);
    const at = (d: Date | null) => d?.toISOString() ?? null;
    return {
      requests: links
        .filter((l) => l.status === 'pending' && l.initiatedBy === 'doctor')
        .map((l) => ({ id: l.id, doctor: toDoctorCard(l.doctor), message: l.message, createdAt: l.createdAt.toISOString() })),
      team: links.filter((l) => l.status === 'active').map((l) => ({ id: l.id, doctor: toDoctorCard(l.doctor), since: at(l.respondedAt) ?? l.createdAt.toISOString() })),
      waiting: [
        ...links
          .filter((l) => l.status === 'pending' && l.initiatedBy === 'patient')
          .map((l) => ({ id: l.id, kind: 'link' as const, label: doctorName(l.doctor), createdAt: l.createdAt.toISOString(), expiresAt: null })),
        ...invites.map((i) => ({ id: i.id, kind: 'invite' as const, label: i.email, createdAt: i.createdAt.toISOString(), expiresAt: i.expiresAt.toISOString() })),
      ],
    };
  },

  async forDoctor(doctorUserId: string) {
    const doctor = await doctorOf(doctorUserId);
    const links = await CareModel.linksForDoctor(doctor.id);
    return {
      requests: links
        .filter((l) => l.status === 'pending' && l.initiatedBy === 'patient')
        .map((l) => ({ id: l.id, patient: toPatientCard(l.patient), message: l.message, createdAt: l.createdAt.toISOString() })),
      waiting: links
        .filter((l) => l.status === 'pending' && l.initiatedBy === 'doctor')
        .map((l) => ({ id: l.id, patientCode: l.patient.patientCode, createdAt: l.createdAt.toISOString() })),
      patients: links
        .filter((l) => l.status === 'active')
        .map((l) => ({ id: l.id, patient: toPatientCard(l.patient), since: (l.respondedAt ?? l.createdAt).toISOString() })),
    };
  },

  async assertActiveLink(doctorUserId: string, patientId: string): Promise<void> {
    const doctor = await CareModel.doctorByUserId(doctorUserId);
    if (!doctor || !(await CareModel.isActive(doctor.id, patientId))) throw HttpError.notFound('Patient not found');
  },
};
