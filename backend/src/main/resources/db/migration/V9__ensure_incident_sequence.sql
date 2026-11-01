-- ============================================================================
-- V9: Ensure Incident Sequences Start From At Least #8
-- ============================================================================

-- Safely advance incident_id_seq to 8 if it is currently below 8, preserving existing historical data
SELECT setval('incident_id_seq', GREATEST(COALESCE((SELECT MAX(id) FROM incident), 0), 7), true);

