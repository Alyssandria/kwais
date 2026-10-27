import type { Prisma } from '@prisma/client';
import { prisma } from '../config/db.js';

const noteSelect = {
  id: true,
  patientId: true,
  authorId: true,
  body: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { firstName: true, lastName: true } },
} satisfies Prisma.ClinicalNoteSelect;

export type NoteRecord = Prisma.ClinicalNoteGetPayload<{ select: typeof noteSelect }>;

export const NoteModel = {
  list(patientId: string, limit = 200): Promise<NoteRecord[]> {
    return prisma.clinicalNote.findMany({ where: { patientId }, orderBy: { createdAt: 'desc' }, take: limit, select: noteSelect });
  },

  find(patientId: string, id: string): Promise<NoteRecord | null> {
    return prisma.clinicalNote.findFirst({ where: { id, patientId }, select: noteSelect });
  },

  create(patientId: string, authorId: string, body: string): Promise<NoteRecord> {
    return prisma.clinicalNote.create({ data: { patientId, authorId, body }, select: noteSelect });
  },

  update(id: string, body: string): Promise<NoteRecord> {
    return prisma.clinicalNote.update({ where: { id }, data: { body }, select: noteSelect });
  },

  delete(id: string) {
    return prisma.clinicalNote.delete({ where: { id }, select: { id: true } });
  },
};
