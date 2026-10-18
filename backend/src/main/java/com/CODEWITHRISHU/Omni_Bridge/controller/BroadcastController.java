package com.CODEWITHRISHU.Omni_Bridge.controller;

import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.*;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.service.BroadcastAlertService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/staff/venues/{venueSlug}/broadcasts")
@RequiredArgsConstructor
public class BroadcastController {

    private final BroadcastAlertService broadcastAlertService;

    @PostMapping
    @PreAuthorize("hasAnyRole('SECURITY', 'COORDINATOR', 'ADMIN')")
    public ResponseEntity<BroadcastAlertResponse> issueBroadcast(
            @PathVariable String venueSlug,
            @Valid @RequestBody BroadcastCreateRequest request,
            @AuthenticationPrincipal StaffUser staff) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(broadcastAlertService.createBroadcast(venueSlug, request, staff));
    }

    @GetMapping
    @PreAuthorize("hasAnyRole('STAFF', 'SECURITY', 'COORDINATOR', 'ADMIN')")
    public List<BroadcastAlertResponse> listActive(
            @PathVariable String venueSlug) {
        return broadcastAlertService.getActiveBroadcasts(venueSlug);
    }

    @PostMapping("/{alertId}/deactivate")
    @PreAuthorize("hasAnyRole('COORDINATOR', 'ADMIN')")
    public ResponseEntity<Void> deactivate(
            @PathVariable String venueSlug,
            @PathVariable Long alertId,
            @AuthenticationPrincipal StaffUser staff) {
        broadcastAlertService.deactivateBroadcast(alertId, staff);
        return ResponseEntity.noContent().build();
    }

}