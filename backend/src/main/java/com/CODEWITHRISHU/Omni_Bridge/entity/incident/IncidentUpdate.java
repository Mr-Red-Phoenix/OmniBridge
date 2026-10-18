package com.CODEWITHRISHU.Omni_Bridge.entity.incident;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "incident_update")
@Getter
@Setter
public class IncidentUpdate {
    public IncidentUpdate() {
    }
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "incident_id", nullable = false)
    private Incident incident;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id")
    private StaffUser author;

    @Column(nullable = false, length = 1000)
    private String message;

    @Column(name = "is_public_to_guest", nullable = false)
    private boolean isPublicToGuest = true;

    @Column(name = "update_type", nullable = false, length = 30)
    private String updateType = "NOTE";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    public IncidentUpdate(Incident incident, StaffUser author, String message) {
        this(incident, author, message, true, "NOTE");
    }

    public IncidentUpdate(Incident incident, StaffUser author, String message, boolean isPublicToGuest, String updateType) {
        this.incident = incident;
        this.author = author;
        this.message = message;
        this.isPublicToGuest = isPublicToGuest;
        this.updateType = updateType != null ? updateType : "NOTE";
    }

    @PrePersist
    void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}