package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.*;
import com.CODEWITHRISHU.Omni_Bridge.entity.incident.*;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.exception.IncidentNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.exception.InvalidIncidentTransitionException;
import com.CODEWITHRISHU.Omni_Bridge.exception.VenueNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.repository.IncidentRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.IncidentUpdateRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class IncidentService {
    private static final List<IncidentStatus> HIDDEN_FROM_OPEN_BOARD =
            List.of(IncidentStatus.CLOSED, IncidentStatus.DUPLICATE, IncidentStatus.FALSE_ALARM);

    private final IncidentRepository incidentRepository;
    private final IncidentUpdateRepository updateRepository;
    private final VenueRepository venueRepository;
    private final CrisisEventStreamService streamService;
    private final EmergencyDispatchService emergencyDispatchService;

    @Value("${app.base.url:http://localhost:8080}")
    private String appBaseUrl;

    @Transactional
    public IncidentCreatedResponse createReport(String venueSlug, ReportRequest request, String clientIp, String userAgent) {
        var venue = venueRepository.findBySlug(venueSlug)
                .orElseThrow(() -> new VenueNotFoundException(venueSlug));

        var incident = new Incident(
                venue,
                request.type(),
                request.severity(),
                request.description().trim(),
                request.location().trim(),
                clean(request.reporterName()),
                clean(request.reporterPhone()),
                "GUEST");

        incident.setReporterIp(clientIp);
        incident.setReporterUserAgent(userAgent);
        incident.setLatitude(request.latitude());
        incident.setLongitude(request.longitude());
        incident.setStatus(IncidentStatus.UNVERIFIED);

        incident = incidentRepository.save(incident);
        record(incident, null, "Report submitted by guest. Status: UNVERIFIED pending security verification. Client IP: " + (clientIp != null ? clientIp : "UNKNOWN"), true, "NOTE");

        streamService.broadcastToStaff(venue.getId(), "NEW_UNVERIFIED_INCIDENT", IncidentResponse.from(incident));

        String lifelineUrl = appBaseUrl + "/api/guest/incidents/" + incident.getId() + "?token=" + incident.getGuestAccessToken();
        return new IncidentCreatedResponse(
                incident.getId(),
                incident.getStatus(),
                incident.getGuestAccessToken(),
                lifelineUrl,
                "Report received and queued for on-site security verification. Keep this lifeline open for status updates.");
    }

    @Transactional
    public SosResponse triggerSos(String venueSlug, SosRequest request, String clientIp, String userAgent) {
        var venue = venueRepository.findBySlug(venueSlug)
                .orElseThrow(() -> new VenueNotFoundException(venueSlug));

        var type = request.type() != null ? request.type() : IncidentType.PANIC;
        String notes = request.notes() != null && !request.notes().isBlank()
                ? request.notes().trim()
                : "ONE-TAP PANIC ALARM ACTIVATED";

        var incident = new Incident(
                venue,
                type,
                Severity.CRITICAL,
                notes,
                request.location().trim(),
                clean(request.reporterName()),
                clean(request.reporterPhone()),
                "ONE_TAP_SOS");

        incident.setReporterIp(clientIp);
        incident.setReporterUserAgent(userAgent);
        incident.setLatitude(request.latitude());
        incident.setLongitude(request.longitude());
        incident.setStatus(IncidentStatus.REPORTED);

        incident = incidentRepository.save(incident);
        record(incident, null, "ONE-TAP SOS ALARM TRIGGERED at " + incident.getLocation() + " (IP: " + (clientIp != null ? clientIp : "UNKNOWN") + ")", true, "SOS_TRIGGER");

        streamService.broadcastToStaff(venue.getId(), "CRITICAL_SOS", IncidentResponse.from(incident));

        emergencyDispatchService.dispatch(incident, null, "Immediate occupant panic trigger at " + incident.getLocation());

        String lifelineUrl = appBaseUrl + "/api/guest/incidents/" + incident.getId() + "?token=" + incident.getGuestAccessToken();
        return new SosResponse(
                incident.getId(),
                incident.getStatus(),
                incident.getGuestAccessToken(),
                lifelineUrl,
                "Emergency SOS broadcasted to venue response team and first responders. Responders are mobilizing to " + incident.getLocation() + ".",
                incident.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<IncidentResponse> listOpenIncidents(StaffUser staff) {
        return incidentRepository.findOpenForVenue(venueIdOf(staff), HIDDEN_FROM_OPEN_BOARD).stream()
                .map(IncidentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public IncidentDetailResponse getDetail(Long incidentId, StaffUser staff) {
        var incident = findOwned(incidentId, staff);
        var timeline = updateRepository.findTimeline(incident.getId()).stream()
                .map(IncidentUpdateResponse::from)
                .toList();
        return new IncidentDetailResponse(IncidentResponse.from(incident), timeline);
    }

    @Transactional
    public void acknowledge(Long incidentId, StaffUser staff) {
        changeStatus(incidentId, IncidentStatus.ACKNOWLEDGED, staff);
    }

    @Transactional
    public void assignToSelf(Long incidentId, StaffUser staff) {
        var incident = findOwned(incidentId, staff);
        incident.setAssignedTo(staff);
        IncidentUpdate update = record(incident, staff, "Assigned to " + staff.getName() + ".", true, "ASSIGNMENT");

        streamService.broadcastToStaff(venueIdOf(staff), "INCIDENT_ASSIGNED", Map.of(
                "incidentId", incident.getId(),
                "assignedTo", staff.getName()));

        streamService.broadcastToGuest(incident.getGuestAccessToken(), "RESPONDER_ASSIGNED", Map.of(
                "incidentId", incident.getId(),
                "assignedTo", staff.getName(),
                "message", "Staff responder " + staff.getName() + " has been assigned to your location."));
    }

    @Transactional
    public void addUpdate(Long incidentId, IncidentUpdateRequest request, StaffUser staff) {
        var incident = findOwned(incidentId, staff);
        boolean isPublic = request.publicToGuestOrDefault();
        String updateType = request.updateType() != null ? request.updateType() : "STAFF_NOTE";

        IncidentUpdate update = record(incident, staff, request.message().trim(), isPublic, updateType);

        streamService.broadcastToStaff(venueIdOf(staff), "INCIDENT_UPDATE", IncidentUpdateResponse.from(update));

        if (isPublic) {
            streamService.broadcastToGuest(incident.getGuestAccessToken(), "LIFELINE_INSTRUCTION", Map.of(
                    "incidentId", incident.getId(),
                    "message", request.message().trim(),
                    "author", staff.getName()));
        }
    }

    @Transactional
    public void changeStatus(Long incidentId, IncidentStatus next, StaffUser staff) {
        var incident = findOwned(incidentId, staff);
        var previous = incident.getStatus();

        if (!previous.canMoveTo(next)) {
            throw new InvalidIncidentTransitionException(previous, next);
        }

        incident.setStatus(next);
        record(incident, staff, "Status changed from " + previous + " to " + next + ".", true, "STATUS_CHANGE");

        streamService.broadcastToStaff(venueIdOf(staff), "STATUS_CHANGED", Map.of(
                "incidentId", incident.getId(),
                "previous", previous,
                "current", next));

        streamService.broadcastToGuest(incident.getGuestAccessToken(), "STATUS_UPDATE", Map.of(
                "incidentId", incident.getId(),
                "status", next,
                "message", "Incident status is now: " + next));
    }

    @Transactional
    public void verifyAndDispatch(Long incidentId, StaffUser staff, boolean dispatchEmergency, String dispatchReason) {
        var incident = findOwned(incidentId, staff);
        incident.setVerified(true);
        incident.setVerifiedAt(Instant.now());
        incident.setVerifiedBy(staff);

        if (incident.getStatus() == IncidentStatus.UNVERIFIED) {
            incident.setStatus(IncidentStatus.REPORTED);
        }

        record(incident, staff, "Incident VERIFIED as authentic by on-site staff " + staff.getName() + ".", true, "VERIFICATION");

        if (dispatchEmergency) {
            emergencyDispatchService.dispatch(incident, staff, dispatchReason != null ? dispatchReason : "On-site verified emergency");
        }

        streamService.broadcastToStaff(venueIdOf(staff), "INCIDENT_VERIFIED", Map.of(
                "incidentId", incident.getId(),
                "verifiedBy", staff.getName(),
                "status", incident.getStatus()));

        streamService.broadcastToGuest(incident.getGuestAccessToken(), "REPORT_VERIFIED", Map.of(
                "incidentId", incident.getId(),
                "message", "Your emergency report has been verified by on-site personnel. Response teams are active."));
    }

    @Transactional
    public void flagFalseAlarm(Long incidentId, FalseAlarmRequest request, StaffUser staff) {
        var incident = findOwned(incidentId, staff);
        var previous = incident.getStatus();

        if (!previous.canMoveTo(IncidentStatus.FALSE_ALARM)) {
            throw new InvalidIncidentTransitionException(previous, IncidentStatus.FALSE_ALARM);
        }

        incident.setStatus(IncidentStatus.FALSE_ALARM);
        incident.setFalseAlarmReason(request.reason().trim());

        record(incident, staff, "FLAGGED AS FALSE ALARM / HOAX by " + staff.getName() + ". Reason: " + request.reason().trim(), true, "FALSE_ALARM_AUDIT");

        streamService.broadcastToStaff(venueIdOf(staff), "INCIDENT_FALSE_ALARM", Map.of(
                "incidentId", incident.getId(),
                "flaggedBy", staff.getName(),
                "reason", request.reason().trim()));

        streamService.broadcastToGuest(incident.getGuestAccessToken(), "FALSE_ALARM_NOTICE", Map.of(
                "incidentId", incident.getId(),
                "message", "This incident has been investigated and marked as a false alarm / unconfirmed report."));
    }

    @Transactional
    public void dispatchEmergencyServices(Long incidentId, StaffUser staff, String reason) {
        var incident = findOwned(incidentId, staff);
        emergencyDispatchService.dispatch(incident, staff, reason);
    }

    @Transactional(readOnly = true)
    public GuestLifelineResponse getGuestLifeline(Long incidentId, String guestAccessToken) {
        var incident = incidentRepository.findByIdAndGuestAccessToken(incidentId, guestAccessToken)
                .orElseThrow(() -> new IncidentNotFoundException(incidentId));

        var publicTimeline = updateRepository.findPublicTimeline(incident.getId()).stream()
                .map(IncidentUpdateResponse::from)
                .toList();

        String assignedName = incident.getAssignedTo() != null ? incident.getAssignedTo().getName() : null;

        return new GuestLifelineResponse(
                incident.getId(),
                incident.getType(),
                incident.getSeverity(),
                incident.getStatus(),
                incident.getLocation(),
                incident.getVenue().getName(),
                incident.getVenue().getEmergencyInstructions(),
                assignedName,
                incident.isEmergencyDispatched(),
                incident.isVerified(),
                publicTimeline);
    }

    @Transactional
    public void addGuestLifelineMessage(Long incidentId, String guestAccessToken, GuestMessageRequest request) {
        var incident = incidentRepository.findByIdAndGuestAccessToken(incidentId, guestAccessToken)
                .orElseThrow(() -> new IncidentNotFoundException(incidentId));

        String guestMsg = "[OCCUPANT UPDATE] " + request.message().trim();
        IncidentUpdate update = record(incident, null, guestMsg, true, "GUEST_MESSAGE");

        streamService.broadcastToStaff(incident.getVenue().getId(), "GUEST_LIFELINE_MESSAGE", Map.of(
                "incidentId", incident.getId(),
                "message", request.message().trim(),
                "location", incident.getLocation(),
                "timestamp", update.getCreatedAt()));

        streamService.broadcastToGuest(incident.getGuestAccessToken(), "MESSAGE_DELIVERED", Map.of(
                "incidentId", incident.getId(),
                "message", request.message().trim()));
    }

    @Transactional(readOnly = true)
    public TacticalResponderPacket getTacticalPacket(String responderToken) {
        var incident = incidentRepository.findByResponderToken(responderToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired tactical responder token"));

        var timeline = updateRepository.findTimeline(incident.getId()).stream()
                .map(IncidentUpdateResponse::from)
                .toList();

        var venue = incident.getVenue();
        String coordinator = incident.getAssignedTo() != null ? incident.getAssignedTo().getName() : "Duty Manager / Security Office";

        return new TacticalResponderPacket(
                incident.getId(),
                incident.getType(),
                incident.getSeverity(),
                incident.getStatus(),
                incident.getLocation(),
                incident.getDescription(),
                incident.getReporterName(),
                incident.getReporterPhone(),
                incident.getCreatedAt(),
                incident.getUpdatedAt(),
                incident.isEmergencyDispatched(),
                incident.isVerified(),
                venue.getName(),
                venue.getAddress(),
                venue.getGateCode(),
                venue.getKnoxBoxLocation(),
                venue.getFloorPlanUrl(),
                venue.getEmergencyInstructions(),
                venue.getEmergencyContactPhone(),
                coordinator,
                timeline);
    }

    @Transactional
    public void updateResponderStatus(String responderToken, ResponderStatusUpdateRequest request) {
        var incident = incidentRepository.findByResponderToken(responderToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid tactical responder token"));

        incident.setStatus(request.status());
        String msg = "[FIRST RESPONDER] Unit status updated to " + request.status() +
                (request.note() != null && !request.note().isBlank() ? ": " + request.note().trim() : "");

        IncidentUpdate update = record(incident, null, msg, true, "FIRST_RESPONDER_NOTE");

        streamService.broadcastToStaff(incident.getVenue().getId(), "FIRST_RESPONDER_UPDATE", Map.of(
                "incidentId", incident.getId(),
                "status", request.status(),
                "note", msg));

        streamService.broadcastToGuest(incident.getGuestAccessToken(), "RESPONDER_ON_SCENE", Map.of(
                "incidentId", incident.getId(),
                "status", request.status(),
                "message", "Emergency Services (First Responders) update: " + msg));
    }

    @Transactional
    public void addResponderNote(String responderToken, ResponderNoteRequest request) {
        var incident = incidentRepository.findByResponderToken(responderToken)
                .orElseThrow(() -> new IllegalArgumentException("Invalid tactical responder token"));

        String msg = "[FIRST RESPONDER FIELD NOTE] " + request.note().trim();
        record(incident, null, msg, true, "FIRST_RESPONDER_NOTE");

        streamService.broadcastToStaff(incident.getVenue().getId(), "FIRST_RESPONDER_NOTE", Map.of(
                "incidentId", incident.getId(),
                "note", request.note().trim()));

        streamService.broadcastToGuest(incident.getGuestAccessToken(), "RESPONDER_NOTE", Map.of(
                "incidentId", incident.getId(),
                "instruction", request.note().trim()));
    }

    private Incident findOwned(Long incidentId, StaffUser staff) {
        return incidentRepository.findByIdAndVenueId(incidentId, venueIdOf(staff))
                .orElseThrow(() -> new IncidentNotFoundException(incidentId));
    }

    private IncidentUpdate record(Incident incident, StaffUser author, String message, boolean isPublic, String updateType) {
        return updateRepository.save(new IncidentUpdate(incident, author, message, isPublic, updateType));
    }

    private Long venueIdOf(StaffUser staff) {
        return staff.getVenue().getId();
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
