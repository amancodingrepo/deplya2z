import { Router } from 'express';

import { pool } from '../database/connection.js';
import { authRequired, rolesAllowed } from '../middleware/auth.js';
import { AppError } from '../shared/errors.js';
import { env } from '../config/env.js';

export const staffRouter = Router();

staffRouter.use(authRequired);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STAFF_SELECT = `
  SELECT
    sm.id,
    sm.user_id,
    sm.location_id,
    sm.employee_code,
    sm.designation,
    sm.joining_date,
    sm.working_days_per_week,
    sm.phone,
    sm.status,
    sm.created_at,
    sm.updated_at,
    u.name,
    u.email,
    l.name   AS location_name,
    l.location_code AS location_code
  FROM staff_members sm
  JOIN users        u  ON u.id  = sm.user_id
  LEFT JOIN locations l ON l.id = sm.location_id
`;

function staffRow(row: Record<string, unknown>) {
  return {
    id: row.id,
    user_id: row.user_id,
    name: row.name,
    email: row.email,
    location_id: row.location_id,
    location_name: row.location_name ?? '',
    location_code: row.location_code ?? '',
    employee_code: row.employee_code ?? '',
    designation: row.designation ?? '',
    joining_date: row.joining_date,
    working_days_per_week: row.working_days_per_week ?? 6,
    phone: row.phone ?? null,
    status: row.status ?? 'active',
    open_task_count: (row.open_task_count as number) ?? 0,
    today_attendance: row.today_attendance ?? null,
  };
}

