package com.CODEWITHRISHU.Omni_Bridge.controller;

import com.CODEWITHRISHU.Omni_Bridge.dto.request.RefreshTokenRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.request.SignUpRequest;
import com.CODEWITHRISHU.Omni_Bridge.dto.response.JwtResponse;
import com.CODEWITHRISHU.Omni_Bridge.entity.RefreshToken;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.service.AuthService;
import com.CODEWITHRISHU.Omni_Bridge.service.JwtService;
import com.CODEWITHRISHU.Omni_Bridge.service.RefreshTokenService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/auth")
public class AuthController {

    private final JwtService jwtService;
    private final AuthService authService;
    private final RefreshTokenService refreshTokenService;

    @PostMapping("/signUp")
    @ResponseStatus(HttpStatus.CREATED)
    public JwtResponse signUp(@Valid @RequestBody SignUpRequest request) {
        var user = authService.register(request);
        var refresh = refreshTokenService.createRefreshToken(user, List.of("OTP_AUTHORITY", "ROLE_" + user.getRole().name()));
        return tokens(user, refresh);
    }

    @PostMapping("/login")
    public JwtResponse login(@Valid @RequestBody com.CODEWITHRISHU.Omni_Bridge.dto.request.LoginRequest request) {
        var user = authService.login(request.email(), request.password());
        var refresh = refreshTokenService.createRefreshToken(user, List.of("OTP_AUTHORITY", "ROLE_" + user.getRole().name()));
        return tokens(user, refresh);
    }

    @PostMapping("/refreshToken")
    public JwtResponse refresh(@Valid @RequestBody RefreshTokenRequest request) {
        var stored = refreshTokenService.verify(request.token());
        return tokens(stored.getUserInfo(), stored);
    }

    private JwtResponse tokens(StaffUser user, RefreshToken refresh) {
        return JwtResponse.builder()
                .accessToken(jwtService.generateMfaToken(user, refresh.factorList()))
                .refreshToken(refresh.getToken())
                .build();
    }

}