package com.CODEWITHRISHU.Omni_Bridge.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record OtpRequest(
        @Size(min = 10, max = 10, message = "Phone number must be 10 digits")
        @NotBlank(message = "Phone number is required")
        String phone,

        @Email
        @NotBlank(message = "Email is required")
        String email,

        String otp) {
}