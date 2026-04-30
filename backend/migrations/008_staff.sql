-- ============================================================
-- 007_staff.sql
-- Staff members, attendance, and tasks tables
-- ============================================================

-- Extend user roles to include 'staff'
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('superadmin','warehouse_manager','store_manager','staff'));

-- Add GPS / geofence columns to locations for check-in validation
ALTER TABLE locations
  ADD COLUMN IF NOT EXISTS latitude               DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude              DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS geofence_radius_meters INTEGER NOT NULL DEFAULT 200;

-- ─── staff_members ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_members (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id           UUID NOT NULL REFERENCES locations(id),
  employee_code         VARCHAR(50) UNIQUE,
  designation           VARCHAR(100),
  joining_date          DATE,
  working_days_per_week SMALLINT NOT NULL DEFAULT 5,
  phone                 VARCHAR(30),
  status                VARCHAR(20) NOT NULL DEFAULT 'active'
                          CHECK (status IN ('active','inactive')),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

-- ─── attendance ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS attendance (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id                  UUID NOT NULL REFERENCES staff_members(id),
  date                      DATE NOT NULL,
  check_in_time             TIMESTAMPTZ,
  check_out_time            TIMESTAMPTZ,
  check_in_lat              DOUBLE PRECISION,
  check_in_lng              DOUBLE PRECISION,
  check_out_lat             DOUBLE PRECISION,
  check_out_lng             DOUBLE PRECISION,
  check_in_distance_meters  INTEGER,
  check_out_distance_meters INTEGER,
  is_within_geofence        BOOLEAN NOT NULL DEFAULT FALSE,
  is_late                   BOOLEAN NOT NULL DEFAULT FALSE,
  late_by_minutes           INTEGER,
  status                    VARCHAR(20) NOT NULL DEFAULT 'present'
                              CHECK (status IN ('present','absent','late','half_day','leave')),
  notes                     TEXT,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (staff_id, date)
);

-- ─── tasks ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code           VARCHAR(50) UNIQUE NOT NULL,
  title               VARCHAR(255) NOT NULL,
  description         TEXT,
  location_id         UUID NOT NULL REFERENCES locations(id),
  assigned_to_id      UUID REFERENCES staff_members(id),
  assigned_by_id      UUID NOT NULL,
  priority            VARCHAR(20) NOT NULL DEFAULT 'medium'
                        CHECK (priority IN ('low','medium','high','urgent')),
  status              VARCHAR(30) NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending','in_progress','completed','cancelled')),
  due_date            DATE,
  started_at          TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  completion_note     TEXT,
  related_order_id    TEXT,
  related_entity_type VARCHAR(50),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id     ON staff_members(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_location_id ON staff_members(location_id);
CREATE INDEX IF NOT EXISTS idx_attendance_staff_date     ON attendance(staff_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_attendance_date           ON attendance(date DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_location            ON tasks(location_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to         ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status              ON tasks(status);

-- ─── RLS: staff_members ───────────────────────────────────────
ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY staff_members_superadmin ON staff_members
  FOR ALL USING (current_app_role() = 'superadmin');

CREATE POLICY staff_members_manager ON staff_members
  FOR SELECT USING (
    current_app_role() IN ('warehouse_manager','store_manager')
    AND location_id = (
      SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1
    )
  );

CREATE POLICY staff_members_self ON staff_members
  FOR SELECT USING (user_id = current_app_user_id());

-- ─── RLS: attendance ──────────────────────────────────────────
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY attendance_superadmin ON attendance
  FOR ALL USING (current_app_role() = 'superadmin');

CREATE POLICY attendance_manager ON attendance
  FOR ALL USING (
    current_app_role() IN ('warehouse_manager','store_manager')
    AND staff_id IN (
      SELECT id FROM staff_members
      WHERE location_id = (
        SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1
      )
    )
  );

CREATE POLICY attendance_self ON attendance
  FOR ALL USING (
    staff_id IN (
      SELECT id FROM staff_members WHERE user_id = current_app_user_id()
    )
  );

-- ─── RLS: tasks ───────────────────────────────────────────────
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY tasks_superadmin ON tasks
  FOR ALL USING (current_app_role() = 'superadmin');

CREATE POLICY tasks_manager ON tasks
  FOR ALL USING (
    current_app_role() IN ('warehouse_manager','store_manager')
    AND location_id = (
      SELECT id FROM locations WHERE location_code = current_app_location() LIMIT 1
    )
  );

CREATE POLICY tasks_staff_read ON tasks
  FOR SELECT USING (
    assigned_to_id IN (
      SELECT id FROM staff_members WHERE user_id = current_app_user_id()
    )
  );

CREATE POLICY tasks_staff_update ON tasks
  FOR UPDATE USING (
    assigned_to_id IN (
      SELECT id FROM staff_members WHERE user_id = current_app_user_id()
    )
  );
