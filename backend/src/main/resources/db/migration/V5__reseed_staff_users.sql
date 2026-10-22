-- V5 migration: Clean up old demo staff users and seed updated team members
-- Clean emails without personal names:
-- Admin: admin@metrogeneral.org
-- Doctors: doctor1@metrogeneral.org, doctor2@metrogeneral.org
-- Nurses: nurse1@metrogeneral.org, nurse2@metrogeneral.org
-- Guards: guard1@metrogeneral.org, guard2@metrogeneral.org

-- Unlink previous references to ensure clean removal
UPDATE incident SET assigned_to_id = NULL WHERE assigned_to_id IN (
    SELECT id FROM staff_user WHERE email IN (
        'mr.parthsharma20@gmail.com',
        'dr.adams@metrogeneral.org',
        'dr.ross@metrogeneral.org',
        'nurse.elena@metrogeneral.org',
        'nurse.chen@metrogeneral.org',
        'security.marcus@metrogeneral.org',
        'security.mercer@metrogeneral.org',
        'doctor@metrogeneral.org',
        'coordinator@metrogeneral.org',
        'nurse@metrogeneral.org',
        'security@metrogeneral.org'
    )
);

UPDATE incident SET verified_by_id = NULL WHERE verified_by_id IN (
    SELECT id FROM staff_user WHERE email IN (
        'mr.parthsharma20@gmail.com',
        'dr.adams@metrogeneral.org',
        'dr.ross@metrogeneral.org',
        'nurse.elena@metrogeneral.org',
        'nurse.chen@metrogeneral.org',
        'security.marcus@metrogeneral.org',
        'security.mercer@metrogeneral.org',
        'doctor@metrogeneral.org',
        'coordinator@metrogeneral.org',
        'nurse@metrogeneral.org',
        'security@metrogeneral.org'
    )
);

UPDATE incident_update SET author_id = NULL WHERE author_id IN (
    SELECT id FROM staff_user WHERE email IN (
        'mr.parthsharma20@gmail.com',
        'dr.adams@metrogeneral.org',
        'dr.ross@metrogeneral.org',
        'nurse.elena@metrogeneral.org',
        'nurse.chen@metrogeneral.org',
        'security.marcus@metrogeneral.org',
        'security.mercer@metrogeneral.org',
        'doctor@metrogeneral.org',
        'coordinator@metrogeneral.org',
        'nurse@metrogeneral.org',
        'security@metrogeneral.org'
    )
);

UPDATE broadcast_alert SET author_id = NULL WHERE author_id IN (
    SELECT id FROM staff_user WHERE email IN (
        'mr.parthsharma20@gmail.com',
        'dr.adams@metrogeneral.org',
        'dr.ross@metrogeneral.org',
        'nurse.elena@metrogeneral.org',
        'nurse.chen@metrogeneral.org',
        'security.marcus@metrogeneral.org',
        'security.mercer@metrogeneral.org',
        'doctor@metrogeneral.org',
        'coordinator@metrogeneral.org',
        'nurse@metrogeneral.org',
        'security@metrogeneral.org'
    )
);

UPDATE patient_intake SET assigned_doctor_id = NULL WHERE assigned_doctor_id IN (
    SELECT id FROM staff_user WHERE email IN (
        'mr.parthsharma20@gmail.com',
        'dr.adams@metrogeneral.org',
        'dr.ross@metrogeneral.org',
        'nurse.elena@metrogeneral.org',
        'nurse.chen@metrogeneral.org',
        'security.marcus@metrogeneral.org',
        'security.mercer@metrogeneral.org',
        'doctor@metrogeneral.org',
        'coordinator@metrogeneral.org',
        'nurse@metrogeneral.org',
        'security@metrogeneral.org'
    )
);

-- Delete previous demo accounts
DELETE FROM staff_user WHERE email IN (
    'mr.parthsharma20@gmail.com',
    'dr.adams@metrogeneral.org',
    'dr.ross@metrogeneral.org',
    'nurse.elena@metrogeneral.org',
    'nurse.chen@metrogeneral.org',
    'security.marcus@metrogeneral.org',
    'security.mercer@metrogeneral.org',
    'doctor@metrogeneral.org',
    'coordinator@metrogeneral.org',
    'nurse@metrogeneral.org',
    'security@metrogeneral.org'
);

-- 1. Sole Admin
INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'System Administrator',
       'admin@metrogeneral.org',
       'ADMIN',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'ADMIN', name = EXCLUDED.name;

-- 2. Two Coordinators / Doctors
INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Doctor 1 (Coordinator)',
       'doctor1@metrogeneral.org',
       'COORDINATOR',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'COORDINATOR', name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Doctor 2 (Coordinator)',
       'doctor2@metrogeneral.org',
       'COORDINATOR',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'COORDINATOR', name = EXCLUDED.name;

-- 3. Two Staff / Nurses
INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Nurse 1 (Triage Intake)',
       'nurse1@metrogeneral.org',
       'STAFF',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'STAFF', name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Nurse 2 (Triage Intake)',
       'nurse2@metrogeneral.org',
       'STAFF',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'STAFF', name = EXCLUDED.name;

-- 4. Two Security Guards
INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Guard 1 (Security Dispatch)',
       'guard1@metrogeneral.org',
       'SECURITY',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'SECURITY', name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Guard 2 (Security Dispatch)',
       'guard2@metrogeneral.org',
       'SECURITY',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = 'SECURITY', name = EXCLUDED.name;

