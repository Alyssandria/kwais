import { z } from 'zod';

const email = z.string().trim().min(1, 'Enter your email').email('Enter a valid email address').max(254);

export const passwordRule = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use 128 characters or fewer')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Include at least one letter and one number');

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password'),
});

export const registerSchema = z
  .object({
    firstName: z.string().trim().min(1, 'Enter your first name').max(80),
    lastName: z.string().trim().min(1, 'Enter your last name').max(80),
    email,
    password: passwordRule,
    confirmPassword: z.string(),
    acceptTerms: z.boolean().refine((v) => v, 'You need to accept the terms to continue'),
    acceptHealthData: z.boolean().refine((v) => v, 'K-WAIS needs this consent to store meals and lab results'),
  })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export const forgotSchema = z.object({ email });

export const resetSchema = z
  .object({ password: passwordRule, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotValues = z.infer<typeof forgotSchema>;
export type ResetValues = z.infer<typeof resetSchema>;
