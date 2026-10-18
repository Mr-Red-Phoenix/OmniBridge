package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.dto.request.LoginRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.request.SignUpRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.response.JwtResponse;
import com.CODEWITHRISHU.Omni_Bridge.dto.response.StaffSummaryResponse;
import com.CODEWITHRISHU.Omni_Bridge.dto.response.StaffVerifyResponse;
import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.exception.StaffNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.exception.UserAlreadyExists;
import com.CODEWITHRISHU.Omni_Bridge.exception.VenueNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.repository.StaffUserRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.List;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final StaffUserRepository repository;
    private final VenueRepository venueRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    @Value("${app.admin-key:}")
    private String adminKey;

    @Transactional(readOnly = true)
    public StaffVerifyResponse verifyStaff(String email) {
        if (email == null || email.isBlank()) {
            return StaffVerifyResponse.notFound("");
        }
        String cleanEmail = email.trim().toLowerCase();
        return repository.findByEmailIgnoreCase(cleanEmail)
                .map(StaffVerifyResponse::found)
                .orElseGet(() -> StaffVerifyResponse.notFound(cleanEmail));
    }

    @Transactional
    public JwtResponse login(LoginRequest request) {
        String cleanEmail = request.email().trim().toLowerCase();
        StaffUser staff = repository.findByEmailIgnoreCase(cleanEmail)
                .orElseThrow(() -> new StaffNotFoundException("Staff user not found in database with email: " + cleanEmail));

        if (!passwordEncoder.matches(request.password(), staff.getPasswordHash())) {
            throw new BadCredentialsException("Invalid password for staff user: " + cleanEmail);
        }

        var refresh = refreshTokenService.createRefreshToken(staff, List.of());
        String accessToken = jwtService.generateToken(staff);

        return buildJwtResponse(staff, accessToken, refresh.getToken());
    }

    @Transactional
    public JwtResponse register(SignUpRequest request) {
        String email = request.email().trim().toLowerCase();
        if (repository.findByEmailIgnoreCase(email).isPresent()) {
            throw new UserAlreadyExists("Staff already exists in database with email: " + email);
        }

        var venue = venueRepository.findBySlug(request.venueSlug().trim())
                .orElseThrow(() -> new VenueNotFoundException(request.venueSlug()));

        var user = new StaffUser();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(resolveRole(request.role(), request.adminKey()));
        user.setVenue(venue);

        StaffUser saved = repository.save(user);
        var refresh = refreshTokenService.createRefreshToken(saved, List.of());
        String accessToken = jwtService.generateToken(saved);

        log.info("Registered staff user id={}, role={}, venue={}", saved.getId(), saved.getRole(), venue.getSlug());
        return buildJwtResponse(saved, accessToken, refresh.getToken());
    }

    @Transactional(readOnly = true)
    public List<StaffSummaryResponse> listStaffByVenue(Long venueId) {
        return repository.findByVenueIdOrderByName(venueId).stream()
                .map(StaffSummaryResponse::from)
                .toList();
    }

    @Transactional
    public StaffSummaryResponse updateStaffRole(Long staffId, Role newRole) {
        StaffUser staff = repository.findById(staffId)
                .orElseThrow(() -> new StaffNotFoundException("Staff user not found with id: " + staffId));
        staff.setRole(newRole);
        return StaffSummaryResponse.from(repository.save(staff));
    }

    public JwtResponse buildJwtResponse(StaffUser user, String accessToken, String refreshToken) {
        return JwtResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .venueId(user.getVenue().getId())
                .venueName(user.getVenue().getName())
                .venueSlug(user.getVenue().getSlug())
                .build();
    }

    private Role resolveRole(Role requestedRole, String providedKey) {
        if (requestedRole == Role.ADMIN) {
            validateAdminKey(providedKey);
            return Role.ADMIN;
        }
        if (requestedRole != null) {
            return requestedRole;
        }
        boolean isAdmin = isValidAdminKey(providedKey);
        return isAdmin ? Role.ADMIN : Role.STAFF;
    }

    private void validateAdminKey(String providedKey) {
        if (!isValidAdminKey(providedKey)) {
            throw new IllegalArgumentException("Invalid admin key provided for ADMIN role assignment.");
        }
    }

    private boolean isValidAdminKey(String providedKey) {
        return !adminKey.isBlank() && providedKey != null
                && MessageDigest.isEqual(providedKey.getBytes(StandardCharsets.UTF_8),
                adminKey.getBytes(StandardCharsets.UTF_8));
    }

}