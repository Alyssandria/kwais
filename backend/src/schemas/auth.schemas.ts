import { z } from 'zod';

const email = z.string().trim().toLowerCase().email('Enter a valid email address').max(254);

export const passwordRule = z
  .string()
  .min(10, 'Use at least 10 characters')
  .max(128, 'Use 128 characters or fewer')
  .refine((p) => /[A-Za-z]/.test(p) && /\d/.test(p), 'Include at least one letter and one number');

export const name = (label: string) =>
  z.string().trim().min(1, `Enter your ${label}`).max(80, `${label[0]?.toUpperCase()}${label.slice(1)} is too long`);

export const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} is too long`)
    .transform((v) => v || null)
    .nullable()
    .optional();

export const prcLicense = z
  .string()
  .trim()
  .transform((v) => v.replace(/\s/g, ''))
  .refine((v) => v === '' || /^\d{4,10}$/.test(v), 'Enter the digits of your PRC licence number')
  .transform((v) => v || null)
  .nullable()
  .optional();

const accountFields = {
  email,
  password: passwordRule,
  firstName: name('first name'),
  lastName: name('last name'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'You need to accept the terms to continue' }) }),
};

const PatientRegisterSchema = z.object({
  role: z.literal('patient'),
  ...accountFields,
  acceptHealthData: z.literal(true, {
    errorMap: () => ({ message: 'K-WAIS needs this consent to store meals and lab results' }),
  }),
});

const DoctorRegisterSchema = z.object({
  role: z.literal('doctor'),
  ...accountFields,
  prcLicense,
  specialty: optionalText(80, 'Specialty'),
  clinic: optionalText(120, 'Clinic or hospital'),
});

export const RegisterSchema = z.preprocess(
  (v) => (v && typeof v === 'object' && !('role' in v) ? { ...v, role: 'patient' } : v),
  z.discriminatedUnion('role', [PatientRegisterSchema, DoctorRegisterSchema]),
);

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
export type DoctorRegisterBody = z.infer<typeof DoctorRegisterSchema>;
export type PatientRegisterBody = z.infer<typeof PatientRegisterSchema>;
