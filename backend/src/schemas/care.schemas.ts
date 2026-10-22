import { z } from 'zod';

const message = z.string().trim().max(300, 'Keep the message under 300 characters').optional().nullable();

export const CareRequestSchema = z.object({
  patientCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^KW-\d{6}$/, 'Patient codes look like KW-000123'),
  message,
});

export const CareInviteSchema = z.object({
  email: z.string().trim().toLowerCase().email('Enter a valid email address').max(254),
  message,
});

export const CareClaimSchema = z.object({ token: z.string().min(20).max(200) });

export const CareActionParam = z.enum(['approve', 'decline', 'cancel', 'end']);

export type CareRequestBody = z.infer<typeof CareRequestSchema>;
export type CareInviteBody = z.infer<typeof CareInviteSchema>;
