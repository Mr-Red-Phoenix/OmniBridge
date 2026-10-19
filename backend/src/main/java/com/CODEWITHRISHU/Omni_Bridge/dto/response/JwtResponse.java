package com.CODEWITHRISHU.Omni_Bridge.dto.response;

import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import lombok.Builder;
import lombok.Data;

@Data
public class JwtResponse {
    public JwtResponse() {
    }

    @Builder
    public JwtResponse(String accessToken, String refreshToken, Long id, String name, String email, Role role, Long venueId, String venueName, String venueSlug) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.id = id;
        this.name = name;
        this.email = email;
        this.role = role;
        this.venueId = venueId;
        this.venueName = venueName;
        this.venueSlug = venueSlug;
    }
    private String accessToken;
    private String refreshToken;
    private Long id;
    private String name;
    private String email;
    private Role role;
    private Long venueId;
    private String venueName;
    private String venueSlug;
}