// ─── GET /staff/me ────────────────────────────────────────────────────────────
staffRouter.get('/me', async (req, res, next) => {
  try {
    const userId = req.user!.id;

    const smResult = await pool.query(
      `${STAFF_SELECT} WHERE sm.user_id = $1`,
      [userId],
    );

    if (!smResult.rows[0]) {
      return res.json({ success: true, data: null });
    }

    const sm = smResult.rows[0];

    // Today's attendance
    const today = new Date().toISOString().split('T')[0];
    const attResult = await pool.query(
      `SELECT * FROM staff_attendance WHERE staff_id = $1 AND date = $2`,
      [sm.id, today],
    );

    // Open task count
    const taskResult = await pool.query(
      `SELECT COUNT(*) AS cnt FROM tasks WHERE assigned_to_id = $1 AND status IN ('open','in_progress')`,
      [sm.id],
    );

    return res.json({
      success: true,
      data: staffRow({
        ...sm,
        today_attendance: attResult.rows[0] ?? null,
        open_task_count: Number(taskResult.rows[0]?.cnt ?? 0),
      }),
    });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /staff/members ───────────────────────────────────────────────────────
staffRouter.get(
  '/members',
  rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']),
  async (req, res, next) => {
    try {
      const locationId = req.query.location_id ? String(req.query.location_id) : null;
      const page = Math.max(1, Number(req.query.page ?? 1));
      const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? 50)));
      const offset = (page - 1) * limit;

      const clauses: string[] = ["sm.status != 'terminated'"];
      const values: unknown[] = [];

      if (locationId) {
        values.push(locationId);
        clauses.push(`sm.location_id = $${values.length}`);
      }

      const where = `WHERE ${clauses.join(' AND ')}`;
      const today = new Date().toISOString().split('T')[0];

      const [countResult, rows] = await Promise.all([
        pool.query(`SELECT COUNT(*) AS total FROM staff_members sm ${where}`, values),
        pool.query(
          `${STAFF_SELECT}
           ${where}
           ORDER BY u.name
           LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
          [...values, limit, offset],
        ),
      ]);

      // Attach today's attendance to each member
      const staffIds = rows.rows.map((r: any) => r.id);
      const attRows =
        staffIds.length > 0
          ? await pool.query(
              `SELECT * FROM staff_attendance
               WHERE staff_id = ANY($1::uuid[]) AND date = $2`,
              [staffIds, today],
            )
          : { rows: [] };

      const attByStaff = Object.fromEntries(
        (attRows.rows as any[]).map((r) => [r.staff_id, r]),
      );

      const total = Number(countResult.rows[0]?.total ?? 0);

      return res.json({
        success: true,
        data: (rows.rows as any[]).map((r) =>
          staffRow({ ...r, today_attendance: attByStaff[r.id] ?? null }),
        ),
        meta: { page, limit, total, pages: Math.ceil(total / limit) },
      });
    } catch (err) {
      return next(err);
    }
  },
);

// ─── GET /staff/records ───────────────────────────────────────────────────────
staffRouter.get(
  '/records',
  rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']),
  async (req, res, next) => {
    try {
      const userId = req.query.user_id ? String(req.query.user_id) : null;

      const clauses: string[] = [];
      const values: unknown[] = [];

      if (userId) {
        values.push(userId);
        clauses.push(`sm.user_id = $${values.length}`);
      }

      const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

      const members = await pool.query(
        `${STAFF_SELECT} ${where} ORDER BY u.name`,
        values,
      );

      return res.json({ success: true, data: members.rows });
    } catch (err) {
      return next(err);
    }
  },
);

// ─── GET /staff/attendance ────────────────────────────────────────────────────
staffRouter.get('/attendance', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const isAdmin = ['superadmin', 'warehouse_manager', 'store_manager'].includes(
      req.user!.role,
    );

    const staffIdParam = req.query.staff_id ? String(req.query.staff_id) : null;
    const dateParam = req.query.attendance_date ? String(req.query.attendance_date) : null;
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? 30)));
    const offset = (page - 1) * limit;

    const clauses: string[] = [];
    const values: unknown[] = [];

    if (!isAdmin) {
      // Staff can only see their own records
      const smResult = await pool.query(
        `SELECT id FROM staff_members WHERE user_id = $1`,
        [userId],
      );
      if (!smResult.rows[0]) return res.json({ success: true, data: [], meta: { page, limit, total: 0, pages: 0 } });
      values.push(smResult.rows[0].id);
      clauses.push(`sa.staff_id = $${values.length}`);
    } else if (staffIdParam) {
      values.push(staffIdParam);
      clauses.push(`sa.staff_id = $${values.length}`);
    }

    if (dateParam) {
      values.push(dateParam);
      clauses.push(`sa.date = $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [countResult, rows] = await Promise.all([
      pool.query(
        `SELECT COUNT(*) AS total FROM staff_attendance sa ${where}`,
        values,
      ),
      pool.query(
        `SELECT sa.*, u.name AS staff_name
         FROM staff_attendance sa
         JOIN staff_members sm ON sm.id = sa.staff_id
         JOIN users u ON u.id = sm.user_id
         ${where}
         ORDER BY sa.date DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset],
      ),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return res.json({
      success: true,
      data: rows.rows,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /staff/attendance/check-in ─────────────────────────────────────────
staffRouter.post('/attendance/check-in', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { latitude, longitude, notes } = req.body as {
      latitude?: number;
      longitude?: number;
      notes?: string;
    };

    const smResult = await pool.query(
      `SELECT sm.*, l.latitude AS loc_lat, l.longitude AS loc_lng
       FROM staff_members sm
       LEFT JOIN locations l ON l.id = sm.location_id
       WHERE sm.user_id = $1 AND sm.status = 'active'`,
      [userId],
    );

    if (!smResult.rows[0]) {
      return next(new AppError('No active staff record found for this user', 404, 'NOT_FOUND'));
    }

    const sm = smResult.rows[0];
    const today = new Date().toISOString().split('T')[0];

    const existing = await pool.query(
      `SELECT id FROM staff_attendance WHERE staff_id = $1 AND date = $2`,
      [sm.id, today],
    );
    if (existing.rows[0]) {
      return next(new AppError('Already checked in today', 409, 'ALREADY_CHECKED_IN'));
    }

    // Simple geofence: within 500m of location if coordinates are available
    let distanceMeters: number | null = null;
    let isWithinGeofence = true;
    if (latitude && longitude && sm.loc_lat && sm.loc_lng) {
      const R = 6371000;
      const φ1 = (Number(sm.loc_lat) * Math.PI) / 180;
      const φ2 = (latitude * Math.PI) / 180;
      const Δφ = ((latitude - Number(sm.loc_lat)) * Math.PI) / 180;
      const Δλ = ((longitude - Number(sm.loc_lng)) * Math.PI) / 180;
      const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      distanceMeters = Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
      isWithinGeofence = distanceMeters <= 500;
    }

    // Check if late (after 9:30 AM)
    const now = new Date();
    const isLate = now.getHours() > 9 || (now.getHours() === 9 && now.getMinutes() > 30);
    const lateByMinutes = isLate
      ? Math.max(0, (now.getHours() - 9) * 60 + now.getMinutes() - 30)
      : 0;

    const result = await pool.query(
      `INSERT INTO staff_attendance
         (staff_id, date, status, check_in_time, check_in_lat, check_in_lng,
          check_in_distance_meters, is_within_geofence, is_late, late_by_minutes, notes)
       VALUES ($1,$2,'present',$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        sm.id,
        today,
        now.toISOString(),
        latitude ?? null,
        longitude ?? null,
        distanceMeters,
        isWithinGeofence,
        isLate,
        lateByMinutes,
        notes ?? null,
      ],
    );

    return res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /staff/attendance/:id/check-out ─────────────────────────────────────
staffRouter.post('/attendance/:id/check-out', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { latitude, longitude, notes } = req.body as {
      latitude?: number;
      longitude?: number;
      notes?: string;
    };

    // Verify record belongs to user (or is admin)
    const isAdmin = ['superadmin', 'warehouse_manager', 'store_manager'].includes(
      req.user!.role,
    );

    const record = await pool.query(
      `SELECT sa.*, sm.user_id, sm.location_id
       FROM staff_attendance sa
       JOIN staff_members sm ON sm.id = sa.staff_id
       WHERE sa.id = $1`,
      [id],
    );

    if (!record.rows[0]) return next(new AppError('Attendance record not found', 404, 'NOT_FOUND'));
    if (!isAdmin && record.rows[0].user_id !== userId) {
      return next(new AppError('Forbidden', 403, 'FORBIDDEN'));
    }
    if (record.rows[0].check_out_time) {
      return next(new AppError('Already checked out', 409, 'ALREADY_CHECKED_OUT'));
    }

    const result = await pool.query(
      `UPDATE staff_attendance
       SET check_out_time = NOW(),
           check_out_lat = $1,
           check_out_lng = $2,
           notes = COALESCE($3, notes),
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [latitude ?? null, longitude ?? null, notes ?? null, id],
    );

    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /staff/attendance/summary ───────────────────────────────────────────
staffRouter.get('/attendance/summary', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const isAdmin = ['superadmin', 'warehouse_manager', 'store_manager'].includes(req.user!.role);
    const month = Number(req.query.month ?? new Date().getMonth() + 1);
    const year = Number(req.query.year ?? new Date().getFullYear());

    const clauses: string[] = [
      `EXTRACT(MONTH FROM sa.date) = $1`,
      `EXTRACT(YEAR FROM sa.date) = $2`,
    ];
    const values: unknown[] = [month, year];

    if (!isAdmin) {
      const smResult = await pool.query(
        `SELECT id FROM staff_members WHERE user_id = $1`,
        [userId],
      );
      if (!smResult.rows[0]) return res.json({ success: true, data: [] });
      values.push(smResult.rows[0].id);
      clauses.push(`sa.staff_id = $${values.length}`);
    }

    const where = `WHERE ${clauses.join(' AND ')}`;

    const rows = await pool.query(
      `SELECT
         sm.id AS staff_id,
         u.name AS staff_name,
         $1::int AS month,
         $2::int AS year,
         COUNT(*) FILTER (WHERE sa.status = 'present') AS present_days,
         COUNT(*) FILTER (WHERE sa.status = 'absent') AS absent_days,
         COUNT(*) FILTER (WHERE sa.status = 'late' OR sa.is_late = true) AS late_days,
         COUNT(*) FILTER (WHERE sa.status = 'half_day') AS half_days,
         COUNT(*) FILTER (WHERE sa.status = 'leave') AS leave_days,
         26 AS working_days
       FROM staff_attendance sa
       JOIN staff_members sm ON sm.id = sa.staff_id
       JOIN users u ON u.id = sm.user_id
       ${where}
       GROUP BY sm.id, u.name`,
      values,
    );

    return res.json({ success: true, data: rows.rows });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /staff/tasks ─────────────────────────────────────────────────────────
staffRouter.get('/tasks', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const isAdmin = ['superadmin', 'warehouse_manager', 'store_manager'].includes(req.user!.role);
    const page = Math.max(1, Number(req.query.page ?? 1));
    const limit = Math.min(env.maxPageSize, Math.max(1, Number(req.query.limit ?? 30)));
    const offset = (page - 1) * limit;

    const clauses: string[] = [];
    const values: unknown[] = [];

    if (!isAdmin) {
      const smResult = await pool.query(
        `SELECT id FROM staff_members WHERE user_id = $1`,
        [userId],
      );
      if (!smResult.rows[0]) return res.json({ success: true, data: [], meta: { page, limit, total: 0, pages: 0 } });
      values.push(smResult.rows[0].id);
      clauses.push(`t.assigned_to_id = $${values.length}`);
    }

    if (req.query.status) {
      values.push(String(req.query.status));
      clauses.push(`t.status = $${values.length}`);
    }

    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

    const [countResult, rows] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM tasks t ${where}`, values),
      pool.query(
        `SELECT t.*,
                ass.name  AS assigned_to_name,
                asby.name AS assigned_by_name
         FROM tasks t
         LEFT JOIN staff_members sm_to ON sm_to.id = t.assigned_to_id
         LEFT JOIN users ass  ON ass.id  = sm_to.user_id
         LEFT JOIN users asby ON asby.id = t.assigned_by_id
         ${where}
         ORDER BY t.created_at DESC
         LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
        [...values, limit, offset],
      ),
    ]);

    const total = Number(countResult.rows[0]?.total ?? 0);

    return res.json({
      success: true,
      data: rows.rows,
      meta: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /staff/tasks ────────────────────────────────────────────────────────
staffRouter.post(
  '/tasks',
  rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']),
  async (req, res, next) => {
    try {
      const { title, description, assigned_to_id, location_id, priority, due_date, related_order_id, related_entity_type } =
        req.body as Record<string, string>;

      if (!title?.trim()) return next(new AppError('Title is required', 400, 'MISSING_FIELD'));

      const result = await pool.query(
        `INSERT INTO tasks
           (title, description, assigned_to_id, location_id, assigned_by_id,
            priority, due_date, related_order_id, related_entity_type)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING *`,
        [
          title.trim(),
          description ?? null,
          assigned_to_id ?? null,
          location_id ?? null,
          req.user!.id,
          priority ?? 'medium',
          due_date ?? null,
          related_order_id ?? null,
          related_entity_type ?? null,
        ],
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      return next(err);
    }
  },
);

// ─── PATCH /staff/tasks/:id/start ─────────────────────────────────────────────
staffRouter.patch('/tasks/:id/start', async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE tasks SET status = 'in_progress', updated_at = NOW()
       WHERE id = $1 AND status = 'open' RETURNING *`,
      [id],
    );
    if (!result.rows[0]) return next(new AppError('Task not found or not in open state', 404, 'NOT_FOUND'));
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /staff/tasks/:id/complete ──────────────────────────────────────────
staffRouter.patch('/tasks/:id/complete', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { completion_note } = req.body as { completion_note?: string };
    const result = await pool.query(
      `UPDATE tasks
       SET status = 'completed', completed_at = NOW(), completion_note = $1, updated_at = NOW()
       WHERE id = $2 AND status IN ('open','in_progress') RETURNING *`,
      [completion_note ?? null, id],
    );
    if (!result.rows[0]) return next(new AppError('Task not found or already completed', 404, 'NOT_FOUND'));
    return res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    return next(err);
  }
});
