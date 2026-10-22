package com.CODEWITHRISHU.Omni_Bridge.entity.triage;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "triage_audit_ledger")
@Getter
@Setter
public class TriageAuditLedger {

    public TriageAuditLedger() {}

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "intake_id", nullable = false)
    private PatientIntake intake;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id", nullable = false)
    private StaffUser actor;

    @Column(nullable = false, length = 50)
    private String action; // INTAKE_CREATED, DOCTOR_OVERRIDE, SPECIAL_REQUEST, REVIEW_FLAGGED, REVIEW_CLEARED

    @Column(name = "previous_esi_level")
    private Integer previousEsiLevel;

    @Column(name = "new_esi_level")
    private Integer newEsiLevel;

    @Column(name = "previous_score")
    private Double previousScore;

    @Column(name = "new_score")
    private Double newScore;

    @Column(nullable = false, length = 1000)
    private String reason;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @PrePersist
    public void onPrePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
