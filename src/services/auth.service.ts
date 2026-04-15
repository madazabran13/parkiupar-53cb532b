import { apiFetch } from "@/lib/api";

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role?: string;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export const authService = {
  login: (data: LoginPayload) =>
    apiFetch<AuthResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(data),
      auth: false,
    }),

  me: () =>
    apiFetch<AuthUser>("/auth/me", {
      method: "GET",
    }),
};