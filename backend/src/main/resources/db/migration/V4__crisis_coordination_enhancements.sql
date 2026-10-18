ALTER TABLE venue ADD COLUMN IF NOT EXISTS gate_code VARCHAR(100);
ALTER TABLE venue ADD COLUMN IF NOT EXISTS knox_box_location VARCHAR(255);
ALTER TABLE venue ADD COLUMN IF NOT EXISTS floor_plan_url VARCHAR(500);
ALTER TABLE venue ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50);

UPDATE venue
SET gate_code = '#9911*',
    knox_box_location = 'Main Emergency Entrance, North Wall next to Trauma Bay 2',
    floor_plan_url = 'https://assets.omni-bridge.internal/maps/metro-general-hospital-tactical.pdf',
    emergency_contact_phone = '+1-800-911-HOSP'
WHERE slug = 'metro-general-hospital';

ALTER TABLE incident ADD COLUMN IF NOT EXISTS guest_access_token VARCHAR(64);
ALTER TABLE incident ADD COLUMN IF NOT EXISTS responder_token VARCHAR(64);
ALTER TABLE incident ADD COLUMN IF NOT EXISTS emergency_dispatched BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE incident ADD COLUMN IF NOT EXISTS emergency_dispatched_at TIMESTAMPTZ;
ALTER TABLE incident ADD COLUMN IF NOT EXISTS source VARCHAR(30) NOT NULL DEFAULT 'GUEST';
ALTER TABLE incident ADD COLUMN IF NOT EXISTS reporter_ip VARCHAR(45);
ALTER TABLE incident ADD COLUMN IF NOT EXISTS reporter_user_agent VARCHAR(255);
ALTER TABLE incident ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION;
ALTER TABLE incident ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;
ALTER TABLE incident ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE incident ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ;
ALTER TABLE incident ADD COLUMN IF NOT EXISTS verified_by_id BIGINT REFERENCES staff_user(id);
ALTER TABLE incident ADD COLUMN IF NOT EXISTS false_alarm_reason VARCHAR(500);

CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_guest_token ON incident(guest_access_token);
CREATE UNIQUE INDEX IF NOT EXISTS idx_incident_responder_token ON incident(responder_token);

ALTER TABLE incident_update ADD COLUMN IF NOT EXISTS is_public_to_guest BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE incident_update ADD COLUMN IF NOT EXISTS update_type VARCHAR(30) NOT NULL DEFAULT 'NOTE';

CREATE TABLE IF NOT EXISTS broadcast_alert (
    id BIGSERIAL PRIMARY KEY,
    venue_id BIGINT NOT NULL REFERENCES venue(id),
    author_id BIGINT REFERENCES staff_user(id),
    title VARCHAR(200) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    target_zone VARCHAR(100) NOT NULL DEFAULT 'ALL',
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_broadcast_venue_active ON broadcast_alert(venue_id, active);
