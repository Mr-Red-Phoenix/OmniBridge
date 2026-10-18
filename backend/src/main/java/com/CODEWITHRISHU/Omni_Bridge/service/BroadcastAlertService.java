package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.*;
import com.CODEWITHRISHU.Omni_Bridge.entity.broadcast.BroadcastAlert;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.exception.VenueNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.repository.BroadcastAlertRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BroadcastAlertService {

    private final BroadcastAlertRepository alertRepository;
    private final VenueRepository venueRepository;
    private final CrisisEventStreamService streamService;

    @Transactional
    public BroadcastAlertResponse createBroadcast(String venueSlug, BroadcastCreateRequest request, StaffUser author) {
        var venue = venueRepository.findBySlug(venueSlug)
                .orElseThrow(() -> new VenueNotFoundException(venueSlug));

        Instant expiresAt = null;
        if (request.durationMinutes() != null && request.durationMinutes() > 0) {
            expiresAt = Instant.now().plus(request.durationMinutes(), ChronoUnit.MINUTES);
        }

        BroadcastAlert alert = new BroadcastAlert(
                venue,
                author,
                request.title().trim(),
                request.message().trim(),
                request.severity(),
                request.targetZone(),
                expiresAt);

        BroadcastAlert saved = alertRepository.save(alert);
        BroadcastAlertResponse response = BroadcastAlertResponse.from(saved);

        streamService.broadcastAlertToVenue(venue.getSlug(), venue.getId(), response);

        return response;
    }

    @Transactional(readOnly = true)
    public List<BroadcastAlertResponse> getActiveBroadcasts(String venueSlug) {
        return alertRepository.findActiveForVenueSlug(venueSlug).stream()
                .map(BroadcastAlertResponse::from)
                .toList();
    }

    @Transactional
    public void deactivateBroadcast(Long alertId, StaffUser staff) {
        BroadcastAlert alert = alertRepository.findById(alertId)
                .orElseThrow(() -> new IllegalArgumentException("Alert not found: " + alertId));

        if (!alert.getVenue().getId().equals(staff.getVenue().getId())) {
            throw new IllegalArgumentException("Unauthorized to modify alerts for another venue");
        }

        alert.setActive(false);
        alertRepository.save(alert);

        BroadcastAlertResponse response = BroadcastAlertResponse.from(alert);
        streamService.broadcastAlertToVenue(alert.getVenue().getSlug(), alert.getVenue().getId(), response);
    }
}
