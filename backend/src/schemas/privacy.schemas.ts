import { z } from 'zod';

export const DeleteAccountSchema = z.object({
  password: z.string().min(1, 'Enter your password').max(128),
  confirm: z.literal('DELETE', { errorMap: () => ({ message: 'Type DELETE to confirm' }) }),
});

export const ActivityQuery = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

export type DeleteAccountBody = z.infer<typeof DeleteAccountSchema>;
