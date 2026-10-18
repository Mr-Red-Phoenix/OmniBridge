package com.CODEWITHRISHU.Omni_Bridge.dto.request;

import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SignUpRequest(
        @NotBlank @Size(max = 160) String name,
        @NotBlank @Email @Size(max = 254) String email,
        @NotBlank String venueSlug,
        Role role,
        String adminKey,
        @NotBlank(message = "Verification code is required") @Size(min = 6, max = 6, message = "OTP must be 6 digits") String otp) {
}