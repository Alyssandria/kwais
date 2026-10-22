import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const limiter = (windowMs: number, limit: number, message: string, perUser = false) =>
  rateLimit({
    windowMs,
    limit,
    ...(perUser ? { keyGenerator: (req) => req.auth?.userId ?? req.ip ?? 'unknown' } : {}),
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    handler: (_req, res) => {
      res.status(429).json({ error: { code: 'rate_limited', message } });
    },
  });

export const credentialLimiter = limiter(15 * 60 * 1000, env.AUTH_ATTEMPTS_PER_15_MIN, 'Too many attempts. Wait a few minutes and try again.');

export const exportLimiter = limiter(60 * 60 * 1000, 5, 'You can download your data 5 times an hour. Try again later.');

export const careRequestLimiter = limiter(60 * 60 * 1000, 10, 'You can send 10 care team requests an hour. Try again later.', true);
