import { z } from 'zod';
import { CKD_STAGES } from './patient.schemas.js';

export const StageSchema = z.object({
  ckdStage: z.enum(CKD_STAGES.filter((s) => s !== 'not_sure') as [string, ...string[]]),
});

export const NoteSchema = z.object({
  body: z.string().trim().min(1, 'Write the note first').max(2000, 'Keep notes to 2,000 characters'),
});

export type StageBody = z.infer<typeof StageSchema>;
export type NoteBody = z.infer<typeof NoteSchema>;
