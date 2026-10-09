INSERT INTO staff_user (name, email, password_hash, role, venue_id)
VALUES 
('Rishabh Gupta', 'rg2822045@gmail.com', 'dummy', 'STAFF', (SELECT id FROM venue WHERE slug = 'er-ward')),
('Parth Sharma', 'mr.parthsharma20@gmail.com', 'dummy', 'ADMIN', (SELECT id FROM venue WHERE slug = 'icu-ward')),
('Akshat Kala', 'akshat@demo.com', 'dummy', 'STAFF', (SELECT id FROM venue WHERE slug = 'maternity-ward'));
