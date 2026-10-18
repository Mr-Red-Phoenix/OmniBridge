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
        userRepository.findByEmailIgnoreCase(email.trim()).ifPresent(user -> {
            ottTokenRepository.deleteByUser(user);

            String token = UUID.randomUUID().toString();
            ottTokenRepository.save(OttToken.builder()
                    .token(token)
                    .expiresAt(Instant.now().plusSeconds(tokenExpirySeconds))
                    .user(user)
                    .build());

            String link = UriComponentsBuilder.fromUriString(frontendUrl)
                    .path("/login").queryParam("token", token).toUriString();
            mail.sendAsync(user.getEmail(), "Sign in to " + mail.appName(),
                    mail.linkEmail(user.getName(), link, tokenExpirySeconds / 60));
        });
    }

    @Transactional
    public JwtResponse loginWithOttToken(String token) {
        var ott = ottTokenRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException(INVALID_LINK));
        if (ott.getExpiresAt().isBefore(Instant.now())) {
            throw new IllegalArgumentException(INVALID_LINK);
        }
        ottTokenRepository.delete(ott);

        var user = ott.getUser();

        List<String> factors = new ArrayList<>();
        factors.add(FactorGrantedAuthority.OTT_AUTHORITY);
        if (otpRepository.existsByUserAndVerifiedTrueAndExpiresAtAfter(user, Instant.now())) {
            factors.add(JwtService.OTP_FACTOR);
        }

        return JwtResponse.builder()
                .accessToken(jwtService.generateMfaToken(user, factors))
                .refreshToken(refreshTokenService.createRefreshToken(user, factors).getToken())
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