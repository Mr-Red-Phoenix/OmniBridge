-- ============================================================================
-- V4: Air-Gapped ESI Triage Engine Tables & Dynamic Priority Indexes
-- ============================================================================

-- 1. Patient Intake Table (Demographics, Vitals, ESI Level, Dynamic Priority)
CREATE TABLE IF NOT EXISTS patient_intake (
    id BIGSERIAL PRIMARY KEY,
    tracking_code VARCHAR(32) NOT NULL UNIQUE,
    venue_id BIGINT NOT NULL REFERENCES venue(id),
    registered_by_id BIGINT NOT NULL REFERENCES staff_user(id),
    assigned_doctor_id BIGINT REFERENCES staff_user(id),
    patient_name VARCHAR(160) NOT NULL,
    age INT NOT NULL,
    gender VARCHAR(20) NOT NULL,
    chief_complaint VARCHAR(1000) NOT NULL,
    heart_rate INT,
    systolic_bp INT,
    diastolic_bp INT,
    respiratory_rate INT,
    oxygen_saturation DOUBLE PRECISION,
    body_temperature DOUBLE PRECISION,
    consciousness_level VARCHAR(20) NOT NULL DEFAULT 'ALERT',
    pain_score INT NOT NULL DEFAULT 0,
    high_risk_condition BOOLEAN NOT NULL DEFAULT FALSE,
    resources_needed INT NOT NULL DEFAULT 0,
    subjective_notes VARCHAR(1000),
    esi_level INT NOT NULL,
    calculated_priority_score DOUBLE PRECISION NOT NULL,
    is_overridden BOOLEAN NOT NULL DEFAULT FALSE,
    override_reason VARCHAR(1000),
    status VARCHAR(30) NOT NULL DEFAULT 'QUEUED',
    admitted_at TIMESTAMPTZ,
    discharged_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Triage Audit Ledger (Immutable Clinical Audit Log)
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
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. High-Concurrency Indexes
CREATE INDEX IF NOT EXISTS idx_intake_venue_status ON patient_intake(venue_id, status);
CREATE INDEX IF NOT EXISTS idx_intake_queue_priority ON patient_intake(status, calculated_priority_score DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_intake_tracking_code ON patient_intake(tracking_code);
CREATE INDEX IF NOT EXISTS idx_triage_audit_intake ON triage_audit_ledger(intake_id, created_at);
