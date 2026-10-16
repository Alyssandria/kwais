import { z } from 'zod';
import { CANONICAL_UNITS } from '../nutrition/units.js';

const text = (max: number) => z.string().trim().min(1).max(max);

export const ParseOutputSchema = z.object({
  items: z
    .array(
      z.object({
        name: text(80),
        localName: text(80).nullable(),
        quantity: z.number().positive().max(50).nullable(),
        unit: z.enum(CANONICAL_UNITS as [string, ...string[]]).nullable(),
        preparation: text(40).nullable(),
        isMixedDish: z.boolean(),
      }),
    )
    .max(20),
});

export const AnalysisOutputSchema = z.object({
  score: z.number().int().min(1).max(10).nullable(),
  scoreReasons: z
    .array(
      z.object({
        title: text(90),
        detail: text(320),
        deduction: z.number().int().min(0).max(5).nullable(),
      }),
    )
    .min(1)
    .max(6),
  summary: text(240),
  observations: z.array(text(240)).max(4),
  concerns: z.array(text(240)).max(4),
  clinicianQuestions: z.array(text(200)).max(3),
  dataQuality: text(400),
  usedInputs: z.array(z.string()).max(16),
});

export type ParseOutput = z.infer<typeof ParseOutputSchema>;
export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

const S = (type: string, extra: Record<string, unknown> = {}) => ({ type, ...extra });
const nullable = (schema: Record<string, unknown>) => ({ ...schema, nullable: true });

export const PARSE_RESPONSE_SCHEMA = S('OBJECT', {
  properties: {
    items: S('ARRAY', {
      items: S('OBJECT', {
        properties: {
          name: S('STRING'),
          localName: nullable(S('STRING')),
          quantity: nullable(S('NUMBER')),
          unit: nullable(S('STRING', { enum: CANONICAL_UNITS })),
          preparation: nullable(S('STRING')),
          isMixedDish: S('BOOLEAN'),
        },
        required: ['name', 'localName', 'quantity', 'unit', 'preparation', 'isMixedDish'],
      }),
    }),
  },
  required: ['items'],
});

export const ANALYSIS_RESPONSE_SCHEMA = S('OBJECT', {
  properties: {
    score: nullable(S('INTEGER')),
    scoreReasons: S('ARRAY', {
      items: S('OBJECT', {
        properties: { title: S('STRING'), detail: S('STRING'), deduction: nullable(S('INTEGER')) },
        required: ['title', 'detail', 'deduction'],
      }),
    }),
    summary: S('STRING'),
    observations: S('ARRAY', { items: S('STRING') }),
    concerns: S('ARRAY', { items: S('STRING') }),
    clinicianQuestions: S('ARRAY', { items: S('STRING') }),
    dataQuality: S('STRING'),
    usedInputs: S('ARRAY', { items: S('STRING') }),
  },
  required: ['score', 'scoreReasons', 'summary', 'observations', 'concerns', 'clinicianQuestions', 'dataQuality', 'usedInputs'],
});
