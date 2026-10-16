import { createHmac, timingSafeEqual } from 'node:crypto';

const ISSUER = 'kwais-api';
const AUDIENCE = 'kwais-web';
const CLOCK_SKEW_S = 30;

export interface AccessClaims {
  sub: string;
  role: 'patient' | 'doctor';
}

interface FullClaims extends AccessClaims {
  iss: string;
  aud: string;
  iat: number;
  nbf: number;
  exp: number;
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

function sign(input: string, secret: string) {
  return createHmac('sha256', secret).update(input).digest();
}

export function signAccessToken(claims: AccessClaims, secret: string, ttlSeconds: number, now = Date.now()): string {
  const iat = Math.floor(now / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = b64url(
    JSON.stringify({ ...claims, iss: ISSUER, aud: AUDIENCE, iat, nbf: iat, exp: iat + ttlSeconds } satisfies FullClaims),
  );
  const signature = b64url(sign(`${header}.${payload}`, secret));
  return `${header}.${payload}.${signature}`;
}

export class TokenError extends Error {
  constructor(public readonly reason: 'malformed' | 'signature' | 'expired' | 'claims') {
    super(`Invalid token: ${reason}`);
  }
}

export function verifyAccessToken(token: string, secret: string, now = Date.now()): AccessClaims {
  const parts = token.split('.');
  if (parts.length !== 3) throw new TokenError('malformed');
  const [h, p, s] = parts as [string, string, string];

  let header: { alg?: string };
  let payload: Partial<FullClaims>;
  try {
    header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    throw new TokenError('malformed');
  }
  if (header.alg !== 'HS256') throw new TokenError('malformed');

  const expected = sign(`${h}.${p}`, secret);
  const given = Buffer.from(s, 'base64url');
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) throw new TokenError('signature');

  const nowS = Math.floor(now / 1000);
  if (typeof payload.exp !== 'number' || nowS > payload.exp + CLOCK_SKEW_S) throw new TokenError('expired');
  if (typeof payload.nbf === 'number' && nowS + CLOCK_SKEW_S < payload.nbf) throw new TokenError('claims');
  if (payload.iss !== ISSUER || payload.aud !== AUDIENCE) throw new TokenError('claims');
  if (typeof payload.sub !== 'string' || (payload.role !== 'patient' && payload.role !== 'doctor')) {
    throw new TokenError('claims');
  }
  return { sub: payload.sub, role: payload.role };
}
