import { createHash, createHmac, randomBytes, randomInt } from 'node:crypto';

export function randomToken(): string {
  return randomBytes(32).toString('base64url');
}

export function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function hashIp(ip: string | undefined, salt: string): string | undefined {
  if (!ip) return undefined;
  return createHmac('sha256', salt).update(ip).digest('hex').slice(0, 32);
}

export function generatePatientCode(): string {
  return `KW-${randomInt(0, 1_000_000).toString().padStart(6, '0')}`;
}
