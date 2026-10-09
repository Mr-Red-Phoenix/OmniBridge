package com.CODEWITHRISHU.Omni_Bridge.entity.incident;

import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum IncidentStatus {
    REPORTED,
    ACKNOWLEDGED,
    RESPONDING,
    RESOLVED,
    CLOSED,
    DUPLICATE;

    private static final Map<IncidentStatus, Set<IncidentStatus>> ALLOWED = new EnumMap<>(IncidentStatus.class);

    static {
        ALLOWED.put(REPORTED, EnumSet.of(ACKNOWLEDGED, DUPLICATE));
        ALLOWED.put(ACKNOWLEDGED, EnumSet.of(RESPONDING, DUPLICATE));
        ALLOWED.put(RESPONDING, EnumSet.of(RESOLVED, DUPLICATE));
        ALLOWED.put(RESOLVED, EnumSet.of(CLOSED, RESPONDING));
        ALLOWED.put(CLOSED, EnumSet.noneOf(IncidentStatus.class));
        ALLOWED.put(DUPLICATE, EnumSet.noneOf(IncidentStatus.class));
    }

    public boolean canMoveTo(IncidentStatus next) {
        return ALLOWED.get(this).contains(next);
    }
}