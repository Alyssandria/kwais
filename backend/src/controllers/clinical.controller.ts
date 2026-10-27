import type { Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import { patientIdOf } from '../middleware/require-patient.js';
import type { NoteBody, StageBody } from '../schemas/clinical.schemas.js';
import { NutrientParam, type LabCreate, type LabUpdate, type TargetBody } from '../schemas/patient.schemas.js';
import { requestMeta } from '../services/audit.service.js';
import { ClinicalService } from '../services/clinical.service.js';
import { NoteService } from '../services/note.service.js';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const userIdOf = (req: Request) => {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth.userId;
};

function idParam(req: Request, what: string): string {
  const id = String(req.params.id);
  if (!UUID.test(id)) throw HttpError.notFound(`${what} not found`);
  return id;
}

function nutrientParam(req: Request) {
  const parsed = NutrientParam.safeParse(req.params.nutrient);
  if (!parsed.success) throw HttpError.notFound('Unknown nutrient');
  return parsed.data;
}

export const ClinicalController = {
  async setStage(req: Request, res: Response) {
    res.json({ data: await ClinicalService.setStage(userIdOf(req), patientIdOf(req), (req.body as StageBody).ckdStage, requestMeta(req)) });
  },
  async setTarget(req: Request, res: Response) {
    res.json({ data: await ClinicalService.setTarget(userIdOf(req), patientIdOf(req), nutrientParam(req), req.body as TargetBody, requestMeta(req)) });
  },
  async addLab(req: Request, res: Response) {
    res.status(201).json({ data: await ClinicalService.addLab(userIdOf(req), patientIdOf(req), req.body as LabCreate, requestMeta(req)) });
  },
  async correctLab(req: Request, res: Response) {
    const id = idParam(req, 'Lab result');
    res.json({ data: await ClinicalService.correctLab(userIdOf(req), patientIdOf(req), id, req.body as LabUpdate, requestMeta(req)) });
  },
  async verifyLab(req: Request, res: Response) {
    res.json({ data: await ClinicalService.verifyLab(userIdOf(req), patientIdOf(req), idParam(req, 'Lab result'), requestMeta(req)) });
  },
  async notes(req: Request, res: Response) {
    res.json({ data: await ClinicalService.notes(userIdOf(req), patientIdOf(req)) });
  },
  async addNote(req: Request, res: Response) {
    res.status(201).json({ data: await ClinicalService.addNote(userIdOf(req), patientIdOf(req), (req.body as NoteBody).body, requestMeta(req)) });
  },
  async editNote(req: Request, res: Response) {
    const id = idParam(req, 'Note');
    res.json({ data: await ClinicalService.editNote(userIdOf(req), patientIdOf(req), id, (req.body as NoteBody).body, requestMeta(req)) });
  },
  async removeNote(req: Request, res: Response) {
    await ClinicalService.removeNote(userIdOf(req), patientIdOf(req), idParam(req, 'Note'), requestMeta(req));
    res.status(204).end();
  },
};

export const PatientNotesController = {
  async list(req: Request, res: Response) {
    res.json({ data: await NoteService.list(patientIdOf(req)) });
  },
};
