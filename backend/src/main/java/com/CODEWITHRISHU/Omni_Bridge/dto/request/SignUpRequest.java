package com.CODEWITHRISHU.Omni_Bridge.dto.request;

import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SignUpRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank @Size(min = 8, max = 72) String password,
        @NotBlank String venueSlug,
        Role role,
        String adminKey) {
}