package com.CODEWITHRISHU.Omni_Bridge.dto.response;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
        Instant timestamp,
        int status,
        String error,
        String message,
        String path,
        Map<String, String> validationErrors) {
    public ErrorResponse {
        validationErrors = validationErrors == null
                ? Map.of()
                : Map.copyOf(validationErrors);
    }
}