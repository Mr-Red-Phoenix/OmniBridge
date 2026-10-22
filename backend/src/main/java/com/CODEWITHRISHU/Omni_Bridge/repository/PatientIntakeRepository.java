package com.CODEWITHRISHU.Omni_Bridge.repository;

import com.CODEWITHRISHU.Omni_Bridge.entity.triage.PatientIntake;
import com.CODEWITHRISHU.Omni_Bridge.entity.triage.PatientStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PatientIntakeRepository extends JpaRepository<PatientIntake, Long> {

    Optional<PatientIntake> findByTrackingCode(String trackingCode);

    List<PatientIntake> findByVenueIdAndStatusOrderByCalculatedPriorityScoreDescCreatedAtAsc(Long venueId, PatientStatus status);

    @Query("SELECT p FROM PatientIntake p WHERE p.venue.id = :venueId AND p.status IN (:statuses) ORDER BY p.calculatedPriorityScore DESC, p.createdAt ASC")
    List<PatientIntake> findActiveQueue(@Param("venueId") Long venueId, @Param("statuses") List<PatientStatus> statuses);

    List<PatientIntake> findByVenueIdOrderByCreatedAtDesc(Long venueId);

    @org.springframework.data.jpa.repository.Modifying(flushAutomatically = true, clearAutomatically = true)
    @Query("update PatientIntake p set p.assignedDoctor = null where p.assignedDoctor = :staff")
    void nullifyAssignedDoctor(@Param("staff") com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser staff);
}
