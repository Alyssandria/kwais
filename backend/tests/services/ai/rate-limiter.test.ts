import { describe, expect, it } from 'vitest';
import { createRateLimiter } from '../../../src/services/ai/rate-limiter.js';

function clock() {
  const c = { t: 0, sleeps: [] as number[] };
  return {
    c,
    now: () => c.t,
    sleep: async (ms: number) => {
      c.sleeps.push(ms);
      c.t += ms;
    },
  };
}

describe('rate limiter', () => {
  it('lets requests through until the minute is full, then waits for the oldest to expire', async () => {
    const { c, now, sleep } = clock();
    const limiter = createRateLimiter({ perMinute: 2, maxWaitMs: 120_000, now, sleep });

    await limiter.acquire();
    c.t = 10_000;
    await limiter.acquire();
    await limiter.acquire();

    expect(c.sleeps).toEqual([50_000]);
    expect(c.t).toBe(60_000);
  });

  it('serves waiting callers in order', async () => {
    const { now, sleep } = clock();
    const limiter = createRateLimiter({ perMinute: 1, maxWaitMs: 300_000, now, sleep });
    const order: number[] = [];
    await Promise.all([1, 2, 3].map((n) => limiter.acquire().then(() => order.push(n))));
    expect(order).toEqual([1, 2, 3]);
  });

  it('gives up with rate_limited when the wait would be longer than allowed', async () => {
    const { now, sleep } = clock();
    const limiter = createRateLimiter({ perMinute: 1, maxWaitMs: 5_000, now, sleep });
    await limiter.acquire();
    await expect(limiter.acquire()).rejects.toMatchObject({ code: 'rate_limited' });
    await expect(limiter.acquire()).rejects.toMatchObject({ code: 'rate_limited' });
  });

  it('holds everyone back after a pause', async () => {
    const { c, now, sleep } = clock();
    const limiter = createRateLimiter({ perMinute: 100, maxWaitMs: 30_000, now, sleep });
    limiter.pauseFor(7_000);
    await limiter.acquire();
    expect(c.t).toBe(7_000);
  });
});
