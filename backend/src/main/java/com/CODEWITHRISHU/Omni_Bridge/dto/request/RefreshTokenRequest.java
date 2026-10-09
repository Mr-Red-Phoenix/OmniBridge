package com.CODEWITHRISHU.Omni_Bridge.dto.request;

import jakarta.validation.constraints.NotBlank;

public record RefreshTokenRequest(@NotBlank(message = "token must be there") String token) {
}