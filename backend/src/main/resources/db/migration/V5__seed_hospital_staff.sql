
INSERT INTO staff_user (name, email, password_hash, role, venue_id)
SELECT 'Dr. Evelyn Reed (Medical Director)',
       'admin@metrogeneral.org',
       '$2a$10$7zBqmD3jW5Zz/OqG0c7Rgeu4f10yqD/Jj7Y4U0Zk2L4f7Fm9C0u8S',
       'ADMIN',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_user (name, email, password_hash, role, venue_id)
SELECT 'Dr. Sarah Adams (Trauma Coordinator)',
       'coordinator@metrogeneral.org',
       '$2a$10$7zBqmD3jW5Zz/OqG0c7Rgeu4f10yqD/Jj7Y4U0Zk2L4f7Fm9C0u8S',
       'COORDINATOR',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_user (name, email, password_hash, role, venue_id)
SELECT 'Marcus Vance (Chief of Security)',
       'security@metrogeneral.org',
       '$2a$10$7zBqmD3jW5Zz/OqG0c7Rgeu4f10yqD/Jj7Y4U0Zk2L4f7Fm9C0u8S',
       'SECURITY',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO NOTHING;

INSERT INTO staff_user (name, email, password_hash, role, venue_id)
SELECT 'Elena Rostova (Triage Nurse)',
       'nurse@metrogeneral.org',
       '$2a$10$7zBqmD3jW5Zz/OqG0c7Rgeu4f10yqD/Jj7Y4U0Zk2L4f7Fm9C0u8S',
       'STAFF',
       id
FROM venue
WHERE slug = 'metro-general-hospital'
ON CONFLICT (email) DO NOTHING;
