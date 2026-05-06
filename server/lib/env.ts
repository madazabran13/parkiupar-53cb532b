import { z } from 'zod';

const Env = z.object({
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  SUPABASE_JWT_SECRET: z.string().min(20),
  UPSTASH_REDIS_REST_URL: z.string().url().optional(),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(10).optional(),
  ALLOWED_ORIGINS: z.string().default(''),
});

export type Env = z.infer<typeof Env>;

export function loadEnv(source: Record<string, string | undefined>): Env {
  const parsed = Env.safeParse(source);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join('.')).join(', ');
    throw new Error(`Gateway env vars inválidas o faltantes: ${missing}`);
  }
  return parsed.data;
}
