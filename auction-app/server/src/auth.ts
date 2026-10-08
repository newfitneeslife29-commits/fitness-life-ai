import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import type { NextFunction, Request, Response } from 'express';
import { config } from './config.ts';
import { getDb } from './db.ts';
import { ApiError } from './errors.ts';

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password, salt, 64);
  return `scrypt:${salt.toString('hex')}:${hash.toString('hex')}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [, saltHex, hashHex] = stored.split(':');
  if (!saltHex || !hashHex) return false;
  const expected = Buffer.from(hashHex, 'hex');
  const actual = scryptSync(password, Buffer.from(saltHex, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function userIdFromToken(token: string | undefined): string | null {
  if (!token) return null;
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    return typeof payload === 'object' && typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

declare global {
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

function bearer(req: Request) {
  const header = req.headers.authorization;
  return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
}

/** Attaches req.userId when a valid token is present; never rejects. */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = userIdFromToken(bearer(req));
  if (userId) req.userId = userId;
  next();
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const userId = userIdFromToken(bearer(req));
  if (!userId) return next(new ApiError(401, 'UNAUTHENTICATED', 'Inicia sesión para continuar'));
  const user = getDb().get<{ status: string }>('SELECT status FROM users WHERE id = ?', userId);
  if (!user) return next(new ApiError(401, 'UNAUTHENTICATED', 'Sesión no válida'));
  if (user.status !== 'active') return next(new ApiError(403, 'ACCOUNT_SUSPENDED', 'Tu cuenta está suspendida'));
  req.userId = userId;
  next();
}
