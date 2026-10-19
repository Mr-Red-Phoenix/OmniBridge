package com.CODEWITHRISHU.Omni_Bridge.entity;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import jakarta.persistence.*;
import lombok.Builder;
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

    @Builder
    public RefreshToken(Long id, String token, String factors, Instant createdAt, Instant expiresAt, StaffUser userInfo) {
        this.id = id;
        this.token = token;
        this.factors = factors != null ? factors : "";
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.userInfo = userInfo;
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