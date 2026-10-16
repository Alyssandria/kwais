import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from '../../src/lib/password.js';
import { signAccessToken, TokenError, verifyAccessToken } from '../../src/lib/jwt.js';
import { generatePatientCode, randomToken, sha256 } from '../../src/lib/tokens.js';

const SECRET = 'test-secret-that-is-long-enough-for-hs256-123';

describe('password hashing', () => {
  it('verifies the right password and rejects the wrong one', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash.startsWith('scrypt$')).toBe(true);
    expect(await verifyPassword('correct horse battery', hash)).toBe(true);
    expect(await verifyPassword('wrong password', hash)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same')).not.toBe(await hashPassword('same'));
  });

  it('rejects malformed stored values', async () => {
    expect(await verifyPassword('x', 'not-a-hash')).toBe(false);
  });
});

describe('access tokens', () => {
  const claims = { sub: 'user-1', role: 'patient' as const };

  it('round-trips claims', () => {
    const t = signAccessToken(claims, SECRET, 900);
    expect(verifyAccessToken(t, SECRET)).toEqual(claims);
  });

  it('rejects a tampered payload', () => {
    const [h, , s] = signAccessToken(claims, SECRET, 900).split('.');
    const forged = Buffer.from(JSON.stringify({ ...claims, role: 'doctor', exp: 9e9 })).toString('base64url');
    expect(() => verifyAccessToken(`${h}.${forged}.${s}`, SECRET)).toThrow(TokenError);
  });

  it('rejects the wrong secret', () => {
    const t = signAccessToken(claims, SECRET, 900);
    expect(() => verifyAccessToken(t, SECRET + 'x')).toThrowError(/signature/);
  });

  it('rejects an expired token', () => {
    const t = signAccessToken(claims, SECRET, 900, Date.now() - 3600_000);
    expect(() => verifyAccessToken(t, SECRET)).toThrowError(/expired/);
  });

  it('rejects alg none', () => {
    const h = Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url');
    const p = Buffer.from(JSON.stringify({ ...claims, exp: 9e9 })).toString('base64url');
    expect(() => verifyAccessToken(`${h}.${p}.`, SECRET)).toThrow(TokenError);
  });
});

describe('token helpers', () => {
  it('makes unguessable tokens and stable hashes', () => {
    expect(randomToken()).not.toBe(randomToken());
    expect(sha256('abc')).toBe(sha256('abc'));
    expect(sha256('abc')).toHaveLength(64);
  });

  it('formats patient codes', () => {
    expect(generatePatientCode()).toMatch(/^KW-\d{6}$/);
  });
});
