package com.CODEWITHRISHU.Omni_Bridge.service.triage;

import com.CODEWITHRISHU.Omni_Bridge.entity.staff.StaffUser;
import com.CODEWITHRISHU.Omni_Bridge.entity.triage.PatientIntake;
import com.CODEWITHRISHU.Omni_Bridge.entity.triage.TriageAuditLedger;
import com.CODEWITHRISHU.Omni_Bridge.repository.TriageAuditLedgerRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.ObjectMapper;

import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AsyncAuditLedgerService {

    private final TriageAuditLedgerRepository auditLedgerRepository;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    /**
     * Non-blocking asynchronous persistence using Java 21 Virtual Threads ("virtualThreadExecutor").
     * Captures actor identity, clinical role, action taken, before/after ESI levels, priority scores,
     * vitals snapshot, and physician justification without slowing down the active queue or websocket broadcasts.
     */
    @Async("virtualThreadExecutor")
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordAuditEntry(
            PatientIntake intake,
            StaffUser actor,
            String action,
            Integer prevEsi,
            Integer newEsi,
            Double prevScore,
            Double newScore,
            String reason,
            Map<String, Object> vitalsSnapshot) {

        long start = System.currentTimeMillis();
        try {
            String snapshotJson = null;
            if (vitalsSnapshot != null && !vitalsSnapshot.isEmpty()) {
                snapshotJson = OBJECT_MAPPER.writeValueAsString(vitalsSnapshot);
            }

            TriageAuditLedger entry = new TriageAuditLedger();
            entry.setIntake(intake);
            entry.setActor(actor);
            entry.setAction(action);
            entry.setPreviousEsiLevel(prevEsi);
            entry.setNewEsiLevel(newEsi);
            entry.setPreviousScore(prevScore);
            entry.setNewScore(newScore);
            entry.setReason(reason != null ? reason : "");
            entry.setMetadataJson(snapshotJson);

            auditLedgerRepository.save(entry);

            long duration = System.currentTimeMillis() - start;
            log.info("[AsyncAuditLedger] Recorded audit action '{}' on intake {} by {} (role={}) in {}ms on thread {}",
                    action,
                    intake.getId(),
                    actor.getEmail(),
                    actor.getRole(),
                    duration,
                    Thread.currentThread());

        } catch (Exception ex) {
            log.error("[AsyncAuditLedger] Failed to persist audit record for intake ID {}: {}",
                    intake.getId(), ex.getMessage(), ex);
        }
    }
}
