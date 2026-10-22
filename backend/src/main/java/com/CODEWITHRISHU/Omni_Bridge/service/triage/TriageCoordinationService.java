package com.CODEWITHRISHU.Omni_Bridge.service.triage;

import com.CODEWITHRISHU.Omni_Bridge.dto.triage.TriageDtos;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.Venue;
import com.CODEWITHRISHU.Omni_Bridge.entity.triage.PatientIntake;
import com.CODEWITHRISHU.Omni_Bridge.entity.triage.PatientStatus;
import com.CODEWITHRISHU.Omni_Bridge.exception.ResourceNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.repository.PatientIntakeRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.VenueRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.PriorityBlockingQueue;

@Service
@Slf4j
@RequiredArgsConstructor
public class TriageCoordinationService {

    private final PatientIntakeRepository intakeRepository;
    private final VenueRepository venueRepository;
    private final ContextualEsiEngine esiEngine;
    private final AsyncAuditLedgerService auditLedgerService;
    private final SimpMessagingTemplate messagingTemplate;

    // In-memory RAM Priority Heap per Venue for air-gapped real-time queue ordering
    private final Map<Long, PriorityBlockingQueue<PatientIntake>> venuePriorityQueues = new ConcurrentHashMap<>();

    private PriorityBlockingQueue<PatientIntake> getQueueForVenue(Long venueId) {
        return venuePriorityQueues.computeIfAbsent(venueId, id ->
                new PriorityBlockingQueue<>(100, Comparator.comparingDouble(PatientIntake::getCalculatedPriorityScore).reversed())
        );
    }

    /**
     * Non-blocking queue hydration on service startup.
     */
    @PostConstruct
    public void hydratePriorityQueues() {
        try {
            List<PatientStatus> activeStatuses = List.of(
                    PatientStatus.QUEUED,
                    PatientStatus.IN_EXAM,
                    PatientStatus.FLAGGED_FOR_REVIEW,
                    PatientStatus.SPECIAL_REQUEST
            );
            List<PatientIntake> activePatients = intakeRepository.findAll().stream()
                    .filter(p -> activeStatuses.contains(p.getStatus()))
                    .toList();

            for (PatientIntake p : activePatients) {
                if (p.getVenue() != null && p.getVenue().getId() != null) {
                    getQueueForVenue(p.getVenue().getId()).offer(p);
                }
            }
            log.info("[TriageCoordination] Safely hydrated {} active triage records into in-memory priority heaps.", activePatients.size());
        } catch (Exception ex) {
            log.warn("[TriageCoordination] Non-blocking initial queue hydration deferred: {}", ex.getMessage());
        }
    }

