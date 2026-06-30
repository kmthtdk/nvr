import type { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service.js';
import { errorResponse } from '../models/schemas.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: number;
        username: string;
        role: 'admin' | 'viewer';
      };
    }
  }
}

/**
 * JWT authentication middleware.
 * Extracts the token from the Authorization header (Bearer scheme).
 */
export function authRequired(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json(errorResponse('Authentication required'));
    return;
  }

  const token = header.slice(7);
  const payload = AuthService.verifyToken(token);

  if (!payload) {
    res.status(401).json(errorResponse('Invalid or expired token'));
    return;
  }

  req.user = payload;
  next();
}

/**
 * Role-based authorization middleware.
 * Must be used after authRequired.
 */
export function adminOnly(req: Request, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'admin') {
    res.status(403).json(errorResponse('Admin access required'));
    return;
  }
  next();
}
