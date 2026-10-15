import { clsx, type ClassValue } from 'clsx';

/** Joins class names, skipping falsy values: cn('a', cond && 'b'). */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
