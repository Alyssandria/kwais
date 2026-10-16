import { randomBytes } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { decryptField, encryptField, FieldCryptoError, parseKey } from '../../src/lib/field-crypto.js';

const k1 = parseKey(randomBytes(32).toString('base64'), 1);
const k2 = parseKey(randomBytes(32).toString('base64'), 2);

describe('field encryption', () => {
  it('round-trips a value', () => {
    const blob = encryptField('5.6', 'patient-1:value', k1);
    expect(decryptField(blob, 'patient-1:value', [k1])).toBe('5.6');
  });

  it('never stores the plain value and uses a fresh IV each time', () => {
    const a = encryptField('5.6', 'p:value', k1);
    const b = encryptField('5.6', 'p:value', k1);
    expect(a.toString('latin1')).not.toContain('5.6');
    expect(a.equals(b)).toBe(false);
  });

  it('refuses a value moved to another patient or column', () => {
    const blob = encryptField('5.6', 'patient-1:value', k1);
    expect(() => decryptField(blob, 'patient-2:value', [k1])).toThrow(FieldCryptoError);
    expect(() => decryptField(blob, 'patient-1:ref_high', [k1])).toThrow(FieldCryptoError);
  });

  it('detects tampering', () => {
    const blob = encryptField('5.6', 'p:value', k1);
    const last = blob.length - 1;
    blob.writeUInt8(blob.readUInt8(last) ^ 0xff, last);
    expect(() => decryptField(blob, 'p:value', [k1])).toThrow(/integrity/);
  });

  it('keeps old rows readable after key rotation', () => {
    const old = encryptField('1.9', 'p:value', k1);
    expect(decryptField(old, 'p:value', [k2, k1])).toBe('1.9');
    expect(() => decryptField(old, 'p:value', [k2])).toThrow(/No key/);
  });

  it('rejects keys of the wrong length', () => {
    expect(() => parseKey(randomBytes(16).toString('base64'), 1)).toThrow(FieldCryptoError);
  });
});
