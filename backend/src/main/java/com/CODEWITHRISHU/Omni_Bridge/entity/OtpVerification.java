package com.CODEWITHRISHU.Omni_Bridge.entity;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "otp_verifications")
@Getter
@Setter
public class OtpVerification {
    public OtpVerification() {
    }

    @Builder
    public OtpVerification(Long id, String email, String phone, String otp, boolean verified, int attempts, StaffUser user, Instant createdAt, Instant expiresAt) {
        this.id = id;
        this.email = email;
        this.phone = phone;
        this.otp = otp;
        this.verified = verified;
        this.attempts = attempts;
        this.user = user;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "email", length = 254)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(nullable = false)
    private String otp;

    @Column(name = "verified")
    private boolean verified;

    @Column(nullable = false)
    private int attempts;

    @ManyToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id")
    private StaffUser user;

    @Column(name = "created_at")
    private Instant createdAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    @PrePersist
    protected void onCreate() {
        createdAt = Instant.now();
    }
}
