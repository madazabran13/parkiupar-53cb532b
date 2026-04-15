import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { AuthService } from '../services/auth.service.js';
import { AuthRepository } from '../repositories/auth.repository.js';
import { validate } from '@parkiupar/shared/middleware';
import { registerSchema, loginSchema, refreshSchema } from '../schemas/auth.schema.js';

const repo = new AuthRepository();
const service = new AuthService(repo);
const controller = new AuthController(service);

const router = Router();

router.post('/register', validate(registerSchema), controller.register);
router.post('/login', validate(loginSchema), controller.login);
router.post('/refresh', validate(refreshSchema), controller.refresh);
router.post('/logout', controller.logout);
router.get('/me', controller.me);

export { router as authRouter };
