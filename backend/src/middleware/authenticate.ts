import type { RequestHandler } from 'express';
import type { Role } from '@prisma/client';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import { TokenError, verifyAccessToken } from '../lib/jwt.js';

/** Requires `Authorization: Bearer <access token>`. Sets req.auth. */
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.get('authorization');
  const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  if (!token) return next(HttpError.unauthorized());

  try {
    const claims = verifyAccessToken(token, env.JWT_ACCESS_SECRET);
    req.auth = { userId: claims.sub, role: claims.role };
    next();
  } catch (err) {
    if (err instanceof TokenError && err.reason === 'expired') {
      return next(new HttpError(401, 'token_expired', 'Your session needs refreshing'));
    }
    next(HttpError.unauthorized());
  }
};

/** Allows only the listed roles. Use after authenticate. */
export function requireRole(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.auth) return next(HttpError.unauthorized());
    if (!roles.includes(req.auth.role)) return next(HttpError.forbidden());
    next();
  };
}
