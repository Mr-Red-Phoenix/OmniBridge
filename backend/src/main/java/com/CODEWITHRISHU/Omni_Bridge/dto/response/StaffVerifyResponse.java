package com.CODEWITHRISHU.Omni_Bridge.dto.response;

import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;

public record StaffVerifyResponse(
        boolean exists,
        String email,
        String name,
        Role role,
        Long venueId,
        String venueName,
        String venueSlug,
        String message) {

    public static StaffVerifyResponse found(StaffUser user) {
        return new StaffVerifyResponse(
                true,
                user.getEmail(),
                user.getName(),
                user.getRole(),
                user.getVenue().getId(),
                user.getVenue().getName(),
                user.getVenue().getSlug(),
                "Staff member verified in database.");
    }

    public static StaffVerifyResponse notFound(String email) {
        return new StaffVerifyResponse(
                false,
                email,
                null,
                null,
                null,
                null,
                null,
                "Staff member not found in database.");
    }
}

