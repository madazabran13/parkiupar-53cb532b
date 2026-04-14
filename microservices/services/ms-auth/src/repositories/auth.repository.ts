/**
 * Auth Repository — Data access layer. ONLY place that imports Supabase.
 */
import { createClient } from '@supabase/supabase-js';
import type { User } from '../types/auth.types.js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('ms_users')
      .select('*')
      .eq('email', email)
      .maybeSingle();
    if (error) throw error;
    return data as User | null;
  }

  async findById(id: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('ms_users')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw error;
    return data as User | null;
  }

  async create(user: Omit<User, 'id' | 'created_at' | 'refresh_token'>): Promise<User> {
    const { data, error } = await supabase
      .from('ms_users')
      .insert({
        nombre: user.nombre,
        email: user.email,
        password_hash: user.password_hash,
        rol: user.rol,
      })
      .select()
      .single();
    if (error) throw error;
    return data as User;
  }

  async updateRefreshToken(userId: string, refreshToken: string | null): Promise<void> {
    const { error } = await supabase
      .from('ms_users')
      .update({ refresh_token: refreshToken })
      .eq('id', userId);
    if (error) throw error;
  }

  async findByRefreshToken(refreshToken: string): Promise<User | null> {
    const { data, error } = await supabase
      .from('ms_users')
      .select('*')
      .eq('refresh_token', refreshToken)
      .maybeSingle();
    if (error) throw error;
    return data as User | null;
  }
}
