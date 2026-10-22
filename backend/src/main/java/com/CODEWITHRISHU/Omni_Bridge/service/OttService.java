package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.dto.response.JwtResponse;
import com.CODEWITHRISHU.Omni_Bridge.entity.OttToken;
import com.CODEWITHRISHU.Omni_Bridge.repository.OtpVerificationRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.OttTokenRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.StaffUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import com.CODEWITHRISHU.Omni_Bridge.exception.StaffNotFoundException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.authority.FactorGrantedAuthority;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class OttService {

    private static final String INVALID_LINK = "Invalid or expired magic link, please request a new one.";

    private final OttTokenRepository ottTokenRepository;
    private final OtpVerificationRepository otpRepository;
    private final StaffUserRepository userRepository;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final BrevoMailService mail;

    @Value("${app.frontend.url}")
    private String frontendUrl;

    @Value("${ott.token.expiry.seconds}")
    private long tokenExpirySeconds;

    @Transactional
    public void generateAndSendMagicLink(String email) {
        String cleanEmail = email.trim();
        var userOptional = userRepository.findByEmailIgnoreCase(cleanEmail);
        if (userOptional.isEmpty()) {
            log.warn("\n=======================================================\n"
                    + ">>> [AUTH-DEV] MAGIC LINK REQUEST FAILED (USER NOT FOUND)\n"
                    + ">>> Email: {}\n"
                    + "=======================================================", cleanEmail);
            throw new StaffNotFoundException("No registered staff member found with email: " + cleanEmail);
        }

        var user = userOptional.get();
        if (!"APPROVED".equalsIgnoreCase(user.getStatus())) {
            log.warn(">>> [AUTH-DEV] MAGIC LINK REQUEST REJECTED (ACCOUNT PENDING APPROVAL): {}", cleanEmail);
            throw new BadCredentialsException("Your account is currently pending Administrator approval. Please contact your facility Admin.");
        }

        ottTokenRepository.deleteByUser(user);

        String token = UUID.randomUUID().toString();
        Instant expiresAt = Instant.now().plusSeconds(tokenExpirySeconds);
        ottTokenRepository.save(OttToken.builder()
                .token(token)
                .expiresAt(expiresAt)
                .user(user)
                .build());

        String link = UriComponentsBuilder.fromUriString(frontendUrl)
                .path("/login").queryParam("token", token).toUriString();

        System.out.println("\n*******************************************************");
        System.out.println(">>> [MAGIC LINK] " + link);
        System.out.println(">>> [MAGIC LINK TOKEN] " + token + " (Email: " + user.getEmail() + ")");
        System.out.println("*******************************************************\n");

        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] MAGIC LINK GENERATED\n"
                + ">>> User Email: {}\n"
                + ">>> Original Magic Link Token: {}\n"
                + ">>> Magic Link URL: {}\n"
                + ">>> Expires At: {}\n"
                + "=======================================================",
                user.getEmail(), token, link, expiresAt);

        mail.sendAsync(user.getEmail(), "Sign in to " + mail.appName(),
                mail.linkEmail(user.getName(), link, tokenExpirySeconds / 60));
    }

    @Transactional
    public JwtResponse loginWithOttToken(String token) {
        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] MAGIC LINK LOGIN ATTEMPT\n"
                + ">>> Submitted Token: {}\n"
                + "=======================================================", token);

        var ott = ottTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException(INVALID_LINK));
        if (ott.getExpiresAt().isBefore(Instant.now())) {
            log.warn(">>> [AUTH-DEV] MAGIC LINK LOGIN FAILED: TOKEN EXPIRED");
            throw new IllegalArgumentException(INVALID_LINK);
        }
        ottTokenRepository.delete(ott);

        var user = ott.getUser();

        List<String> factors = new ArrayList<>();
        factors.add(FactorGrantedAuthority.OTT_AUTHORITY);
        if (otpRepository.existsByUserAndVerifiedTrueAndExpiresAtAfter(user, Instant.now())) {
            factors.add(JwtService.OTP_FACTOR);
        }

        log.info("\n=======================================================\n"
                + ">>> [AUTH-DEV] MAGIC LINK LOGIN SUCCESSFUL\n"
                + ">>> User Email: {}\n"
                + ">>> Granted Factors: {}\n"
                + "=======================================================",
                user.getEmail(), factors);

        return JwtResponse.builder()
                .accessToken(jwtService.generateMfaToken(user, factors))
                .refreshToken(refreshTokenService.createRefreshToken(user, factors).getToken())
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .venueId(user.getVenue() != null ? user.getVenue().getId() : null)
                .venueName(user.getVenue() != null ? user.getVenue().getName() : null)
                .venueSlug(user.getVenue() != null ? user.getVenue().getSlug() : null)
                .build();
    }

    @Scheduled(fixedRateString = "${ott.cleanup-rate-ms}")
    @Transactional
    public void cleanupExpired() {
        int deleted = ottTokenRepository.deleteExpired(Instant.now());
        if (deleted > 0) {
            log.debug("Removed {} expired magic links", deleted);
        }
    }

}