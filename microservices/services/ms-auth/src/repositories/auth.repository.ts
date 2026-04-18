/**
 * Auth Repository — Data access layer. ONLY place that imports Supabase.
 * Uses TWO separate clients:
 *   - supabaseAuth (ANON_KEY)  → solo para operaciones públicas de auth (signInWithPassword)
 *   - supabaseAdmin (SERVICE_KEY) → para admin y consultas a la base de datos
 *
 * Validation flow on every auth operation:
 *  1. Supabase Auth verifies credentials (email/password).
 *  2. user_profiles is queried by UUID to confirm the profile exists.
 *  3. is_active is checked — inactive accounts are rejected with ForbiddenError.
 */
import { createClient } from '@supabase/supabase-js';
import { ForbiddenError } from '@parkiupar/shared/errors';
import type { User, ProfileUser, ReactivationRequestDTO } from '../types/auth.types.js';

const supabaseAuth = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!,
);

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!,
);

type Profile = {
  full_name: string | null;
  role: string;
  is_active: boolean;
  refresh_token: string | null;
  created_at: string;
};

export class AuthRepository {
  /**
   * Fetches minimal user_profiles row (for auth operations).
   * Throws ForbiddenError if the account is inactive.
   */
  private async getProfile(id: string): Promise<Profile | null> {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name, role, is_active, refresh_token, created_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    const profile = data as Profile;
    if (!profile.is_active) {
      throw new ForbiddenError('La cuenta está desactivada');
    }
    return profile;
  }

  private buildUser(id: string, email: string, profile: Profile): User {
    return {
      id,
      nombre: profile.full_name ?? '',
      email,
      rol: profile.role as User['rol'],
      refresh_token: profile.refresh_token ?? null,
      created_at: profile.created_at,
    };
  }

  async emailExists(email: string): Promise<boolean> {
    const { data } = await supabaseAdmin.rpc('get_user_id_by_email', { p_email: email });
    return data !== null;
  }

  /** Used by /me — returns full user_profiles row */
  async findProfileById(id: string): Promise<ProfileUser | null> {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, tenant_id, role, full_name, phone, avatar_url, is_active, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    if (!(data as ProfileUser).is_active) {
      throw new ForbiddenError('La cuenta está desactivada');
    }
    return data as ProfileUser;
  }

  /** Used internally (refresh, logout) */
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin.auth.admin.getUserById(id);
    if (error || !data.user) return null;

    const profile = await this.getProfile(id);
    if (!profile) return null;

    return this.buildUser(data.user.id, data.user.email!, profile);
  }

  /**
   * ✅ Verifies credentials using ANON client + reintentos automáticos
   *    para errores de red (ECONNRESET / TLS)
   */
  /**
 * Verifies credentials with aggressive retry for network/TLS issues
 */
  async verifyCredentials(email: string, password: string): Promise<User | null> {
    const maxRetries = 4;           // más intentos
    let lastError: any;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const { data, error } = await supabaseAuth.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error(`[AUTH] signInWithPassword failed (attempt ${attempt}/${maxRetries}):`, error.message, `(status: ${error.status || 0})`);

          if (
            error.message.includes('Invalid login credentials') ||
            error.message.includes('Email not confirmed') ||
            error.status === 400 ||
            error.code === 'invalid_credentials'
          ) {
            return null;
          }
          throw error;
        }

        if (!data?.user) return null;

        const profile = await this.getProfile(data.user.id);
        if (!profile) return null;

        console.log(`[AUTH] Login exitoso para ${email} (attempt ${attempt})`);
        return this.buildUser(data.user.id, data.user.email!, profile);

      } catch (err: any) {
        lastError = err;

        const isNetworkError =
          err?.cause?.code === 'ECONNRESET' ||
          err?.message?.includes('fetch failed') ||
          err?.message?.includes('TLS') ||
          err?.message?.includes('socket disconnected') ||
          err?.status === 0 ||
          err?.name === 'AuthRetryableFetchError';

        if (isNetworkError) {
          console.error(`[AUTH] Network/TLS error (attempt ${attempt}/${maxRetries}):`, err.message || err);

          if (attempt < maxRetries) {
            // Backoff exponencial más largo: 800ms → 1600ms → 3200ms → 5000ms
            const delay = Math.min(attempt * 800, 5000);
            console.log(`[AUTH] Reintentando en ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          }
        } else {
          console.error('[AUTH] Error no reintentable en verifyCredentials:', err);
        }
        break;
      }
    }

    // Si llegó aquí después de todos los reintentos
    console.error('[AUTH] Todos los reintentos fallaron. Último error:', lastError);
    throw lastError;
  }

  async create(dto: { nombre: string; email: string; password: string; rol: string }): Promise<User> {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });
    if (error) throw error;

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .insert({ id: data.user.id, full_name: dto.nombre, role: dto.rol })
      .select('full_name, role, is_active, refresh_token, created_at')
      .single();

    if (profileError) throw profileError;

    return this.buildUser(data.user.id, data.user.email!, profile as Profile);
  }

  async createReactivationNotification(requesterId: string, dto: ReactivationRequestDTO): Promise<void> {
    const { error } = await supabaseAdmin.from('notifications').insert({
      user_id: null,
      tenant_id: dto.tenantId,
      type: 'warning',
      title: 'Solicitud de reactivación',
      message: `El parqueadero "${dto.tenantName}" (admin: ${dto.requesterName}) solicita la reactivación de su cuenta.`,
      metadata: { tenant_id: dto.tenantId, requester_id: requesterId },
    });
    if (error) throw error;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const { error } = await supabaseAdmin
      .from('user_profiles')
      .update({ refresh_token: refreshToken })
      .eq('id', userId);
    if (error) throw error;
  }

  /** Used by /refresh */
  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const { data, error } = await supabaseAdmin
      .from('user_profiles')
      .select('id, full_name, role, is_active, refresh_token, created_at')
      .eq('refresh_token', refreshToken)
      .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    if (!(data as Profile).is_active) {
      throw new ForbiddenError('La cuenta está desactivada');
    }

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.getUserById(data.id);
    if (authError || !authData.user) return null;

    return this.buildUser(data.id, authData.user.email!, data as Profile);
  }
}