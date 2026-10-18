package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.entity.incident.Incident;
import com.CODEWITHRISHU.Omni_Bridge.entity.incident.IncidentStatus;
import com.CODEWITHRISHU.Omni_Bridge.entity.incident.IncidentUpdate;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.repository.IncidentRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.IncidentUpdateRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmergencyDispatchService {

    private final IncidentRepository incidentRepository;
    private final IncidentUpdateRepository updateRepository;
    private final CrisisEventStreamService streamService;

    @Value("${app.base.url}")
    private String appBaseUrl;

    @Transactional
    public void dispatch(Incident incident, StaffUser author, String dispatchReason) {
        if (incident.isEmergencyDispatched()) {
            return;
        }

        incident.setEmergencyDispatched(true);
        incident.setEmergencyDispatchedAt(Instant.now());
        if (incident.getStatus() == IncidentStatus.REPORTED || incident.getStatus() == IncidentStatus.ACKNOWLEDGED) {
            incident.setStatus(IncidentStatus.DISPATCHED);
        }

        String tacticalUrl = appBaseUrl + "/api/responder/" + incident.getResponderToken();

        String dispatchMessage = "EMERGENCY SERVICES DISPATCHED: " +
                (dispatchReason != null ? dispatchReason : "Critical threat response triggered.") +
                " Tactical Responder Link: " + tacticalUrl;

        IncidentUpdate update = new IncidentUpdate(
                incident,
                author,
                dispatchMessage,
                true,
                "DISPATCH");
        updateRepository.save(update);
        incidentRepository.save(incident);

        streamService.broadcastToStaff(incident.getVenue().getId(), "INCIDENT_DISPATCHED", Map.of(
                "incidentId", incident.getId(),
                "status", incident.getStatus(),
                "tacticalUrl", tacticalUrl,
                "dispatchedAt", incident.getEmergencyDispatchedAt()));

        streamService.broadcastToGuest(incident.getGuestAccessToken(), "EMERGENCY_DISPATCHED", Map.of(
                "incidentId", incident.getId(),
                "status", incident.getStatus(),
                "message", "Emergency services have been officially dispatched to your venue. First responders are en route."));
    }
}
