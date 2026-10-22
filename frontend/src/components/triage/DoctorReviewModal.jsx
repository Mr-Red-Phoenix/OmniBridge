import React, { useState } from 'react';
import {
  XClose as X,
  CheckCircle as CheckCircle2,
  UserCheck01 as UserCheck,
  AlertOctagon as ShieldAlert,
  Clock,
  Activity,
  Heart,
  Thermometer01 as Thermometer,
  ShieldTick,
  AlertTriangle,
  File02 as FileText,
  Zap,
} from '@untitledui/icons';
import { toast } from 'react-toastify';
import triageApi from '../../api/triageApi';

const ESI_DESCRIPTIONS = {
  1: {
    title: 'ESI 1: Resuscitation / Immediate',
    subtitle: 'Immediate life-threat (Airway/Breathing/Circulation collapse or unresponsiveness)',
    color: 'text-rose-600 dark:text-rose-400 border-rose-400 dark:border-rose-500/60 bg-rose-50/80 dark:bg-rose-500/10 shadow-sm shadow-rose-500/10',
    badge: 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40',
  },
  2: {
    title: 'ESI 2: Emergent / High Risk',
    subtitle: 'Confused, lethargic, severe pain (>=7/10), immunocompromised fever, or danger zone vitals',
    color: 'text-amber-600 dark:text-amber-400 border-amber-400 dark:border-amber-500/60 bg-amber-50/80 dark:bg-amber-500/10 shadow-sm shadow-amber-500/10',
    badge: 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40',
  },
  3: {
    title: 'ESI 3: Urgent (2+ ER Resources)',
    subtitle: 'Requires multiple hospital resources (e.g., labs + CT/IV meds) with stable vitals',
    color: 'text-yellow-600 dark:text-yellow-400 border-yellow-400 dark:border-yellow-500/60 bg-yellow-50/80 dark:bg-yellow-500/10 shadow-sm shadow-yellow-500/10',
    badge: 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-500/40',
  },
  4: {
    title: 'ESI 4: Less Urgent (1 Resource)',
    subtitle: 'Requires 1 diagnostic or therapeutic resource (e.g., single X-ray or simple sutures)',
    color: 'text-emerald-600 dark:text-emerald-400 border-emerald-400 dark:border-emerald-500/60 bg-emerald-50/80 dark:bg-emerald-500/10 shadow-sm shadow-emerald-500/10',
    badge: 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40',
  },
  5: {
    title: 'ESI 5: Non-Urgent (0 Resources)',
    subtitle: 'Requires medication refill, routine exam, or simple bandage with no resource consumption',
    color: 'text-blue-600 dark:text-blue-400 border-blue-400 dark:border-blue-500/60 bg-blue-50/80 dark:bg-blue-500/10 shadow-sm shadow-blue-500/10',
    badge: 'bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-500/40',
  },
};

