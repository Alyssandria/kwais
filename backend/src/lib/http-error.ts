export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = 'HttpError';
  }

  static badRequest(message = 'Bad request', details?: unknown) {
    return new HttpError(400, 'bad_request', message, details);
  }
  static unauthorized(message = 'Sign in required') {
    return new HttpError(401, 'unauthorized', message);
  }
  static forbidden(message = 'You do not have access to this resource') {
    return new HttpError(403, 'forbidden', message);
  }
  static notFound(message = 'Not found') {
    return new HttpError(404, 'not_found', message);
  }
  static conflict(message: string) {
    return new HttpError(409, 'conflict', message);
  }
}
