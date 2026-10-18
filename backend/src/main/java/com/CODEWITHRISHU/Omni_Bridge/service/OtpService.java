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
import com.CODEWITHRISHU.Omni_Bridge.exception.UserAlreadyExists;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;

@Service
@Slf4j
public class OtpService {

    private static final int MAX_ATTEMPTS = 5;
    private static final String SENT = "If this email is registered, a verification code has been sent.";
    private static final String REJECTED = "Invalid or expired code. Please request a new one.";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final OtpVerificationRepository otpRepository;
    private final StaffUserRepository userRepository;
    private final BrevoMailService mail;

    @Value("${otp.expiration-ms}")
    private long otpExpirationMs;

    @Value("${otp.length}")
    private int otpLength;

    public OtpService(OtpVerificationRepository otpRepository,
                      StaffUserRepository userRepository,
                      BrevoMailService mail) {
        this.otpRepository = otpRepository;
        this.userRepository = userRepository;
        this.mail = mail;
    }

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
        String cleanEmail = request.email().trim().toLowerCase();

        var userOpt = userRepository.findByEmailIgnoreCase(cleanEmail);
        if (userOpt.isEmpty()) {
            log.warn("\n=======================================================\n"
                    + ">>> [AUTH-DEV] OTP REQUEST FAILED (USER NOT FOUND)\n"
                    + ">>> Email: {}\n"
                    + "=======================================================", cleanEmail);
            return new OtpResponse(true, SENT, expiresAt);
        }

        var user = userOpt.get();
        otpRepository.deleteAllForUser(user);
        otpRepository.deleteAllByEmailIgnoreCase(cleanEmail);

