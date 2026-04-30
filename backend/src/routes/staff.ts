import { Router } from 'express';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

import { pool } from '../database/connection.js';
import { authRequired, rolesAllowed } from '../middleware/auth.js';
import {
  createStaffMember,
  createTask,
  getStaffMemberByUserId,
  getTaskById,
  listAllStaff,
  listAttendanceByStaff,
  listStaffByLocation,
  listTasksByLocation,
  listTasksByStaffId,
  getAttendanceSummary,
  updateTaskComplete,
  updateTaskStart,
} from '../repositories/staffRepository.js';
import { staffCheckIn, staffCheckOut } from '../services/staffService.js';

export const staffRouter = Router();
staffRouter.use(authRequired);

// ─── Members ─────────────────────────────────────────────────

// GET /staff/members
staffRouter.get(
  '/members',
  rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']),
  async (req, res, next) => {
    try {
      if (req.user!.role === 'superadmin') {
        return res.json(await listAllStaff());
      }
      const locRow = await pool.query(
        `SELECT id FROM locations
         WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
        [req.user!.location_id ?? ''],
      );
      const locationId = locRow.rows[0]?.id;
      if (!locationId) return res.json([]);
      return res.json(await listStaffByLocation(locationId));
    } catch (err) {
      return next(err);
    }
  },
);

const createStaffSchema = z.object({
  user_id: z.string().uuid(),
  location_code: z.string().min(1),
  employee_code: z.string().optional(),
  designation: z.string().optional(),
  joining_date: z.string().optional(),
  working_days_per_week: z.number().int().min(1).max(7).optional(),
  phone: z.string().optional(),
});

// POST /staff/members
staffRouter.post(
  '/members',
  rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']),
  async (req, res, next) => {
    try {
      const body = createStaffSchema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', errors: body.error.issues });
      }

      // Managers can only create staff for their own location
      if (req.user!.role !== 'superadmin') {
        const actorLocCode = req.user!.location_id;
        if (!actorLocCode || body.data.location_code !== actorLocCode) {
          return res.status(403).json({ code: 'FORBIDDEN', message: 'Managers can only create staff for their own location' });
        }
      }

      const locRow = await pool.query(
        `SELECT id FROM locations WHERE location_code = $1 LIMIT 1`,
        [body.data.location_code],
      );
      const locationId = locRow.rows[0]?.id;
      if (!locationId) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Location not found' });
      }

      // Generate employee code if not provided
      let employeeCode = body.data.employee_code;
      if (!employeeCode) {
        const loc = locRow.rows[0];
        const locTypeResult = await pool.query(`SELECT type FROM locations WHERE id = $1`, [loc.id]);
        const locType = locTypeResult.rows[0]?.type as 'warehouse' | 'store';
        const prefix = locType === 'warehouse' ? 'WH' : 'ST';
        const seqResult = await pool.query(
          `SELECT COUNT(*) as cnt FROM staff_members WHERE location_id = $1`,
          [loc.id],
        );
        const seq = String(Number(seqResult.rows[0]?.cnt ?? 0) + 1).padStart(3, '0');
        employeeCode = `EMP-${prefix}${body.data.location_code.slice(-2)}-${seq}`;
      }

      const member = await createStaffMember({
        userId: body.data.user_id,
        locationId,
        employeeCode,
        designation: body.data.designation,
        joiningDate: body.data.joining_date,
        workingDaysPerWeek: body.data.working_days_per_week,
        phone: body.data.phone,
      });
      return res.status(201).json(member);
    } catch (err) {
      return next(err);
    }
  },
);

// GET /staff/me  (staff profile for logged-in staff user)
staffRouter.get('/me', rolesAllowed(['staff']), async (req, res, next) => {
  try {
    const member = await getStaffMemberByUserId(req.user!.id);
    if (!member) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Staff profile not found' });
    }
    return res.json(member);
  } catch (err) {
    return next(err);
  }
});

// ─── Attendance ───────────────────────────────────────────────

const checkInSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

// POST /staff/attendance/check-in
staffRouter.post('/attendance/check-in', rolesAllowed(['staff']), async (req, res, next) => {
  try {
    const body = checkInSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', errors: body.error.issues });
    }
    const record = await staffCheckIn(req.user!.id, body.data.latitude, body.data.longitude);
    return res.status(201).json(record);
  } catch (err: any) {
    if (err.code === 'ALREADY_CHECKED_IN') {
      return res.status(409).json({ code: err.code, message: err.message });
    }
    if (err.code === 'NOT_FOUND') {
      return res.status(404).json({ code: err.code, message: err.message });
    }
    return next(err);
  }
});

const checkOutSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
});

// PATCH /staff/attendance/:id/check-out
staffRouter.patch(
  '/attendance/:id/check-out',
  rolesAllowed(['staff']),
  async (req, res, next) => {
    try {
      const body = checkOutSchema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', errors: body.error.issues });
      }
      const record = await staffCheckOut(
        req.user!.id,
        String(req.params.id),
        body.data.latitude,
        body.data.longitude,
      );
      return res.json(record);
    } catch (err: any) {
      if (err.code === 'NOT_FOUND') {
        return res.status(404).json({ code: err.code, message: err.message });
      }
      return next(err);
    }
  },
);

// GET /staff/attendance  (staff: own records; manager: location records)
staffRouter.get('/attendance', async (req, res, next) => {
  try {
    const dateFrom = String(req.query.date_from ?? '').trim() || undefined;
    const dateTo   = String(req.query.date_to   ?? '').trim() || undefined;

    if (req.user!.role === 'staff') {
      const member = await getStaffMemberByUserId(req.user!.id);
      if (!member) return res.json([]);
      return res.json(await listAttendanceByStaff(member.id, dateFrom, dateTo));
    }

    // manager: optional staff_id filter
    const staffIdParam = String(req.query.staff_id ?? '').trim() || null;
    if (staffIdParam) {
      // Verify staff belongs to manager's location
      const staffLocationRow = await pool.query(
        `SELECT location_id FROM staff_members WHERE id = $1`,
        [staffIdParam],
      );
      const staffLocation = staffLocationRow.rows[0];
      if (!staffLocation) {
        return res.status(404).json({ code: 'NOT_FOUND', message: 'Staff member not found' });
      }
      const locRow = await pool.query(
        `SELECT id FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
        [req.user!.location_id ?? ''],
      );
      const actorLocation = locRow.rows[0];
      if (!actorLocation || staffLocation.location_id !== actorLocation.id) {
        return res.status(403).json({ code: 'FORBIDDEN', message: 'Cannot view attendance for staff from another location' });
      }
      return res.json(await listAttendanceByStaff(staffIdParam, dateFrom, dateTo));
    }

    const locRow = await pool.query(
      `SELECT id FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
      [req.user!.location_id ?? ''],
    );
    const locationId = locRow.rows[0]?.id;
    if (!locationId) return res.json([]);

    const result = await pool.query(
      `SELECT a.* FROM attendance a
       JOIN staff_members sm ON sm.id = a.staff_id
       WHERE sm.location_id = $1
       ORDER BY a.date DESC, a.check_in_time DESC`,
      [locationId],
    );
    return res.json(result.rows);
  } catch (err) {
    return next(err);
  }
});

// GET /staff/attendance/summary?year=2026&month=4
staffRouter.get('/attendance/summary', async (req, res, next) => {
  try {
    const year  = parseInt(String(req.query.year  ?? new Date().getFullYear()),     10);
    const month = parseInt(String(req.query.month ?? (new Date().getMonth() + 1)), 10);

    if (req.user!.role === 'staff') {
      const member = await getStaffMemberByUserId(req.user!.id);
      if (!member) {
        return res.json({ present: 0, absent: 0, late: 0, half_day: 0, leave: 0 });
      }
      return res.json(await getAttendanceSummary(member.id, year, month));
    }

    const staffIdParam = String(req.query.staff_id ?? '').trim() || null;
    if (!staffIdParam) {
      return res
        .status(400)
        .json({ code: 'BAD_REQUEST', message: 'staff_id required for managers' });
    }
    // Verify staff belongs to manager's location
    const staffLocationRow = await pool.query(
      `SELECT location_id FROM staff_members WHERE id = $1`,
      [staffIdParam],
    );
    const staffLocation = staffLocationRow.rows[0];
    if (!staffLocation) {
      return res.status(404).json({ code: 'NOT_FOUND', message: 'Staff member not found' });
    }
    const locRow = await pool.query(
      `SELECT id FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
      [req.user!.location_id ?? ''],
    );
    const actorLocation = locRow.rows[0];
    if (!actorLocation || staffLocation.location_id !== actorLocation.id) {
      return res.status(403).json({ code: 'FORBIDDEN', message: 'Cannot view summary for staff from another location' });
    }
    return res.json(await getAttendanceSummary(staffIdParam, year, month));
  } catch (err) {
    return next(err);
  }
});

