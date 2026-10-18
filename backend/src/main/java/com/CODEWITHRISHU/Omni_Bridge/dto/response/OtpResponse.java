package com.CODEWITHRISHU.Omni_Bridge.dto.response;

import java.time.Instant;

public record OtpResponse(boolean success,
                          boolean verified,
                          String message,
                          Instant expiresAt) {

    public OtpResponse(boolean success, String message, Instant expiresAt) {
        this(success, success, message, expiresAt);
    }
}