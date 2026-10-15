import { HealthModel } from '../models/health.model.js';
import { HttpError } from '../lib/http-error.js';

/**
 * Service layer: business logic. Uses models for data, throws HttpError for
 * expected failures, and knows nothing about req/res.
 */

export interface ApiStatus {
  status: 'ok';
  service: string;
  time: string;
}

export interface DbStatus {
  status: 'ok';
  database: 'reachable';
  latencyMs: number;
}

export const HealthService = {
  getApiStatus(): ApiStatus {
    return { status: 'ok', service: 'kwais-api', time: new Date().toISOString() };
  },

  async getDbStatus(): Promise<DbStatus> {
    const started = performance.now();
    try {
      await HealthModel.ping();
    } catch {
      throw new HttpError(503, 'db_unreachable', 'Database is not reachable. Is `docker compose up -d db` running?');
    }
    return { status: 'ok', database: 'reachable', latencyMs: Math.round(performance.now() - started) };
  },
};
