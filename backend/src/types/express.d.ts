import type { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      /** Set by the authenticate middleware for signed-in requests. */
      auth?: { userId: string; role: Role };
    }
  }
}

export {};
