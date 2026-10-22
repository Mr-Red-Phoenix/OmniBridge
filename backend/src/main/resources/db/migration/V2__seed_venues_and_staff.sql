-- 1. Seed Venues
INSERT INTO venue (name, slug, address, emergency_instructions, gate_code, knox_box_location, floor_plan_url, emergency_contact_phone)
VALUES 
('Metro General Hospital & Trauma Center',
 'metro-general-hospital',
 '500 Healthcare Parkway, Medical District',
 'Trauma and acute crisis response facility. Direct arriving emergency vehicles to Trauma Bay 2. In code red fire or active security threat, initiate ward lockdown, seal Level 3 isolation units, and follow designated emergency evacuation corridors.',
 '#9911*',
 'Main Emergency Entrance, North Wall next to Trauma Bay 2',
 'https://assets.omni-bridge.internal/maps/metro-general-hospital-tactical.pdf',
 '+1-800-911-HOSP'),

('Emergency Room',
 'er-ward',
 '500 Healthcare Parkway, Wing A',
 'For life-threatening emergencies, alert ER triage immediately.',
 '#1101*',
 'ER Triage Bay 1 Entrance',
 '',
 '+1-800-911-ER01'),

('Intensive Care Unit (ICU)',
 'icu-ward',
 '500 Healthcare Parkway, Wing B',
 'Contact code blue team for emergencies.',
 '#1102*',
 'ICU Secure Airlock',
 '',
 '+1-800-911-ICU2')
ON CONFLICT (slug) DO UPDATE 
SET name = EXCLUDED.name,
    address = EXCLUDED.address,
    emergency_instructions = EXCLUDED.emergency_instructions,
    gate_code = EXCLUDED.gate_code,
    knox_box_location = EXCLUDED.knox_box_location,
    floor_plan_url = EXCLUDED.floor_plan_url,
    emergency_contact_phone = EXCLUDED.emergency_contact_phone;

-- 2. Seed Hospital Staff Members (Passwordless MFA Accounts)
INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Dr. Evelyn Reed (Medical Director)',
       'admin@metrogeneral.org',
       'ADMIN',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Dr. Sarah Adams (Lead ER Physician)',
       'doctor@metrogeneral.org',
       'DOCTOR',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Dr. Sarah Adams (Trauma Coordinator)',
       'coordinator@metrogeneral.org',
       'COORDINATOR',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Marcus Vance (Chief of Security)',
       'security@metrogeneral.org',
       'SECURITY',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, name = EXCLUDED.name;

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Elena Rostova (Triage Nurse)',
       'nurse@metrogeneral.org',
       'STAFF',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, name = EXCLUDED.name;

DELETE FROM staff_user WHERE email = 'rg2822045@gmail.com';

INSERT INTO staff_user (name, email, role, venue_id)
SELECT 'Parth Sharma (DB Admin)',
       'mr.parthsharma20@gmail.com',
       'ADMIN',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO UPDATE 
SET role = EXCLUDED.role, name = EXCLUDED.name;
