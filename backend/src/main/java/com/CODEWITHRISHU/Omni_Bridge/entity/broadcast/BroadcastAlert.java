package com.CODEWITHRISHU.Omni_Bridge.entity.broadcast;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.Venue;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "broadcast_alert")
@Getter
@Setter
@NoArgsConstructor
public class BroadcastAlert {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private StaffUser author;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, length = 2000)
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BroadcastSeverity severity;

    @Column(name = "target_zone", nullable = false, length = 100)
    private String targetZone = "ALL";

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "expires_at")
    private Instant expiresAt;

    public BroadcastAlert(Venue venue, StaffUser author, String title, String message,
                          BroadcastSeverity severity, String targetZone, Instant expiresAt) {
        this.venue = venue;
        this.author = author;
        this.title = title;
        this.message = message;
        this.severity = severity;
        this.targetZone = targetZone != null && !targetZone.isBlank() ? targetZone : "ALL";
        this.active = true;
        this.expiresAt = expiresAt;
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}

