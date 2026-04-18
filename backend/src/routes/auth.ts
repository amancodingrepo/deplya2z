import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

import { pool } from '../database/connection.js';
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

authRouter.get('/me', authRequired, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.name, u.role, u.status, u.created_at, u.updated_at,
              l.id as location_db_id, l.location_code, l.name as location_name, l.type as location_type
       FROM users u
       LEFT JOIN locations l ON l.location_code = u.location_id OR l.id::text = u.location_id
       WHERE u.id = $1 AND u.deleted_at IS NULL
       LIMIT 1`,
      [req.user!.id],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ code: 'USER_NOT_FOUND', message: 'User not found' });
    }

    const row = result.rows[0] as {
      id: string; email: string; name: string; role: string; status: string;
      created_at: string; updated_at: string;
      location_db_id: string | null; location_code: string | null;
      location_name: string | null; location_type: string | null;
    };

    return res.json({
      success: true,
      data: {
        user: {
          id: row.id,
          email: row.email,
          name: row.name,
          role: row.role,
          status: row.status,
          created_at: row.created_at,
          updated_at: row.updated_at,
          location: row.location_db_id
            ? {
                id: row.location_db_id,
                location_code: row.location_code,
                name: row.location_name,
                type: row.location_type,
              }
            : null,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
});
