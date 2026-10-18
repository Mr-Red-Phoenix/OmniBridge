package com.CODEWITHRISHU.Omni_Bridge.controller;

import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.*;
import com.CODEWITHRISHU.Omni_Bridge.service.IncidentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/responder")
@RequiredArgsConstructor
public class FirstResponderController {

    private final IncidentService incidentService;

    @GetMapping("/{responderToken}")
    public ResponseEntity<TacticalResponderPacket> getTacticalPacket(
            @PathVariable String responderToken) {
        return ResponseEntity.ok(incidentService.getTacticalPacket(responderToken));
    }

    @PostMapping("/{responderToken}/status")
    public ResponseEntity<Void> updateStatus(
            @PathVariable String responderToken,
            @Valid @RequestBody ResponderStatusUpdateRequest request) {
        incidentService.updateResponderStatus(responderToken, request);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{responderToken}/notes")
    public ResponseEntity<Void> addNote(
            @PathVariable String responderToken,
            @Valid @RequestBody ResponderNoteRequest request) {
        incidentService.addResponderNote(responderToken, request);
        return ResponseEntity.noContent().build();
    }
}
