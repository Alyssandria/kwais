import { afterEach, describe, expect, it, vi } from 'vitest';
import { HealthService } from '../../src/services/health.service.js';
import { HealthModel } from '../../src/models/health.model.js';
import { HttpError } from '../../src/lib/http-error.js';

describe('HealthService', () => {
  afterEach(() => vi.restoreAllMocks());

  it('reports latency when the database answers', async () => {
    vi.spyOn(HealthModel, 'ping').mockResolvedValue();
    const status = await HealthService.getDbStatus();
    expect(status.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it('turns a database failure into a 503 HttpError', async () => {
    vi.spyOn(HealthModel, 'ping').mockRejectedValue(new Error('connection refused'));
    await expect(HealthService.getDbStatus()).rejects.toMatchObject({
      status: 503,
      code: 'db_unreachable',
    } satisfies Partial<HttpError>);
  });
});
