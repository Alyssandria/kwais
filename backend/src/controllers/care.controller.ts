import type { Request, Response } from 'express';
import type { CareParty } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { CareActionParam, type CareInviteBody, type CareRequestBody } from '../schemas/care.schemas.js';
import { requestMeta } from '../services/audit.service.js';
import { CareService } from '../services/care.service.js';

const userIdOf = (req: Request) => {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth.userId;
};

const param = (req: Request, name: string) => {
  const v = req.params[name];
  if (typeof v !== 'string' || !v) throw HttpError.notFound();
  return v;
};

function actionOf(req: Request) {
  const parsed = CareActionParam.safeParse(req.params.action);
  if (!parsed.success) throw HttpError.notFound();
  return parsed.data;
}

const act = (party: CareParty) => async (req: Request, res: Response) => {
  res.json({ data: await CareService.act(party, userIdOf(req), param(req, 'id'), actionOf(req), requestMeta(req)) });
};

export const PatientCareController = {
  async overview(req: Request, res: Response) {
    res.json({ data: await CareService.forPatient(userIdOf(req)) });
  },
  async invite(req: Request, res: Response) {
    const body = req.body as CareInviteBody;
    await CareService.inviteByEmail(userIdOf(req), body.email, body.message, requestMeta(req));
    res.status(202).json({ data: { message: 'Invitation sent. Sharing starts once your doctor accepts.' } });
  },
  async cancelInvite(req: Request, res: Response) {
    await CareService.cancelInvite(userIdOf(req), param(req, 'id'), requestMeta(req));
    res.status(204).end();
  },
  act: act('patient'),
};

export const DoctorCareController = {
  async overview(req: Request, res: Response) {
    res.json({ data: await CareService.forDoctor(userIdOf(req)) });
  },
  async request(req: Request, res: Response) {
    const body = req.body as CareRequestBody;
    await CareService.requestByCode(userIdOf(req), body.patientCode, body.message, requestMeta(req));
    res.status(202).json({ data: { message: 'Request sent. The patient sees it next time they open K-WAIS.' } });
  },
  async previewInvite(req: Request, res: Response) {
    const invite = await CareService.previewInvite(param(req, 'token'));
    res.json({ data: { patientName: `${invite.patient.firstName} ${invite.patient.lastName}`, message: invite.message, expiresAt: invite.expiresAt.toISOString() } });
  },
  async claimInvite(req: Request, res: Response) {
    res.json({ data: await CareService.claimInvite(userIdOf(req), String(req.body.token), requestMeta(req)) });
  },
  act: act('doctor'),
};
