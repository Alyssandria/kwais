import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validateBody } from '../middleware/validate.js';
import {
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
} from '../schemas/auth.schemas.js';
import { env } from '../config/env.js';

export const authRoutes = Router();

const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  skip: () => env.NODE_ENV === 'test',
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'rate_limited', message: 'Too many attempts. Wait a few minutes and try again.' },
    });
  },
});

authRoutes.post('/register', credentialLimiter, validateBody(RegisterSchema), AuthController.register);
authRoutes.post('/login', credentialLimiter, validateBody(LoginSchema), AuthController.login);
authRoutes.post('/refresh', AuthController.refresh);
authRoutes.post('/logout', AuthController.logout);
authRoutes.post('/forgot-password', credentialLimiter, validateBody(ForgotPasswordSchema), AuthController.forgotPassword);
authRoutes.post('/reset-password', credentialLimiter, validateBody(ResetPasswordSchema), AuthController.resetPassword);
authRoutes.get('/me', authenticate, AuthController.me);
