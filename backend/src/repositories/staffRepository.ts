import { pool } from '../database/connection.js';

// ─── Staff Members ────────────────────────────────────────────

export async function getStaffMemberByUserId(userId: string) {
  const result = await pool.query(
    `SELECT sm.*, u.email, u.name, u.status AS user_status,
            l.name AS location_name, l.location_code,
            l.latitude, l.longitude, l.geofence_radius_meters
     FROM staff_members sm
     JOIN users u ON u.id = sm.user_id
     JOIN locations l ON l.id = sm.location_id
     WHERE sm.user_id = $1 LIMIT 1`,
    [userId],
  );
  return result.rows[0] ?? null;
}

export async function getStaffMemberById(id: string) {
  const result = await pool.query(
    `SELECT sm.*, u.email, u.name, u.status AS user_status,
            l.name AS location_name, l.location_code,
            l.latitude, l.longitude, l.geofence_radius_meters
     FROM staff_members sm
     JOIN users u ON u.id = sm.user_id
     JOIN locations l ON l.id = sm.location_id
     WHERE sm.id = $1 LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listStaffByLocation(locationId: string) {
  const result = await pool.query(
    `SELECT sm.*, u.email, u.name, u.status AS user_status,
            l.name AS location_name, l.location_code
     FROM staff_members sm
     JOIN users u ON u.id = sm.user_id
     JOIN locations l ON l.id = sm.location_id
     WHERE sm.location_id = $1
     ORDER BY u.name ASC`,
    [locationId],
  );
  return result.rows;
}

export async function listAllStaff() {
  const result = await pool.query(
    `SELECT sm.*, u.email, u.name, u.status AS user_status,
            l.name AS location_name, l.location_code
     FROM staff_members sm
     JOIN users u ON u.id = sm.user_id
     JOIN locations l ON l.id = sm.location_id
     ORDER BY l.name ASC, u.name ASC`,
  );
  return result.rows;
}

export async function createStaffMember(input: {
  userId: string;
  locationId: string;
  employeeCode?: string;
  designation?: string;
  joiningDate?: string;
  workingDaysPerWeek?: number;
  phone?: string;
}) {
  const result = await pool.query(
    `INSERT INTO staff_members
       (user_id, location_id, employee_code, designation,
        joining_date, working_days_per_week, phone)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.userId,
      input.locationId,
      input.employeeCode ?? null,
      input.designation ?? null,
      input.joiningDate ?? null,
      input.workingDaysPerWeek ?? 5,
      input.phone ?? null,
    ],
  );
  return getStaffMemberById(result.rows[0].id);
}

// ─── Attendance ───────────────────────────────────────────────

export async function getAttendanceByStaffAndDate(staffId: string, date: string) {
  const result = await pool.query(
    `SELECT * FROM attendance WHERE staff_id = $1 AND date = $2 LIMIT 1`,
    [staffId, date],
  );
  return result.rows[0] ?? null;
}

export async function createAttendanceCheckIn(input: {
  staffId: string;
  date: string;
  checkInTime: string;
  lat: number;
  lng: number;
  distanceMeters: number;
  isWithinGeofence: boolean;
  isLate: boolean;
  lateByMinutes?: number;
  status: string;
}) {
  const result = await pool.query(
    `INSERT INTO attendance
       (staff_id, date, check_in_time, check_in_lat, check_in_lng,
        check_in_distance_meters, is_within_geofence, is_late, late_by_minutes, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING *`,
    [
      input.staffId,
      input.date,
      input.checkInTime,
      input.lat,
      input.lng,
      input.distanceMeters,
      input.isWithinGeofence,
      input.isLate,
      input.lateByMinutes ?? null,
      input.status,
    ],
  );
  return result.rows[0];
}

export async function updateAttendanceCheckOut(
  attendanceId: string,
  input: {
    checkOutTime: string;
    lat: number;
    lng: number;
    distanceMeters: number;
  },
) {
  const result = await pool.query(
    `UPDATE attendance
     SET check_out_time = $1, check_out_lat = $2, check_out_lng = $3,
         check_out_distance_meters = $4, updated_at = NOW()
     WHERE id = $5
     RETURNING *`,
    [input.checkOutTime, input.lat, input.lng, input.distanceMeters, attendanceId],
  );
  return result.rows[0] ?? null;
}

