package com.CODEWITHRISHU.Omni_Bridge.dto;

import com.CODEWITHRISHU.Omni_Bridge.entity.broadcast.BroadcastAlert;
import com.CODEWITHRISHU.Omni_Bridge.entity.broadcast.BroadcastSeverity;
import com.CODEWITHRISHU.Omni_Bridge.entity.incident.*;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.Venue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.List;

public final class IncidentApiModels {
    private IncidentApiModels() {}

    public record ReportRequest(
            @NotNull IncidentType type,
            @NotNull Severity severity,
            @NotBlank @Size(max = 2000) String description,
            @NotBlank @Size(max = 200) String location,
            @Size(max = 160) String reporterName,
            @Size(max = 40) String reporterPhone,
            Double latitude,
            Double longitude) {}

    public record SosRequest(
            @NotBlank @Size(max = 200) String location,
            IncidentType type,
            @Size(max = 2000) String notes,
            @Size(max = 160) String reporterName,
            @Size(max = 40) String reporterPhone,
            Double latitude,
            Double longitude) {}

    public record IncidentUpdateRequest(
            @NotBlank @Size(max = 1000) String message,
            Boolean isPublicToGuest,
            String updateType) {
        public boolean publicToGuestOrDefault() {
            return isPublicToGuest == null || isPublicToGuest;
        }
    }

    public record GuestMessageRequest(
            @NotBlank @Size(max = 1000) String message) {}

    public record StatusChangeRequest(@NotNull IncidentStatus status) {}

    public record FalseAlarmRequest(
            @NotBlank @Size(max = 500) String reason) {}

    public record IncidentCreatedResponse(
            Long incidentId,
            IncidentStatus status,
            String guestAccessToken,
            String lifelineUrl,
            String message) {}

    public record SosResponse(
            Long incidentId,
            IncidentStatus status,
            String guestAccessToken,
            String lifelineUrl,
            String message,
            Instant reportedAt) {}

    public record VenueResponse(
            Long id,
            String name,
            String slug,
            String address,
            String emergencyInstructions,
            String gateCode,
            String knoxBoxLocation,
            String floorPlanUrl,
            String emergencyContactPhone) {
        public static VenueResponse from(Venue venue) {
            return new VenueResponse(
                    venue.getId(), venue.getName(), venue.getSlug(),
                    venue.getAddress(), venue.getEmergencyInstructions(),
                    venue.getGateCode(), venue.getKnoxBoxLocation(),
                    venue.getFloorPlanUrl(), venue.getEmergencyContactPhone());
        }
    }

    public record IncidentResponse(
            Long id,
            IncidentType type,
            Severity severity,
            String description,
            String location,
            IncidentStatus status,
            String reporterName,
            String reporterPhone,
            Instant createdAt,
            Instant updatedAt,
            String assignedToName,
            String guestAccessToken,
            String responderToken,
            boolean emergencyDispatched,
            Instant emergencyDispatchedAt,
            String source,
            boolean verified,
            Instant verifiedAt,
            String verifiedByName,
            String reporterIp,
            String reporterUserAgent,
            Double latitude,
            Double longitude,
            String falseAlarmReason) {
        public static IncidentResponse from(Incident incident) {
            String assignedToName = incident.getAssignedTo() == null
                    ? null
                    : incident.getAssignedTo().getName();

            String verifiedByName = incident.getVerifiedBy() == null
                    ? null
                    : incident.getVerifiedBy().getName();

            return new IncidentResponse(
                    incident.getId(), incident.getType(), incident.getSeverity(),
                    incident.getDescription(), incident.getLocation(),
                    incident.getStatus(), incident.getReporterName(),
                    incident.getReporterPhone(), incident.getCreatedAt(),
                    incident.getUpdatedAt(), assignedToName,
                    incident.getGuestAccessToken(), incident.getResponderToken(),
                    incident.isEmergencyDispatched(), incident.getEmergencyDispatchedAt(),
                    incident.getSource(), incident.isVerified(), incident.getVerifiedAt(),
                    verifiedByName, incident.getReporterIp(), incident.getReporterUserAgent(),
                    incident.getLatitude(), incident.getLongitude(), incident.getFalseAlarmReason());
        }
    }

    public record IncidentUpdateResponse(
            Long id,
            String message,
            Instant createdAt,
            String authorName,
            boolean isPublicToGuest,
            String updateType) {
        public static IncidentUpdateResponse from(IncidentUpdate update) {
            String authorName = update.getAuthor() == null
                    ? "Guest / Emergency System"
                    : update.getAuthor().getName();
            return new IncidentUpdateResponse(
                    update.getId(),
                    update.getMessage(),
                    update.getCreatedAt(),
                    authorName,
                    update.isPublicToGuest(),
                    update.getUpdateType());
        }
    }

    public record IncidentDetailResponse(
            IncidentResponse incident,
            List<IncidentUpdateResponse> timeline) {
        public IncidentDetailResponse {
            timeline = List.copyOf(timeline);
        }
    }

    public record GuestLifelineResponse(
            Long incidentId,
            IncidentType type,
            Severity severity,
            IncidentStatus status,
            String location,
            String venueName,
            String emergencyInstructions,
            String assignedStaffName,
            boolean emergencyDispatched,
            boolean verified,
            List<IncidentUpdateResponse> publicUpdates) {
        public GuestLifelineResponse {
            publicUpdates = List.copyOf(publicUpdates);
        }
    }

    public record TacticalResponderPacket(
            Long incidentId,
            IncidentType type,
            Severity severity,
            IncidentStatus status,
            String location,
            String description,
            String reporterName,
            String reporterPhone,
            Instant reportedAt,
            Instant updatedAt,
            boolean emergencyDispatched,
            boolean verified,
            String venueName,
            String venueAddress,
            String gateCode,
            String knoxBoxLocation,
            String floorPlanUrl,
            String emergencyInstructions,
            String emergencyContactPhone,
            String onSiteCoordinatorName,
            List<IncidentUpdateResponse> timeline) {
        public TacticalResponderPacket {
            timeline = List.copyOf(timeline);
        }
    }

    public record ResponderStatusUpdateRequest(
            @NotNull IncidentStatus status,
            @Size(max = 1000) String note) {}

    public record ResponderNoteRequest(
            @NotBlank @Size(max = 1000) String note) {}

    public record BroadcastCreateRequest(
            @NotBlank @Size(max = 200) String title,
            @NotBlank @Size(max = 2000) String message,
            @NotNull BroadcastSeverity severity,
            @Size(max = 100) String targetZone,
            Integer durationMinutes) {}

    public record BroadcastAlertResponse(
            Long id,
            String venueSlug,
            String venueName,
            String title,
            String message,
            BroadcastSeverity severity,
            String targetZone,
            boolean active,
            Instant createdAt,
            Instant expiresAt,
            String authorName) {
        public static BroadcastAlertResponse from(BroadcastAlert alert) {
            String author = alert.getAuthor() == null ? "Emergency Command" : alert.getAuthor().getName();
            return new BroadcastAlertResponse(
                    alert.getId(),
                    alert.getVenue().getSlug(),
                    alert.getVenue().getName(),
                    alert.getTitle(),
                    alert.getMessage(),
                    alert.getSeverity(),
                    alert.getTargetZone(),
                    alert.isActive(),
                    alert.getCreatedAt(),
                    alert.getExpiresAt(),
                    author);
        }
    }
}
