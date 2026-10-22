package com.CODEWITHRISHU.Omni_Bridge.service.triage;

import com.CODEWITHRISHU.Omni_Bridge.dto.triage.TriageDtos;
import com.CODEWITHRISHU.Omni_Bridge.entity.triage.PatientIntake;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;

/**
 * Air-Gapped Contextual ESI Engine implementing the 5-level Emergency Severity Index
 * algorithm combined with objective vitals scoring, subjective bias panel evaluation,
 * and dynamic wait-time decay priority calculations.
 */
@Service
public class ContextualEsiEngine {

    /**
     * Computes the base ESI Level (1 to 5) from clinical vitals and risk assessment:
     * - ESI 1: Immediate resuscitation / life-threatening conditions (unresponsive, extreme SpO2/HR/BP)
     * - ESI 2: High-risk situation, altered mental status, severe respiratory distress, or severe pain (>= 8)
     * - ESI 3: Multiple resources needed (>= 2) with stable vitals
     * - ESI 4: One resource needed
     * - ESI 5: No resources needed
     */
    public int calculateBaseEsiLevel(TriageDtos.IntakeRequest request) {
        // Step 1: Decision Point A - Requires immediate life-saving intervention?
        if (isImmediateLifeThreat(request)) {
            return 1;
        }

        // Step 2: Decision Point B - High-risk situation, confused/lethargic/disoriented, or severe pain?
        if (isHighRiskOrSeverePain(request)) {
            return 2;
        }

        // Step 3: Decision Point C - How many resources are needed?
        int resources = request.getEffectiveResources();
        if (resources >= 2) {
            // Check vitals zone danger zone for ESI 3 (upscale to ESI 2 if danger criteria met)
            if (isDangerZoneVitals(request)) {
                return 2;
            }
            return 3;
        } else if (resources == 1) {
            return 4;
        } else {
            return 5;
        }
    }

    /**
     * Calculates the dynamic priority score.
     * Higher score indicates higher precedence in the queue.
     * Base score is derived from ESI Level (Level 1 has highest weight),
     * adjusted by objective vital deviations, and increased by dynamic wait-time decay:
     * Priority = BaseWeight(ESI) + VitalDeviationPenalty + (WaitMinutes * DecayRate(ESI))
     */
    public double calculateDynamicPriorityScore(int esiLevel, Instant createdAt, TriageDtos.IntakeRequest vitals) {
        double baseWeight = switch (esiLevel) {
            case 1 -> 10000.0;
            case 2 -> 5000.0;
            case 3 -> 2000.0;
            case 4 -> 1000.0;
            case 5 -> 500.0;
            default -> 100.0;
        };

        // Wait-time decay rate per minute: lower ESI levels gain priority faster so patients don't deteriorate unaddressed
        double decayRatePerMinute = switch (esiLevel) {
            case 1 -> 50.0;
            case 2 -> 15.0;
            case 3 -> 5.0;
            case 4 -> 2.0;
            case 5 -> 1.0;
            default -> 0.5;
        };

        long waitMinutes = 0;
        if (createdAt != null) {
            waitMinutes = Math.max(0, Duration.between(createdAt, Instant.now()).toMinutes());
        }

        double waitBonus = waitMinutes * decayRatePerMinute;

        // Vitals penalty/bump
        double vitalBonus = 0.0;
        if (vitals != null) {
            if (vitals.oxygenSaturation() != null && vitals.oxygenSaturation() < 92.0) {
                vitalBonus += 200.0;
            }
            if (vitals.heartRate() != null && (vitals.heartRate() > 120 || vitals.heartRate() < 50)) {
                vitalBonus += 150.0;
            }
            if (vitals.systolicBp() != null && (vitals.systolicBp() < 90 || vitals.systolicBp() > 180)) {
                vitalBonus += 150.0;
            }
            if (Boolean.TRUE.equals(vitals.infantFlag())) {
                vitalBonus += 100.0;
            }
        }

        return baseWeight + waitBonus + vitalBonus;
    }

    public double calculateDynamicPriorityScore(PatientIntake entity) {
        if (entity == null) return 0.0;
        int esiLevel = entity.getEsiLevel() != null ? entity.getEsiLevel() : 3;
        double baseWeight = switch (esiLevel) {
            case 1 -> 10000.0;
            case 2 -> 5000.0;
            case 3 -> 2000.0;
            case 4 -> 1000.0;
            case 5 -> 500.0;
            default -> 100.0;
        };

        double decayRatePerMinute = switch (esiLevel) {
            case 1 -> 50.0;
            case 2 -> 15.0;
            case 3 -> 5.0;
            case 4 -> 2.0;
            case 5 -> 1.0;
            default -> 0.5;
        };

        long waitMinutes = 0;
        if (entity.getCreatedAt() != null) {
            waitMinutes = Math.max(0, Duration.between(entity.getCreatedAt(), Instant.now()).toMinutes());
        }

        double waitBonus = waitMinutes * decayRatePerMinute;

        double vitalBonus = 0.0;
        if (entity.getOxygenSaturation() != null && entity.getOxygenSaturation() < 92.0) {
            vitalBonus += 200.0;
        }
        if (entity.getHeartRate() != null && (entity.getHeartRate() > 120 || entity.getHeartRate() < 50)) {
            vitalBonus += 150.0;
        }
        if (entity.getSystolicBp() != null && (entity.getSystolicBp() < 90 || entity.getSystolicBp() > 180)) {
            vitalBonus += 150.0;
        }
        if (Boolean.TRUE.equals(entity.getHighRiskCondition())) {
            vitalBonus += 100.0;
        }

        return baseWeight + waitBonus + vitalBonus;
    }

