package com.CODEWITHRISHU.Omni_Bridge.exception;

public class IncidentNotFoundException extends RuntimeException {
    public IncidentNotFoundException(Long incidentId) {
        super("Incident not found: " + incidentId);
    }
}
