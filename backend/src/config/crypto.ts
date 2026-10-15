import { parseKey, type FieldKey } from '../lib/field-crypto.js';
import { env } from './env.js';

/** Current lab-encryption key, used for every new write. */
export const currentLabKey: FieldKey = parseKey(env.LAB_ENCRYPTION_KEY, env.LAB_ENCRYPTION_KEY_VERSION);

/** All keys that may decrypt: current first, then the previous one during a rotation. */
export const labKeys: FieldKey[] = [
  currentLabKey,
  ...(env.LAB_ENCRYPTION_KEY_PREVIOUS && env.LAB_ENCRYPTION_KEY_PREVIOUS_VERSION
    ? [parseKey(env.LAB_ENCRYPTION_KEY_PREVIOUS, env.LAB_ENCRYPTION_KEY_PREVIOUS_VERSION)]
    : []),
];
