package com.CODEWITHRISHU.Omni_Bridge.dto.response;

import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@Builder
public class JwtResponse {
    public JwtResponse() {
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