// ─── Tasks ────────────────────────────────────────────────────

// GET /staff/tasks
staffRouter.get('/tasks', async (req, res, next) => {
  try {
    const statusFilter = String(req.query.status ?? '').trim() || undefined;

    if (req.user!.role === 'staff') {
      const member = await getStaffMemberByUserId(req.user!.id);
      if (!member) return res.json([]);
      return res.json(await listTasksByStaffId(member.id, statusFilter));
    }

    if (req.user!.role === 'superadmin') {
      const result = await pool.query(
        `SELECT t.*, u.name AS assignee_name
         FROM tasks t
         LEFT JOIN staff_members sm ON sm.id = t.assigned_to_id
         LEFT JOIN users u ON u.id = sm.user_id
         ORDER BY t.created_at DESC`,
      );
      return res.json(result.rows);
    }

    const locRow = await pool.query(
      `SELECT id FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
      [req.user!.location_id ?? ''],
    );
    const locationId = locRow.rows[0]?.id;
    if (!locationId) return res.json([]);
    return res.json(await listTasksByLocation(locationId, statusFilter));
  } catch (err) {
    return next(err);
  }
});

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  assigned_to_staff_id: z.string().uuid().optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
  due_date: z.string().optional(),
  related_order_id: z.string().optional(),
  related_entity_type: z.string().optional(),
});

// POST /staff/tasks
staffRouter.post(
  '/tasks',
  rolesAllowed(['superadmin', 'warehouse_manager', 'store_manager']),
  async (req, res, next) => {
    try {
      const body = createTaskSchema.safeParse(req.body);
      if (!body.success) {
        return res.status(400).json({ code: 'VALIDATION_ERROR', errors: body.error.issues });
      }

      const locRow = await pool.query(
        `SELECT id FROM locations WHERE location_code = $1 OR id::text = $1 LIMIT 1`,
        [req.user!.location_id ?? ''],
      );
      const locationId = locRow.rows[0]?.id;
      if (!locationId) {
        return res
          .status(400)
          .json({ code: 'BAD_REQUEST', message: 'Manager has no assigned location' });
      }

      const taskCode = `TASK-${uuidv4().slice(0, 8).toUpperCase()}`;
      const task = await createTask({
        taskCode,
        title: body.data.title,
        description: body.data.description,
        locationId,
        assignedToId: body.data.assigned_to_staff_id,
        assignedById: req.user!.id,
        priority: body.data.priority,
        dueDate: body.data.due_date,
        relatedOrderId: body.data.related_order_id,
        relatedEntityType: body.data.related_entity_type,
      });
      return res.status(201).json(task);
    } catch (err) {
      return next(err);
    }
  },
);

// GET /staff/tasks/:id
staffRouter.get('/tasks/:id', async (req, res, next) => {
  try {
    const task = await getTaskById(req.params.id);
    if (!task) return res.status(404).json({ code: 'NOT_FOUND', message: 'Task not found' });
    return res.json(task);
  } catch (err) {
    return next(err);
  }
});

// PATCH /staff/tasks/:id/start
staffRouter.patch('/tasks/:id/start', rolesAllowed(['staff']), async (req, res, next) => {
  try {
    const updated = await updateTaskStart(String(req.params.id));
    if (!updated) {
      return res
        .status(404)
        .json({ code: 'NOT_FOUND', message: 'Task not found or not in pending state' });
    }
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});

const completeTaskSchema = z.object({
  completion_note: z.string().optional(),
});

// PATCH /staff/tasks/:id/complete
staffRouter.patch('/tasks/:id/complete', rolesAllowed(['staff']), async (req, res, next) => {
  try {
    const body = completeTaskSchema.safeParse(req.body);
    if (!body.success) {
      return res.status(400).json({ code: 'VALIDATION_ERROR', errors: body.error.issues });
    }
    const updated = await updateTaskComplete(String(req.params.id), body.data.completion_note);
    if (!updated) {
      return res
        .status(404)
        .json({ code: 'NOT_FOUND', message: 'Task not found or not in in_progress state' });
    }
    return res.json(updated);
  } catch (err) {
    return next(err);
  }
});
