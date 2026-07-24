import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errors.js';
import { env } from './env.js';

export type UserRole = 'OWNER_ADMIN' | 'STAFF_FARMER';

export interface AuthClaims {
  sub: string;
  role: UserRole;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthClaims;
    }
  }
}

export const authenticate: RequestHandler = (request, _response, next) => {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    next(new AppError(401, 'Authentication is required.', 'AUTH_REQUIRED'));
    return;
  }

  try {
    request.auth = jwt.verify(token, env.JWT_SECRET) as AuthClaims;
    next();
  } catch {
    next(new AppError(401, 'The authentication token is invalid or expired.', 'INVALID_TOKEN'));
  }
};

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth || !roles.includes(request.auth.role)) {
      next(new AppError(403, 'You do not have permission for this operation.', 'FORBIDDEN'));
      return;
    }
    next();
  };
}
