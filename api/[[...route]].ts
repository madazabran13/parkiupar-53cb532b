import { createApp } from '../server/app';

export const config = { runtime: 'edge' };

let app: ReturnType<typeof createApp> | null = null;

export default function handler(req: Request): Response | Promise<Response> {
  if (!app) {
    app = createApp({
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      SUPABASE_JWT_SECRET: process.env.SUPABASE_JWT_SECRET,
      UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL,
      UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN,
      ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
    });
  }
  return app.fetch(req);
}
