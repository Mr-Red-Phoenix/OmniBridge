package com.CODEWITHRISHU.Omni_Bridge.repository;

import com.CODEWITHRISHU.Omni_Bridge.entity.triage.TriageAuditLedger;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TriageAuditLedgerRepository extends JpaRepository<TriageAuditLedger, Long> {

    List<TriageAuditLedger> findByIntakeIdOrderByCreatedAtDesc(Long intakeId);
}