    /**
     * Process Nurse Intake (/api/v1/triage/intake):
     * Restrict to STAFF, compute ESI score, determine if flagged for review,
     * persist to DB, push to RAM priority queue, broadcast via WebSockets, and trigger async immutable audit ledger.
     */
    @Transactional
    public TriageDtos.QueueItemResponse processNurseIntake(TriageDtos.IntakeRequest request, StaffUser nurse) {
        int baseEsi = esiEngine.calculateBaseEsiLevel(request);
        Instant now = Instant.now();
        double priorityScore = esiEngine.calculateDynamicPriorityScore(baseEsi, now, request);

        PatientStatus initialStatus = request.isEscalationRequested()
                ? PatientStatus.FLAGGED_FOR_REVIEW
                : PatientStatus.QUEUED;

        PatientIntake intake = new PatientIntake();
        intake.setTrackingCode("OB-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase());
        intake.setVenue(nurse.getVenue());
        intake.setRegisteredBy(nurse);
        intake.setPatientName(request.patientName().trim());
        intake.setAge(request.age());
        intake.setGender(request.gender().trim());
        intake.setChiefComplaint(request.chiefComplaint().trim());

        // Objective Vitals
        intake.setHeartRate(request.heartRate());
        intake.setSystolicBp(request.systolicBp());
        intake.setDiastolicBp(request.diastolicBp());
        intake.setRespiratoryRate(request.respiratoryRate());
        intake.setOxygenSaturation(request.oxygenSaturation());
        intake.setBodyTemperature(request.bodyTemperature());
        intake.setConsciousnessLevel(request.consciousnessLevel() != null ? request.consciousnessLevel().trim().toUpperCase() : "ALERT");

        // Subjective Bias Panel
        intake.setPainScore(request.getEffectivePainScore());
        intake.setHighRiskCondition(Boolean.TRUE.equals(request.highRiskCondition()));
        intake.setResourcesNeeded(request.getEffectiveResources());
        intake.setSubjectiveNotes(request.subjectiveNotes());

        // ESI & Scores
        intake.setEsiLevel(baseEsi);
        intake.setCalculatedPriorityScore(priorityScore);
        intake.setStatus(initialStatus);

        PatientIntake saved = intakeRepository.save(intake);

        // Enqueue to in-memory priority heap if actively queued
        if (saved.getStatus() == PatientStatus.QUEUED) {
            getQueueForVenue(nurse.getVenue().getId()).offer(saved);
        }

        // Asynchronously record into immutable audit ledger using Java 21 Virtual Threads
        Map<String, Object> vitalsMap = buildVitalsSnapshot(request);
        String actionType = request.isEscalationRequested() ? "INTAKE_CREATED_FLAGGED_FOR_REVIEW" : "INTAKE_CREATED_QUEUED";
        auditLedgerService.recordAuditEntry(
                saved,
                nurse,
                actionType,
                null,
                baseEsi,
                null,
                priorityScore,
                request.isEscalationRequested() ? "Nurse requested doctor review during intake" : "Nurse intake completed",
                vitalsMap
        );

        // Broadcast real-time updated queue to STOMP topic
        broadcastQueueUpdate(nurse.getVenue().getId());

        log.info("[TriageCoordination] Registered patient {} (Tracking: {}, ESI: {}, Score: {}, Status: {}) by nurse {}",
                saved.getPatientName(), saved.getTrackingCode(), saved.getEsiLevel(), saved.getCalculatedPriorityScore(), saved.getStatus(), nurse.getEmail());

        return TriageDtos.QueueItemResponse.fromEntity(saved);
    }

    /**
     * Process Doctor Override / Review (/api/v1/triage/review):
     * Restrict to DOCTOR, update ESI level, adjust priority score, clear review flag,
     * reorder RAM priority queue, broadcast via WebSockets, and trigger immutable audit log.
     */
    @Transactional
    public TriageDtos.QueueItemResponse processDoctorReview(TriageDtos.DoctorReviewRequest request, StaffUser doctor) {
        PatientIntake intake = intakeRepository.findById(request.intakeId())
                .orElseThrow(() -> new ResourceNotFoundException("Patient intake record not found with id: " + request.intakeId()));

        int oldEsi = intake.getEsiLevel();
        double oldScore = intake.getCalculatedPriorityScore();
        int newEsi = request.newEsiLevel();

        // Recalculate score with new ESI level and accumulated wait time
        double newScore = esiEngine.calculateDynamicPriorityScore(newEsi, intake.getCreatedAt(), null);

        intake.setEsiLevel(newEsi);
        intake.setCalculatedPriorityScore(newScore);
        intake.setIsOverridden(true);
        intake.setOverrideReason(request.clinicalJustification().trim());
        intake.setAssignedDoctor(doctor);

        if (request.shouldApproveAndQueue()) {
            intake.setStatus(PatientStatus.QUEUED);
        } else {
            intake.setStatus(PatientStatus.SPECIAL_REQUEST);
        }

        PatientIntake updated = intakeRepository.save(intake);

        // Update RAM priority queue
        PriorityBlockingQueue<PatientIntake> queue = getQueueForVenue(intake.getVenue().getId());
        queue.removeIf(p -> p.getId().equals(updated.getId()));
        if (updated.getStatus() == PatientStatus.QUEUED) {
            queue.offer(updated);
        }

        // Asynchronously record into immutable audit ledger using Virtual Threads
        auditLedgerService.recordAuditEntry(
                updated,
                doctor,
                "DOCTOR_CLINICAL_OVERRIDE",
                oldEsi,
                newEsi,
                oldScore,
                newScore,
                request.clinicalJustification(),
                Map.of("assignedDoctor", doctor.getName(), "doctorEmail", doctor.getEmail())
        );

        // Broadcast real-time updated queue
        broadcastQueueUpdate(intake.getVenue().getId());

        log.info("[TriageCoordination] Doctor {} updated intake {} from ESI {} to {}. Justification: '{}'",
                doctor.getEmail(), updated.getId(), oldEsi, newEsi, request.clinicalJustification());

        return TriageDtos.QueueItemResponse.fromEntity(updated);
    }

    /**
     * Read Active Queue for Venue (/api/v1/triage/queue):
     * Hydrate initial UI state before WebSocket subscription.
     */
    @Transactional
    public List<TriageDtos.QueueItemResponse> getActiveQueue(Long venueId) {
        List<PatientStatus> activeStatuses = List.of(
                PatientStatus.QUEUED,
                PatientStatus.IN_EXAM,
                PatientStatus.FLAGGED_FOR_REVIEW,
                PatientStatus.SPECIAL_REQUEST
        );
        List<PatientIntake> patients = intakeRepository.findActiveQueue(venueId, activeStatuses);

        // Dynamically evaluate wait-time decay and objective risk bonuses on read
        for (PatientIntake p : patients) {
            double currentScore = esiEngine.calculateDynamicPriorityScore(p);
            p.setCalculatedPriorityScore(currentScore);
        }

        // Sort priority queue: Highest dynamic priority score first; FIFO tie-breaker on createdAt
        patients.sort(Comparator.comparingDouble(PatientIntake::getCalculatedPriorityScore).reversed()
                .thenComparing(PatientIntake::getCreatedAt));

        return patients.stream()
                .map(TriageDtos.QueueItemResponse::fromEntity)
                .toList();
    }

    /**
     * Update Patient Status:
     * Accessible by Doctors and Nurses to take patients out of the active queue
     * (e.g. IN_EXAM, ADMITTED, or DISCHARGED), removing them from the waiting heap
     * and recording an audit ledger event.
     */
    @Transactional
    public TriageDtos.QueueItemResponse updatePatientStatus(
            Long intakeId,
            TriageDtos.PatientStatusUpdateRequest request,
            StaffUser staffUser) {

        PatientIntake intake = intakeRepository.findById(intakeId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient intake not found with ID: " + intakeId));

        PatientStatus oldStatus = intake.getStatus();
        PatientStatus newStatus = request.status();

        intake.setStatus(newStatus);
        PatientIntake saved = intakeRepository.save(intake);

        // Update in-memory priority queue
        PriorityBlockingQueue<PatientIntake> queue = getQueueForVenue(intake.getVenue().getId());
        queue.removeIf(p -> p.getId().equals(saved.getId()));
        if (newStatus == PatientStatus.QUEUED) {
            queue.offer(saved);
        }

        // Asynchronously record into immutable audit ledger
        String action = "PATIENT_STATUS_" + newStatus.name();
        String justification = request.notes() != null && !request.notes().isBlank()
                ? request.notes()
                : "Status transitioned from " + oldStatus + " to " + newStatus + " by " + staffUser.getName();

        auditLedgerService.recordAuditEntry(
                saved,
                staffUser,
                action,
                intake.getEsiLevel(),
                intake.getEsiLevel(),
                intake.getCalculatedPriorityScore(),
                intake.getCalculatedPriorityScore(),
                justification,
                Map.of(
                        "staffName", staffUser.getName(),
                        "staffEmail", staffUser.getEmail(),
                        "staffRole", staffUser.getRole().name(),
                        "previousStatus", oldStatus.name(),
                        "newStatus", newStatus.name()
                )
        );

        // Broadcast updated queue to connected clients
        broadcastQueueUpdate(intake.getVenue().getId());

        log.info("[TriageCoordination] Patient {} ({}) transitioned from {} to {} by {} ({})",
                saved.getPatientName(), saved.getTrackingCode(), oldStatus, newStatus, staffUser.getName(), staffUser.getRole());

        return TriageDtos.QueueItemResponse.fromEntity(saved);
    }


    /**
     * Read Public Hall Queue by venue slug or default venue.
     */
    @Transactional
    public List<TriageDtos.QueueItemResponse> getPublicQueue(String venueSlug) {
        Long venueId = 1L;
        if (venueSlug != null && !venueSlug.isBlank() && !"default".equalsIgnoreCase(venueSlug)) {
            venueId = venueRepository.findBySlug(venueSlug)
                    .map(Venue::getId)
                    .orElse(1L);
        }
        return getActiveQueue(venueId);
    }

    private void broadcastQueueUpdate(Long venueId) {
        try {
            List<TriageDtos.QueueItemResponse> currentQueue = getActiveQueue(venueId);
            messagingTemplate.convertAndSend("/topic/queue", currentQueue);
            messagingTemplate.convertAndSend("/topic/venue/" + venueId + "/queue", currentQueue);
        } catch (Exception e) {
            log.warn("[TriageCoordination] Real-time queue broadcast notification failed: {}", e.getMessage());
        }
    }

    private Map<String, Object> buildVitalsSnapshot(TriageDtos.IntakeRequest r) {
        Map<String, Object> map = new HashMap<>();
        if (r.heartRate() != null) map.put("hr", r.heartRate());
        if (r.systolicBp() != null) map.put("sbp", r.systolicBp());
        if (r.diastolicBp() != null) map.put("dbp", r.diastolicBp());
        if (r.respiratoryRate() != null) map.put("rr", r.respiratoryRate());
        if (r.oxygenSaturation() != null) map.put("spo2", r.oxygenSaturation());
        if (r.bodyTemperature() != null) map.put("temp", r.bodyTemperature());
        if (r.consciousnessLevel() != null) map.put("avpu", r.consciousnessLevel());
        if (r.painScore() != null) map.put("pain", r.painScore());
        if (r.resourcesNeeded() != null) map.put("resources", r.resourcesNeeded());
        if (r.infantFlag() != null) map.put("infant", r.infantFlag());
        return map;
    }
}
