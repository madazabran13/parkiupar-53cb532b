export interface User {
  id: string;
  nombre: string;
  email: string;
  rol: 'superadmin' | 'admin' | 'operator' | 'viewer' | 'cajero' | 'portero' | 'conductor';
  refresh_token: string | null;
  created_at: string;
}

/** Full profile returned by /me — matches the user_profiles table shape the frontend expects. */
export interface ProfileUser {
  id: string;
  tenant_id: string | null;
  role: string;
  full_name: string | null;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegisterDTO {
  nombre: string;
  email: string;
  password: string;
  rol?: 'superadmin' | 'admin' | 'operator' | 'viewer' | 'cajero' | 'portero' | 'conductor';
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

export interface AuthUser {
  id: string;
  nombre: string;
  email: string;
  rol: string;
}

export interface ReactivationRequestDTO {
  tenantId: string;
  tenantName: string;
  requesterName: string;
}
