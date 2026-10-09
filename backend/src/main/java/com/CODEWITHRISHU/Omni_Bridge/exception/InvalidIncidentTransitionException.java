package com.CODEWITHRISHU.Omni_Bridge.exception;

import com.CODEWITHRISHU.Omni_Bridge.entity.incident.IncidentStatus;

public class InvalidIncidentTransitionException extends RuntimeException {
    public InvalidIncidentTransitionException(
            IncidentStatus current, IncidentStatus requested) {
        super("Cannot change incident status from " + current + " to " + requested);
    }
}
