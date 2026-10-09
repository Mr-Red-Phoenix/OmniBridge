package com.CODEWITHRISHU.Omni_Bridge.controller;

import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.*;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class IncidentController {

    private final IncidentService incidentService;

    @PostMapping("/report/{venueSlug}")
    public ResponseEntity<IncidentCreatedResponse> submitReport(
            @PathVariable String venueSlug,
            @Valid @RequestBody ReportRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(incidentService.createReport(venueSlug, request));
    }

    @GetMapping("/staff/incidents")
    public List<IncidentResponse> incidentBoard(@AuthenticationPrincipal StaffUser staff) {
        return incidentService.listOpenIncidents(staff);
    }

    @GetMapping("/staff/incidents/{incidentId}")
    public IncidentDetailResponse incidentDetail(@PathVariable Long incidentId,
                                                 @AuthenticationPrincipal StaffUser staff) {
        return incidentService.getDetail(incidentId, staff);
    }

    @PostMapping("/staff/incidents/{incidentId}/acknowledge")
    public ResponseEntity<Void> acknowledge(@PathVariable Long incidentId,
                                            @AuthenticationPrincipal StaffUser staff) {
        incidentService.acknowledge(incidentId, staff);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff/incidents/{incidentId}/assign-to-self")
    public ResponseEntity<Void> assignToSelf(@PathVariable Long incidentId,
                                             @AuthenticationPrincipal StaffUser staff) {
        incidentService.assignToSelf(incidentId, staff);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff/incidents/{incidentId}/status")
    public ResponseEntity<Void> changeStatus(@PathVariable Long incidentId,
                                             @Valid @RequestBody StatusChangeRequest request,
                                             @AuthenticationPrincipal StaffUser staff) {
        incidentService.changeStatus(incidentId, request.status(), staff);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/staff/incidents/{incidentId}/updates")
    public ResponseEntity<Void> addUpdate(@PathVariable Long incidentId,
                                          @Valid @RequestBody IncidentUpdateRequest request,
                                          @AuthenticationPrincipal StaffUser staff) {
        incidentService.addUpdate(incidentId, request, staff);
        return ResponseEntity.noContent().build();
    }
}
