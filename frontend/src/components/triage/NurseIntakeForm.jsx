import React, { useState, useMemo } from 'react';
import {
  ActivityHeart,
  User01 as User,
  CheckCircle as CheckCircle2,
  AlertTriangle,
  AlertOctagon as ShieldAlert,
  Clock,
  HelpCircle,
  Activity as ResourceIcon,
  Zap,
} from '@untitledui/icons';
import { toast } from 'react-toastify';
import triageApi from '../../api/triageApi';

// AHRQ Resource Definitions
const RESOURCE_CATEGORIES = [
  { id: 'LABS', label: 'Labs (Blood, Urine, CSF)', desc: '1 resource total regardless of tube count' },
  { id: 'ECG', label: 'ECG / Monitor', desc: 'Diagnostic rhythm evaluation' },
  { id: 'XRAY', label: 'X-Ray / Plain Films', desc: 'Diagnostic plain radiography' },
  { id: 'CT_MRI_US', label: 'Advanced Imaging (CT, MRI, US)', desc: 'Each distinct modality counts' },
  { id: 'IV_FLUIDS', label: 'IV Fluid Hydration', desc: 'Bolus or continuous infusion' },
  { id: 'IV_IM_MEDS', label: 'IV / IM / Nebulized Meds', desc: 'Injected or inhaled therapeutics' },
  { id: 'SPECIALTY_CONSULT', label: 'Specialty Consultation', desc: 'Cardiology, Surgery, Ortho, etc.' },
  { id: 'COMPLEX_PROCEDURE', label: 'Complex Procedure', desc: 'Foley, sedation, complex sutures' },
];

