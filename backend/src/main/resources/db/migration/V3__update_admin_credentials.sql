-- Migration to remove previous seed user and add Parth Sharma as DB Admin
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
