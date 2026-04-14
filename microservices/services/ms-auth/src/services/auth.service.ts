/**
 * Auth Service — Business logic. No Supabase imports here.
 */
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { AuthRepository } from '../repositories/auth.repository.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../../../shared/src/errors.js';
import type { RegisterDTO, LoginDTO, TokenPair, AuthUser } from '../types/auth.types.js';

const SALT_ROUNDS = 10;
const ACCESS_TOKEN_EXPIRY = '1h';
const REFRESH_TOKEN_EXPIRY = '7d';

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async register(dto: RegisterDTO): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const existing = await this.repo.findByEmail(dto.email);
    if (existing) throw new ConflictError('El email ya está registrado');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.repo.create({
      nombre: dto.nombre,
      email: dto.email,
      password_hash: passwordHash,
      rol: dto.rol || 'cliente',
    });

    const tokens = this.generateTokens(user.id, user.email, user.rol);
    await this.repo.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      user: { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
      tokens,
    };
  }

  async login(dto: LoginDTO): Promise<{ user: AuthUser; tokens: TokenPair }> {
    const user = await this.repo.findByEmail(dto.email);
    if (!user) throw new UnauthorizedError('Credenciales inválidas');

    const valid = await bcrypt.compare(dto.password, user.password_hash);
    if (!valid) throw new UnauthorizedError('Credenciales inválidas');

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

  async getMe(userId: string): Promise<AuthUser> {
    const user = await this.repo.findById(userId);
    if (!user) throw new NotFoundError('Usuario');
    return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
  }

  private generateTokens(sub: string, email: string, rol: string): TokenPair {
    const secret = process.env.JWT_SECRET!;
    const accessToken = jwt.sign({ sub, email, rol }, secret, { expiresIn: ACCESS_TOKEN_EXPIRY });
    const refreshToken = randomUUID();
    return { accessToken, refreshToken };
  }
}
