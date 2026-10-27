import { HttpError } from '../lib/http-error.js';
import { NoteModel, type NoteRecord } from '../models/note.model.js';
import { AuditService, type RequestMeta } from './audit.service.js';
import { doctorDisplayName, type Clinician } from './verification.js';

export interface NoteView {
  id: string;
  body: string;
  author: string | null;
  createdAt: string;
  updatedAt: string;
  edited: boolean;
  mine: boolean;
}

function toView(n: NoteRecord, viewerDoctorId: string | null): NoteView {
  return {
    id: n.id,
    body: n.body,
    author: n.author ? doctorDisplayName(n.author) : null,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    edited: n.updatedAt.getTime() - n.createdAt.getTime() > 1000,
    mine: viewerDoctorId != null && n.authorId === viewerDoctorId,
  };
}

async function ownNote(patientId: string, id: string, clinician: Clinician): Promise<NoteRecord> {
  const note = await NoteModel.find(patientId, id);
  if (!note) throw HttpError.notFound('Note not found');
  if (note.authorId !== clinician.doctorId) throw HttpError.forbidden('You can only change your own notes');
  return note;
}

export const NoteService = {
  async list(patientId: string, viewerDoctorId: string | null = null): Promise<NoteView[]> {
    return (await NoteModel.list(patientId)).map((n) => toView(n, viewerDoctorId));
  },

  async create(patientId: string, body: string, clinician: Clinician, meta: RequestMeta): Promise<NoteView> {
    const note = await NoteModel.create(patientId, clinician.doctorId, body);
    await AuditService.record('create', 'clinical_note', meta, { actorId: clinician.userId, actorRole: 'doctor', resourceId: note.id, patientId });
    return toView(note, clinician.doctorId);
  },

  async update(patientId: string, id: string, body: string, clinician: Clinician, meta: RequestMeta): Promise<NoteView> {
    await ownNote(patientId, id, clinician);
    const note = await NoteModel.update(id, body);
    await AuditService.record('update', 'clinical_note', meta, { actorId: clinician.userId, actorRole: 'doctor', resourceId: id, patientId });
    return toView(note, clinician.doctorId);
  },

  async remove(patientId: string, id: string, clinician: Clinician, meta: RequestMeta): Promise<void> {
    await ownNote(patientId, id, clinician);
    await NoteModel.delete(id);
    await AuditService.record('delete', 'clinical_note', meta, { actorId: clinician.userId, actorRole: 'doctor', resourceId: id, patientId });
  },
};
