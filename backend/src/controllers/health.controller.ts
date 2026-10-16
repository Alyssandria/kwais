import type { Request, Response } from 'express';
import { HealthService } from '../services/health.service.js';

export const HealthController = {
  api(_req: Request, res: Response) {
    res.json({ data: HealthService.getApiStatus() });
  },

  async db(_req: Request, res: Response) {
    res.json({ data: await HealthService.getDbStatus() });
  },
};
