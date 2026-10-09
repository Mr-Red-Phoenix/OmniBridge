package com.CODEWITHRISHU.Omni_Bridge.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

@ConfigurationProperties(prefix = "rate-limit")
public record RateLimitProp(
        @DefaultValue("3") int register,
        @DefaultValue("20") int auth,
        @DefaultValue("5") int otp,
        @DefaultValue("5") int ott,
        @DefaultValue("60") int report,
        @DefaultValue("1") int duration) {
}