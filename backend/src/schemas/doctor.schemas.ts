import { z } from 'zod';
import { name, optionalText, prcLicense } from './auth.schemas.js';

export const DoctorProfileUpdateSchema = z
  .object({
    firstName: name('first name'),
    lastName: name('last name'),
    prcLicense,
    specialty: optionalText(80, 'Specialty'),
    clinic: optionalText(120, 'Clinic or hospital'),
  })
  .partial();

export type DoctorProfileUpdate = z.infer<typeof DoctorProfileUpdateSchema>;
