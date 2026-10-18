package com.CODEWITHRISHU.Omni_Bridge.entity.incident;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum IncidentStatus {
    UNVERIFIED,
    REPORTED,
    ACKNOWLEDGED,
    DISPATCHED,
    RESPONDING,
    RESOLVED,
    CLOSED,
    DUPLICATE,
    FALSE_ALARM;

    private static final Map<IncidentStatus, Set<IncidentStatus>> ALLOWED = new EnumMap<>(IncidentStatus.class);

    static {
        ALLOWED.put(UNVERIFIED, EnumSet.of(REPORTED, ACKNOWLEDGED, DISPATCHED, FALSE_ALARM, DUPLICATE));
        ALLOWED.put(REPORTED, EnumSet.of(ACKNOWLEDGED, DISPATCHED, RESPONDING, FALSE_ALARM, DUPLICATE));
        ALLOWED.put(ACKNOWLEDGED, EnumSet.of(DISPATCHED, RESPONDING, FALSE_ALARM, DUPLICATE));
        ALLOWED.put(DISPATCHED, EnumSet.of(RESPONDING, RESOLVED, FALSE_ALARM, DUPLICATE));
        ALLOWED.put(RESPONDING, EnumSet.of(DISPATCHED, RESOLVED, FALSE_ALARM, DUPLICATE));
        ALLOWED.put(RESOLVED, EnumSet.of(CLOSED, RESPONDING));
        ALLOWED.put(FALSE_ALARM, EnumSet.of(CLOSED));
        ALLOWED.put(CLOSED, EnumSet.noneOf(IncidentStatus.class));
        ALLOWED.put(DUPLICATE, EnumSet.noneOf(IncidentStatus.class));
    }

    public boolean canMoveTo(IncidentStatus next) {
        return ALLOWED.get(this).contains(next);
    }
}