export default function NurseIntakeForm({ onIntakeSuccess }) {
  const [loading, setLoading] = useState(false);
  const [isAgeInMonths, setIsAgeInMonths] = useState(false);
  const [isFahrenheit, setIsFahrenheit] = useState(false);

  // Core Form State (Demographics, Vitals, Context, Resources)
  const [form, setForm] = useState({
    patientName: '',
    age: '',
    gender: 'MALE',
    chiefComplaint: '',

    // Tier 1: Objective Vitals
    heartRate: '',
    systolicBp: '',
    diastolicBp: '',
    respiratoryRate: '',
    oxygenSaturation: '',
    bodyTemperature: '',
    temperatureRoute: 'ORAL',
    consciousnessLevel: 'ALERT',

    // Tier 2: Subjective Clinical & Risk Indicators
    painScore: 0,
    painLocation: '',
    highRiskCondition: false,
    fever: false,
    immunocompromised: false,
    lastMealTime: '',
    subjectiveNotes: '',

    // Tier 3: Resources & Escalation
    selectedResources: [],
    requestDoctorReview: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const toggleResource = (resourceId) => {
    setForm((prev) => {
      const exists = prev.selectedResources.includes(resourceId);
      const updated = exists
        ? prev.selectedResources.filter((r) => r !== resourceId)
        : [...prev.selectedResources, resourceId];
      return { ...prev, selectedResources: updated };
    });
  };

  // Live AHRQ Triage Evaluation (Decision Gates A -> B -> C -> D)
  const ahrqEvaluation = useMemo(() => {
    const ageNum = Number(form.age) || 0;
    const effectiveAgeYears = isAgeInMonths ? Math.round(ageNum / 12) : ageNum;
    const isInfantUnder3Mo = isAgeInMonths ? ageNum < 3 : effectiveAgeYears === 0;

    const hr = form.heartRate ? Number(form.heartRate) : null;
    const rr = form.respiratoryRate ? Number(form.respiratoryRate) : null;
    const spo2 = form.oxygenSaturation ? Number(form.oxygenSaturation) : null;
    const sbp = form.systolicBp ? Number(form.systolicBp) : null;

    let tempC = null;
    if (form.bodyTemperature) {
      const t = Number(form.bodyTemperature);
      tempC = isFahrenheit ? ((t - 32) * 5) / 9 : t;
    }

    // Gate A: Immediate Life-Threat?
    const isAvpuPOrU = form.consciousnessLevel === 'PAIN' || form.consciousnessLevel === 'UNRESPONSIVE';
    const isSevereHypoxia = spo2 !== null && spo2 < 80;
    const isSevereArrest = (hr !== null && (hr < 40 || hr > 180)) || (rr !== null && (rr < 6 || rr > 45));

    if (isAvpuPOrU || isSevereHypoxia || isSevereArrest) {
      return {
        level: 1,
        title: 'ESI 1: Resuscitation',
        color: 'rose',
        gate: 'Gate A: Immediate Life-Threat',
        rationale: 'Requires immediate bedside resuscitation. Critical vitals or unresponsiveness (AVPU = P/U).',
        isDangerZone: false,
      };
    }

    // Gate B: High-Risk / Severe Pain / Pediatric Bias?
    const isHighRisk = Boolean(form.highRiskCondition);
    const isAlteredMental = form.consciousnessLevel === 'VERBAL';
    const isSeverePain = Number(form.painScore) >= 7;
    const isPediatricFeverBias = isInfantUnder3Mo && (tempC !== null ? tempC > 38.0 : Boolean(form.fever));
    const isImmunoFever = Boolean(form.immunocompromised) && Boolean(form.fever);

    if (isHighRisk || isAlteredMental || isSeverePain || isPediatricFeverBias || isImmunoFever) {
      let reason = 'High-risk clinical presentation requiring rapid placement.';
      if (isSeverePain) reason = 'Severe pain score (≥ 7/10) with physiological distress.';
      if (isPediatricFeverBias) reason = 'AHRQ Rule: Infant < 3 months with fever (> 38.0°C / 100.4°F).';
      if (isAlteredMental) reason = 'Acute altered mental status (AVPU = Verbal).';
      if (isImmunoFever) reason = 'Immunocompromised patient presenting with fever.';

      return {
        level: 2,
        title: 'ESI 2: Emergent / High-Risk',
        color: 'orange',
        gate: 'Gate B: High-Risk / Acute Distress',
        rationale: reason,
        isDangerZone: false,
      };
    }

    // Gate C: Resource Consumption (0, 1, or 2+)
    const resourceCount = form.selectedResources.length;

    if (resourceCount === 0) {
      return {
        level: 5,
        title: 'ESI 5: Non-Urgent',
        color: 'blue',
        gate: 'Gate C: Zero Resources',
        rationale: 'Basic oral history, exam, or simple prescription. No specialized hospital resource categories.',
        isDangerZone: false,
      };
    }

    if (resourceCount === 1) {
      return {
        level: 4,
        title: 'ESI 4: Less Urgent',
        color: 'emerald',
        gate: 'Gate C: Single Resource',
        rationale: 'Requires 1 diagnostic or therapeutic category (e.g. single X-ray, simple labs, or IM injection).',
        isDangerZone: false,
      };
    }

    // Gate D: 2+ Resources -> Check Danger Zone Vital Signs
    let dangerVitalsTriggered = false;
    let dangerReason = '';

    if (spo2 !== null && spo2 < 92) {
      dangerVitalsTriggered = true;
      dangerReason = `Hypoxia flag (SpO2 ${spo2}% < 92%)`;
    } else if (isInfantUnder3Mo) {
      if (hr !== null && hr > 180) { dangerVitalsTriggered = true; dangerReason = `Tachycardia (HR ${hr} > 180)`; }
      else if (rr !== null && rr > 50) { dangerVitalsTriggered = true; dangerReason = `Tachypnea (RR ${rr} > 50)`; }
      else if (tempC !== null && tempC > 38.0) { dangerVitalsTriggered = true; dangerReason = `Infant Fever (${tempC.toFixed(1)}°C > 38.0°C)`; }
    } else if (effectiveAgeYears <= 3) {
      if (hr !== null && hr > 160) { dangerVitalsTriggered = true; dangerReason = `Pediatric Tachycardia (HR ${hr} > 160)`; }
      else if (rr !== null && rr > 40) { dangerVitalsTriggered = true; dangerReason = `Pediatric Tachypnea (RR ${rr} > 40)`; }
      else if (tempC !== null && tempC > 39.0) { dangerVitalsTriggered = true; dangerReason = `High Pediatric Fever (${tempC.toFixed(1)}°C > 39.0°C)`; }
    } else if (effectiveAgeYears <= 8) {
      if (hr !== null && hr > 140) { dangerVitalsTriggered = true; dangerReason = `Child Tachycardia (HR ${hr} > 140)`; }
      else if (rr !== null && rr > 30) { dangerVitalsTriggered = true; dangerReason = `Child Tachypnea (RR ${rr} > 30)`; }
      else if (tempC !== null && tempC > 39.0) { dangerVitalsTriggered = true; dangerReason = `Child Fever (${tempC.toFixed(1)}°C > 39.0°C)`; }
    } else {
      // Adult / > 8y
      if (hr !== null && hr > 100) { dangerVitalsTriggered = true; dangerReason = `Adult Tachycardia (HR ${hr} > 100)`; }
      else if (rr !== null && rr > 20) { dangerVitalsTriggered = true; dangerReason = `Adult Tachypnea (RR ${rr} > 20)`; }
      else if (tempC !== null && (tempC > 40.0 || tempC < 35.0)) { dangerVitalsTriggered = true; dangerReason = `Severe Temp (${tempC.toFixed(1)}°C)`; }
      else if (sbp !== null && sbp < 90) { dangerVitalsTriggered = true; dangerReason = `Hypotension (SBP ${sbp} < 90 mmHg)`; }
    }

    if (dangerVitalsTriggered) {
      return {
        level: 2,
        title: 'ESI 2: Upgraded from Level 3',
        color: 'orange',
        gate: 'Gate D: Danger Zone Vitals Triggered',
        rationale: `Multiple resources projected (${resourceCount}), but upgraded to Level 2 due to abnormal vitals: ${dangerReason}.`,
        isDangerZone: true,
      };
    }

    return {
      level: 3,
      title: 'ESI 3: Urgent',
      color: 'yellow',
      gate: 'Gate D: Multiple Resources (Stable Vitals)',
      rationale: `Requires ${resourceCount} resource categories with vitals remaining within acceptable physiological bounds.`,
      isDangerZone: false,
    };
  }, [form, isAgeInMonths, isFahrenheit]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.patientName.trim()) {
      toast.error('Please enter patient name.');
      return;
    }
    if (form.age === '' || isNaN(form.age)) {
      toast.error('Please enter a valid age.');
      return;
    }
    if (!form.chiefComplaint.trim()) {
      toast.error('Please enter chief complaint.');
      return;
    }

    let parsedAge = Number(form.age);
    let infant = isAgeInMonths ? parsedAge < 12 : parsedAge <= 1;
    if (isAgeInMonths) {
      parsedAge = Math.max(0, Math.round(parsedAge / 12));
    }

    const payload = {
      patientName: form.patientName.trim(),
      age: parsedAge,
      gender: form.gender,
      chiefComplaint: form.chiefComplaint.trim(),
      heartRate: form.heartRate ? Number(form.heartRate) : null,
      systolicBp: form.systolicBp ? Number(form.systolicBp) : null,
      diastolicBp: form.diastolicBp ? Number(form.diastolicBp) : null,
      respiratoryRate: form.respiratoryRate ? Number(form.respiratoryRate) : null,
      oxygenSaturation: form.oxygenSaturation ? Number(form.oxygenSaturation) : null,
      bodyTemperature: form.bodyTemperature
        ? isFahrenheit
          ? Number((((Number(form.bodyTemperature) - 32) * 5) / 9).toFixed(1))
          : Number(form.bodyTemperature)
        : null,
      consciousnessLevel: form.consciousnessLevel,
      painScore: Number(form.painScore) || 0,
      infantFlag: infant,
      highRiskCondition: Boolean(form.highRiskCondition),
      fever: Boolean(form.fever),
      lastMealTime: form.lastMealTime || null,
      resourcesNeeded: form.selectedResources.length,
      subjectiveNotes: form.subjectiveNotes || (form.painLocation ? `Pain Location: ${form.painLocation}` : null),
      requestDoctorReview: Boolean(form.requestDoctorReview),
    };

    // Client-side quick range validation
    if (payload.bodyTemperature !== null && (payload.bodyTemperature < 30 || payload.bodyTemperature > 45)) {
      toast.error(
        isFahrenheit
          ? 'Temperature must be between 86°F and 113°F (30°C - 45°C).'
          : 'Temperature must be between 30°C and 45°C.'
      );
      return;
    }
    if (payload.oxygenSaturation !== null && (payload.oxygenSaturation < 50 || payload.oxygenSaturation > 100)) {
      toast.error('SpO2 must be between 50% and 100%.');
      return;
    }
    if (payload.heartRate !== null && (payload.heartRate < 20 || payload.heartRate > 300)) {
      toast.error('Heart Rate must be between 20 and 300 bpm.');
      return;
    }
    if (payload.systolicBp !== null && (payload.systolicBp < 40 || payload.systolicBp > 300)) {
      toast.error('Systolic BP must be between 40 and 300 mmHg.');
      return;
    }

    setLoading(true);
    try {
      const res = await triageApi.submitIntake(payload);
      const data = res.data;
      toast.success(
        `Patient ${data.patientName} triaged to ESI Level ${data.esiLevel} (Code: ${data.trackingCode})`
      );
      if (onIntakeSuccess) {
        onIntakeSuccess(data);
      }
      // Reset form
      setForm({
        patientName: '',
        age: '',
        gender: 'MALE',
        chiefComplaint: '',
        heartRate: '',
        systolicBp: '',
        diastolicBp: '',
        respiratoryRate: '',
        oxygenSaturation: '',
        bodyTemperature: '',
        temperatureRoute: 'ORAL',
        consciousnessLevel: 'ALERT',
        painScore: 0,
        painLocation: '',
        highRiskCondition: false,
        fever: false,
        immunocompromised: false,
        lastMealTime: '',
        selectedResources: [],
        subjectiveNotes: '',
        requestDoctorReview: false,
      });
    } catch (err) {
      const resp = err.response?.data;
      if (resp?.validationErrors && Object.keys(resp.validationErrors).length > 0) {
        const errorList = Object.entries(resp.validationErrors)
          .map(([field, msg]) => `${field}: ${msg}`)
          .join(' • ');
        toast.error(`Validation: ${errorList}`);
      } else {
        toast.error(resp?.message || 'Failed to submit triage intake');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Real-time AHRQ ESI Decision Gate HUD Banner */}
      <div
        className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          ahrqEvaluation.level === 1
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-200'
            : ahrqEvaluation.level === 2
            ? 'bg-orange-500/10 border-orange-500/30 text-orange-800 dark:text-orange-200'
            : ahrqEvaluation.level === 3
            ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-800 dark:text-yellow-200'
            : ahrqEvaluation.level === 4
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-200'
            : 'bg-blue-500/10 border-blue-500/30 text-blue-800 dark:text-blue-200'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-md ${
              ahrqEvaluation.level === 1
                ? 'bg-rose-600'
                : ahrqEvaluation.level === 2
                ? 'bg-orange-500'
                : ahrqEvaluation.level === 3
                ? 'bg-amber-500'
                : ahrqEvaluation.level === 4
                ? 'bg-emerald-600'
                : 'bg-blue-600'
            }`}
          >
            L{ahrqEvaluation.level}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-black/10 dark:bg-white/10">
                {ahrqEvaluation.gate}
              </span>
              <h4 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                {ahrqEvaluation.title}
              </h4>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 max-w-2xl leading-relaxed">
              {ahrqEvaluation.rationale}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-center">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 shadow-xs">
            Resources: <strong className="text-blue-600 dark:text-blue-400">{form.selectedResources.length}</strong>
          </span>
        </div>
      </div>

      {/* 1. Patient Demographics & Encounter */}
      <div className="bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 mb-4 flex items-center gap-2">
          <User size={16} /> Patient Demographics &amp; Chief Complaint
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Full Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="patientName"
              value={form.patientName}
              onChange={handleChange}
              placeholder="Enter name"
              autoComplete="off"
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Age {isAgeInMonths ? '(Months)' : '(Years)'} <span className="text-rose-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAgeInMonths(!isAgeInMonths)}
                className="text-[11px] font-semibold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
              >
                {isAgeInMonths ? 'Switch to Years' : 'Switch to Months (< 3y)'}
              </button>
            </div>
            <input
              type="number"
              name="age"
              value={form.age}
              onChange={handleChange}
              min="0"
              max={isAgeInMonths ? 36 : 130}
              placeholder={isAgeInMonths ? 'e.g. 2' : 'e.g. 45'}
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Gender <span className="text-rose-500">*</span>
            </label>
            <select
              name="gender"
              value={form.gender}
              onChange={handleChange}
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="OTHER">Other / Non-binary</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
            Chief Complaint <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="chiefComplaint"
            value={form.chiefComplaint}
            onChange={handleChange}
            placeholder="e.g. Crushing retrosternal chest pain radiating to left jaw, diaphoresis"
            className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            required
          />
        </div>
      </div>

      {/* 2. Objective Vitals Panel (Gate A & Gate D) */}
      <div className="bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-2">
            <ActivityHeart size={16} /> Tier 1: Objective Vital Signs Panel
          </h3>
          <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
            Evaluated against AHRQ age-stratified danger thresholds
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Heart Rate (bpm)
            </label>
            <input
              type="number"
              name="heartRate"
              value={form.heartRate}
              onChange={handleChange}
              placeholder="75"
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Systolic BP (mmHg)
            </label>
            <input
              type="number"
              name="systolicBp"
              value={form.systolicBp}
              onChange={handleChange}
              placeholder="120"
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Diastolic BP (mmHg)
            </label>
            <input
              type="number"
              name="diastolicBp"
              value={form.diastolicBp}
              onChange={handleChange}
              placeholder="80"
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              SpO2 (%)
            </label>
            <input
              type="number"
              step="0.1"
              name="oxygenSaturation"
              value={form.oxygenSaturation}
              onChange={handleChange}
              placeholder="98"
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
              Resp. Rate (/min)
            </label>
            <input
              type="number"
              name="respiratoryRate"
              value={form.respiratoryRate}
              onChange={handleChange}
              placeholder="16"
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                Temp ({isFahrenheit ? '°F' : '°C'})
              </label>
              <button
                type="button"
                onClick={() => setIsFahrenheit(!isFahrenheit)}
                className="text-[10px] font-bold text-blue-600 dark:text-sky-400 hover:underline cursor-pointer"
                title="Toggle between Celsius and Fahrenheit"
              >
                {isFahrenheit ? '°F → °C' : '°C → °F'}
              </button>
            </div>
            <input
              type="number"
              step="0.1"
              name="bodyTemperature"
              value={form.bodyTemperature}
              onChange={handleChange}
              placeholder={isFahrenheit ? '98.6' : '37.0'}
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {/* Neurological AVPU Scale (Decision Point A/B) */}
        <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
              Neurological Assessment (AVPU Scale)
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              A = Alert, V = Verbal only (ESI 2), P = Pain response (ESI 1), U = Unresponsive (ESI 1)
            </span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: 'ALERT', label: 'Alert (A)', badge: 'Normal' },
              { id: 'VERBAL', label: 'Verbal (V)', badge: 'ESI 2 High-Risk' },
              { id: 'PAIN', label: 'Pain (P)', badge: 'ESI 1 Resuscitation' },
              { id: 'UNRESPONSIVE', label: 'Unresponsive (U)', badge: 'ESI 1 Resuscitation' },
            ].map((item) => (
              <button
                type="button"
                key={item.id}
                onClick={() => setForm((p) => ({ ...p, consciousnessLevel: item.id }))}
                className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer flex flex-col items-center gap-0.5 ${
                  form.consciousnessLevel === item.id
                    ? item.id === 'ALERT'
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : item.id === 'VERBAL'
                      ? 'bg-orange-500 text-white border-orange-500 shadow-sm'
                      : 'bg-rose-600 text-white border-rose-600 shadow-sm'
                    : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`text-[9px] font-semibold ${
                    form.consciousnessLevel === item.id ? 'text-white/90' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {item.badge}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Subjective Bias Panel & Clinical High-Risk Indicators (Gate B) */}
      <div className="bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 mb-4 flex items-center gap-2">
          <ShieldAlert size={16} /> Tier 2: Subjective Bias Panel &amp; High-Risk Flags
        </h3>

        <div className="space-y-4">
          {/* Validated Pain Scale (0-10) with Location */}
          <div className="p-4 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800">
            <div className="flex flex-wrap justify-between items-center gap-2 mb-2">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Validated Pain Score:{' '}
                <span
                  className={`font-black text-sm ${
                    form.painScore >= 7
                      ? 'text-rose-600 dark:text-rose-400'
                      : form.painScore >= 4
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-blue-600 dark:text-sky-400'
                  }`}
                >
                  {form.painScore} / 10
                </span>
              </label>
              <span
                className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                  form.painScore >= 7
                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50'
                    : form.painScore >= 4
                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                }`}
              >
                {form.painScore >= 7 ? 'Severe Distress (AHRQ ESI 2 Trigger)' : form.painScore >= 4 ? 'Moderate' : 'Mild / None'}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              name="painScore"
              value={form.painScore}
              onChange={handleChange}
              className="w-full accent-blue-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-semibold mt-1">
              <span>0 - No Pain</span>
              <span>3 - Mild</span>
              <span>6 - Moderate</span>
              <span>7 - Severe (ESI 2)</span>
              <span>10 - Worst Possible</span>
            </div>

            <div className="mt-3">
              <input
                type="text"
                name="painLocation"
                value={form.painLocation}
                onChange={handleChange}
                placeholder="Pain anatomical location (e.g. Left lower quadrant abdomen, radiating to groin)"
                className="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* High-Risk Clinical Condition Checkboxes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                name="highRiskCondition"
                checked={form.highRiskCondition}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  High-Risk Presentation
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                  Suspected ACS, stroke within window, ectopic pregnancy, suicidal intent
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                name="fever"
                checked={form.fever}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Active High Fever (&gt; 38.0°C / 100.4°F)
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                  Pediatric Rule: Automatically triggers ESI 2 for infant &lt; 3 months
                </span>
              </div>
            </label>

            <label className="flex items-start gap-2.5 p-3 rounded-xl bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <input
                type="checkbox"
                name="immunocompromised"
                checked={form.immunocompromised}
                onChange={handleChange}
                className="mt-0.5 w-4 h-4 accent-blue-600 rounded cursor-pointer"
              />
              <div>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Immunocompromised Status
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
                  Chemo, organ transplant, active biologicals, asplenia, HIV/AIDS
                </span>
              </div>
            </label>
          </div>
        </div>
      </div>

      {/* 4. Projected Resource Utilization Categories (AHRQ Decision Gate C) */}
      <div className="bg-slate-50/80 dark:bg-slate-900/60 p-5 rounded-2xl border border-slate-200 dark:border-slate-800/80 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-sky-400 flex items-center gap-2">
              <ResourceIcon size={16} /> Tier 3: AHRQ Resource Consumption
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
              Select distinct hospital resource categories projected before disposition. (0 = ESI 5, 1 = ESI 4, ≥ 2 = ESI 3/2).
            </p>
          </div>
          <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/50 self-start sm:self-auto">
            {form.selectedResources.length} Selected (
            {form.selectedResources.length === 0 ? 'ESI 5' : form.selectedResources.length === 1 ? 'ESI 4' : 'ESI 3/2'}
            )
          </span>
        </div>

        {/* What Counts vs Does NOT Count Tip Pill */}
        <div className="p-3 mb-4 rounded-xl bg-slate-100 dark:bg-slate-800/60 text-[11px] text-slate-600 dark:text-slate-400 flex items-start gap-2">
          <HelpCircle size={15} className="text-blue-500 mt-0.5 flex-shrink-0" />
          <span>
            <strong>AHRQ Standard:</strong> History/physical exam, fingerstick blood sugar, oral meds, slings, and saline locks do <em>not</em> count as resources.
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {RESOURCE_CATEGORIES.map((res) => {
            const isSelected = form.selectedResources.includes(res.id);
            return (
              <button
                type="button"
                key={res.id}
                onClick={() => toggleResource(res.id)}
                className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-white dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-blue-500/50'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <span className="font-bold text-xs">{res.label}</span>
                  <span
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] flex-shrink-0 ${
                      isSelected ? 'bg-white text-blue-600 font-black' : 'border border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    {isSelected && '✓'}
                  </span>
                </div>
                <span
                  className={`text-[10px] mt-1.5 line-clamp-1 ${
                    isSelected ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {res.desc}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Last Oral Intake (NPO Status)
            </label>
            <input
              type="text"
              name="lastMealTime"
              value={form.lastMealTime}
              onChange={handleChange}
              placeholder="e.g. 2 hours ago (water only) / NPO since midnight"
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Clinical Observations &amp; Subjective Notes
            </label>
            <input
              type="text"
              name="subjectiveNotes"
              value={form.subjectiveNotes}
              onChange={handleChange}
              placeholder="e.g. Pale, anxious, guarding right upper quadrant"
              className="w-full bg-white dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>
      </div>

      {/* 5. Doctor Review / Flagged Request */}
      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
        <input
          type="checkbox"
          id="requestDoctorReview"
          name="requestDoctorReview"
          checked={form.requestDoctorReview}
          onChange={handleChange}
          className="mt-1 w-4 h-4 accent-amber-500 rounded cursor-pointer flex-shrink-0"
        />
        <label htmlFor="requestDoctorReview" className="cursor-pointer">
          <span className="text-sm font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
            <AlertTriangle size={15} /> Request Physician Clinical Review / Flag Case
          </span>
          <p className="text-xs text-amber-700/80 dark:text-amber-200/80 mt-0.5">
            Check this box if case presentation is ambiguous, atypical, or requires immediate physician review. The patient will be marked as <code className="bg-amber-500/20 px-1 rounded font-bold">FLAGGED_FOR_REVIEW</code>.
          </p>
        </label>
      </div>

      {/* Submit Button & Summary */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2">
        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Clock size={15} className="text-blue-500" />
          <span>AHRQ ESI 2.0 Engine ready for immediate triage queuing</span>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="px-7 py-3.5 rounded-xl bg-gradient-to-r from-blue-600 via-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer active:scale-98"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Triaging &amp; Enqueuing...
            </>
          ) : (
            <>
              <CheckCircle2 size={18} /> Execute Triage &amp; Enqueue Patient (
              {ahrqEvaluation.title.split(':')[0]})
            </>
          )}
        </button>
      </div>
    </form>
  );
}
