import type { RequestHandler } from 'express';
import type { ZodTypeAny } from 'zod';

/**
 * Validates req.body against a Zod schema and replaces it with the parsed value
 * (trimmed, defaults applied, unknown keys dropped). Failures go to the error
 * handler as 400 validation_failed with per-field messages.
 */
export function validateBody(schema: ZodTypeAny): RequestHandler {
  return (req, _res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) return next(result.error);
    req.body = result.data;
    next();
  };
}
