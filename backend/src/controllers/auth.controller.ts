import type { CookieOptions, Request, Response } from 'express';
import { isProd } from '../config/env.js';
import { HttpError } from '../lib/http-error.js';
import type { ChangePasswordBody, ForgotPasswordBody, LoginBody, RegisterBody, ResetPasswordBody } from '../schemas/auth.schemas.js';
import { requestMeta } from '../services/audit.service.js';
import { AuthService, type Session } from '../services/auth.service.js';

export const REFRESH_COOKIE = 'kwais_rt';

export const refreshCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: 'strict',
  path: '/api/v1/auth',
};

function sendSession(res: Response, session: Session, status = 200) {
  res.cookie(REFRESH_COOKIE, session.refreshToken, { ...refreshCookieOptions, expires: session.refreshTokenExpiresAt });
  res.status(status).json({
    data: {
      user: session.user,
      accessToken: session.accessToken,
      expiresIn: session.accessTokenExpiresIn,
    },
  });
}

function readRefreshCookie(req: Request): string | undefined {
  const value: unknown = req.cookies?.[REFRESH_COOKIE];
  return typeof value === 'string' ? value : undefined;
}

export const AuthController = {
  async register(req: Request, res: Response) {
    sendSession(res, await AuthService.register(req.body as RegisterBody, requestMeta(req)), 201);
  },

  async login(req: Request, res: Response) {
    const body = req.body as LoginBody;
    sendSession(res, await AuthService.login(body.email, body.password, requestMeta(req)));
  },

  async refresh(req: Request, res: Response) {
    try {
      sendSession(res, await AuthService.refresh(readRefreshCookie(req), requestMeta(req)));
    } catch (err) {
      if (err instanceof HttpError && err.status === 401) res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
      throw err;
    }
  },

  async logout(req: Request, res: Response) {
    await AuthService.logout(readRefreshCookie(req));
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    res.status(204).end();
  },

  async forgotPassword(req: Request, res: Response) {
    await AuthService.forgotPassword((req.body as ForgotPasswordBody).email, requestMeta(req));
    res.json({
      data: { message: 'If an account exists for that email, we sent a link to reset the password.' },
    });
  },

  async resetPassword(req: Request, res: Response) {
    const body = req.body as ResetPasswordBody;
    await AuthService.resetPassword(body.token, body.password, requestMeta(req));
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    res.json({ data: { message: 'Your password was changed. Sign in with your new password.' } });
  },

  async changePassword(req: Request, res: Response) {
    if (!req.auth) throw HttpError.unauthorized();
    const body = req.body as ChangePasswordBody;
    sendSession(res, await AuthService.changePassword(req.auth.userId, body.currentPassword, body.newPassword, requestMeta(req)));
  },

  async logoutEverywhere(req: Request, res: Response) {
    if (!req.auth) throw HttpError.unauthorized();
    await AuthService.logoutEverywhere(req.auth.userId, requestMeta(req));
    res.clearCookie(REFRESH_COOKIE, refreshCookieOptions);
    res.status(204).end();
  },

  async me(req: Request, res: Response) {
    if (!req.auth) throw HttpError.unauthorized();
    res.json({ data: { user: await AuthService.me(req.auth.userId) } });
  },
};
