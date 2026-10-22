package com.CODEWITHRISHU.Omni_Bridge.dto.triage;

import com.CODEWITHRISHU.Omni_Bridge.entity.triage.PatientIntake;
import com.CODEWITHRISHU.Omni_Bridge.entity.triage.PatientStatus;
import jakarta.validation.constraints.*;

import java.time.Instant;

public final class TriageDtos {

    private TriageDtos() {}

    /**
     * Request payload submitted by Nurses (ROLE_STAFF) during triage intake.
     */
    public record IntakeRequest(
            @NotBlank(message = "Patient name is required")
            @Size(max = 160)
            String patientName,

            @NotNull(message = "Age is required")
            @Min(0) @Max(130)
            Integer age,

            @NotBlank(message = "Gender is required")
            @Size(max = 20)
            String gender,

            @NotBlank(message = "Chief complaint is required")
            @Size(max = 1000)
            String chiefComplaint,

            // Objective Vitals
            @Min(20) @Max(300)
            Integer heartRate,

            @Min(40) @Max(300)
            Integer systolicBp,

            @Min(20) @Max(200)
            Integer diastolicBp,

            @Min(4) @Max(80)
            Integer respiratoryRate,

            @DecimalMin("50.0") @DecimalMax("100.0")
            Double oxygenSaturation,

            @DecimalMin("30.0") @DecimalMax("45.0")
            Double bodyTemperature,

            @Size(max = 20)
            String consciousnessLevel, // ALERT, VERBAL, PAIN, UNRESPONSIVE

            // Subjective Bias Panel & Clinical Risk Factors
            @Min(0) @Max(10)
            Integer painScore,

            Boolean infantFlag, // Specific pediatric concern (< 1 year or high fever)
            Boolean highRiskCondition,
            Boolean fever,
            String lastMealTime,

            @Min(0) @Max(10)
            Integer resourcesNeeded, // Projected ER resources

            @Size(max = 1000)
            String subjectiveNotes,

            // Escalation flag
            Boolean requestDoctorReview
    ) {
        public int getEffectivePainScore() {
            return painScore != null ? painScore : 0;
        }

        public int getEffectiveResources() {
            return resourcesNeeded != null ? resourcesNeeded : 0;
        }

        public boolean isEscalationRequested() {
            return Boolean.TRUE.equals(requestDoctorReview);
        }
    }

    /**
     * Doctor review / clinical override request restricted to ROLE_DOCTOR.
     */
    public record DoctorReviewRequest(
            @NotNull(message = "Intake ID is required")
            Long intakeId,

            @NotNull(message = "ESI Level is required")
            @Min(value = 1, message = "ESI level must be between 1 (Immediate) and 5 (Non-urgent)")
            @Max(value = 5, message = "ESI level must be between 1 (Immediate) and 5 (Non-urgent)")
            Integer newEsiLevel,

            @NotBlank(message = "Clinical justification note is required")
            @Size(max = 1000, message = "Justification note cannot exceed 1000 characters")
            String clinicalJustification,

            Boolean approveAndQueue // true to move to active QUEUED, false to keep in review/special request
    ) {
        public boolean shouldApproveAndQueue() {
            return approveAndQueue == null || Boolean.TRUE.equals(approveAndQueue);
        }
    }

    /**
     * Request payload to transition patient status (e.g. IN_EXAM, ADMITTED, DISCHARGED).
     * Accessible by Doctors and Nurses.
     */
    public record PatientStatusUpdateRequest(
            @NotNull(message = "New status is required")
            PatientStatus status,

            @Size(max = 1000)
            String notes
    ) {}

    /**
     * DTO representing patient item in the priority queue.
     */
    public record QueueItemResponse(
            Long id,
            String trackingCode,
            String patientName,
            Integer age,
            String gender,
            String chiefComplaint,
            Integer esiLevel,
            Double calculatedPriorityScore,
            PatientStatus status,
            Boolean isOverridden,
            String overrideReason,
            String consciousnessLevel,
            Integer heartRate,
            Integer systolicBp,
            Integer diastolicBp,
            Double oxygenSaturation,
            Double bodyTemperature,
            Integer painScore,
            Boolean highRiskCondition,
            String subjectiveNotes,
            Integer resourcesNeeded,
            Instant createdAt,
            Instant updatedAt,
            Long waitTimeMinutes
    ) {
        public static QueueItemResponse fromEntity(PatientIntake entity) {
            long waitMinutes = 0;
            if (entity.getCreatedAt() != null) {
                waitMinutes = java.time.Duration.between(entity.getCreatedAt(), Instant.now()).toMinutes();
            }
            return new QueueItemResponse(
                    entity.getId(),
                    entity.getTrackingCode(),
                    entity.getPatientName(),
                    entity.getAge(),
                    entity.getGender(),
                    entity.getChiefComplaint(),
                    entity.getEsiLevel(),
                    entity.getCalculatedPriorityScore(),
                    entity.getStatus(),
                    entity.getIsOverridden(),
                    entity.getOverrideReason(),
                    entity.getConsciousnessLevel(),
                    entity.getHeartRate(),
                    entity.getSystolicBp(),
                    entity.getDiastolicBp(),
                    entity.getOxygenSaturation(),
                    entity.getBodyTemperature(),
                    entity.getPainScore(),
                    entity.getHighRiskCondition(),
                    entity.getSubjectiveNotes(),
                    entity.getResourcesNeeded(),
                    entity.getCreatedAt(),
                    entity.getUpdatedAt(),
                    waitMinutes
            );
        }
    }

    /**
     * Audit log summary response DTO.
     */
    public record AuditLedgerResponse(
            Long id,
            Long intakeId,
            String actorName,
            String actorRole,
            String action,
            Integer previousEsiLevel,
            Integer newEsiLevel,
            Double previousScore,
            Double newScore,
            String reason,
            String metadataJson,
            Instant createdAt
    ) {}
}
