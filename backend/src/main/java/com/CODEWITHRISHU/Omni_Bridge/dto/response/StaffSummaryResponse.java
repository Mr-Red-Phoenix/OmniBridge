package com.CODEWITHRISHU.Omni_Bridge.dto.response;

import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;

public record StaffSummaryResponse(
        Long id,
        String name,
        String email,
        Role role,
        Long venueId,
        String venueName,
        String venueSlug) {

    public static StaffSummaryResponse from(StaffUser user) {
        return new StaffSummaryResponse(
                user.getId(),
                user.getName(),
                user.getEmail(),
                user.getRole(),
                user.getVenue().getId(),
                user.getVenue().getName(),
                user.getVenue().getSlug());
    }
}

