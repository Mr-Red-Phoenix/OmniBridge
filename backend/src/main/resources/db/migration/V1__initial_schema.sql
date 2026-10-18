-- 1. Venue Table
CREATE TABLE IF NOT EXISTS venue (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    address VARCHAR(300) NOT NULL,
    emergency_instructions VARCHAR(1000) NOT NULL,
    gate_code VARCHAR(100),
    knox_box_location VARCHAR(255),
    floor_plan_url VARCHAR(500),
    emergency_contact_phone VARCHAR(50)
);

-- 2. Staff User Table (Passwordless MFA Architecture)
CREATE TABLE IF NOT EXISTS staff_user (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL,
    venue_id BIGINT NOT NULL REFERENCES venue(id)
);

-- 3. Incident Table
CREATE TABLE IF NOT EXISTS incident (
    id BIGSERIAL PRIMARY KEY,
    venue_id BIGINT NOT NULL REFERENCES venue(id),
    type VARCHAR(30) NOT NULL,
    severity VARCHAR(30) NOT NULL,
    description VARCHAR(2000) NOT NULL,
    location VARCHAR(200) NOT NULL,
    reporter_name VARCHAR(160),
    reporter_phone VARCHAR(40),
    status VARCHAR(30) NOT NULL,
    assigned_to_id BIGINT REFERENCES staff_user(id),
    guest_access_token VARCHAR(64) UNIQUE,
    responder_token VARCHAR(64) UNIQUE,
    emergency_dispatched BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_dispatched_at TIMESTAMPTZ,
    source VARCHAR(30) NOT NULL DEFAULT 'GUEST',
    reporter_ip VARCHAR(45),
    reporter_user_agent VARCHAR(255),
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    verified_at TIMESTAMPTZ,
    verified_by_id BIGINT REFERENCES staff_user(id),
    false_alarm_reason VARCHAR(500),
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- 4. Incident Updates & Public Logs
CREATE TABLE IF NOT EXISTS incident_update (
    id BIGSERIAL PRIMARY KEY,
    incident_id BIGINT NOT NULL REFERENCES incident(id),
    author_id BIGINT REFERENCES staff_user(id),
    message VARCHAR(1000) NOT NULL,
    is_public_to_guest BOOLEAN NOT NULL DEFAULT TRUE,
    update_type VARCHAR(30) NOT NULL DEFAULT 'NOTE',
    created_at TIMESTAMPTZ NOT NULL
);

-- 5. Broadcast Emergency Alerts
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

-- 6. OTP MFA Verifications
CREATE TABLE IF NOT EXISTS otp_verifications (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(254),
    phone VARCHAR(20) NOT NULL,
    otp VARCHAR(64) NOT NULL,
    verified BOOLEAN NOT NULL DEFAULT FALSE,
    attempts INT NOT NULL DEFAULT 0,
    user_id BIGINT REFERENCES staff_user(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- 7. One-Time Token (OTT / Magic Link)
CREATE TABLE IF NOT EXISTS ott_token (
    id BIGSERIAL PRIMARY KEY,
    access_token VARCHAR(100) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL UNIQUE REFERENCES staff_user(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- 8. Refresh Tokens
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id BIGSERIAL PRIMARY KEY,
    refresh_token VARCHAR(100) NOT NULL UNIQUE,
    factors VARCHAR(200) NOT NULL DEFAULT '',
    user_id BIGINT NOT NULL UNIQUE REFERENCES staff_user(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_incident_venue_status ON incident(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_incident_update_timeline ON incident_update(incident_id, created_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_venue_active ON broadcast_alert(venue_id, active);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_verifications(user_id, verified);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_ott_expires ON ott_token(expires_at);
