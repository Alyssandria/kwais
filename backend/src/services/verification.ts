export interface Verification {
  by: string | null;
  at: string;
}

export interface Clinician {
  userId: string;
  doctorId: string;
  name: string;
}

export const doctorDisplayName = (d: { firstName: string; lastName: string }) => `Dr. ${d.firstName} ${d.lastName}`;

export function toVerification(at: Date | null, by: { firstName: string; lastName: string } | null): Verification | null {
  if (!at) return null;
  return { by: by ? doctorDisplayName(by) : null, at: at.toISOString() };
}

export const verifiedFields = (clinician: Clinician | undefined, now = new Date()) =>
  clinician
    ? { source: 'clinician_verified' as const, verifiedById: clinician.doctorId, verifiedAt: now }
    : { source: 'patient_entered' as const, verifiedById: null, verifiedAt: null };
