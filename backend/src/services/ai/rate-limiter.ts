import { AiError } from './types.js';

const WINDOW_MS = 60_000;

export interface RateLimiter {
  acquire(): Promise<void>;
  pauseFor(ms: number): void;
}

export interface RateLimiterOptions {
  perMinute: number;
  maxWaitMs: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

export function createRateLimiter(opts: RateLimiterOptions): RateLimiter {
  const now = opts.now ?? Date.now;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const starts: number[] = [];
  let pausedUntil = 0;
  let queue: Promise<void> = Promise.resolve();

  async function take(deadline: number) {
    for (;;) {
      const t = now();
      while (starts.length && starts[0]! <= t - WINDOW_MS) starts.shift();
      const freeAt = Math.max(pausedUntil, starts.length >= opts.perMinute ? starts[0]! + WINDOW_MS : 0);
      if (freeAt <= t) {
        starts.push(t);
        return;
      }
      if (freeAt > deadline) {
        const seconds = Math.ceil((freeAt - t) / 1000);
        throw new AiError('rate_limited', `The AI service is busy. Try again in about ${seconds} seconds.`);
      }
      await sleep(freeAt - t);
    }
  }

  return {
    acquire() {
      const deadline = now() + opts.maxWaitMs;
      const turn = queue.then(() => take(deadline));
      queue = turn.catch(() => undefined);
      return turn;
    },
    pauseFor(ms: number) {
      pausedUntil = Math.max(pausedUntil, now() + ms);
    },
  };
}