export default function DoctorReviewModal({ isOpen, onClose, patient, onReviewSuccess }) {
  const [selectedEsi, setSelectedEsi] = useState(patient?.esiLevel || 2);
  const [clinicalJustification, setClinicalJustification] = useState('');
  const [approveAndQueue, setApproveAndQueue] = useState(true);
  const [loading, setLoading] = useState(false);

  if (!isOpen || !patient) return null;

  const waitMinutes = patient.waitTimeMinutes ?? 0;
  const painScore = patient.painScore ?? 0;
  const isHighRisk = Boolean(patient.highRiskCondition);
  const hasSubjectiveNotes = Boolean(patient.subjectiveNotes && patient.subjectiveNotes.trim().length > 0);
  const isHypoxic = patient.oxygenSaturation != null && patient.oxygenSaturation < 92;
  const isTachycardic = patient.heartRate != null && (patient.heartRate > 120 || patient.heartRate < 50);

  // Dynamic wait-time decay rate per minute per ESI level
  const decayRate = selectedEsi === 1 ? 50 : selectedEsi === 2 ? 15 : selectedEsi === 3 ? 5 : selectedEsi === 4 ? 2 : 1;
  const waitBonus = waitMinutes * decayRate;
  const baseWeight = selectedEsi === 1 ? 10000 : selectedEsi === 2 ? 5000 : selectedEsi === 3 ? 2000 : selectedEsi === 4 ? 1000 : 500;
  const estimatedNewScore = baseWeight + waitBonus + (isHypoxic ? 200 : 0) + (isTachycardic ? 150 : 0) + (isHighRisk ? 100 : 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!clinicalJustification.trim()) {
      toast.error('Clinical justification note is required for physician override.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        intakeId: patient.id,
        newEsiLevel: Number(selectedEsi),
        clinicalJustification: clinicalJustification.trim(),
        approveAndQueue,
      };

      const res = await triageApi.submitReview(payload);
      toast.success(`Override confirmed: ${patient.patientName} moved to ESI ${selectedEsi}`);
      if (onReviewSuccess) {
        onReviewSuccess(res.data);
      }
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit clinical override');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl relative my-8 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/20">
              <ShieldAlert size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Physician Clinical Review &amp; ESI Override
              </h2>
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                AHRQ 5-Tier Algorithm &bull; Dynamic Heap Recalculation
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="overflow-y-auto flex-1 py-4 pr-1 space-y-4">
          {/* Patient Overview Card */}
          <div className="p-4 rounded-2xl bg-slate-50/90 dark:bg-slate-950/50 border border-slate-200/90 dark:border-slate-800/90 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  {patient.patientName}
                </h3>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-sky-500/20 text-blue-700 dark:text-sky-300 font-mono font-bold border border-blue-200 dark:border-sky-500/30">
                  {patient.trackingCode}
                </span>
                {patient.gender && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    &bull; {patient.gender}
                  </span>
                )}
                {patient.age != null && (
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    &bull; {patient.age}y
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">Current:</span>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold border ${
                    patient.esiLevel === 1
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-500/40'
                      : patient.esiLevel === 2
                      ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-500/40'
                      : patient.esiLevel === 3
                      ? 'bg-yellow-100 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-500/40'
                      : 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-500/40'
                  }`}
                >
                  ESI Level {patient.esiLevel}
                </span>
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/70 dark:border-slate-800/70">
              <span className="font-bold text-slate-900 dark:text-white mr-1.5">Chief Complaint:</span>
              <span className="italic">{patient.chiefComplaint || 'Unspecified'}</span>
            </div>

            {/* Objective Vitals Row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">
                  Pulse / HR
                </span>
                <span className={`font-mono font-bold text-sm ${isTachycardic ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {patient.heartRate ?? '--'} <span className="text-[10px] font-normal text-slate-400">bpm</span>
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">
                  SpO2 Saturation
                </span>
                <span className={`font-mono font-bold text-sm ${isHypoxic ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-200'}`}>
                  {patient.oxygenSaturation ?? '--'} <span className="text-[10px] font-normal text-slate-400">%</span>
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">
                  Blood Pressure
                </span>
                <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {patient.systolicBp ? `${patient.systolicBp}/${patient.diastolicBp ?? '--'}` : '--'}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60">
                <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider block font-bold">
                  Temperature
                </span>
                <span className="font-mono font-bold text-sm text-slate-800 dark:text-slate-200">
                  {patient.bodyTemperature ?? '--'} <span className="text-[10px] font-normal text-slate-400">&deg;C</span>
                </span>
              </div>
            </div>
          </div>

          {/* Subjective Bias & Clinical Risk Factors Panel */}
          <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-500/5 border border-amber-200/80 dark:border-amber-500/20 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-800 dark:text-amber-400 flex items-center gap-1.5">
                <AlertTriangle size={15} /> Subjective Bias Panel &amp; Triage Assessment
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300">
                AHRQ Gate B
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
              {/* Pain Score */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-500/20">
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block font-semibold">
                  Reported Pain Score
                </span>
                <div className="flex items-center gap-2 mt-0.5">
                  <span
                    className={`text-base font-black ${
                      painScore >= 7
                        ? 'text-rose-600 dark:text-rose-400'
                        : painScore >= 4
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    {painScore} / 10
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {painScore >= 7 ? '(Severe Distress)' : painScore >= 4 ? '(Moderate)' : '(Mild)'}
                  </span>
                </div>
              </div>

              {/* High-Risk Clinical Condition */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-500/20">
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block font-semibold">
                  High-Risk Flag
                </span>
                <span
                  className={`inline-block mt-1 text-xs font-bold px-2 py-0.5 rounded ${
                    isHighRisk
                      ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-700 dark:text-rose-400'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {isHighRisk ? 'TRIGGERED (High Risk)' : 'None Identified'}
                </span>
              </div>

              {/* Resources Needed */}
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-500/20">
                <span className="text-[10.5px] text-slate-500 dark:text-slate-400 block font-semibold">
                  Projected Resources
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5 block">
                  {patient.resourcesNeeded ?? 0} category{(patient.resourcesNeeded === 1) ? '' : 'ies'}
                </span>
              </div>
            </div>

            {/* Subjective Nurse Notes */}
            {hasSubjectiveNotes && (
              <div className="p-3 rounded-xl bg-white dark:bg-slate-900/80 border border-amber-200/60 dark:border-amber-500/20 text-xs">
                <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 mb-1">
                  <FileText size={13} className="text-amber-500" /> Nurse Intake Subjective Observations:
                </span>
                <p className="text-slate-600 dark:text-slate-300 italic leading-relaxed">
                  "{patient.subjectiveNotes}"
                </p>
              </div>
            )}
          </div>

          {/* Dynamic Priority Queue & Wait Time Decay Breakdown */}
          <div className="p-4 rounded-2xl bg-blue-50/70 dark:bg-blue-500/5 border border-blue-200/80 dark:border-blue-500/20 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-800 dark:text-blue-400 flex items-center gap-1.5">
                <Zap size={14} /> Priority Queue &amp; Wait Time Decay Dynamics
              </span>
              <span className="text-[11px] font-mono font-bold text-blue-700 dark:text-sky-300">
                Heap Score: {Math.round(patient.calculatedPriorityScore || 0)} pts
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/70 border border-blue-100 dark:border-blue-500/20">
                <span className="text-[10px] text-slate-400 block font-bold">Elapsed Wait</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                  {waitMinutes} min
                </span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/70 border border-blue-100 dark:border-blue-500/20">
                <span className="text-[10px] text-slate-400 block font-bold">Decay Boost Rate</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200 text-xs">
                  +{decayRate} pts/min
                </span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/70 border border-blue-100 dark:border-blue-500/20">
                <span className="text-[10px] text-slate-400 block font-bold">Wait Time Bonus</span>
                <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-xs">
                  +{Math.round(waitBonus)} pts
                </span>
              </div>

              <div className="p-2 rounded-xl bg-white dark:bg-slate-900/70 border border-blue-100 dark:border-blue-500/20">
                <span className="text-[10px] text-slate-400 block font-bold">Projected New Score</span>
                <span className="font-mono font-bold text-blue-600 dark:text-sky-400 text-xs">
                  ~{Math.round(estimatedNewScore)} pts
                </span>
              </div>
            </div>
          </div>

          {/* Override Form */}
          <form id="doctor-override-form" onSubmit={handleSubmit} className="space-y-4 pt-1">
            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
                Select Approved ESI Level:
              </label>
              <div className="space-y-2">
                {[1, 2, 3, 4, 5].map((lvl) => {
                  const info = ESI_DESCRIPTIONS[lvl];
                  const isSelected = selectedEsi === lvl;
                  return (
                    <label
                      key={lvl}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSelected
                          ? info.color
                          : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="radio"
                        name="esiLevel"
                        value={lvl}
                        checked={isSelected}
                        onChange={() => setSelectedEsi(lvl)}
                        className="w-4 h-4 shrink-0 accent-amber-500 mt-0.5 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center justify-between gap-1.5">
                          <span className="text-xs font-bold tracking-tight text-slate-900 dark:text-white">
                            {info.title}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${info.badge}`}>
                            Priority Base: {lvl === 1 ? '10,000' : lvl === 2 ? '5,000' : lvl === 3 ? '2,000' : lvl === 4 ? '1,000' : '500'}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-snug">
                          {info.subtitle}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                Physician Justification &amp; Clinical Audit Notes <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={clinicalJustification}
                onChange={(e) => setClinicalJustification(e.target.value)}
                placeholder="e.g. Patient displays silent diaphoresis and atypical presentation. Overriding from Level 3 to Level 2 for immediate cardiac workup."
                className="w-full bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-3.5 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-medium"
                required
              />
              <span className="text-[10.5px] text-slate-400 mt-1 block">
                Logged to immutable Virtual Thread audit ledger with doctor timestamp.
              </span>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-200/80 dark:border-slate-800/80">
              <input
                type="checkbox"
                id="approveAndQueue"
                checked={approveAndQueue}
                onChange={(e) => setApproveAndQueue(e.target.checked)}
                className="w-4 h-4 shrink-0 accent-blue-600 rounded cursor-pointer"
              />
              <label htmlFor="approveAndQueue" className="text-xs text-slate-700 dark:text-slate-300 cursor-pointer font-medium select-none">
                Clear review flag and push to active <span className="text-blue-600 dark:text-sky-400 font-bold">QUEUED</span> priority heap
              </label>
            </div>
          </form>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="doctor-override-form"
            disabled={loading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {loading ? 'Submitting Override...' : (
              <>
                <UserCheck size={16} /> Confirm Clinical Override
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
