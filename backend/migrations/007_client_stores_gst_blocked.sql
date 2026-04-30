ALTER TABLE client_stores
  ADD COLUMN IF NOT EXISTS gst_number VARCHAR(20);

ALTER TABLE client_stores
  DROP CONSTRAINT IF EXISTS client_stores_status_check;

ALTER TABLE client_stores
  ADD CONSTRAINT client_stores_status_check
    CHECK (status IN ('active', 'inactive', 'blocked'));
