import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { authRequired } from '../middleware/auth.js';
import { writeAuditLog } from '../repositories/auditRepository.js';
import { AppError } from '../shared/errors.js';
import { login, refresh } from '../services/authService.js';

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(4),
});

export const authRouter = Router();
const loginRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    code: 'TOO_MANY_REQUESTS',
    message: 'Too many login attempts. Try again in one minute.',
  },
});

authRouter.post('/login', loginRateLimiter, (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      code: 'INVALID_PAYLOAD',
      message: 'Request body validation failed',
      details: parsed.error.flatten(),
    });
  }

  login(parsed.data.email, parsed.data.password)
    .then((result) => {
      void writeAuditLog({
        actorUserId: result.user.id,
        action: 'auth_login_success',
        entityType: 'auth',
        entityId: result.user.id,
        details: `Login success from IP ${req.ip}`,
        afterValue: { role: result.user.role, location_id: result.user.location_id },
      }).catch(() => undefined);
      return res.json(result);
    })
    .catch((error) => {
      if (error instanceof AppError) {
        return res.status(error.statusCode).json({
          code: error.code,
          message: error.message,
        });
      }
      return res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: 'Invalid credentials',
      });
    });
});

authRouter.post('/refresh', authRequired, (req, res) => {
  refresh({ userId: req.user!.id })
    .then((result) => res.json(result))
    .catch(() => res.status(401).json({ code: 'INVALID_TOKEN', message: 'Invalid token' }));
});

authRouter.post('/logout', (_req, res) => {
  return res.json({ success: true });
});
