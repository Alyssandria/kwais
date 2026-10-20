import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const passwordRule = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use 128 characters or fewer')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Include at least one letter and one number');

const name = (label: string) =>
  z.string().trim().min(1, `Enter your ${label}`).max(80, `${label[0]?.toUpperCase()}${label.slice(1)} is too long`);

export const RegisterSchema = z.object({
  email,
  password: passwordRule,
  firstName: name('first name'),
  lastName: name('last name'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You need to accept the terms to continue' }) }),
  acceptHealthData: z.literal(true, {
    errorMap: () => ({ message: 'K-WAIS needs this consent to store meals and lab results' }),
  }),
});

export const LoginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password').max(128),
});

export const ForgotPasswordSchema = z.object({ email });

export const ResetPasswordSchema = z.object({
  token: z.string().min(20).max(200),
  password: passwordRule,
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Enter your current password').max(128),
  newPassword: passwordRule,
});

export type RegisterBody = z.infer<typeof RegisterSchema>;
export type LoginBody = z.infer<typeof LoginSchema>;
export type ForgotPasswordBody = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordBody = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordBody = z.infer<typeof ChangePasswordSchema>;
