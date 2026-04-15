/**
 * Auth Service — Business logic. No Supabase imports here.
 * Password verification is handled by Supabase Auth via the repository.
 */
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { AuthRepository } from '../repositories/auth.repository.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '@parkiupar/shared/errors';
import type { RegisterDTO, LoginDTO, TokenPair, AuthUser, ProfileUser } from '../types/auth.types.js';

const ACCESS_TOKEN_EXPIRY = '1h';

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async register(dto: RegisterDTO): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const exists = await this.repo.emailExists(dto.email);
    if (exists) throw new ConflictError('El email ya está registrado');

    const user = await this.repo.create({
      nombre: dto.nombre,
      email: dto.email,
      password: dto.password,
      rol: dto.rol || 'viewer',
    });

    const tokens = this.generateTokens(user.id, user.email, user.rol);
    await this.repo.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      tokens,
    };
  }

  async login(dto: LoginDTO): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const user = await this.repo.verifyCredentials(dto.email, dto.password);
    if (!user) throw new UnauthorizedError('Credenciales inválidas');

    const tokens = this.generateTokens(user.id, user.email, user.rol);
    await this.repo.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      tokens,
    };
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const user = await this.repo.findByRefreshToken(refreshToken);
    if (!user) throw new UnauthorizedError('Refresh token inválido');

    const tokens = this.generateTokens(user.id, user.email, user.rol);
    await this.repo.updateRefreshToken(user.id, tokens.refreshToken);
    return tokens;
  }

  async logout(userId: string): Promise<void> {
    await this.repo.updateRefreshToken(userId, null);
  }

  /** Returns full user_profiles row — matches the UserProfile type expected by the frontend. */
  async getMe(userId: string): Promise<ProfileUser> {
    const profile = await this.repo.findProfileById(userId);
    if (!profile) throw new NotFoundError('Usuario');
    return profile;
  }

  private generateTokens(sub: string, email: string, rol: string): TokenPair {
    const secret = process.env.JWT_SECRET!;
    const accessToken = jwt.sign({ sub, email, rol }, secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = randomUUID();
    return { accessToken, refreshToken };
  }
}
