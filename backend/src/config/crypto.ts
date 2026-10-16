import { parseKey, type FieldKey } from '../lib/field-crypto.js';
import { env } from './env.js';

export const currentLabKey: FieldKey = parseKey(env.LAB_ENCRYPTION_KEY, env.LAB_ENCRYPTION_KEY_VERSION);

export const labKeys: FieldKey[] = [
  currentLabKey,
  ...(env.LAB_ENCRYPTION_KEY_PREVIOUS && env.LAB_ENCRYPTION_KEY_PREVIOUS_VERSION
    ? [parseKey(env.LAB_ENCRYPTION_KEY_PREVIOUS, env.LAB_ENCRYPTION_KEY_PREVIOUS_VERSION)]
    : []),
];
