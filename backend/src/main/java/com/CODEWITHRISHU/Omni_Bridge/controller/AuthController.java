package com.CODEWITHRISHU.Omni_Bridge.controller;

import com.CODEWITHRISHU.Omni_Bridge.dto.request.LoginRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.request.RefreshTokenRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.request.SignUpRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.request.StaffVerifyRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.response.JwtResponse;
import com.CODEWITHRISHU.Omni_Bridge.dto.response.StaffSummaryResponse;
import com.CODEWITHRISHU.Omni_Bridge.dto.response.StaffVerifyResponse;
import com.CODEWITHRISHU.Omni_Bridge.entity.RefreshToken;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.service.AuthService;
import com.CODEWITHRISHU.Omni_Bridge.service.JwtService;
import com.CODEWITHRISHU.Omni_Bridge.service.RefreshTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtService jwtService;
    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;

    @GetMapping("/verify-staff")
    public ResponseEntity<StaffVerifyResponse> verifyStaffGet(@RequestParam String email) {
        return ResponseEntity.ok(authService.verifyStaff(email));
    }

    @PostMapping("/verify-staff")
    public ResponseEntity<StaffVerifyResponse> verifyStaffPost(@Valid @RequestBody StaffVerifyRequest request) {
        return ResponseEntity.ok(authService.verifyStaff(request.email()));
    }

    @PostMapping("/login")
    public ResponseEntity<JwtResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public JwtResponse register(@Valid @RequestBody SignUpRequest request) {
        return authService.register(request);
    }

    @PostMapping("/signUp")
    @ResponseStatus(HttpStatus.CREATED)
    public JwtResponse signUp(@Valid @RequestBody SignUpRequest request) {
        return authService.register(request);
    }

    @PostMapping("/refreshToken")
    public JwtResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        var stored = refreshTokenService.verify(request.token());
        return tokens(stored.getUserInfo(), stored);
    }

    @GetMapping("/me")
    public ResponseEntity<StaffSummaryResponse> getCurrentStaff(@AuthenticationPrincipal StaffUser staff) {
        if (staff == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        return ResponseEntity.ok(StaffSummaryResponse.from(staff));
    }

    private JwtResponse tokens(StaffUser user, RefreshToken refresh) {
        return JwtResponse.builder()
                .accessToken(jwtService.generateMfaToken(user, refresh.factorList()))
                .refreshToken(refresh.getToken())
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .role(user.getRole())
                .venueId(user.getVenue().getId())
                .venueName(user.getVenue().getName())
                .venueSlug(user.getVenue().getSlug())
                .build();
    }

}