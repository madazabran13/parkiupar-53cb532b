export interface User {
  id: string;
  nombre: string;
  email: string;
  password_hash: string;
  rol: 'admin' | 'operador' | 'cliente';
  refresh_token: string | null;
  created_at: string;
}

export interface RegisterDTO {
  nombre: string;
  email: string;
  password: string;
  rol?: 'admin' | 'operador' | 'cliente';
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
