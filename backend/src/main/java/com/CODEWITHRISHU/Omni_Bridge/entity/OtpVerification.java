package com.CODEWITHRISHU.Omni_Bridge.entity;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import jakarta.persistence.*;
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

    public static OtpVerificationBuilder builder() {
        return new OtpVerificationBuilder();
    }

    public static class OtpVerificationBuilder {
        private Long id;
        private String email;
        private String phone;
        private String otp;
        private boolean verified;
        private int attempts;
        private StaffUser user;
        private Instant createdAt;
        private Instant expiresAt;

        public OtpVerificationBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public OtpVerificationBuilder email(String email) {
            this.email = email;
            return this;
        }

        public OtpVerificationBuilder phone(String phone) {
            this.phone = phone;
            return this;
        }

        public OtpVerificationBuilder otp(String otp) {
            this.otp = otp;
            return this;
        }

        public OtpVerificationBuilder verified(boolean verified) {
            this.verified = verified;
            return this;
        }

        public OtpVerificationBuilder attempts(int attempts) {
            this.attempts = attempts;
            return this;
        }

        public OtpVerificationBuilder user(StaffUser user) {
            this.user = user;
            return this;
        }

        public OtpVerificationBuilder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public OtpVerificationBuilder expiresAt(Instant expiresAt) {
            this.expiresAt = expiresAt;
            return this;
        }

        public OtpVerification build() {
            return new OtpVerification(id, email, phone, otp, verified, attempts, user, createdAt, expiresAt);
        }
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
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
