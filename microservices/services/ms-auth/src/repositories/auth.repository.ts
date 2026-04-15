/**
 * Auth Repository — Data access layer. ONLY place that imports Supabase.
 * Uses Supabase Auth for credential management + user_profiles for profile data.
 *
 * Validation flow on every auth operation:
 *  1. Supabase Auth verifies credentials (email/password).
 *  2. user_profiles is queried by UUID to confirm the profile exists.
 *  3. is_active is checked — inactive accounts are rejected with ForbiddenError.
 */
import { createClient } from '@supabase/supabase-js';
import { ForbiddenError } from '@parkiupar/shared/errors';
import type { User, ProfileUser } from '../types/auth.types.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
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
    const { data, error } = await supabase
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
    const { data } = await supabase.rpc('get_user_id_by_email', { p_email: email });
    return data !== null;
  }

  /** Used by /me — returns full user_profiles row (matches frontend UserProfile type). */
  async findProfileById(id: string): Promise<ProfileUser | null> {
    const { data, error } = await supabase
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

  /** Used internally (refresh, logout) — fetches minimal User shape. */
  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase.auth.admin.getUserById(id);
    if (error || !data.user) return null;
    const profile = await this.getProfile(id);
    if (!profile) return null;
    return this.buildUser(data.user.id, data.user.email!, profile);
  }

  /**
   * Used by /login — verifies password via Supabase Auth, then validates
   * the profile exists in user_profiles and is_active = true.
   */
  async verifyCredentials(email: string, password: string): Promise<User | null> {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.user) return null;
    const profile = await this.getProfile(data.user.id);
    if (!profile) return null;
    return this.buildUser(data.user.id, data.user.email!, profile);
  }

  async create(dto: { nombre: string; email: string; password: string; rol: string }): Promise<User> {
    const { data, error } = await supabase.auth.admin.createUser({
      email: dto.email,
      password: dto.password,
      email_confirm: true,
    });
    if (error) throw error;

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({ id: data.user.id, full_name: dto.nombre, role: dto.rol })
      .select('full_name, role, is_active, refresh_token, created_at')
      .single();
    if (profileError) throw profileError;

    return this.buildUser(data.user.id, data.user.email!, profile as Profile);
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const { error } = await supabase
      .from('user_profiles')
      .update({ refresh_token: refreshToken })
      .eq('id', userId);
    if (error) throw error;
  }

  /** Used by /refresh — also validates is_active before issuing new tokens. */
  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('id, full_name, role, is_active, refresh_token, created_at')
      .eq('refresh_token', refreshToken)
      .maybeSingle();
    if (error) throw error;
    if (!data) return null;

    if (!(data as Profile).is_active) {
      throw new ForbiddenError('La cuenta está desactivada');
    }

    const { data: authData, error: authError } = await supabase.auth.admin.getUserById(data.id);
    if (authError || !authData.user) return null;

    return this.buildUser(data.id, authData.user.email!, data as Profile);
  }
}
