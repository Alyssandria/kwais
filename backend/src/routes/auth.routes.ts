import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { credentialLimiter } from '../middleware/rate-limits.js';
import { validateBody } from '../middleware/validate.js';
import {
  ChangePasswordSchema,
  ForgotPasswordSchema,
  LoginSchema,
  RegisterSchema,
  ResetPasswordSchema,
} from '../schemas/auth.schemas.js';

export const authRoutes = Router();

authRoutes.post('/register', credentialLimiter, validateBody(RegisterSchema), AuthController.register);
authRoutes.post('/login', credentialLimiter, validateBody(LoginSchema), AuthController.login);
authRoutes.post('/refresh', AuthController.refresh);
authRoutes.post('/logout', AuthController.logout);
authRoutes.post('/forgot-password', credentialLimiter, validateBody(ForgotPasswordSchema), AuthController.forgotPassword);
authRoutes.post('/reset-password', credentialLimiter, validateBody(ResetPasswordSchema), AuthController.resetPassword);
authRoutes.get('/me', authenticate, AuthController.me);
authRoutes.post('/change-password', authenticate, credentialLimiter, validateBody(ChangePasswordSchema), AuthController.changePassword);
authRoutes.post('/logout-all', authenticate, AuthController.logoutEverywhere);
