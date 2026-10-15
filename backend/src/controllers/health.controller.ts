import type { Request, Response } from 'express';
import { HealthService } from '../services/health.service.js';

/**
 * Controller layer: reads the request, calls a service, sends JSON.
 * Success responses are always { data, meta? }.
 * No database access and no business rules here. Express 5 forwards thrown or
 * rejected errors to the error handler, so no try/catch is needed.
 */
export const HealthController = {
  api(_req: Request, res: Response) {
    res.json({ data: HealthService.getApiStatus() });
  },

  async db(_req: Request, res: Response) {
    res.json({ data: await HealthService.getDbStatus() });
  },
};
