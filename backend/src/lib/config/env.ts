import { z } from 'zod';

/**
 * Environment configuration.
 *
 * Secrets are read here and nowhere else. Two rules hold throughout:
 *  1. The service-role key is read only through `serverEnv()`, which throws if
 *     called from browser code — it must never reach the client bundle.
 *  2. Nothing is hard-coded. An absent optional provider key disables that
 *     provider rather than falling back to a literal.
 */

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('NEXT_PUBLIC_SUPABASE_URL must be a URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  NEXT_PUBLIC_DEFAULT_CITY_SLUG: z.string().default('bhavnagar'),
});

const serverSchema = publicSchema.extend({
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required on the server'),
  /** Direct Postgres connection, used by migrations and seeds only. */
  SUPABASE_DB_URL: z.string().optional(),

  /** Listing parser. Absent ⇒ the manual parser is used (no AI calls). */
  AI_PARSER_PROVIDER: z.enum(['none', 'anthropic', 'openai']).default('none'),
  AI_PARSER_API_KEY: z.string().optional(),
  AI_PARSER_MODEL: z.string().default('claude-sonnet-5'),

  /** Push provider. Absent ⇒ notifications are recorded but not delivered. */
  PUSH_PROVIDER: z.enum(['none', 'fcm']).default('none'),
  FCM_SERVER_KEY: z.string().optional(),

  OCCURRENCE_HORIZON_DAYS: z.coerce.number().int().positive().default(120),
  RATE_LIMIT_ENABLED: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type PublicEnv = z.infer<typeof publicSchema>;
export type ServerEnv = z.infer<typeof serverSchema>;

let cachedServerEnv: ServerEnv | null = null;
let cachedPublicEnv: PublicEnv | null = null;

function format(error: z.ZodError): string {
  return error.issues.map((i) => `  - ${i.path.join('.')}: ${i.message}`).join('\n');
}

export function publicEnv(): PublicEnv {
  if (cachedPublicEnv) return cachedPublicEnv;
  const parsed = publicSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_DEFAULT_CITY_SLUG: process.env.NEXT_PUBLIC_DEFAULT_CITY_SLUG,
  });
  if (!parsed.success) {
    throw new Error(`Invalid public environment:\n${format(parsed.error)}`);
  }
  cachedPublicEnv = parsed.data;
  return cachedPublicEnv;
}

export function serverEnv(): ServerEnv {
  if (typeof window !== 'undefined') {
    throw new Error('serverEnv() must never be called in browser code');
  }
  if (cachedServerEnv) return cachedServerEnv;

  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid server environment:\n${format(parsed.error)}`);
  }
  if (parsed.data.AI_PARSER_PROVIDER !== 'none' && !parsed.data.AI_PARSER_API_KEY) {
    throw new Error('AI_PARSER_PROVIDER is set but AI_PARSER_API_KEY is missing');
  }
  if (parsed.data.PUSH_PROVIDER === 'fcm' && !parsed.data.FCM_SERVER_KEY) {
    throw new Error('PUSH_PROVIDER=fcm but FCM_SERVER_KEY is missing');
  }
  cachedServerEnv = parsed.data;
  return cachedServerEnv;
}

/** Test seam: clears memoised config after mutating process.env. */
export function resetEnvCache(): void {
  cachedServerEnv = null;
  cachedPublicEnv = null;
}
