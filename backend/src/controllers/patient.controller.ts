import type { Request, Response } from 'express';
import type { LabTest, Nutrient } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { patientIdOf } from '../middleware/require-patient.js';
import {
  LAB_TESTS,
  NutrientParam,
  type ConsentChange,
  type LabCreate,
  type LabUpdate,
  type ProfileUpdate,
  type TargetBody,
} from '../schemas/patient.schemas.js';
import { requestMeta } from '../services/audit.service.js';
import { ConsentService } from '../services/consent.service.js';
import { LabService } from '../services/lab.service.js';
import { ProfileService } from '../services/profile.service.js';
import { TargetService } from '../services/target.service.js';

const userIdOf = (req: Request) => {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth.userId;
};

function nutrientParam(req: Request): Nutrient {
  const parsed = NutrientParam.safeParse(req.params.nutrient);
  if (!parsed.success) throw HttpError.notFound('Unknown nutrient');
  return parsed.data;
}

function labTestQuery(req: Request): LabTest | undefined {
  const t = req.query.test;
  if (t === undefined) return undefined;
  if (typeof t !== 'string' || !(t in LAB_TESTS)) throw HttpError.badRequest('Unknown lab test');
  return t as LabTest;
}

export const ProfileController = {
  async get(req: Request, res: Response) {
    res.json({ data: await ProfileService.get(patientIdOf(req)) });
  },
  async update(req: Request, res: Response) {
    res.json({ data: await ProfileService.update(patientIdOf(req), req.body as ProfileUpdate, userIdOf(req), requestMeta(req)) });
  },
  async completeOnboarding(req: Request, res: Response) {
    res.json({ data: await ProfileService.completeOnboarding(patientIdOf(req), userIdOf(req), requestMeta(req)) });
  },
};

export const TargetController = {
  async list(req: Request, res: Response) {
    res.json({ data: await TargetService.listActive(patientIdOf(req)) });
  },
  async set(req: Request, res: Response) {
    res.json({
      data: await TargetService.set(patientIdOf(req), nutrientParam(req), req.body as TargetBody, userIdOf(req), requestMeta(req)),
    });
  },
  async remove(req: Request, res: Response) {
    await TargetService.remove(patientIdOf(req), nutrientParam(req), userIdOf(req), requestMeta(req));
    res.status(204).end();
  },
};

export const LabController = {
  async list(req: Request, res: Response) {
    res.json({ data: await LabService.list(patientIdOf(req), labTestQuery(req)) });
  },
  async create(req: Request, res: Response) {
    res.status(201).json({ data: await LabService.create(patientIdOf(req), req.body as LabCreate, userIdOf(req), requestMeta(req)) });
  },
  async update(req: Request, res: Response) {
    res.json({
      data: await LabService.update(patientIdOf(req), String(req.params.id), req.body as LabUpdate, userIdOf(req), requestMeta(req)),
    });
  },
  async remove(req: Request, res: Response) {
    await LabService.remove(patientIdOf(req), String(req.params.id), userIdOf(req), requestMeta(req));
    res.status(204).end();
  },
};

export const ConsentController = {
  async current(req: Request, res: Response) {
    res.json({ data: await ConsentService.current(userIdOf(req)) });
  },
  async change(req: Request, res: Response) {
    res.json({ data: await ConsentService.change(userIdOf(req), req.body as ConsentChange, requestMeta(req)) });
  },
};
