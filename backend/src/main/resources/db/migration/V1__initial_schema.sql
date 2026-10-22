-- ============================================================================
-- OmniBridge 2.0 Unified Schema (Venue SOS + Air-Gapped ESI Triage Engine)
-- ============================================================================

-- 1. Venue Table (Facilities, Wards & Triage Stations)
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

-- 2. Staff User Table (Unified Auth & RBAC: STAFF, DOCTOR, SECURITY, ADMIN)
CREATE TABLE IF NOT EXISTS staff_user (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    role VARCHAR(30) NOT NULL,
    venue_id BIGINT NOT NULL REFERENCES venue(id) ON DELETE RESTRICT
);

-- 3. Incident Table (Venue SOS & Crisis Management)
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
    incident_id BIGINT NOT NULL REFERENCES incident(id) ON DELETE CASCADE,
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

-- ============================================================================
-- ESI TRIAGE ENGINE TABLES
-- ============================================================================

-- 9. Patient Intake (ESI Triage Form & Queue Records)
CREATE TABLE IF NOT EXISTS patient_intake (
    id BIGSERIAL PRIMARY KEY,
    tracking_code VARCHAR(32) NOT NULL UNIQUE,
    venue_id BIGINT NOT NULL REFERENCES venue(id),
    registered_by_id BIGINT NOT NULL REFERENCES staff_user(id),
    assigned_doctor_id BIGINT REFERENCES staff_user(id),
    
    -- Patient Demographics & Anonymized Display
    patient_name VARCHAR(160) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    chief_complaint VARCHAR(1000) NOT NULL,
    
    -- Objective Vitals Panel
    heart_rate INT,
    systolic_bp INT,
    diastolic_bp INT,
    respiratory_rate INT,
    oxygen_saturation DOUBLE PRECISION,
    body_temperature DOUBLE PRECISION,
    consciousness_level VARCHAR(20) NOT NULL DEFAULT 'ALERT',
    
    -- Subjective Bias & Clinical Risk Factors
    pain_score INT NOT NULL DEFAULT 0,
    high_risk_condition BOOLEAN NOT NULL DEFAULT FALSE,
    resources_needed INT NOT NULL DEFAULT 0,
    subjective_notes VARCHAR(1000),
    
    -- Computed ESI Scoring & Dynamic Queue Priority
    esi_level INT NOT NULL,
    calculated_priority_score DOUBLE PRECISION NOT NULL,
    is_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason VARCHAR(1000),
    
    -- Workflow Status
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    admitted_at TIMESTAMPTZ,
    discharged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

-- 10. Triage Audit Ledger (Immutable Ledger for Score & Override Transparency)
CREATE TABLE IF NOT EXISTS triage_audit_ledger (
    id BIGSERIAL PRIMARY KEY,
    intake_id BIGINT NOT NULL REFERENCES patient_intake(id) ON DELETE CASCADE,
    actor_id BIGINT NOT NULL REFERENCES staff_user(id),
    action VARCHAR(50) NOT NULL,
    previous_esi_level INT,
    new_esi_level INT,
    previous_score DOUBLE PRECISION,
    new_score DOUBLE PRECISION,
    reason VARCHAR(1000) NOT NULL,
    metadata_json TEXT,
    created_at TIMESTAMPTZ NOT NULL
);

-- ============================================================================
-- Indexes for High-Concurrency Performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_incident_venue_status ON incident(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_incident_update_timeline ON incident_update(incident_id, created_at);
CREATE INDEX IF NOT EXISTS idx_broadcast_venue_active ON broadcast_alert(venue_id, active);
CREATE INDEX IF NOT EXISTS idx_otp_user ON otp_verifications(user_id, verified);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS idx_ott_expires ON ott_token(expires_at);

-- ESI Triage & Queue Indexes
CREATE INDEX IF NOT EXISTS idx_intake_venue_status ON patient_intake(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_intake_queue_priority ON patient_intake(status, calculated_priority_score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_intake_tracking_code ON patient_intake(tracking_code);
CREATE INDEX IF NOT EXISTS idx_triage_audit_intake ON triage_audit_ledger(intake_id, created_at);
