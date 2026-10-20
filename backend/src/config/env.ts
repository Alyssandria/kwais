import { z } from 'zod';

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required (see backend/.env.example)'),

  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(14),
  PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  LAB_ENCRYPTION_KEY: z
    .string({ required_error: 'LAB_ENCRYPTION_KEY is required (see backend/.env.example)' })
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'LAB_ENCRYPTION_KEY must be 32 random bytes, base64-encoded'),
  LAB_ENCRYPTION_KEY_VERSION: z.coerce.number().int().min(1).max(255).default(1),
  LAB_ENCRYPTION_KEY_PREVIOUS: z.string().optional(),
  LAB_ENCRYPTION_KEY_PREVIOUS_VERSION: z.coerce.number().int().min(1).max(255).optional(),

  AI_PROVIDER: z.enum(['gemini', 'mock']).default('mock'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-2.5-flash'),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(20000),
  AI_MAX_REQUESTS_PER_MINUTE: z.coerce.number().int().positive().default(10),
  AI_MAX_QUEUE_WAIT_MS: z.coerce.number().int().nonnegative().default(15000),

  TRUST_PROXY: z.coerce.number().int().nonnegative().default(0),
  AUTH_ATTEMPTS_PER_15_MIN: z.coerce.number().int().positive().default(10),
  API_REQUESTS_PER_15_MIN: z.coerce.number().int().positive().default(600),
  SOFT_DELETE_RETENTION_DAYS: z.coerce.number().int().positive().default(30),
  AUDIT_RETENTION_DAYS: z.coerce.number().int().positive().default(365),
}).superRefine((e, ctx) => {
  if (e.NODE_ENV !== 'production') return;
  for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET'] as const) {
    if (e[key].startsWith('change-me')) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: [key], message: 'Replace the example value with a random secret' });
    }
  }
});

export type Env = z.infer<typeof EnvSchema>;

function loadEnv(): Env {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(`Invalid environment configuration:\n${issues}`);
    process.exit(1);
  }
  return parsed.data;
}

export const env = loadEnv();
export const isProd = env.NODE_ENV === 'production';
