package com.CODEWITHRISHU.Omni_Bridge.entity.triage;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.entity.staff.Venue;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;

@Entity
@Table(name = "patient_intake")
@Getter
@Setter
public class PatientIntake {

    public PatientIntake() {}

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tracking_code", nullable = false, unique = true, length = 32)
    private String trackingCode;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "venue_id", nullable = false)
    private Venue venue;

    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "registered_by_id", nullable = false)
    private StaffUser registeredBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_doctor_id")
    private StaffUser assignedDoctor;

    // Demographics
    @Column(name = "patient_name", nullable = false, length = 160)
    private String patientName;

    @Column(nullable = false)
    private Integer age;

    @Column(nullable = false, length = 20)
    private String gender;

    @Column(name = "chief_complaint", nullable = false, length = 1000)
    private String chiefComplaint;

    // Objective Vitals
    @Column(name = "heart_rate")
    private Integer heartRate;

    @Column(name = "systolic_bp")
    private Integer systolicBp;

    @Column(name = "diastolic_bp")
    private Integer diastolicBp;

    @Column(name = "respiratory_rate")
    private Integer respiratoryRate;

    @Column(name = "oxygen_saturation")
    private Double oxygenSaturation;

    @Column(name = "body_temperature")
    private Double bodyTemperature;

    @Column(name = "consciousness_level", nullable = false, length = 20)
    private String consciousnessLevel = "ALERT"; // AVPU

    // Subjective Bias & Clinical Risk Factors
    @Column(name = "pain_score", nullable = false)
    private Integer painScore = 0;

    @Column(name = "high_risk_condition", nullable = false)
    private Boolean highRiskCondition = false;

    @Column(name = "resources_needed", nullable = false)
    private Integer resourcesNeeded = 0;

    @Column(name = "subjective_notes", length = 1000)
    private String subjectiveNotes;

    // Computed ESI Scoring & Dynamic Queue Priority
    @Column(name = "esi_level", nullable = false)
    private Integer esiLevel;

    @Column(name = "calculated_priority_score", nullable = false)
    private Double calculatedPriorityScore;

    @Column(name = "is_overridden", nullable = false)
    private Boolean isOverridden = false;

    @Column(name = "override_reason", length = 1000)
    private String overrideReason;

    // Workflow Status
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PatientStatus status = PatientStatus.QUEUED;

    @Column(name = "admitted_at")
    private Instant admittedAt;

    @Column(name = "discharged_at")
    private Instant dischargedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PrePersist
    public void onPrePersist() {
        if (createdAt == null) createdAt = Instant.now();
        if (updatedAt == null) updatedAt = Instant.now();
    }

    @PreUpdate
    public void onPreUpdate() {
        updatedAt = Instant.now();
    }
}
