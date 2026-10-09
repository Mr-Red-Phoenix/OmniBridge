package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.exception.InvalidRefreshTokenException;
import com.CODEWITHRISHU.Omni_Bridge.entity.RefreshToken;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.repository.RefreshTokenRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.StaffUserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final Duration TTL = Duration.ofDays(15);

    private final RefreshTokenRepository refreshTokenRepository;
    private final StaffUserRepository userRepository;

    @Transactional
    public RefreshToken createRefreshToken(StaffUser user, List<String> factors) {
        refreshTokenRepository.deleteByUserInfo(user);
        return refreshTokenRepository.save(RefreshToken.builder()
                .userInfo(user)
                .token(UUID.randomUUID().toString())
                .factors(String.join(",", factors))
                .expiresAt(Instant.now().plus(TTL))
                .build());
    }

    @Transactional(noRollbackFor = InvalidRefreshTokenException.class)
    public RefreshToken verify(String token) {
        RefreshToken stored = refreshTokenRepository.findByToken(token)
                .orElseThrow(() -> new InvalidRefreshTokenException("Refresh token is invalid or not found."));
        if (stored.getExpiresAt().isBefore(Instant.now())) {
            refreshTokenRepository.delete(stored);
            throw new InvalidRefreshTokenException("Refresh token expired. Please sign in again.");
        }
        return stored;
    }

}