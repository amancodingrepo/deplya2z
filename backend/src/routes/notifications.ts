import { Router } from 'express';

import { pool } from '../database/connection.js';
import { authRequired } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const notificationsRouter = Router();

notificationsRouter.use(authRequired);

// GET /notifications
notificationsRouter.get('/', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const readParam = req.query.read;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? 20)));
    const offset = (page - 1) * limit;

    const clauses: string[] = [`n.user_id = $1`];
    const values: (string | number | boolean)[] = [userId];

    if (readParam !== undefined && readParam !== '') {
      values.push(readParam === 'true');
      clauses.push(`n.is_read = $${values.length}`);
    }

    const where = `WHERE ${clauses.join(' AND ')}`;

    const [countResult, unreadResult] = await Promise.all([
      pool.query(`SELECT COUNT(*) as total FROM notifications n ${where}`, values),
      pool.query(`SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false`, [userId]),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);
    const unreadCount = Number(unreadResult.rows[0]?.count ?? 0);

    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;
    values.push(limit, offset);

    const rows = await pool.query(
      `SELECT * FROM notifications n ${where}
       ORDER BY n.created_at DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      values,
    );

    return res.json({
      success: true,
      data: rows.rows,
      unread_count: unreadCount,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return next(error);
  }
});

// PATCH /notifications/read-all
notificationsRouter.patch('/read-all', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW(), updated_at = NOW()
       WHERE user_id = $1 AND is_read = false`,
      [userId],
    );
    return res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    return next(error);
  }
});

// PATCH /notifications/:id/read
notificationsRouter.patch('/:id/read', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const id = String(req.params.id);

    const result = await pool.query(
      `UPDATE notifications SET is_read = true, read_at = NOW(), updated_at = NOW()
       WHERE id::text = $1 AND user_id = $2
       RETURNING *`,
      [id, userId],
    );

    if (!result.rows[0]) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Notification not found' });
    }

    return res.json({ success: true, data: result.rows[0] });
  } catch (error) {
    return next(error);
  }
});
