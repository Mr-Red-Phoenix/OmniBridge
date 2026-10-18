package com.CODEWITHRISHU.Omni_Bridge.controller;

import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.*;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.service.CrisisEventStreamService;
import com.CODEWITHRISHU.Omni_Bridge.service.IncidentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;
    private final CrisisEventStreamService streamService;

    @PostMapping("/report/{venueSlug}")
    public ResponseEntity<IncidentCreatedResponse> submitReport(
            @PathVariable String venueSlug,
            @Valid @RequestBody ReportRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(incidentService.createReport(venueSlug, request, clientIp, userAgent));
    }

    @PostMapping("/report/{venueSlug}/sos")
    public ResponseEntity<SosResponse> submitSos(
            @PathVariable String venueSlug,
            @Valid @RequestBody SosRequest request,
            HttpServletRequest httpRequest) {
        String clientIp = extractClientIp(httpRequest);
        String userAgent = httpRequest.getHeader("User-Agent");
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(incidentService.triggerSos(venueSlug, request, clientIp, userAgent));
    }

    @GetMapping("/staff/incidents/stream")
    @PreAuthorize("hasAnyRole('STAFF', 'SECURITY', 'COORDINATOR', 'ADMIN')")
    public SseEmitter streamStaffIncidents(@AuthenticationPrincipal StaffUser staff) {
        return streamService.subscribeStaffVenue(staff.getVenue().getId());
    }

    @GetMapping("/staff/incidents")
    @PreAuthorize("hasAnyRole('STAFF', 'SECURITY', 'COORDINATOR', 'ADMIN')")
    public List<IncidentResponse> incidentBoard(@AuthenticationPrincipal StaffUser staff) {
        return incidentService.listOpenIncidents(staff);
    }

    @GetMapping("/staff/incidents/{incidentId}")
    @PreAuthorize("hasAnyRole('STAFF', 'SECURITY', 'COORDINATOR', 'ADMIN')")
    public IncidentDetailResponse incidentDetail(@PathVariable Long incidentId,
                                                 @AuthenticationPrincipal StaffUser staff) {
        return incidentService.getDetail(incidentId, staff);
    }

    @PostMapping("/staff/incidents/{incidentId}/acknowledge")
    @PreAuthorize("hasAnyRole('STAFF', 'SECURITY', 'COORDINATOR', 'ADMIN')")
    public ResponseEntity<Void> acknowledge(@PathVariable Long incidentId,
                                            @AuthenticationPrincipal StaffUser staff) {
        incidentService.acknowledge(incidentId, staff);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff/incidents/{incidentId}/assign-to-self")
    @PreAuthorize("hasAnyRole('STAFF', 'SECURITY', 'COORDINATOR', 'ADMIN')")
    public ResponseEntity<Void> assignToSelf(@PathVariable Long incidentId,
                                             @AuthenticationPrincipal StaffUser staff) {
        incidentService.assignToSelf(incidentId, staff);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff/incidents/{incidentId}/verify")
    @PreAuthorize("hasAnyRole('SECURITY', 'COORDINATOR', 'ADMIN')")
    public ResponseEntity<Void> verifyIncident(
            @PathVariable Long incidentId,
            @RequestParam(defaultValue = "false") boolean dispatchEmergency,
            @RequestParam(required = false) String dispatchReason,
            @AuthenticationPrincipal StaffUser staff) {
        incidentService.verifyAndDispatch(incidentId, staff, dispatchEmergency, dispatchReason);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff/incidents/{incidentId}/flag-false-alarm")
    @PreAuthorize("hasAnyRole('SECURITY', 'COORDINATOR', 'ADMIN')")
    public ResponseEntity<Void> flagFalseAlarm(
            @PathVariable Long incidentId,
            @Valid @RequestBody FalseAlarmRequest request,
            @AuthenticationPrincipal StaffUser staff) {
        incidentService.flagFalseAlarm(incidentId, request, staff);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff/incidents/{incidentId}/status")
    @PreAuthorize("hasAnyRole('SECURITY', 'COORDINATOR', 'ADMIN')")
    public ResponseEntity<Void> changeStatus(@PathVariable Long incidentId,
                                             @Valid @RequestBody StatusChangeRequest request,
                                             @AuthenticationPrincipal StaffUser staff) {
        incidentService.changeStatus(incidentId, request.status(), staff);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff/incidents/{incidentId}/updates")
    @PreAuthorize("hasAnyRole('STAFF', 'SECURITY', 'COORDINATOR', 'ADMIN')")
    public ResponseEntity<Void> addUpdate(@PathVariable Long incidentId,
                                          @Valid @RequestBody IncidentUpdateRequest request,
                                          @AuthenticationPrincipal StaffUser staff) {
        incidentService.addUpdate(incidentId, request, staff);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff/incidents/{incidentId}/dispatch-emergency")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public ResponseEntity<Void> dispatchEmergency(
            @PathVariable Long incidentId,
            @RequestParam(required = false) String reason,
            @AuthenticationPrincipal StaffUser staff) {
        incidentService.dispatchEmergencyServices(incidentId, staff, reason);
        return ResponseEntity.noContent().build();
    }

    private String extractClientIp(HttpServletRequest request) {
        String xf = request.getHeader("X-Forwarded-For");
        if (xf == null || xf.isBlank()) {
            return request.getRemoteAddr();
        }
        return xf.split(",")[0].trim();
    }
}