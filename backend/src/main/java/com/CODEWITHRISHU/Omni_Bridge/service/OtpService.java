package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.dto.request.OtpRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.response.OtpResponse;
import com.CODEWITHRISHU.Omni_Bridge.entity.OtpVerification;
import com.CODEWITHRISHU.Omni_Bridge.repository.OtpVerificationRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.StaffUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;

@Service
@Slf4j
@RequiredArgsConstructor
public class OtpService {

    private static final int MAX_ATTEMPTS = 5;
    private static final String SENT = "If this email is registered, a verification code has been sent.";
    private static final String REJECTED = "Invalid or expired code. Please request a new one.";

    private final OtpVerificationRepository otpRepository;
    private final StaffUserRepository userRepository;
    private final BrevoMailService mail;
    private final SecureRandom random = new SecureRandom();

    @Value("${otp.expiration-ms}")
    private long otpExpirationMs;

    @Value("${otp.length}")
    private int otpLength;

    private static String normalizePhone(String phone) {
        if (phone == null) return null;
        return phone.startsWith("+") ? phone : "+91" + phone;
    }

    private static String hash(String code) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(code.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }

    private static boolean matches(String raw, String storedHash) {
        return raw != null && MessageDigest.isEqual(
                hash(raw).getBytes(StandardCharsets.UTF_8), storedHash.getBytes(StandardCharsets.UTF_8));
    }

    @Transactional
    public OtpResponse sendOtp(OtpRequest request) {
        var expiresAt = Instant.now().plusMillis(otpExpirationMs);

        userRepository.findByEmailIgnoreCase(request.email().trim()).ifPresent(user -> {
            otpRepository.deleteAllForUser(user);

            String code = generateOtp();
            otpRepository.save(OtpVerification.builder()
                    .phone(normalizePhone(request.phone()))
                    .otp(hash(code))
                    .verified(false)
                    .expiresAt(expiresAt)
                    .user(user)
                    .build());

            mail.sendAsync(user.getEmail(), code + " is your " + mail.appName() + " verification code",
                    mail.codeEmail(user.getName(), code, otpExpirationMs / 60_000));
        });
        return new OtpResponse(true, SENT, expiresAt);
    }

    public OtpResponse resendOtp(OtpRequest request) {
        return sendOtp(request);
    }

    @Transactional
    public OtpResponse verifyOtp(OtpRequest request) {
        var user = userRepository.findByEmailIgnoreCase(request.email().trim()).orElse(null);
        var otp = user == null ? null
                : otpRepository.findTopByUserAndVerifiedFalseOrderByCreatedAtDesc(user).orElse(null);

        if (otp == null || otp.getExpiresAt().isBefore(Instant.now())) {
            return new OtpResponse(false, REJECTED, null);
        }
        if (otp.getAttempts() >= MAX_ATTEMPTS) {
            otpRepository.delete(otp);
            return new OtpResponse(false, REJECTED, null);
        }
        if (!matches(request.otp(), otp.getOtp())) {
            otp.setAttempts(otp.getAttempts() + 1);
            return new OtpResponse(false, REJECTED, null);
        }

        otp.setVerified(true);
        log.info("OTP verified for user id={}", user.getId());
        return new OtpResponse(true, "Verified.", otp.getExpiresAt());
    }

    @Scheduled(fixedRateString = "${otp.cleanup-rate-ms}")
    @Transactional
    public void cleanupExpiredOtp() {
        int deleted = otpRepository.deleteExpired(Instant.now());
        if (deleted > 0) {
            log.debug("Removed {} expired OTP rows", deleted);
        }
    }

    private String generateOtp() {
        StringBuilder code = new StringBuilder(otpLength);
        for (int i = 0; i < otpLength; i++) {
            code.append(random.nextInt(10));
        }
        return code.toString();
    }

}