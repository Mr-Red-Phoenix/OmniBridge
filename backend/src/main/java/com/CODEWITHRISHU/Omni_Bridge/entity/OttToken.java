package com.CODEWITHRISHU.Omni_Bridge.entity;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "ott_token")
@Getter
@Setter
public class OttToken {

    public OttToken() {
    }

    public OttToken(Long id, String token, Instant createdAt, Instant expiresAt, StaffUser user) {
        this.id = id;
        this.token = token;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
        this.user = user;
    }

    public static OttTokenBuilder builder() {
        return new OttTokenBuilder();
    }

    public static class OttTokenBuilder {
        private Long id;
        private String token;
        private Instant createdAt;
        private Instant expiresAt;
        private StaffUser user;

        public OttTokenBuilder id(Long id) {
            this.id = id;
            return this;
        }

        public OttTokenBuilder token(String token) {
            this.token = token;
            return this;
        }

        public OttTokenBuilder createdAt(Instant createdAt) {
            this.createdAt = createdAt;
            return this;
        }

        public OttTokenBuilder expiresAt(Instant expiresAt) {
            this.expiresAt = expiresAt;
            return this;
        }

        public OttTokenBuilder user(StaffUser user) {
            this.user = user;
            return this;
        }

        public OttToken build() {
            return new OttToken(id, token, createdAt, expiresAt, user);
        }
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "access_token", unique = true, nullable = false)
    private String token;

    @Column(nullable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant expiresAt;

    @OneToOne
    @JoinColumn(name = "user_id", referencedColumnName = "id", unique = true)
    private StaffUser user;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}