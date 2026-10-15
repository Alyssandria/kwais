import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

/**
 * Field-level encryption for lab results (AES-256-GCM).
 *
 * Stored blob: [1 byte key version][12 byte IV][16 byte auth tag][ciphertext]
 *
 * Each value is bound to its context (patient id + field name) as additional authenticated
 * data, so a ciphertext copied into another patient's row, or into another column, fails to
 * decrypt instead of showing the wrong value.
 *
 * This protects data at rest (database dumps, backups). It does not take the data outside the
 * Data Privacy Act: the application can still read it, so it remains personal information.
 */

const IV_LEN = 12;
const TAG_LEN = 16;

export interface FieldKey {
  version: number;
  key: Buffer;
}

export class FieldCryptoError extends Error {}

/** Parses LAB_ENCRYPTION_KEY (base64, 32 bytes). */
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
  return Buffer.concat([Buffer.from([k.version]), iv, cipher.getAuthTag(), ct]);
}

/** `keys` lets old rows keep decrypting after a key rotation. */
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
