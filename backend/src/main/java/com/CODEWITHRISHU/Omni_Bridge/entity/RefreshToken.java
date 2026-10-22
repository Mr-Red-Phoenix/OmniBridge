package com.CODEWITHRISHU.Omni_Bridge.entity;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.Instant;
import java.util.Arrays;
import java.util.List;

@Entity
@Table(name = "refresh_tokens")
@Getter
@Setter
public class RefreshToken {
    public RefreshToken() {
    }

    public RefreshToken(Long id, String token, String factors, Instant createdAt, Instant expiresAt, StaffUser userInfo) {
        this.id = id;
        this.token = token;
        this.factors = factors != null ? factors : "";
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.userInfo = userInfo;
    }

    public static RefreshTokenBuilder builder() {
        return new RefreshTokenBuilder();
    }

    public static class RefreshTokenBuilder {
        private Long id;
        private String token;
        private String factors = "";
        private Instant createdAt;
        private Instant expiresAt;
        private StaffUser userInfo;

        public RefreshTokenBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public RefreshTokenBuilder token(String token) {
            this.token = token;
            return this;
        }

        public RefreshTokenBuilder factors(String factors) {
            this.factors = factors != null ? factors : "";
            return this;
        }

        public RefreshTokenBuilder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public RefreshTokenBuilder expiresAt(Instant expiresAt) {
            this.expiresAt = expiresAt;
            return this;
        }

        public RefreshTokenBuilder userInfo(StaffUser userInfo) {
            this.userInfo = userInfo;
            return this;
        }

        public RefreshToken build() {
            return new RefreshToken(id, token, factors, createdAt, expiresAt, userInfo);
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "refresh_token", nullable = false, unique = true)
    private String token;

    @Column(nullable = false, length = 200)
    private String factors = "";

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", unique = true)
    private StaffUser userInfo;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }

    public List<String> factorList() {
        return factors == null || factors.isBlank() ? List.of() : Arrays.asList(factors.split(","));
    }
}