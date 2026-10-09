package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels;
import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.IncidentUpdateRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.ReportRequest;
import com.CODEWITHRISHU.Omni_Bridge.exception.IncidentNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.exception.InvalidIncidentTransitionException;
import com.CODEWITHRISHU.Omni_Bridge.exception.VenueNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import com.CODEWITHRISHU.Omni_Bridge.entity.incident.Incident;
import com.CODEWITHRISHU.Omni_Bridge.entity.incident.IncidentStatus;
import com.CODEWITHRISHU.Omni_Bridge.entity.incident.IncidentUpdate;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.repository.IncidentRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.IncidentUpdateRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class IncidentService {
    private static final List<IncidentStatus> HIDDEN_FROM_OPEN_BOARD =
            List.of(IncidentStatus.CLOSED, IncidentStatus.DUPLICATE);

    private final IncidentRepository incidentRepository;
    private final IncidentUpdateRepository updateRepository;
    private final VenueRepository venueRepository;

    @Transactional
    public IncidentApiModels.IncidentCreatedResponse createReport(String venueSlug, ReportRequest request) {
        var venue = venueRepository.findBySlug(venueSlug)
                .orElseThrow(() -> new VenueNotFoundException(venueSlug));

        var incident = incidentRepository.save(new Incident(
                venue,
                request.type(),
                request.severity(),
                request.description().trim(),
                request.location().trim(),
                clean(request.reporterName()),
                clean(request.reporterPhone())));
        record(incident, null, "Report submitted by guest.");

        return new IncidentApiModels.IncidentCreatedResponse(incident.getId(), incident.getStatus());
    }

    @Transactional(readOnly = true)
    public List<IncidentApiModels.IncidentResponse> listOpenIncidents(StaffUser staff) {
        List<Incident> list = (staff.getRole() == Role.ADMIN)
                ? incidentRepository.findAll(Sort.by(Sort.Direction.DESC, "createdAt"))
                : incidentRepository.findAllForVenue(venueIdOf(staff));
        return list.stream()
                .map(IncidentApiModels.IncidentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public IncidentApiModels.IncidentDetailResponse getDetail(Long incidentId, StaffUser staff) {
        var incident = findOwned(incidentId, staff);
        var timeline = updateRepository.findTimeline(incident.getId()).stream()
                .map(IncidentApiModels.IncidentUpdateResponse::from)
                .toList();
        return new IncidentApiModels.IncidentDetailResponse(IncidentApiModels.IncidentResponse.from(incident), timeline);
    }

    @Transactional
    public void acknowledge(Long incidentId, StaffUser staff) {
        changeStatus(incidentId, IncidentStatus.ACKNOWLEDGED, staff);
    }

    @Transactional
    public void assignToSelf(Long incidentId, StaffUser staff) {
        var incident = findOwned(incidentId, staff);
        incident.setAssignedTo(staff);
        record(incident, staff, "Assigned to " + staff.getName() + ".");
    }

    @Transactional
    public void addUpdate(Long incidentId, IncidentUpdateRequest request, StaffUser staff) {
        record(findOwned(incidentId, staff), staff, request.message().trim());
    }

    @Transactional
    public void changeStatus(Long incidentId, IncidentStatus next, StaffUser staff) {
        var incident = findOwned(incidentId, staff);
        var previous = incident.getStatus();

        if (!previous.canMoveTo(next)) {
            throw new InvalidIncidentTransitionException(previous, next);
        }

        incident.setStatus(next);
        record(incident, staff, "Status changed from " + previous + " to " + next + ".");
    }

    private Incident findOwned(Long incidentId, StaffUser staff) {
        if (staff.getRole() == Role.ADMIN) {
            return incidentRepository.findById(incidentId)
                    .orElseThrow(() -> new IncidentNotFoundException(incidentId));
        }
        return incidentRepository.findByIdAndVenueId(incidentId, venueIdOf(staff))
                .orElseThrow(() -> new IncidentNotFoundException(incidentId));
    }

    private void record(Incident incident, StaffUser author, String message) {
        updateRepository.save(new IncidentUpdate(incident, author, message));
    }

    private Long venueIdOf(StaffUser staff) {
        return staff.getVenue().getId();
    }

    private String clean(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

}
