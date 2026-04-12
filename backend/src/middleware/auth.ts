import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import type { User, UserRole } from '../types.js';

declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
  }
}

export function authRequired(req: Request, res: Response, next: NextFunction) {
  const raw = req.headers.authorization;
  const token = raw?.startsWith('Bearer ') ? raw.slice(7) : null;
  if (!token) {
    return res.status(401).json({ code: 'UNAUTHORIZED', message: 'Authorization token is required' });
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as {
      userId: string;
      role: UserRole;
      location_id: string | null;
      email?: string;
      name?: string;
    };

    req.user = {
      id: payload.userId,
      email: payload.email ?? '',
      name: payload.name ?? '',
      role: payload.role,
      location_id: payload.location_id ?? null,
      status: 'active',
    };

    return next();
  } catch {
    return res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid or expired token' });
  }
}

export function rolesAllowed(roles: UserRole[]) {
  return function enforceRole(req: Request, res: Response, next: NextFunction) {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Permission denied for this action' });
    }
    return next();
  };
}