export async function listAttendanceByStaff(
  staffId: string,
  dateFrom?: string,
  dateTo?: string,
) {
  const values: string[] = [staffId];
  let sql = `SELECT * FROM attendance WHERE staff_id = $1`;
  if (dateFrom) {
    values.push(dateFrom);
    sql += ` AND date >= $${values.length}`;
  }
  if (dateTo) {
    values.push(dateTo);
    sql += ` AND date <= $${values.length}`;
  }
  sql += ` ORDER BY date DESC`;
  const result = await pool.query(sql, values);
  return result.rows;
}

export async function getAttendanceSummary(staffId: string, year: number, month: number) {
  const result = await pool.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'present')  AS present,
       COUNT(*) FILTER (WHERE status = 'absent')   AS absent,
       COUNT(*) FILTER (WHERE status = 'late')     AS late,
       COUNT(*) FILTER (WHERE status = 'half_day') AS half_day,
       COUNT(*) FILTER (WHERE status = 'leave')    AS leave
     FROM attendance
     WHERE staff_id = $1
       AND EXTRACT(YEAR  FROM date) = $2
       AND EXTRACT(MONTH FROM date) = $3`,
    [staffId, year, month],
  );
  return result.rows[0] ?? { present: 0, absent: 0, late: 0, half_day: 0, leave: 0 };
}

// ─── Tasks ────────────────────────────────────────────────────

export async function getTaskById(id: string) {
  const result = await pool.query(
    `SELECT t.*, sm.user_id AS assignee_user_id, u.name AS assignee_name
     FROM tasks t
     LEFT JOIN staff_members sm ON sm.id = t.assigned_to_id
     LEFT JOIN users u ON u.id = sm.user_id
     WHERE t.id = $1 LIMIT 1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function listTasksByLocation(locationId: string, status?: string) {
  const values: string[] = [locationId];
  let sql = `
    SELECT t.*, sm.user_id AS assignee_user_id, u.name AS assignee_name
    FROM tasks t
    LEFT JOIN staff_members sm ON sm.id = t.assigned_to_id
    LEFT JOIN users u ON u.id = sm.user_id
    WHERE t.location_id = $1`;
  if (status) {
    values.push(status);
    sql += ` AND t.status = $${values.length}`;
  }
  sql += ` ORDER BY t.created_at DESC`;
  const result = await pool.query(sql, values);
  return result.rows;
}

export async function listTasksByStaffId(staffId: string, status?: string) {
  const values: string[] = [staffId];
  let sql = `SELECT * FROM tasks WHERE assigned_to_id = $1`;
  if (status) {
    values.push(status);
    sql += ` AND status = $${values.length}`;
  }
  sql += ` ORDER BY created_at DESC`;
  const result = await pool.query(sql, values);
  return result.rows;
}

export async function createTask(input: {
  taskCode: string;
  title: string;
  description?: string;
  locationId: string;
  assignedToId?: string;
  assignedById: string;
  priority: string;
  dueDate?: string;
  relatedOrderId?: string;
  relatedEntityType?: string;
}) {
  const result = await pool.query(
    `INSERT INTO tasks
       (task_code, title, description, location_id, assigned_to_id, assigned_by_id,
        priority, due_date, related_order_id, related_entity_type)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      input.taskCode,
      input.title,
      input.description ?? null,
      input.locationId,
      input.assignedToId ?? null,
      input.assignedById,
      input.priority,
      input.dueDate ?? null,
      input.relatedOrderId ?? null,
      input.relatedEntityType ?? null,
    ],
  );
  return getTaskById(result.rows[0].id);
}

export async function updateTaskStart(taskId: string) {
  const result = await pool.query(
    `UPDATE tasks
     SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND status = 'pending'
     RETURNING *`,
    [taskId],
  );
  return result.rows[0] ?? null;
}

export async function updateTaskComplete(taskId: string, completionNote?: string) {
  const result = await pool.query(
    `UPDATE tasks
     SET status = 'completed', completed_at = NOW(),
         completion_note = $2, updated_at = NOW()
     WHERE id = $1 AND status = 'in_progress'
     RETURNING *`,
    [taskId, completionNote ?? null],
  );
  return result.rows[0] ?? null;
}
