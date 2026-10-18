package com.CODEWITHRISHU.Omni_Bridge.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record StaffVerifyRequest(
        @NotBlank @Email String email) {
}

