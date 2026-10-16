import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const IV_LEN = 12;
const TAG_LEN = 16;

export interface FieldKey {
  version: number;
  key: Buffer;
}

export class FieldCryptoError extends Error {}

export function parseKey(base64: string, version: number): FieldKey {
  const key = Buffer.from(base64, 'base64');
  if (key.length !== 32) throw new FieldCryptoError('LAB_ENCRYPTION_KEY must be 32 bytes, base64-encoded');
  if (!Number.isInteger(version) || version < 1 || version > 255) {
    throw new FieldCryptoError('LAB_ENCRYPTION_KEY_VERSION must be between 1 and 255');
  }
  return { version, key };
}

export function encryptField(plain: string, context: string, k: FieldKey): Buffer {
  const iv = randomBytes(IV_LEN);
  const cipher = createCipheriv('aes-256-gcm', k.key, iv);
  cipher.setAAD(Buffer.from(context, 'utf8'));
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  // [key version][iv][auth tag][ciphertext]
  return Buffer.concat([Buffer.from([k.version]), iv, cipher.getAuthTag(), ct]);
}

export function decryptField(blob: Uint8Array, context: string, keys: FieldKey[]): string {
  const buf = Buffer.from(blob);
  if (buf.length < 1 + IV_LEN + TAG_LEN) throw new FieldCryptoError('Encrypted value is too short');
  const version = buf[0];
  const k = keys.find((x) => x.version === version);
  if (!k) throw new FieldCryptoError(`No key for encryption version ${version}`);
  const iv = buf.subarray(1, 1 + IV_LEN);
  const tag = buf.subarray(1 + IV_LEN, 1 + IV_LEN + TAG_LEN);
  const ct = buf.subarray(1 + IV_LEN + TAG_LEN);
  try {
    const decipher = createDecipheriv('aes-256-gcm', k.key, iv);
    decipher.setAAD(Buffer.from(context, 'utf8'));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8');
  } catch {
    throw new FieldCryptoError('Encrypted value failed integrity check');
  }
}
