package com.CODEWITHRISHU.Omni_Bridge.entity;

public enum Role {
    STAFF,        // Nurses & Triage Intake Staff
    DOCTOR,       // Physicians, Coordinators & Override Authority
    SECURITY,     // Facility Security & Venue SOS Incident Responders
    ADMIN,        // System Admin / Medical Director
    COORDINATOR,  // Operations & Crisis Coordinator
    RESPONDER;    // External Field Emergency Responders

    public String getAuthority() {
        return "ROLE_" + this.name();
    }

    public boolean isDoctorOrAdmin() {
        return this == DOCTOR || this == ADMIN || this == COORDINATOR;
    }

    public boolean isStaffMember() {
        return this == STAFF || this == DOCTOR || this == ADMIN || this == COORDINATOR;
    }

    public boolean isSecurityTeam() {
        return this == SECURITY || this == ADMIN;
    }
}