        String code = generateOtp();
        otpRepository.save(OtpVerification.builder()
                .email(cleanEmail)
                .phone(normalizePhone(request.phone()))
                .otp(hash(code))
                .verified(false)
                .expiresAt(expiresAt)
                .user(user)
                .build());

        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] LOGIN OTP GENERATED\n"
                + ">>> User Email: {}\n"
                + ">>> Original OTP Code: {}\n"
                + ">>> Expires At: {}\n"
                + "=======================================================",
                cleanEmail, code, expiresAt);

        mail.sendAsync(user.getEmail(), code + " is your " + mail.appName() + " verification code",
                mail.codeEmail(user.getName(), code, otpExpirationMs / 60_000));

        return new OtpResponse(true, SENT, expiresAt);
    }

    public OtpResponse resendOtp(OtpRequest request) {
        return sendOtp(request);
    }

    @Transactional
    public OtpResponse sendRegistrationOtp(OtpRequest request) {
        String cleanEmail = request.email().trim().toLowerCase();
        if (userRepository.findByEmailIgnoreCase(cleanEmail).isPresent()) {
            throw new UserAlreadyExists("Staff user already exists with email: " + cleanEmail);
        }

        otpRepository.deleteAllByEmailIgnoreCase(cleanEmail);

        var expiresAt = Instant.now().plusMillis(otpExpirationMs);
        String code = generateOtp();

        otpRepository.save(OtpVerification.builder()
                .email(cleanEmail)
                .phone(normalizePhone(request.phone()))
                .otp(hash(code))
                .verified(false)
                .expiresAt(expiresAt)
                .user(null)
                .build());

        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] REGISTRATION OTP GENERATED\n"
                + ">>> User Email: {}\n"
                + ">>> Original OTP Code: {}\n"
                + ">>> Expires At: {}\n"
                + "=======================================================",
                cleanEmail, code, expiresAt);

        mail.sendAsync(cleanEmail, code + " is your " + mail.appName() + " registration verification code",
                mail.codeEmail("Staff Member", code, otpExpirationMs / 60_000));

        return new OtpResponse(true, "Registration verification code sent to your email.", expiresAt);
    }

    @Transactional
    public void validateAndConsumeRegistrationOtp(String email, String rawOtp) {
        if (rawOtp == null || rawOtp.isBlank()) {
            throw new BadCredentialsException("Verification code is required. Please check your email.");
        }
        String cleanEmail = email.trim().toLowerCase();
        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] VALIDATING REGISTRATION OTP\n"
                + ">>> User Email: {}\n"
                + ">>> Submitted Raw OTP Code: {}\n"
                + "=======================================================",
                cleanEmail, rawOtp.trim());

        var otp = otpRepository.findTopByEmailIgnoreCaseAndVerifiedFalseOrderByCreatedAtDesc(cleanEmail)
                .orElseThrow(() -> {
                    log.warn(">>> [AUTH-DEV] No active registration OTP found for {}", cleanEmail);
                    return new BadCredentialsException("No active verification code found for " + cleanEmail + ". Please request a verification code.");
                });

        if (otp.getExpiresAt().isBefore(Instant.now())) {
            otpRepository.delete(otp);
            log.warn(">>> [AUTH-DEV] Registration OTP expired for {}", cleanEmail);
            throw new BadCredentialsException("Verification code has expired. Please request a new code.");
        }

        if (otp.getAttempts() >= MAX_ATTEMPTS) {
            otpRepository.delete(otp);
            log.warn(">>> [AUTH-DEV] Too many attempts for registration OTP for {}", cleanEmail);
            throw new BadCredentialsException("Too many invalid attempts. Please request a new verification code.");
        }

        if (!matches(rawOtp.trim(), otp.getOtp())) {
            otp.setAttempts(otp.getAttempts() + 1);
            otpRepository.save(otp);
            log.warn(">>> [AUTH-DEV] Registration OTP mismatch for {} (attempts={})", cleanEmail, otp.getAttempts());
            throw new BadCredentialsException("Invalid verification code. Please check your email.");
        }

        otpRepository.delete(otp);
        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] REGISTRATION OTP VERIFIED & CONSUMED\n"
                + ">>> User Email: {}\n"
                + "=======================================================", cleanEmail);
    }

    @Transactional
    public OtpResponse verifyOtp(OtpRequest request) {
        String cleanEmail = request.email().trim().toLowerCase();
        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] VERIFYING OTP\n"
                + ">>> User Email: {}\n"
                + ">>> Submitted Raw OTP Code: {}\n"
                + "=======================================================",
                cleanEmail, request.otp());

        var otp = otpRepository.findTopByEmailIgnoreCaseAndVerifiedFalseOrderByCreatedAtDesc(cleanEmail)
                .orElse(null);

        if (otp == null) {
            var user = userRepository.findByEmailIgnoreCase(cleanEmail).orElse(null);
            otp = user == null ? null
                    : otpRepository.findTopByUserAndVerifiedFalseOrderByCreatedAtDesc(user).orElse(null);
        }

        if (otp == null || otp.getExpiresAt().isBefore(Instant.now())) {
            log.warn(">>> [AUTH-DEV] OTP Verification Failed: Not found or expired for {}", cleanEmail);
            return new OtpResponse(false, REJECTED, null);
        }
        if (otp.getAttempts() >= MAX_ATTEMPTS) {
            log.warn(">>> [AUTH-DEV] OTP Verification Failed: Max attempts exceeded for {}", cleanEmail);
            otpRepository.delete(otp);
            return new OtpResponse(false, REJECTED, null);
        }
        if (!matches(request.otp(), otp.getOtp())) {
            otp.setAttempts(otp.getAttempts() + 1);
            log.warn(">>> [AUTH-DEV] OTP Verification Failed: Code mismatch for {} (attempts={})", cleanEmail, otp.getAttempts());
            return new OtpResponse(false, REJECTED, null);
        }

        otp.setVerified(true);
        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] OTP VERIFIED SUCCESSFULLY\n"
                + ">>> User Email: {}\n"
                + "=======================================================", cleanEmail);
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
            code.append(RANDOM.nextInt(10));
        }
        return code.toString();
    }

}