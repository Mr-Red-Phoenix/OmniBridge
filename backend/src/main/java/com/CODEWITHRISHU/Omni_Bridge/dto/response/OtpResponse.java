package com.CODEWITHRISHU.Omni_Bridge.dto.response;

import java.time.Instant;

public record OtpResponse(boolean success,
                          String message,
                          Instant expiresAt) {
}