package com.CODEWITHRISHU.Omni_Bridge.entity.incident;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.Venue;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "incident")
@Getter
@Setter
public class Incident {
    public Incident() {
    }
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private IncidentType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Severity severity;

    @Column(nullable = false, length = 2000)
    private String description;

    @Column(nullable = false, length = 200)
    private String location;

    @Column(name = "reporter_name", length = 160)
    private String reporterName;

    @Column(name = "reporter_phone", length = 40)
    private String reporterPhone;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private IncidentStatus status = IncidentStatus.UNVERIFIED;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to_id")
    private StaffUser assignedTo;

    @Column(name = "guest_access_token", length = 64, unique = true)
    private String guestAccessToken;

    @Column(name = "responder_token", length = 64, unique = true)
    private String responderToken;

    @Column(name = "emergency_dispatched", nullable = false)
    private boolean emergencyDispatched = false;

    @Column(name = "emergency_dispatched_at")
    private Instant emergencyDispatchedAt;

    @Column(name = "source", nullable = false, length = 30)
    private String source = "GUEST";

    @Column(name = "reporter_ip", length = 45)
    private String reporterIp;

    @Column(name = "reporter_user_agent", length = 255)
    private String reporterUserAgent;

    @Column(name = "latitude")
    private Double latitude;

    @Column(name = "longitude")
    private Double longitude;

    @Column(name = "verified", nullable = false)
    private boolean verified = false;

    @Column(name = "verified_at")
    private Instant verifiedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "verified_by_id")
    private StaffUser verifiedBy;

    @Column(name = "false_alarm_reason", length = 500)
    private String falseAlarmReason;

    @Version
    private Long version;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    public Incident(Venue venue, IncidentType type, Severity severity,
                    String description, String location,
                    String reporterName, String reporterPhone) {
        this(venue, type, severity, description, location, reporterName, reporterPhone, "GUEST");
    }

    public Incident(Venue venue, IncidentType type, Severity severity,
                    String description, String location,
                    String reporterName, String reporterPhone, String source) {
        this.venue = venue;
        this.type = type;
        this.severity = severity;
        this.description = description;
        this.location = location;
        this.reporterName = reporterName;
        this.reporterPhone = reporterPhone;
        this.source = source != null ? source : "GUEST";
        this.status = IncidentStatus.UNVERIFIED;
    }

    @PrePersist
    void onCreate() {
        Instant now = Instant.now();
        createdAt = now;
        updatedAt = now;
        if (guestAccessToken == null) {
            guestAccessToken = java.util.UUID.randomUUID().toString().replace("-", "");
        }
        if (responderToken == null) {
            responderToken = java.util.UUID.randomUUID().toString().replace("-", "");
        }
        if (source == null) {
            source = "GUEST";
        }
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = Instant.now();
    }
}