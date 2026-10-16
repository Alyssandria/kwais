import type { Request, Response } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http-error.js';
import { patientIdOf } from '../middleware/require-patient.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { DashboardService } from '../services/dashboard.service.js';
import { NotificationService } from '../services/notification.service.js';

const RangeQuery = z.object({
  range: z.enum(['7', '30', '90']).default('30').transform((r) => Number(r) as 7 | 30 | 90),
});

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const userIdOf = (req: Request) => {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth.userId;
};

export const DashboardController = {
  async patient(req: Request, res: Response) {
    res.json({ data: await DashboardService.forPatient(patientIdOf(req)) });
  },
};

export const AnalyticsController = {
  async me(req: Request, res: Response) {
    const { range } = RangeQuery.parse(req.query);
    res.json({ data: await AnalyticsService.forPatient(patientIdOf(req), range) });
  },
};

export const NotificationController = {
  async list(req: Request, res: Response) {
    const { items, unread } = await NotificationService.list(userIdOf(req));
    res.json({ data: items, meta: { unread } });
  },
  async read(req: Request, res: Response) {
    const id = String(req.params.id);
    if (!UUID.test(id)) throw HttpError.notFound('Notification not found');
    await NotificationService.markRead(userIdOf(req), id);
    res.status(204).end();
  },
  async readAll(req: Request, res: Response) {
    res.json({ data: { marked: await NotificationService.markAllRead(userIdOf(req)) } });
  },
};
