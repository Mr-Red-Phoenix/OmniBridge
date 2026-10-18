package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.dto.IncidentApiModels.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

@Service
@Slf4j
public class CrisisEventStreamService {

    private static final Long SSE_TIMEOUT = 30 * 60 * 1000L;

    private final Map<Long, List<SseEmitter>> staffVenueEmitters = new ConcurrentHashMap<>();
    private final Map<String, List<SseEmitter>> guestLifelineEmitters = new ConcurrentHashMap<>();
    private final Map<String, List<SseEmitter>> venueAlertEmitters = new ConcurrentHashMap<>();

    public SseEmitter subscribeStaffVenue(Long venueId) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        staffVenueEmitters.computeIfAbsent(venueId, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeStaffEmitter(venueId, emitter));
        emitter.onTimeout(() -> removeStaffEmitter(venueId, emitter));
        emitter.onError(e -> removeStaffEmitter(venueId, emitter));

        sendInitialEvent(emitter, "STAFF_CONNECTED", Map.of("venueId", venueId, "message", "Real-time crisis coordination stream active."));
        return emitter;
    }

    public SseEmitter subscribeGuestLifeline(String guestAccessToken) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        guestLifelineEmitters.computeIfAbsent(guestAccessToken, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeGuestEmitter(guestAccessToken, emitter));
        emitter.onTimeout(() -> removeGuestEmitter(guestAccessToken, emitter));
        emitter.onError(e -> removeGuestEmitter(guestAccessToken, emitter));

        sendInitialEvent(emitter, "LIFELINE_CONNECTED", Map.of("message", "Direct crisis lifeline connected. Responders have been notified."));
        return emitter;
    }

    public SseEmitter subscribeVenueAlerts(String venueSlug) {
        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        venueAlertEmitters.computeIfAbsent(venueSlug, k -> new CopyOnWriteArrayList<>()).add(emitter);

        emitter.onCompletion(() -> removeVenueAlertEmitter(venueSlug, emitter));
        emitter.onTimeout(() -> removeVenueAlertEmitter(venueSlug, emitter));
        emitter.onError(e -> removeVenueAlertEmitter(venueSlug, emitter));

        sendInitialEvent(emitter, "VENUE_BROADCAST_CONNECTED", Map.of("venueSlug", venueSlug, "message", "Emergency broadcast monitor active."));
        return emitter;
    }

    public void broadcastToStaff(Long venueId, String eventName, Object payload) {
        List<SseEmitter> emitters = staffVenueEmitters.get(venueId);
        if (emitters == null || emitters.isEmpty()) return;

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(payload));
            } catch (IOException e) {
                removeStaffEmitter(venueId, emitter);
            }
        }
    }

    public void broadcastToGuest(String guestAccessToken, String eventName, Object payload) {
        if (guestAccessToken == null || guestAccessToken.isBlank()) return;

        List<SseEmitter> emitters = guestLifelineEmitters.get(guestAccessToken);
        if (emitters == null || emitters.isEmpty()) return;

        for (SseEmitter emitter : emitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(payload));
            } catch (IOException e) {
                removeGuestEmitter(guestAccessToken, emitter);
            }
        }
    }

    public void broadcastAlertToVenue(String venueSlug, Long venueId, BroadcastAlertResponse alert) {
        List<SseEmitter> publicEmitters = venueAlertEmitters.get(venueSlug);
        if (publicEmitters != null) {
            for (SseEmitter emitter : publicEmitters) {
                try {
                    emitter.send(SseEmitter.event()
                            .name("EMERGENCY_BROADCAST")
                            .data(alert));
                } catch (IOException e) {
                    removeVenueAlertEmitter(venueSlug, emitter);
                }
            }
        }

        if (venueId != null) {
            broadcastToStaff(venueId, "EMERGENCY_BROADCAST", alert);
        }
    }

    private void sendInitialEvent(SseEmitter emitter, String name, Object data) {
        try {
            emitter.send(SseEmitter.event().name(name).data(data));
        } catch (IOException e) {
            log.debug("Failed to send initial SSE event: {}", e.getMessage());
        }
    }

    private void removeStaffEmitter(Long venueId, SseEmitter emitter) {
        List<SseEmitter> list = staffVenueEmitters.get(venueId);
        if (list != null) {
            list.remove(emitter);
        }
    }

    private void removeGuestEmitter(String token, SseEmitter emitter) {
        List<SseEmitter> list = guestLifelineEmitters.get(token);
        if (list != null) {
            list.remove(emitter);
        }
    }

    private void removeVenueAlertEmitter(String venueSlug, SseEmitter emitter) {
        List<SseEmitter> list = venueAlertEmitters.get(venueSlug);
        if (list != null) {
            list.remove(emitter);
        }
    }
}
