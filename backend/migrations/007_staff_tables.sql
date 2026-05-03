-- ─── Staff Members ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_members (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id            UUID REFERENCES locations(id) ON DELETE SET NULL,
  employee_code          VARCHAR(50) UNIQUE,
  designation            VARCHAR(100) NOT NULL DEFAULT 'Staff',
  joining_date           DATE NOT NULL DEFAULT CURRENT_DATE,
  working_days_per_week  INT NOT NULL DEFAULT 6,
  phone                  VARCHAR(30),
  status                 VARCHAR(20) NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active','inactive','terminated')),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_staff_members_user ON staff_members(user_id);

-- ─── Staff Attendance ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS staff_attendance (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id                   UUID NOT NULL REFERENCES staff_members(id) ON DELETE CASCADE,
  date                       DATE NOT NULL,
  status                     VARCHAR(20) NOT NULL DEFAULT 'present'
                             CHECK (status IN ('present','absent','half_day','leave','late','holiday')),
  check_in_time              TIMESTAMPTZ,
  check_out_time             TIMESTAMPTZ,
  check_in_lat               DECIMAL(10,7),
  check_in_lng               DECIMAL(10,7),
  check_out_lat              DECIMAL(10,7),
  check_out_lng              DECIMAL(10,7),
  check_in_distance_meters   INT,
  check_out_distance_meters  INT,
  is_within_geofence         BOOLEAN NOT NULL DEFAULT TRUE,
  is_late                    BOOLEAN NOT NULL DEFAULT FALSE,
  late_by_minutes            INT NOT NULL DEFAULT 0,
  notes                      TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(staff_id, date)
);

-- ─── Tasks ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_code            VARCHAR(50) UNIQUE DEFAULT ('TSK-' || UPPER(SUBSTRING(gen_random_uuid()::text, 1, 8))),
  title                VARCHAR(255) NOT NULL,
  description          TEXT,
  location_id          UUID REFERENCES locations(id) ON DELETE SET NULL,
  assigned_to_id       UUID REFERENCES staff_members(id) ON DELETE SET NULL,
  assigned_by_id       UUID REFERENCES users(id) ON DELETE SET NULL,
  priority             VARCHAR(20) NOT NULL DEFAULT 'medium'
                       CHECK (priority IN ('low','medium','high','urgent')),
  status               VARCHAR(20) NOT NULL DEFAULT 'open'
                       CHECK (status IN ('open','in_progress','completed','cancelled')),
  due_date             DATE,
  completed_at         TIMESTAMPTZ,
  completion_note      TEXT,
  related_order_id     UUID,
  related_entity_type  VARCHAR(50),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_staff_members') THEN
    CREATE TRIGGER set_updated_at_staff_members
      BEFORE UPDATE ON staff_members
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_staff_attendance') THEN
    CREATE TRIGGER set_updated_at_staff_attendance
      BEFORE UPDATE ON staff_attendance
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_tasks') THEN
    CREATE TRIGGER set_updated_at_tasks
      BEFORE UPDATE ON tasks
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
