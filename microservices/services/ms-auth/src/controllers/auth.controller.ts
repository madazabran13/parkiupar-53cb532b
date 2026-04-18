/**
 * Auth Controller — Maps HTTP requests to service calls.
 */
import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { sendSuccess, sendCreated, sendNoContent } from '@parkiupar/shared/response';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.register(req.body);
      sendCreated(res, result);
    } catch (err) { next(err); }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.service.login(req.body);
      sendSuccess(res, result);
    } catch (err) { next(err); }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const tokens = await this.service.refresh(req.body.refreshToken);
      sendSuccess(res, tokens);
    } catch (err) { next(err); }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      await this.service.logout(userId);
      sendNoContent(res);
    } catch (err) { next(err); }
  };

  me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      const user = await this.service.getMe(userId);
      sendSuccess(res, user);
    } catch (err) { next(err); }
  };

  requestReactivation = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const userId = req.headers['x-user-id'] as string;
      await this.service.requestReactivation(userId, req.body);
      sendNoContent(res);
    } catch (err) { next(err); }
  };
}