    private boolean isImmediateLifeThreat(TriageDtos.IntakeRequest r) {
        String level = r.consciousnessLevel() != null ? r.consciousnessLevel().trim().toUpperCase() : "ALERT";
        // Decision Point A: Requires immediate airway, breathing, or hemodynamic support / Unresponsive (P or U on AVPU)
        if ("UNRESPONSIVE".equals(level) || "PAIN".equals(level)) {
            return true;
        }
        // Severe respiratory arrest or profound hypoxia (< 80% SpO2)
        if (r.oxygenSaturation() != null && r.oxygenSaturation() < 80.0) {
            return true;
        }
        // Pulselessness / severe bradycardia or extreme tachycardia
        if (r.heartRate() != null && (r.heartRate() < 40 || r.heartRate() > 180)) {
            return true;
        }
        if (r.respiratoryRate() != null && (r.respiratoryRate() < 6 || r.respiratoryRate() > 45)) {
            return true;
        }
        return false;
    }

    private boolean isHighRiskOrSeverePain(TriageDtos.IntakeRequest r) {
        // High risk presentation: ACS, stroke, acute distress, immunocompromised with fever
        if (Boolean.TRUE.equals(r.highRiskCondition())) {
            return true;
        }
        // Altered mental status: acute confusion, lethargy, verbal responsiveness only
        String level = r.consciousnessLevel() != null ? r.consciousnessLevel().trim().toUpperCase() : "ALERT";
        if ("VERBAL".equals(level)) {
            return true;
        }
        // AHRQ Standard: Severe pain score >= 7/10
        if (r.getEffectivePainScore() >= 7) {
            return true;
        }
        // Pediatric Bias Rule: infant with fever (> 38.0°C)
        if (Boolean.TRUE.equals(r.infantFlag()) && (Boolean.TRUE.equals(r.fever()) || (r.bodyTemperature() != null && r.bodyTemperature() > 38.0))) {
            return true;
        }
        return false;
    }

    /**
     * Decision Point D: Age-stratified Danger Zone Vital Signs Evaluation
     * Age Group                  HR Cutoff   RR Cutoff   SpO2 Cutoff  Temp Cutoff
     * < 3 Months                 > 180       > 50        < 92%        > 38.0°C (Auto ESI 2)
     * 3 Months - 3 Years         > 160       > 40        < 92%        > 39.0°C
     * 3 Years - 8 Years          > 140       > 30        < 92%        > 39.0°C
     * > 8 Years - Adult          > 100       > 20        < 92%        > 40.0°C or < 35.0°C / SBP < 90
     */
    private boolean isDangerZoneVitals(TriageDtos.IntakeRequest r) {
        int age = r.age() != null ? r.age() : 30;
        boolean isInfantUnder3Mo = Boolean.TRUE.equals(r.infantFlag()) && age == 0;

        // Universal Hypoxia threshold per AHRQ Standard (< 92%)
        if (r.oxygenSaturation() != null && r.oxygenSaturation() < 92.0) {
            return true;
        }

        if (isInfantUnder3Mo) {
            if (r.heartRate() != null && r.heartRate() > 180) return true;
            if (r.respiratoryRate() != null && r.respiratoryRate() > 50) return true;
            if (r.bodyTemperature() != null && r.bodyTemperature() > 38.0) return true;
        } else if (age <= 3) {
            if (r.heartRate() != null && r.heartRate() > 160) return true;
            if (r.respiratoryRate() != null && r.respiratoryRate() > 40) return true;
            if (r.bodyTemperature() != null && r.bodyTemperature() > 39.0) return true;
        } else if (age <= 8) {
            if (r.heartRate() != null && r.heartRate() > 140) return true;
            if (r.respiratoryRate() != null && r.respiratoryRate() > 30) return true;
            if (r.bodyTemperature() != null && r.bodyTemperature() > 39.0) return true;
        } else {
            // > 8 Years - Adult
            if (r.heartRate() != null && r.heartRate() > 100) return true;
            if (r.respiratoryRate() != null && r.respiratoryRate() > 20) return true;
            if (r.bodyTemperature() != null && (r.bodyTemperature() > 40.0 || r.bodyTemperature() < 35.0)) return true;
            if (r.systolicBp() != null && (r.systolicBp() < 90 || r.systolicBp() > 200)) return true;
        }

        return false;
    }
}
