package com.CODEWITHRISHU.Omni_Bridge.dto.response;

import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;

public record StaffVerifyResponse(
        boolean exists,
        boolean isApproved,
        String status,
        String email,
        String name,
        Role role,
        Long venueId,
        String venueName,
        String venueSlug,
        String message) {

    public static StaffVerifyResponse found(StaffUser user) {
        boolean approved = "APPROVED".equalsIgnoreCase(user.getStatus());
        return new StaffVerifyResponse(
                true,
                approved,
                user.getStatus() != null ? user.getStatus() : "APPROVED",
                user.getEmail(),
                user.getName(),
                user.getRole(),
                user.getVenue().getId(),
                user.getVenue().getName(),
                user.getVenue().getSlug(),
                approved
                        ? "Staff member verified in database."
                        : "Your registration is pending Administrator approval. Please notify your facility Admin.");
    }

    public static StaffVerifyResponse notFound(String email) {
        return new StaffVerifyResponse(
                false,
                false,
                "NOT_FOUND",
                email,
                null,
                null,
                null,
                null,
                null,
                "Staff member not found in database.");
    }
}

