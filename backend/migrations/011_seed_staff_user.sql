-- ============================================================
-- 011_seed_staff_user.sql
-- Adds a default staff user for testing.
--
-- Default password: Staff@123
-- Hash: bcrypt(Staff@123, 12 rounds)
-- ============================================================

INSERT INTO users (email, name, password_hash, role, location_id, status)
SELECT
  'staff@yourcompany.com',
  'Staff User',
  '$2b$12$nJfXGkwYRBKbbOO8dv5zr.U2vG6Hb3HL8KxxwNBiaAckzkFTvrtB.',
  'staff',
  id,
  'active'
FROM locations WHERE location_code = 'ST01'
ON CONFLICT (email) DO NOTHING;
