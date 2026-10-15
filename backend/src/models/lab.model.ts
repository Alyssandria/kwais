import type { LabTest, Prisma, ValueSource } from '@prisma/client';
import { prisma } from '../config/db.js';

const labSelect = {
  id: true,
  test: true,
  testLabel: true,
  valueEnc: true,
  refLowEnc: true,
  refHighEnc: true,
  unit: true,
  collectedOn: true,
  labName: true,
  source: true,
  keyVersion: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.LabResultSelect;

/** Row as stored: values are ciphertext. Only the lab service decrypts them. */
export type EncryptedLab = Prisma.LabResultGetPayload<{ select: typeof labSelect }>;

export interface EncryptedLabInput {
  test: LabTest;
  testLabel: string | null;
  valueEnc: Uint8Array;
  refLowEnc: Uint8Array | null;
  refHighEnc: Uint8Array | null;
  unit: string;
  collectedOn: Date;
  labName: string | null;
  source: ValueSource;
  keyVersion: number;
}

export const LabModel = {
  /** Newest collection date first. Always scoped to one patient. */
  list(patientId: string, test?: LabTest): Promise<EncryptedLab[]> {
    return prisma.labResult.findMany({
      where: { patientId, ...(test ? { test } : {}) },
      orderBy: [{ collectedOn: 'desc' }, { createdAt: 'desc' }],
      select: labSelect,
    });
  },

  /** Scoped by patient too, so another patient's id simply isn't found. */
  findOwned(patientId: string, id: string): Promise<EncryptedLab | null> {
    return prisma.labResult.findFirst({ where: { id, patientId }, select: labSelect });
  },

  create(patientId: string, data: EncryptedLabInput): Promise<EncryptedLab> {
    return prisma.labResult.create({ data: { ...data, patientId }, select: labSelect });
  },

  update(id: string, data: Partial<EncryptedLabInput>): Promise<EncryptedLab> {
    return prisma.labResult.update({ where: { id }, data, select: labSelect });
  },

  delete(id: string) {
    return prisma.labResult.delete({ where: { id }, select: { id: true } });
  },
};
