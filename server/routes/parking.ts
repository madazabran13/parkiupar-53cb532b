import { Hono } from 'hono';
import { authGuardMiddleware, type AuthUser } from '../middleware/authGuard';
import { tenantGuardMiddleware } from '../middleware/tenantGuard';
import { validate } from '../middleware/validate';
import {
  closeSessionBodySchema,
  closeSessionParamsSchema,
  createSessionBodySchema,
  listSessionsQuerySchema,
  type CloseSessionBody,
  type CreateSessionBody,
  type ListSessionsQuery,
} from '../schemas/parking';
import { getSupabaseAdmin } from '../services/supabaseAdmin';
import { AppError } from '../lib/errors';
import type { Env } from '../lib/env';

interface Variables {
  user: AuthUser;
  validated_body: unknown;
  validated_query: unknown;
  validated_params: unknown;
}

export function parkingRoutes(env: Env) {
  const app = new Hono<{ Variables: Variables }>();
  const admin = getSupabaseAdmin(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

  app.use('*', authGuardMiddleware(env.SUPABASE_JWT_SECRET));
  app.use('*', tenantGuardMiddleware);

  app.get('/sessions', validate(listSessionsQuerySchema, 'query'), async (c) => {
    const user = c.get('user');
    const q = c.get('validated_query') as ListSessionsQuery;
    const offset = (q.page - 1) * q.pageSize;

    let query = admin
      .from('parking_sessions')
      .select('*', { count: 'exact' })
      .order('entry_time', { ascending: false })
      .range(offset, offset + q.pageSize - 1);

    if (user.role !== 'superadmin') query = query.eq('tenant_id', user.tenant_id!);
    if (q.status) query = query.eq('status', q.status);
    if (q.from) query = query.gte('entry_time', q.from);
    if (q.to) query = query.lte('entry_time', q.to);

    const { data, error, count } = await query;
    if (error) throw new AppError('INTERNAL', 'Error consultando sesiones', error.message);
    return c.json({ data, page: q.page, pageSize: q.pageSize, total: count ?? 0 });
  });

  app.post('/sessions', validate(createSessionBodySchema, 'body'), async (c) => {
    const user = c.get('user');
    const body = c.get('validated_body') as CreateSessionBody;

    const { data, error } = await admin
      .from('parking_sessions')
      .insert({
        tenant_id: user.tenant_id!,
        plate: body.plate,
        vehicle_type: body.vehicle_type,
        vehicle_id: body.vehicle_id ?? null,
        customer_id: body.customer_id ?? null,
        customer_name: body.customer_name ?? null,
        customer_phone: body.customer_phone ?? null,
        space_number: body.space_number ?? null,
        rate_per_hour: body.rate_per_hour,
        notes: body.notes ?? null,
        status: 'active',
      })
      .select()
      .single();
    if (error) throw new AppError('INTERNAL', 'No se pudo crear la sesión', error.message);
    return c.json({ data }, 201);
  });

  app.patch(
    '/sessions/:id/close',
    validate(closeSessionParamsSchema, 'params'),
    validate(closeSessionBodySchema, 'body'),
    async (c) => {
      const user = c.get('user');
      const { id } = c.get('validated_params') as { id: string };
      const body = c.get('validated_body') as CloseSessionBody;

      let q = admin
        .from('parking_sessions')
        .update({
          status: 'completed',
          exit_time: body.exit_time ?? new Date().toISOString(),
          hours_parked: body.hours_parked ?? null,
          total_amount: body.total_amount ?? null,
        })
        .eq('id', id);
      if (user.role !== 'superadmin') q = q.eq('tenant_id', user.tenant_id!);

      const { data, error } = await q.select().single();
      if (error) throw new AppError('INTERNAL', 'No se pudo cerrar la sesión', error.message);
      return c.json({ data });
    },
  );

  return app;
}
