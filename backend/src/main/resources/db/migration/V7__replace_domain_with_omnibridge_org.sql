-- V7 migration: Update all staff emails from @metrogeneral.org to @omnibridge.org
-- Admin: admin@omnibridge.org
-- Doctors: doctor1@omnibridge.org, doctor2@omnibridge.org
-- Nurses: nurse1@omnibridge.org, nurse2@omnibridge.org
-- Guards: guard1@omnibridge.org, guard2@omnibridge.org

-- 1. Unlink previous references to ensure clean removal/migration
UPDATE incident SET assigned_to_id = NULL WHERE assigned_to_id IN (
    SELECT id FROM staff_user WHERE email LIKE '%@metrogeneral.org'
);

UPDATE incident SET verified_by_id = NULL WHERE verified_by_id IN (
    SELECT id FROM staff_user WHERE email LIKE '%@metrogeneral.org'
);

UPDATE incident_update SET author_id = NULL WHERE author_id IN (
    SELECT id FROM staff_user WHERE email LIKE '%@metrogeneral.org'
);

UPDATE broadcast_alert SET author_id = NULL WHERE author_id IN (
    SELECT id FROM staff_user WHERE email LIKE '%@metrogeneral.org'
);

UPDATE patient_intake SET assigned_doctor_id = NULL WHERE assigned_doctor_id IN (
    SELECT id FROM staff_user WHERE email LIKE '%@metrogeneral.org'
);

-- 2. Remove any old sessions / otps for metrogeneral accounts
DELETE FROM otp_verifications WHERE email LIKE '%@metrogeneral.org';
DELETE FROM ott_token WHERE user_id IN (SELECT id FROM staff_user WHERE email LIKE '%@metrogeneral.org');
DELETE FROM refresh_tokens WHERE user_id IN (SELECT id FROM staff_user WHERE email LIKE '%@metrogeneral.org');

-- 3. Delete old @metrogeneral.org staff users
DELETE FROM staff_user WHERE email LIKE '%@metrogeneral.org';

-- 4. Seed new @omnibridge.org accounts
-- 4.1 Sole Admin
INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'System Administrator',
       'admin@omnibridge.org',
       'ADMIN',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'ADMIN', name = EXCLUDED.name;

-- 4.2 Two Coordinators / Doctors
INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Doctor 1 (Coordinator)',
       'doctor1@omnibridge.org',
       'COORDINATOR',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'COORDINATOR', name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Doctor 2 (Coordinator)',
       'doctor2@omnibridge.org',
       'COORDINATOR',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'COORDINATOR', name = EXCLUDED.name;

-- 4.3 Two Staff / Nurses
INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Nurse 1 (Triage Intake)',
       'nurse1@omnibridge.org',
       'STAFF',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'STAFF', name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Nurse 2 (Triage Intake)',
       'nurse2@omnibridge.org',
       'STAFF',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'STAFF', name = EXCLUDED.name;

-- 4.4 Two Security Guards
INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Guard 1 (Security Dispatch)',
       'guard1@omnibridge.org',
       'SECURITY',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'SECURITY', name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Guard 2 (Security Dispatch)',
       'guard2@omnibridge.org',
       'SECURITY',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'SECURITY', name = EXCLUDED.name;
