package com.CODEWITHRISHU.Omni_Bridge.controller;

import com.CODEWITHRISHU.Omni_Bridge.dto.triage.TriageDtos;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.service.triage.TriageCoordinationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/triage")
@RequiredArgsConstructor
public class TriageController {

    private final TriageCoordinationService triageCoordinationService;

    /**
     * Nurse Intake Endpoint:
     * Restricted to ROLE_STAFF (and higher authorities DOCTOR, ADMIN, COORDINATOR).
     * Calculates base ESI, computes initial priority score, marks as QUEUED or FLAGGED_FOR_REVIEW,
     * enqueues into in-memory priority heap, and asynchronously logs immutable audit trail.
     */
    @PostMapping("/intake")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<TriageDtos.QueueItemResponse> processIntake(
            @Valid @RequestBody TriageDtos.IntakeRequest request,
            @AuthenticationPrincipal StaffUser currentUser) {

        TriageDtos.QueueItemResponse response = triageCoordinationService.processNurseIntake(request, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    /**
     * Doctor Override / Clinical Review Endpoint:
     * Strictly restricted to ROLE_DOCTOR (and ADMIN, COORDINATOR).
     * Overrides patient ESI level with clinical justification, adjusts priority score,
     * updates heap placement, and asynchronously logs to audit ledger.
     */
    @PostMapping("/review")
    @PreAuthorize("hasAnyRole('DOCTOR', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<TriageDtos.QueueItemResponse> reviewAndOverride(
            @Valid @RequestBody TriageDtos.DoctorReviewRequest request,
            @AuthenticationPrincipal StaffUser doctor) {

        TriageDtos.QueueItemResponse response = triageCoordinationService.processDoctorReview(request, doctor);
        return ResponseEntity.ok(response);
    }

    /**
     * Patient Status Transition Endpoint:
     * Accessible by Doctors and Nurses (STAFF, DOCTOR, COORDINATOR).
     * Moves a patient out of the active waiting queue (e.g. into exam, admitted, or discharged).
     * Admin accounts are view-only.
     */
    @PutMapping("/status/{intakeId}")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'COORDINATOR')")
    public ResponseEntity<TriageDtos.QueueItemResponse> updateStatus(
            @PathVariable Long intakeId,
            @Valid @RequestBody TriageDtos.PatientStatusUpdateRequest request,
            @AuthenticationPrincipal StaffUser currentUser) {

        TriageDtos.QueueItemResponse response = triageCoordinationService.updatePatientStatus(intakeId, request, currentUser);
        return ResponseEntity.ok(response);
    }

    /**
     * Read Active Queue for Facility:
     * Accessible by authenticated clinical staff (STAFF, DOCTOR, COORDINATOR, ADMIN)
     * as well as venue personnel to hydrate initial queue state on page load.
     */
    @GetMapping("/queue")
    @PreAuthorize("hasAnyRole('STAFF', 'DOCTOR', 'SECURITY', 'ADMIN', 'COORDINATOR')")
    public ResponseEntity<List<TriageDtos.QueueItemResponse>> getQueue(
            @AuthenticationPrincipal StaffUser currentUser) {

        List<TriageDtos.QueueItemResponse> queue = triageCoordinationService.getActiveQueue(currentUser.getVenue().getId());
        return ResponseEntity.ok(queue);
    }

    /**
     * Public / Hall Read Endpoint:
     * Hydrates the 3D Public Hall Dashboard queue (No-Login required for public triage hall display)
     */
    @GetMapping("/public/queue/{venueSlug}")
    public ResponseEntity<List<TriageDtos.QueueItemResponse>> getPublicHallQueue(@PathVariable String venueSlug) {
        return ResponseEntity.ok(triageCoordinationService.getPublicQueue(venueSlug));
    }
}
