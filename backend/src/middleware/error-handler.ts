import type { ErrorRequestHandler, RequestHandler, Response } from 'express';
import { ZodError } from 'zod';
import { HttpError } from '../lib/http-error.js';
import { isProd } from '../config/env.js';

function sendError(res: Response, status: number, code: string, message: string, details?: unknown) {
  res.status(status).json({ error: details === undefined ? { code, message } : { code, message, details } });
}

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(HttpError.notFound(`No route for ${req.method} ${req.path}`));
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof HttpError) {
    sendError(res, err.status, err.code, err.message, err.details);
    return;
  }

  if (err instanceof ZodError) {
    sendError(
      res,
      400,
      'validation_failed',
      'Some fields are invalid',
      err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
    );
    return;
  }

  if (err instanceof SyntaxError && 'body' in err) {
    sendError(res, 400, 'invalid_json', 'Request body is not valid JSON');
    return;
  }

  console.error(err);
  sendError(
    res,
    500,
    'internal_error',
    'Something went wrong on our side',
    isProd ? undefined : String(err?.message ?? err),
  );
};
