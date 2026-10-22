package com.CODEWITHRISHU.Omni_Bridge.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OtpRequest(
        String phone,

        @Email
        @NotBlank(message = "Email is required")
        String email,

        String otp) {
}