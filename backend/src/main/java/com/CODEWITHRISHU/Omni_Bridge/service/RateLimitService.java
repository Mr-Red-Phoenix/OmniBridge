package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.config.RateLimitProp;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import io.github.bucket4j.ConsumptionProbe;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

@Service
@RequiredArgsConstructor
public class RateLimitService {

    private static final Duration IDLE_EVICTION = Duration.ofMinutes(30);
    private final RateLimitProp prop;
    private final Map<String, Entry> buckets = new ConcurrentHashMap<>();

    public ConsumptionProbe consume(String clientKey, String path) {
        Policy policy = policyFor(path);
        Entry entry = buckets.computeIfAbsent(clientKey + '|' + policy.name(),
                k -> new Entry(newBucket(policy.capacity())));
        entry.lastAccess = Instant.now();
        return entry.bucket.tryConsumeAndReturnRemaining(1);
    }

    private Policy policyFor(String path) {
        if (path.startsWith("/api/auth/signUp")) return new Policy("register", prop.register());
        if (path.startsWith("/api/otp")) return new Policy("otp", prop.otp());
        if (path.startsWith("/api/ott")) return new Policy("ott", prop.ott());
        if (path.startsWith("/api/report")) return new Policy("report", prop.report());
        return new Policy("auth", prop.auth());
    }

    private Bucket newBucket(int capacity) {
        int safe = Math.max(1, capacity);
        return Bucket.builder()
                .addLimit(Bandwidth.builder()
                        .capacity(safe)
                        .refillGreedy(safe, Duration.ofMinutes(Math.max(1, prop.duration())))
                        .build())
                .build();
    }

    @Scheduled(fixedDelay = 10, timeUnit = TimeUnit.MINUTES)
    void evictIdle() {
        Instant cutoff = Instant.now().minus(IDLE_EVICTION);
        buckets.values().removeIf(e -> e.lastAccess.isBefore(cutoff));
    }

    private static final class Entry {
        final Bucket bucket;
        volatile Instant lastAccess = Instant.now();

        Entry(Bucket bucket) {
            this.bucket = bucket;
        }
    }

    private record Policy(String name, int capacity) {
    }
}
