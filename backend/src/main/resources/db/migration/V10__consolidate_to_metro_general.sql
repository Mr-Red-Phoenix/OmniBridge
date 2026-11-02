-- ============================================================================
-- V10: Consolidate to Sole Facility: Metro General Hospital & Trauma Center
-- Reassign all references to Metro General Hospital and remove legacy sub-wards
-- ============================================================================

DO $$
DECLARE
    metro_id BIGINT;
BEGIN
    SELECT id INTO metro_id FROM venue WHERE slug = 'metro-general-hospital' LIMIT 1;

    IF metro_id IS NOT NULL THEN
        -- 1. Reassign any incidents tied to other venues
        UPDATE incident 
        SET venue_id = metro_id 
        WHERE venue_id != metro_id;

        -- 2. Reassign any staff users tied to other venues
        UPDATE staff_user 
        SET venue_id = metro_id 
        WHERE venue_id != metro_id;

        -- 3. Reassign any patient intakes tied to other venues
        UPDATE patient_intake 
        SET venue_id = metro_id 
        WHERE venue_id != metro_id;

        -- 4. Reassign any broadcast alerts tied to other venues
        UPDATE broadcast_alert 
        SET venue_id = metro_id 
        WHERE venue_id != metro_id;

        -- 5. Delete other venues
        DELETE FROM venue 
        WHERE id != metro_id;
    END IF;
END $$;
