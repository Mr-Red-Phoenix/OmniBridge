package com.CODEWITHRISHU.Omni_Bridge.dto;

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
            @Size(max = 40) String reporterPhone) {}

    public record IncidentUpdateRequest(
            @NotBlank @Size(max = 1000) String message) {}

    public record StatusChangeRequest(@NotNull IncidentStatus status) {}

    public record IncidentCreatedResponse(Long incidentId, IncidentStatus status) {}

    public record VenueResponse(
            Long id,
            String name,
            String slug,
            String address,
            String emergencyInstructions) {
        public static VenueResponse from(Venue venue) {
            return new VenueResponse(
                    venue.getId(), venue.getName(), venue.getSlug(),
                    venue.getAddress(), venue.getEmergencyInstructions());
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
            String assignedToName) {
        public static IncidentResponse from(Incident incident) {
            String assignedToName = incident.getAssignedTo() == null
                    ? null
                    : incident.getAssignedTo().getName();

            return new IncidentResponse(
                    incident.getId(), incident.getType(), incident.getSeverity(),
                    incident.getDescription(), incident.getLocation(),
                    incident.getStatus(), incident.getReporterName(),
                    incident.getReporterPhone(), incident.getCreatedAt(),
                    incident.getUpdatedAt(), assignedToName);
        }
    }

    public record IncidentUpdateResponse(
            Long id, String message, Instant createdAt, String authorName) {
        public static IncidentUpdateResponse from(IncidentUpdate update) {
            String authorName = update.getAuthor() == null
                    ? "Guest"
                    : update.getAuthor().getName();
            return new IncidentUpdateResponse(
                    update.getId(), update.getMessage(),
                    update.getCreatedAt(), authorName);
        }
    }

    public record IncidentDetailResponse(
            IncidentResponse incident,
            List<IncidentUpdateResponse> timeline) {
        public IncidentDetailResponse {
            timeline = List.copyOf(timeline);
        }
    }

}
