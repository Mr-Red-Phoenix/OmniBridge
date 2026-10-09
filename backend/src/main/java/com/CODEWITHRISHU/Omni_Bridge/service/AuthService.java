package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.dto.request.SignUpRequest;
import com.CODEWITHRISHU.Omni_Bridge.exception.UserAlreadyExists;
import com.CODEWITHRISHU.Omni_Bridge.exception.VenueNotFoundException;
import com.CODEWITHRISHU.Omni_Bridge.entity.Role;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.repository.StaffUserRepository;
import com.CODEWITHRISHU.Omni_Bridge.repository.VenueRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
@Slf4j
@RequiredArgsConstructor
public class AuthService {

    private final StaffUserRepository repository;
    private final VenueRepository venueRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.admin-key:}")
    private String adminKey;

    @Transactional
    public StaffUser register(SignUpRequest request) {
        String email = request.email().trim().toLowerCase();
        if (repository.findByEmailIgnoreCase(email).isPresent()) {
            throw new UserAlreadyExists("User already exists with email: " + email);
        }

        var venue = venueRepository.findBySlug(request.venueSlug())
                .orElseThrow(() -> new VenueNotFoundException(request.venueSlug()));

        var user = new StaffUser();
        user.setName(request.name().trim());
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setRole(resolveRole(request.adminKey()));
        user.setVenue(venue);

        log.info("Registered user id pending, role={}", user.getRole());
        return repository.save(user);
    }

    private Role resolveRole(String providedKey) {
        boolean isAdmin = !adminKey.isBlank() && providedKey != null
                && MessageDigest.isEqual(providedKey.getBytes(StandardCharsets.UTF_8),
                adminKey.getBytes(StandardCharsets.UTF_8));
        return isAdmin ? Role.ADMIN : Role.STAFF;
    }

    public StaffUser login(String email, String password) {
        StaffUser user = repository.findByEmailIgnoreCase(email.trim())
                .orElseThrow(() -> new org.springframework.security.authentication.BadCredentialsException("Invalid credentials"));
        
        if (!passwordEncoder.matches(password, user.getPasswordHash()) && !password.equals(user.getPasswordHash())) {
            throw new org.springframework.security.authentication.BadCredentialsException("Invalid credentials");
        }
        return user;
    }

}