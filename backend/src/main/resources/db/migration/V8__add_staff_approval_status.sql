-- V8 migration: Add approval status to staff_user table
-- All existing staff users are grandfathered as APPROVED
-- New registrations default to PENDING until approved by an ADMIN

ALTER TABLE staff_user 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'APPROVED';

-- Ensure all current active seed users are APPROVED
UPDATE staff_user SET status = 'APPROVED' WHERE status IS NULL OR status = '';
