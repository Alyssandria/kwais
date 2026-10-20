import type { Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import { ActivityQuery, type DeleteAccountBody } from '../schemas/privacy.schemas.js';
import { requestMeta } from '../services/audit.service.js';
import { PrivacyService } from '../services/privacy.service.js';
import { REFRESH_COOKIE, refreshCookieOptions } from './auth.controller.js';

const userIdOf = (req: Request) => {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth.userId;
};

export const PrivacyController = {
  async exportData(req: Request, res: Response) {
    const { filename, body } = await PrivacyService.exportData(userIdOf(req), requestMeta(req));
    res.set('Cache-Control', 'no-store');
    res.attachment(filename);
    res.type('application/json').send(JSON.stringify(body, null, 2));
  },

  async activity(req: Request, res: Response) {
    const parsed = ActivityQuery.safeParse(req.query);
    if (!parsed.success) throw HttpError.badRequest('limit must be between 1 and 200');
    res.json({ data: await PrivacyService.activity(userIdOf(req), parsed.data.limit) });
  },

  async deleteAccount(req: Request, res: Response) {
    const body = req.body as DeleteAccountBody;
    await PrivacyService.deleteAccount(userIdOf(req), body.password, requestMeta(req));
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    res.status(204).end();
  },
};
