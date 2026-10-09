package com.CODEWITHRISHU.Omni_Bridge.service;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;
import java.util.List;

@Slf4j
@Service
public class JwtService {

    public static final String OTP_FACTOR = "OTP_AUTHORITY";
    private static final String CLAIM_FACTORS = "authorities";

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(@Value("${jwt.secret}") String secret,
                      @Value("${jwt.expiration-ms}") long expirationMs) {
        this.signingKey = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
        this.expirationMs = expirationMs;
    }

    public Claims parse(String token) {
        return Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
    }

    public boolean belongsTo(Claims claims, UserDetails user) {
        return user.getUsername().equalsIgnoreCase(claims.getSubject());
    }

    public List<String> factors(Claims claims) {
        List<?> raw = claims.get(CLAIM_FACTORS, List.class);
        return raw == null ? List.of() : raw.stream().map(String::valueOf).toList();
    }

    public String generateToken(StaffUser user) {
        return generateMfaToken(user, List.of());
    }

    public String generateMfaToken(StaffUser user, List<String> factors) {
        var now = new Date();
        return Jwts.builder()
                .subject(user.getEmail())
                .claim("userId", user.getId())
                .claim("name", user.getName())
                .claim("email", user.getEmail())
                .claim(CLAIM_FACTORS, factors)
                .issuedAt(now)
                .expiration(new Date(now.getTime() + expirationMs))
                .signWith(signingKey)
                .compact();
    }

}