import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';

/** 256-bit random token for refresh cookies and password-reset links. */
export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

/** Tokens are stored as SHA-256 hashes, so a database leak does not leak usable tokens. */
export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

/** Salted hash of an IP for audit logs: lets us spot repeated abuse without storing the address. */
export function hashIp(ip: string | undefined, salt: string): string | undefined {
  if (!ip) return undefined;
  return createHmac('sha256', salt).update(ip).digest('hex').slice(0, 32);
}

/** Patient code shown to the patient and, in v1, given to their doctor. Format KW-123456. */
export function generatePatientCode(): string {
  return `KW-${randomInt(0, 1_000_000).toString().padStart(6, '0')}`;
}
