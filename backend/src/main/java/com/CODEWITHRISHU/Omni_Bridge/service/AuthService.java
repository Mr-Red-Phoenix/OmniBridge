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
import com.CODEWITHRISHU.Omni_Bridge.repository.IncidentRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.IncidentUpdateRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.BroadcastAlertRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.PatientIntakeRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.OtpVerificationRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.OttTokenRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.RefreshTokenRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.BadCredentialsException;
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
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;
    private final OtpService otpService;
    private final IncidentRepository incidentRepository;
    private final IncidentUpdateRepository incidentUpdateRepository;
    private final BroadcastAlertRepository broadcastAlertRepository;
    private final PatientIntakeRepository patientIntakeRepository;
    private final OtpVerificationRepository otpVerificationRepository;
    private final OttTokenRepository ottTokenRepository;
    private final RefreshTokenRepository refreshTokenRepository;

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
        throw new BadCredentialsException("Password-based authentication is no longer supported. Please authenticate using OTP and Magic Link MFA.");
    }

    @Transactional
    public JwtResponse register(SignUpRequest request) {
        String email = request.email().trim().toLowerCase();
        if (repository.findByEmailIgnoreCase(email).isPresent()) {
            throw new UserAlreadyExists("Staff already exists in database with email: " + email);
        }

        otpService.validateAndConsumeRegistrationOtp(email, request.otp());

        var venue = venueRepository.findBySlug(request.venueSlug().trim())
                .orElseThrow(() -> new VenueNotFoundException(request.venueSlug()));

        var user = new StaffUser();
        user.setName(request.name().trim());
        user.setEmail(email);
        Role resolvedRole = resolveRole(request.role(), request.adminKey());
        user.setRole(resolvedRole);
        user.setVenue(venue);

        // Security rule: Primary Admin is auto-approved; all other new staff registrants require Admin approval
        boolean isPrimaryAdmin = "admin@omnibridge.org".equalsIgnoreCase(email) || resolvedRole == Role.ADMIN;
        user.setStatus(isPrimaryAdmin ? "APPROVED" : "PENDING");

        StaffUser saved = repository.save(user);

        if (!isPrimaryAdmin) {
            log.info("Registered staff applicant id={}, role={}, venue={} (STATUS: PENDING ADMIN APPROVAL)",
                    saved.getId(), saved.getRole(), venue.getSlug());
            // Return response indicating pending approval (no active session tokens issued)
            return JwtResponse.builder()
                    .accessToken(null)
                    .refreshToken(null)
                    .id(saved.getId())
                    .name(saved.getName())
                    .email(saved.getEmail())
                    .role(saved.getRole())
                    .venueId(venue.getId())
                    .venueName(venue.getName())
                    .venueSlug(venue.getSlug())
                    .build();
        }

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
    public StaffSummaryResponse approveStaffUser(Long staffId) {
        StaffUser staff = repository.findById(staffId)
                .orElseThrow(() -> new StaffNotFoundException("Staff user not found with id: " + staffId));

        staff.setStatus("APPROVED");
        StaffUser saved = repository.save(staff);
        log.info("Admin approved staff user id={}, email={}, role={}", saved.getId(), saved.getEmail(), saved.getRole());
        return StaffSummaryResponse.from(saved);
    }

    @Transactional
    public StaffSummaryResponse updateStaffRole(Long staffId, Role newRole) {
        StaffUser staff = repository.findById(staffId)
                .orElseThrow(() -> new StaffNotFoundException("Staff user not found with id: " + staffId));

        if ("admin@omnibridge.org".equalsIgnoreCase(staff.getEmail())) {
            throw new IllegalArgumentException("The primary Admin account (admin@omnibridge.org) role is immutable.");
        }

        if (newRole == Role.ADMIN) {
            throw new IllegalArgumentException("Only admin@omnibridge.org can hold the ADMIN role.");
        }

        staff.setRole(newRole);
        return StaffSummaryResponse.from(repository.save(staff));
    }

    @Transactional
    public void deleteStaffUser(Long staffId) {
        StaffUser staff = repository.findById(staffId)
                .orElseThrow(() -> new StaffNotFoundException("Staff user not found with id: " + staffId));

        if ("admin@omnibridge.org".equalsIgnoreCase(staff.getEmail())) {
            throw new IllegalArgumentException("Cannot remove the primary system Admin account (admin@omnibridge.org).");
        }

        // 1. Clean auth session tokens
        ottTokenRepository.deleteByUser(staff);
        refreshTokenRepository.deleteByUserInfo(staff);
        otpVerificationRepository.deleteAllForUser(staff);

        // 2. Nullify assignments/authorship to maintain operational history without foreign key violations
        incidentRepository.unassignStaffUser(staff);
        incidentRepository.nullifyVerifiedBy(staff);
        incidentUpdateRepository.nullifyAuthor(staff);
        broadcastAlertRepository.nullifyAuthor(staff);
        patientIntakeRepository.nullifyAssignedDoctor(staff);

        // 3. Remove user
        repository.delete(staff);
        log.info("Successfully removed staff user id={}, email={}", staffId, staff.getEmail());
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