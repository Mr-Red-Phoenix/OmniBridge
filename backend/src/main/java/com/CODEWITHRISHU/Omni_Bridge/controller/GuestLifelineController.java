package com.CODEWITHRISHU.Omni_Bridge.controller;

import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.*;
import com.CODEWITHRISHU.Omni_Bridge.service.BroadcastAlertService;
import com.CODEWITHRISHU.Omni_Bridge.service.CrisisEventStreamService;
import com.CODEWITHRISHU.Omni_Bridge.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.List;

@RestController
@RequestMapping("/api/guest")
@RequiredArgsConstructor
public class GuestLifelineController {

    private final IncidentService incidentService;
    private final BroadcastAlertService broadcastAlertService;
    private final CrisisEventStreamService streamService;

    @GetMapping("/incidents/{incidentId}")
    public ResponseEntity<GuestLifelineResponse> getLifeline(
            @PathVariable Long incidentId,
            @RequestParam String token) {
        return ResponseEntity.ok(incidentService.getGuestLifeline(incidentId, token));
    }

    @GetMapping("/incidents/{incidentId}/stream")
    public SseEmitter streamLifeline(
            @PathVariable Long incidentId,
            @RequestParam String token) {
        incidentService.getGuestLifeline(incidentId, token);
        return streamService.subscribeGuestLifeline(token);
    }

    @PostMapping("/incidents/{incidentId}/messages")
    public ResponseEntity<Void> sendLifelineMessage(
            @PathVariable Long incidentId,
            @RequestParam String token,
            @Valid @RequestBody GuestMessageRequest request) {
        incidentService.addGuestLifelineMessage(incidentId, token, request);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/venues/{venueSlug}/broadcasts")
    public List<BroadcastAlertResponse> getVenueBroadcasts(@PathVariable String venueSlug) {
        return broadcastAlertService.getActiveBroadcasts(venueSlug);
    }

    @GetMapping("/venues/{venueSlug}/broadcasts/stream")
    public SseEmitter streamVenueBroadcasts(@PathVariable String venueSlug) {
        return streamService.subscribeVenueAlerts(venueSlug);
    }
}
