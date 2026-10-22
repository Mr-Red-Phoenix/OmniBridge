import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AlertCircle,
  AlertTriangle,
  AlertOctagon,
  CheckCircle as CheckCircle2,
  Clock,
  FilterLines as Filter,
  MarkerPin01 as MapPin,
  SearchLg as Search,
  User01 as User,
  Users01 as Users,
  Signal01 as Radio,
  File06 as FileSpreadsheet,
  ClipboardCheck,
  ArrowUpRight,
  ChevronRight,
  Sliders01 as SlidersHorizontal,
  Activity,
  ActivityHeart,
  Shield01,
  ShieldTick,
  ShieldZap,
  MedicalCross,
  MedicalCircle,
  BellRinging01,
  Zap,
} from '@untitledui/icons';
import { toast } from 'react-toastify';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import incidentApi from '../api/incidentApi';
import triageApi from '../api/triageApi';
import { useAuth } from '../context/AuthContext';
import IncidentDetailModal from '../components/IncidentDetailModal';
import BroadcastManagerModal from '../components/BroadcastManagerModal';
import AdminUserManagement from '../components/AdminUserManagement';
import NurseIntakeForm from '../components/triage/NurseIntakeForm';
import DoctorReviewModal from '../components/triage/DoctorReviewModal';

export default function StaffDashboard() {
  const { user, role } = useAuth();

  // Role permissions per specification:
  // ADMIN: can broadcast alert, manage staff, venue incident SOS and incident report; no ESI, no live triage queue, no clinical review
  // COORDINATOR (Doctor): can broadcast alert, venue incident SOS and incident report, ESI, live triage queue, clinical review override req; no manage staff
  // STAFF: ESI, venue incident SOS and incident report, live triage queue; no broadcast alert, no manage staff, no clinical review
  // SECURITY: venue incident SOS and incident report
  const isAdmin = role === 'ADMIN';
  const isCoordinator = role === 'COORDINATOR' || role === 'DOCTOR';
  const isDoctor = isCoordinator;
  const isStaffNurse = role === 'STAFF';
  const isSecurity = role === 'SECURITY';

  // Capabilities based on Recommended Adjusted Matrix:
  // ADMIN: Broadcast Alert, Manage Staff, Venue SOS & Incident Reports, Live Triage Queue (View Only); No ESI Intake, No Clinical Review
  // COORDINATOR (Doctor): Broadcast Alert, Venue SOS & Incident Reports, ESI Triage Intake, Live Triage Queue, Clinical Review / Overrides; No Manage Staff
  // STAFF (Nurse): Venue SOS & Incident Reports, ESI Triage Intake, Live Triage Queue; No Broadcast Alert, No Manage Staff, No Clinical Review
  // SECURITY: Venue SOS & Incident Reports; No Broadcast, No Manage Staff, No ESI, No Queue, No Review
  const canBroadcast = isAdmin || isCoordinator;
  const canManageStaff = isAdmin;
  const canAccessEsi = isStaffNurse || isCoordinator;
  const canAccessQueue = isStaffNurse || isCoordinator || isAdmin;
  const canAccessClinicalReview = isCoordinator;
  const canAccessReports = true; // All authenticated staff roles access venue SOS & reports

  // Default active tab based on role
  const defaultTab = canAccessEsi 
    ? 'triage_intake' 
    : canAccessQueue 
    ? 'triage_queue' 
    : 'reports';
  const [activeTab, setActiveTab] = useState(defaultTab);

  // Incidents State
  const [incidents, setIncidents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [streamStatus, setStreamStatus] = useState('connecting');

  // Triage State
  const [triageQueue, setTriageQueue] = useState([]);
  const [triageLoading, setTriageLoading] = useState(false);
  const [reviewPatient, setReviewPatient] = useState(null);

  // Filters & Search for Incidents
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');

  // Modals
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  const fetchIncidents = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await incidentApi.getStaffIncidents();
      setIncidents(res.data || []);
    } catch {
      if (!silent) toast.error('Failed to load incident board');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const fetchTriageQueue = async () => {
    setTriageLoading(true);
    try {
      const res = await triageApi.getQueue();
      setTriageQueue(res.data || []);
    } catch {
      // triage queue silent fail
    } finally {
      setTriageLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();
    if (canAccessQueue || canAccessEsi) {
      fetchTriageQueue();
    }

    // 1. SSE Connection for Incidents and Staff Alerts
    let eventSource = null;
    try {
      const token = localStorage.getItem('jwt');
      const streamUrl = `/api/staff/incidents/stream${token ? `?access_token=${token}` : ''}`;
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => setStreamStatus('connected');
      eventSource.addEventListener('incident_created', (e) => {
        try {
          const newInc = JSON.parse(e.data);
          toast.warning(`NEW INCIDENT REPORTED #${newInc.id}: ${newInc.type}`);
          fetchIncidents(true);
        } catch {}
      });
      eventSource.addEventListener('incident_updated', () => fetchIncidents(true));
      eventSource.addEventListener('incident_status_changed', () => fetchIncidents(true));
      eventSource.onerror = () => setStreamStatus('connecting');
    } catch {
      setStreamStatus('disconnected');
    }

    // 2. STOMP over WebSockets for Instant Triage Queue & Incidents synchronization
    let stompClient = null;
    try {
      if (typeof window !== 'undefined') {
        stompClient = new Client({
          webSocketFactory: () => new SockJS('/ws/triage'),
          reconnectDelay: 3000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: () => {
            setStreamStatus('connected');

            // Subscribe to real-time triage queue updates
            stompClient.subscribe('/topic/queue', (message) => {
              try {
                const updatedQueue = JSON.parse(message.body);
                if (Array.isArray(updatedQueue)) {
                  setTriageQueue(updatedQueue);
                }
              } catch (e) {
                console.error('Failed to parse STOMP triage queue', e);
              }
            });

            // Subscribe to real-time incident broadcasts
            stompClient.subscribe('/topic/incidents', (message) => {
              try {
                fetchIncidents(true);
              } catch (e) {
                console.error('Failed to process STOMP incident event', e);
              }
            });
          },
        });

        stompClient.activate();
      }
    } catch (e) {
      console.warn('STOMP client init warning:', e);
    }

    return () => {
      if (eventSource) eventSource.close();
      if (stompClient) stompClient.deactivate();
    };
  }, [canAccessQueue, canAccessEsi]);

  const handleAcknowledge = async (id, e) => {
    e.stopPropagation();
    try {
      await incidentApi.acknowledge(id);
      toast.success(`Incident #${id} acknowledged.`);
      fetchIncidents(true);
    } catch {
      toast.error('Failed to acknowledge incident');
    }
  };

  const handleAssignToSelf = async (id, e) => {
    e.stopPropagation();
    try {
      await incidentApi.assignToSelf(id);
      toast.success(`Incident #${id} assigned to you.`);
      fetchIncidents(true);
    } catch {
      toast.error('Failed to claim incident');
    }
  };

  const handlePatientStatusUpdate = async (intakeId, newStatus, patientName, e) => {
    if (e) e.stopPropagation();
    try {
      await triageApi.updateStatus(intakeId, {
        status: newStatus,
        notes: `Patient transitioned to ${newStatus} by ${user?.name || 'Staff'}`
      });
      toast.success(`${patientName || 'Patient'} moved to ${newStatus.replace('_', ' ')}.`);
      fetchTriageQueue();
    } catch (err) {
      toast.error(err.response?.data?.message || `Failed to update status to ${newStatus}`);
    }
  };

  const flaggedCases = triageQueue.filter(
    (p) => p.status === 'FLAGGED_FOR_REVIEW' || p.status === 'SPECIAL_REQUEST'
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-12 py-6 pb-20 w-full"
    >
      {/* Top Command Bar */}
      <div className="card mb-6 p-4 sm:p-5 flex flex-wrap justify-between items-center gap-4 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800/80 shadow-xs rounded-2xl">
        <div className="flex items-center gap-3.5">
          <div className="relative flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/25 border border-white/20">
            <ShieldTick size={24} />
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Staff Operations Center
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Role:{' '}
              <span className="text-blue-600 dark:text-blue-400 font-bold">
                {role === 'COORDINATOR' ? 'Coordinator (Doctor)' : role}
              </span>{' '}
              • Facility:{' '}
              <span className="text-slate-800 dark:text-slate-200 font-semibold">
                {user?.venueName || 'Metro General'}
              </span>
            </p>
          </div>
        </div>

        {/* Global Action Triggers (Refresh button removed) */}
        <div className="flex flex-wrap items-center gap-2.5">
          {canBroadcast && (
            <button
              onClick={() => setIsBroadcastModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 bg-red-50 hover:bg-red-100 dark:bg-red-950/30 dark:hover:bg-red-950/50 border border-red-200 dark:border-red-900/50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Radio size={14} className="stroke-[2.2]" /> Broadcast Alert
            </button>
          )}

          {canManageStaff && (
            <button
              onClick={() => setIsAdminModalOpen(true)}
              className="px-3.5 py-2 rounded-xl text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 transition-all flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
            >
              <Users size={14} className="stroke-[2.2]" /> Manage Staff
            </button>
          )}
        </div>
      </div>

      {/* Role-Based Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 mb-6 overflow-x-auto">
        {/* STAFF & COORDINATOR (Doctor) Tab: ESI Triage Intake */}
        {canAccessEsi && (
          <button
            onClick={() => setActiveTab('triage_intake')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'triage_intake'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ActivityHeart size={16} /> ESI Triage Intake
          </button>
        )}

        {/* Live Queue Tab: STAFF & COORDINATOR (Doctor) */}
        {canAccessQueue && (
          <button
            onClick={() => {
              setActiveTab('triage_queue');
              fetchTriageQueue();
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'triage_queue'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ClipboardCheck size={16} /> Live Triage Queue
            <span className="px-2 py-0.5 rounded-full bg-slate-900/30 dark:bg-slate-950/60 text-[10px] font-bold">
              {triageQueue.length}
            </span>
          </button>
        )}

        {/* COORDINATOR (Doctor) Review Tab */}
        {canAccessClinicalReview && (
          <button
            onClick={() => setActiveTab('doctor_review')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'doctor_review'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/25'
                : 'bg-slate-100 dark:bg-slate-800/60 text-amber-600 dark:text-amber-400/90 hover:bg-slate-200 dark:hover:bg-slate-800'
            }`}
          >
            <AlertOctagon size={16} /> Clinical Reviews / Overrides
            {flaggedCases.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] animate-pulse">
                {flaggedCases.length}
              </span>
            )}
          </button>
        )}

        {/* Reports & SOS (ADMIN, COORDINATOR, STAFF, SECURITY) */}
        {canAccessReports && (
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'reports'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25'
                : 'bg-slate-100 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <FileSpreadsheet size={15} /> Venue SOS &amp; Incident Reports
            <span className="px-2 py-0.5 rounded-full bg-slate-900/30 dark:bg-slate-950/60 text-[10px] font-bold">
              {incidents.length}
            </span>
          </button>
        )}
      </div>

      {/* TAB 1: Nurse ESI Intake Form */}
      {activeTab === 'triage_intake' && canAccessEsi && (
        <div className="card p-6">
          <div className="mb-6">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <ActivityHeart className="text-blue-600 dark:text-sky-400" size={20} /> ESI Clinical Intake Form
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Objective vitals scoring with AVPU mental state, pediatric flags, and ER resource projection.
            </p>
          </div>
          <NurseIntakeForm
            onIntakeSuccess={() => {
              fetchTriageQueue();
              setActiveTab('triage_queue');
            }}
          />
        </div>
      )}

      {/* TAB 2: Live Triage Queue */}
      {activeTab === 'triage_queue' && canAccessQueue && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ClipboardCheck size={18} className="text-blue-500" />
              Active Triage Queue ({triageQueue.length} Patients)
            </h3>
          </div>

          <div className="grid gap-3">
            {triageQueue.length === 0 ? (
              <div className="card text-center py-12 text-slate-600 dark:text-slate-400 font-medium text-sm">
                No active patients in triage queue.
              </div>
            ) : (
              triageQueue.map((item, idx) => {
                const pain = item.painScore ?? 0;
                const wait = item.waitTimeMinutes ?? 0;
                const decayRate = item.esiLevel === 1 ? 50 : item.esiLevel === 2 ? 15 : item.esiLevel === 3 ? 5 : item.esiLevel === 4 ? 2 : 1;
                const isSeverePain = pain >= 7;
                const isModeratePain = pain >= 4 && pain < 7;

                return (
                  <div
                    key={item.id}
                    className="card p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 hover:border-blue-500/40 dark:hover:border-blue-500/40 transition-all rounded-2xl"
                  >
                    <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                      <span className="w-9 h-9 rounded-2xl bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-sky-400 font-extrabold text-xs flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700/80">
                        #{idx + 1}
                      </span>
                      <div className="space-y-1.5 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{item.patientName}</span>
                          <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border border-slate-200 dark:border-slate-700/60">
                            {item.trackingCode}
                          </span>
                          <span
                            className={`text-xs px-2.5 py-0.5 rounded-full font-extrabold border ${
                              item.esiLevel === 1
                                ? 'bg-rose-500/15 text-rose-700 dark:text-rose-400 border-rose-500/30'
                                : item.esiLevel === 2
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30'
                                : item.esiLevel === 3
                                ? 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30'
                                : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
                            }`}
                          >
                            ESI Level {item.esiLevel}
                          </span>
                          {item.status === 'FLAGGED_FOR_REVIEW' && (
                            <span className="text-[11px] bg-amber-500/20 text-amber-800 dark:text-amber-300 px-2.5 py-0.5 rounded-full font-bold border border-amber-500/40 flex items-center gap-1">
                              <AlertOctagon size={12} /> Doctor Review Flagged
                            </span>
                          )}
                        </div>

                        {/* Chief complaint */}
                        <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                          <span className="font-semibold text-slate-900 dark:text-white">Chief Complaint:</span> {item.chiefComplaint || 'Unspecified'}
                        </p>

                        {/* Subjective Bias & Clinical Metrics Row */}
                        <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px]">
                          {/* Subjective Pain Badge */}
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold flex items-center gap-1 border ${
                              isSeverePain
                                ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                : isModeratePain
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                            }`}
                          >
                            Pain: {pain}/10 {isSeverePain ? '(Severe Distress)' : isModeratePain ? '(Moderate)' : '(Mild)'}
                          </span>

                          {/* High risk condition flag */}
                          {item.highRiskCondition && (
                            <span className="px-2 py-0.5 rounded-md font-bold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                              High-Risk Flag
                            </span>
                          )}

                          {/* Resources */}
                          <span className="text-slate-500 dark:text-slate-400">
                            Resources: <strong className="text-slate-700 dark:text-slate-200">{item.resourcesNeeded ?? 0}</strong>
                          </span>

                          {/* Vitals quick snippet */}
                          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">&bull;</span>
                          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                            HR: <strong className="text-slate-700 dark:text-slate-200">{item.heartRate ?? '--'} bpm</strong>
                          </span>
                          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">&bull;</span>
                          <span className="text-slate-500 dark:text-slate-400 hidden sm:inline">
                            SpO2: <strong className={`font-mono ${item.oxygenSaturation != null && item.oxygenSaturation < 92 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-200'}`}>{item.oxygenSaturation ?? '--'}%</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      {/* Priority Queue & Decay Score Box */}
                      <div className="text-right text-xs bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-700/60">
                        <div className="flex items-center justify-end gap-1.5 text-slate-500 dark:text-slate-400 text-[11px]">
                          <Clock size={12} />
                          <span>Wait: <strong className="text-slate-800 dark:text-slate-200 font-mono">{wait}m</strong></span>
                          <span className="text-sky-600 dark:text-sky-400 font-bold">(+{decayRate}/m)</span>
                        </div>
                        <span className="text-blue-600 dark:text-sky-400 font-mono font-bold block mt-0.5 text-xs">
                          Priority Score: {Math.round(item.calculatedPriorityScore || 0)} pts
                        </span>
                      </div>

                      {/* Clinical Actions for Doctors and Nurses (Admin is view-only) */}
                      {(isDoctor || isStaffNurse) ? (
                        <div className="flex items-center gap-2">
                          {/* Call In Exam / Out of Queue Button */}
                          <button
                            onClick={(e) => handlePatientStatusUpdate(item.id, 'IN_EXAM', item.patientName, e)}
                            title="Call patient into examination room (Takes patient out of waiting queue)"
                            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                          >
                            <CheckCircle2 size={14} /> Call In Exam
                          </button>

                          {/* Quick Discharge/Admit Dropdown or Button */}
                          <button
                            onClick={(e) => handlePatientStatusUpdate(item.id, 'DISCHARGED', item.patientName, e)}
                            title="Discharge patient (Completes care and removes from waiting queue)"
                            className="px-2.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 font-bold text-xs transition-all cursor-pointer whitespace-nowrap"
                          >
                            Discharge
                          </button>

                          {/* Doctor Clinical Review & Override */}
                          {isDoctor && (
                            <button
                              onClick={() => setReviewPatient(item)}
                              className="px-3 py-2 rounded-xl bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/25 transition-all cursor-pointer shadow-xs whitespace-nowrap flex items-center gap-1.5"
                            >
                              <ShieldZap size={14} /> Review
                            </button>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 3: Doctor Special Requests / Flagged Review */}
      {activeTab === 'doctor_review' && isDoctor && (
        <div className="space-y-4">
          <div className="card p-5 bg-amber-500/10 dark:bg-amber-500/5 border-amber-500/30">
            <h3 className="text-base font-bold text-amber-700 dark:text-amber-300 flex items-center gap-2">
              <AlertOctagon size={18} /> Doctor Clinical Review &amp; Flagged Cases
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-1">
              Patients flagged by triage intake nurses for diagnostic ambiguity or severe atypical presentation.
            </p>
          </div>

          <div className="grid gap-3">
            {flaggedCases.length === 0 ? (
              <div className="card text-center py-12 text-slate-600 dark:text-slate-400 font-medium text-sm">
                No cases currently flagged for physician review.
              </div>
            ) : (
              flaggedCases.map((item) => {
                const pain = item.painScore ?? 0;
                const wait = item.waitTimeMinutes ?? 0;
                const decayRate = item.esiLevel === 1 ? 50 : item.esiLevel === 2 ? 15 : item.esiLevel === 3 ? 5 : item.esiLevel === 4 ? 2 : 1;
                const isSeverePain = pain >= 7;

                return (
                  <div
                    key={item.id}
                    className="card p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-amber-500/40 bg-amber-50/20 dark:bg-amber-500/5 rounded-2xl hover:border-amber-500/60 transition-all"
                  >
                    <div className="space-y-2 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-base text-slate-900 dark:text-slate-100">{item.patientName}</span>
                        <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold border border-slate-200 dark:border-slate-700">
                          {item.trackingCode}
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-800 dark:text-amber-300 font-extrabold border border-amber-500/30">
                          Current: ESI Level {item.esiLevel}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-700 dark:text-rose-400 border border-rose-500/30 flex items-center gap-1">
                          <AlertOctagon size={12} /> Pending Physician Action
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                        <span className="font-semibold text-slate-900 dark:text-white">Chief Complaint:</span> {item.chiefComplaint || 'Unspecified'}
                      </p>

                      {/* Subjective Bias & Clinical Metrics Row */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[11px] border ${
                            isSeverePain
                              ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          Pain: {pain}/10 {isSeverePain ? '(Severe Distress)' : '(Reported)'}
                        </span>

                        {item.highRiskCondition && (
                          <span className="px-2 py-0.5 rounded-md font-bold text-[11px] bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800">
                            High-Risk Flag Triggered
                          </span>
                        )}

                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          Age: <strong className="text-slate-700 dark:text-slate-200">{item.age}y</strong>
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">&bull;</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          HR: <strong className="text-slate-700 dark:text-slate-200">{item.heartRate ?? '--'} bpm</strong>
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">&bull;</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          SpO2: <strong className={`font-mono ${item.oxygenSaturation != null && item.oxygenSaturation < 92 ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-700 dark:text-slate-200'}`}>{item.oxygenSaturation ?? '--'}%</strong>
                        </span>
                        <span className="text-slate-400 dark:text-slate-500">&bull;</span>
                        <span className="text-slate-500 dark:text-slate-400 text-xs">
                          Resources: <strong className="text-slate-700 dark:text-slate-200">{item.resourcesNeeded ?? 0}</strong>
                        </span>
                      </div>

                      {/* Nurse Subjective Note snippet if present */}
                      {item.subjectiveNotes && (
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-amber-200/50 dark:border-amber-500/20 italic">
                          "{item.subjectiveNotes}"
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 self-end md:self-center shrink-0">
                      <div className="text-right text-xs bg-white dark:bg-slate-900/80 p-2.5 rounded-xl border border-amber-200/70 dark:border-amber-500/20">
                        <div className="flex items-center justify-end gap-1 text-slate-500 dark:text-slate-400 text-[11px]">
                          <Clock size={12} />
                          <span>Wait: <strong className="text-slate-800 dark:text-slate-200 font-mono">{wait}m</strong></span>
                          <span className="text-amber-600 dark:text-amber-400 font-bold">(+{decayRate}/m)</span>
                        </div>
                        <span className="text-blue-600 dark:text-sky-400 font-mono font-bold block mt-0.5 text-xs">
                          Score: {Math.round(item.calculatedPriorityScore || 0)} pts
                        </span>
                      </div>

                      <button
                        onClick={() => setReviewPatient(item)}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-bold text-xs hover:from-amber-400 hover:to-orange-400 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-amber-500/20"
                      >
                        <ShieldZap size={15} /> Action Clinical Override
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* TAB 4: Standard Venue SOS & Incident Reports */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          {/* Top Row: Hero Spotlight Card + KPI Analytics Cards (Inspired by Untitled UI & reference) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Spotlight Hero Card (Concentric radial rings, blue gradient, findings pill) */}
            <div className="lg:col-span-4 relative overflow-hidden rounded-3xl p-6 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white shadow-xl shadow-blue-600/20 flex flex-col justify-between min-h-[220px]">
              {/* Concentric subtle vector rings */}
              <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full border border-white/15 pointer-events-none" />
              <div className="absolute -top-4 -right-4 w-48 h-48 rounded-full border border-white/20 pointer-events-none" />
              <div className="absolute top-10 right-10 w-28 h-28 rounded-full border border-white/25 pointer-events-none" />

              <div className="relative z-10 flex items-center justify-between">
                <span className="px-3 py-1 rounded-full text-[11px] font-bold tracking-wide uppercase bg-white/20 backdrop-blur-md border border-white/30 text-white">
                  Live Operations
                </span>
                <span className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white/90">
                  <Zap size={15} />
                </span>
              </div>

              <div className="relative z-10 my-4">
                <div className="text-3xl font-extrabold tracking-tight">
                  {incidents.filter((i) => i.status === 'RESOLVED').length} / {incidents.length || 0}
                </div>
                <p className="text-xs text-blue-100 font-medium mt-1 leading-relaxed">
                  Incidents resolved or actively contained across your facility today.
                </p>
              </div>

              <div className="relative z-10 pt-2 border-t border-white/15 flex items-center justify-between text-xs text-blue-100">
                <span className="font-semibold">Facility Readiness</span>
                <span className="font-bold text-white bg-white/20 px-2 py-0.5 rounded-full text-[10px]">
                  99.8% Online
                </span>
              </div>
            </div>

            {/* KPI Cards (Profile Completion / Spending style clean metric cards) */}
            <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Card 1: Open Active Incidents */}
              <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Active Incidents
                  </span>
                  <span className="w-8 h-8 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <ShieldTick size={18} />
                  </span>
                </div>
                <div>
                  <div className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                    {incidents.filter((i) => i.status !== 'CLOSED' && i.status !== 'RESOLVED').length}
                  </div>
                  <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, (incidents.filter((i) => i.status !== 'CLOSED' && i.status !== 'RESOLVED').length / (incidents.length || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-2 block">
                    Requiring command action
                  </span>
                </div>
              </div>

              {/* Card 2: High & Critical Threats */}
              <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
                    Critical Threats
                  </span>
                  <span className="w-8 h-8 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertCircle size={16} />
                  </span>
                </div>
                <div>
                  <div className="text-3xl font-extrabold tracking-tight text-rose-600 dark:text-rose-400">
                    {incidents.filter((i) => (i.severity === 'CRITICAL' || i.severity === 'HIGH') && i.status !== 'CLOSED').length}
                  </div>
                  <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-rose-500 h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, (incidents.filter((i) => (i.severity === 'CRITICAL' || i.severity === 'HIGH') && i.status !== 'CLOSED').length / (incidents.length || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-2 block">
                    Priority clinical triage
                  </span>
                </div>
              </div>

              {/* Card 3: 911 & Responders En Route */}
              <div className="rounded-3xl p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                    911 Dispatches
                  </span>
                  <span className="w-8 h-8 rounded-2xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                    <BellRinging01 size={16} />
                  </span>
                </div>
                <div>
                  <div className="text-3xl font-extrabold tracking-tight text-purple-600 dark:text-purple-400">
                    {incidents.filter((i) => i.emergencyDispatched).length}
                  </div>
                  <div className="mt-2 w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ 
                        width: `${Math.min(100, (incidents.filter((i) => i.emergencyDispatched).length / (incidents.length || 1)) * 100)}%` 
                      }}
                    />
                  </div>
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 mt-2 block">
                    EMS / Local authorities
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Search & Multi-Filters Toolbar (Untitled UI filter pattern) */}
          <div className="rounded-2xl p-3.5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 shadow-xs">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              {/* Search input with modern left icon */}
              <div className="relative flex-1 max-w-lg">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search incidents by ID, complaint, location, or reporter..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 text-xs font-medium rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
                />
              </div>

              {/* Status Segmented Buttons */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                  Status:
                </span>
                {['ALL', 'REPORTED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED'].map((st) => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      statusFilter === st
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                    }`}
                  >
                    {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              {/* Severity Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mr-1">
                  Severity:
                </span>
                {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      severityFilter === sev
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs'
                        : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Incident List: Redesigned like Reference's 'Transaction History' Rows */}
          {loading ? (
            <div className="rounded-3xl p-16 text-center bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 text-slate-400 text-sm">
              Loading verified incident dossiers...
            </div>
          ) : incidents.length === 0 ? (
            <div className="rounded-3xl p-16 text-center bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90">
              <CheckCircle2 size={44} className="mx-auto text-emerald-500 mb-3 opacity-80" />
              <h3 className="text-base font-bold text-slate-900 dark:text-white">All Clear</h3>
              <p className="text-xs text-slate-400 mt-1">No active incidents recorded for this facility.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence>
                {incidents
                  .filter((inc) => {
                    if (statusFilter !== 'ALL' && inc.status !== statusFilter) return false;
                    if (severityFilter !== 'ALL' && inc.severity !== severityFilter) return false;
                    if (searchQuery.trim()) {
                      const q = searchQuery.toLowerCase();
                      return (
                        String(inc.id).includes(q) ||
                        inc.type?.toLowerCase().includes(q) ||
                        inc.description?.toLowerCase().includes(q) ||
                        inc.location?.toLowerCase().includes(q)
                      );
                    }
                    return true;
                  })
                  .slice()
                  .sort((a, b) => {
                    // Priority Queue Sorting: CRITICAL (1) > HIGH (2) > MEDIUM (3) > LOW (4)
                    const severityScore = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
                    const sevA = severityScore[a.severity] || 5;
                    const sevB = severityScore[b.severity] || 5;
                    if (sevA !== sevB) return sevA - sevB;

                    // Active/unresolved incidents precede completed/resolved
                    const isClosedA = a.status === 'RESOLVED' || a.status === 'CLOSED';
                    const isClosedB = b.status === 'RESOLVED' || b.status === 'CLOSED';
                    if (isClosedA !== isClosedB) return isClosedA ? 1 : -1;

                    // Most recent first within same criticality tier
                    return new Date(b.createdAt) - new Date(a.createdAt);
                  })
                  .map((inc, index) => {
                    // Dynamic theme badge colors based on severity
                    const isCritical = inc.severity === 'CRITICAL';
                    const isHigh = inc.severity === 'HIGH';
                    const isMedium = inc.severity === 'MEDIUM';

                    const iconBg = isCritical
                      ? 'from-rose-500 to-red-600 text-white shadow-rose-500/25'
                      : isHigh
                      ? 'from-amber-500 to-orange-600 text-white shadow-amber-500/25'
                      : isMedium
                      ? 'from-blue-500 to-indigo-600 text-white shadow-blue-500/25'
                      : 'from-emerald-500 to-teal-600 text-white shadow-emerald-500/25';

                    const isResolved = inc.status === 'RESOLVED';
                    const isResponding = inc.status === 'RESPONDING';

                    return (
                      <motion.div
                        key={inc.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSelectedIncidentId(inc.id)}
                        className="group relative rounded-2xl p-4 sm:p-5 bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 hover:border-blue-500/50 dark:hover:border-blue-500/50 hover:shadow-lg hover:shadow-slate-200/50 dark:hover:shadow-black/40 transition-all duration-200 cursor-pointer flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        {/* Left Side: Avatar Squircle + Incident Information */}
                        <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                          {/* Untitled UI style squircle icon with Priority Rank Badge */}
                          <div className="relative flex-shrink-0">
                            <div className={`flex items-center justify-center w-11 h-11 rounded-2xl bg-gradient-to-tr ${iconBg} shadow-md`}>
                              {isCritical ? (
                                <AlertOctagon size={20} />
                              ) : isHigh ? (
                                <AlertCircle size={20} />
                              ) : (
                                <ShieldTick size={20} />
                              )}
                            </div>
                            <span 
                              className="absolute -top-1.5 -left-1.5 text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-sm border border-white/20 dark:border-slate-800"
                              title={`Priority Queue Position #${index + 1}`}
                            >
                              P{index + 1}
                            </span>
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              {/* Criticality Level Priority Pill replacing plain sequence no */}
                              <span
                                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                                  isCritical
                                    ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                                    : isHigh
                                    ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                                    : isMedium
                                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                                    : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                                }`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${isCritical ? 'bg-rose-500 animate-ping' : isHigh ? 'bg-amber-500' : 'bg-blue-500'}`} />
                                PRIORITY {isCritical ? '1 • CRITICAL' : isHigh ? '2 • HIGH' : isMedium ? '3 • MEDIUM' : '4 • LOW'}
                              </span>

                              <span className="font-extrabold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                {inc.type}
                              </span>

                              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                                (Ref #{inc.id})
                              </span>

                              {inc.emergencyDispatched && (
                                <span className="bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-[10px] px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                  <BellRinging01 size={11} /> 911 DISPATCHED
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-1">
                              {inc.description || 'No complaint notes documented.'}
                            </p>

                            <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
                              <span className="flex items-center gap-1">
                                <MapPin size={12} className="text-blue-500" /> {inc.location}
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <Clock size={12} /> {new Date(inc.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {inc.assignedToName && (
                                <>
                                  <span>•</span>
                                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                                    Assigned: {inc.assignedToName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Status Badge + Action Pill (Matching Reference Status dot) */}
                        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
                          {/* Live Status indicator pill matching reference: In process, Completed */}
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5 ${
                              isResolved
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                                : isResponding
                                ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50'
                                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                isResolved ? 'bg-emerald-500' : isResponding ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'
                              }`}
                            />
                            {inc.status === 'REPORTED'
                              ? 'Reported'
                              : inc.status === 'ACKNOWLEDGED'
                              ? 'Acknowledged'
                              : inc.status === 'RESPONDING'
                              ? 'In Process'
                              : 'Completed'}
                          </span>

                          {/* Quick Actions */}
                          <div className="flex items-center gap-2">
                            {inc.status === 'REPORTED' && isSecurity && (
                              <button
                                onClick={(e) => handleAcknowledge(inc.id, e)}
                                className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs"
                              >
                                Acknowledge
                              </button>
                            )}
                            {!inc.assignedToName && (
                              <button
                                onClick={(e) => handleAssignToSelf(inc.id, e)}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold transition-all cursor-pointer active:scale-95 shadow-xs"
                              >
                                Claim
                              </button>
                            )}

                            <div className="flex items-center text-xs font-bold text-blue-600 dark:text-blue-400 group-hover:translate-x-0.5 transition-transform">
                              <span className="hidden sm:inline mr-1">Dossier</span>
                              <ArrowUpRight size={14} className="stroke-[2.5]" />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Doctor Review Modal */}
      <DoctorReviewModal
        isOpen={!!reviewPatient}
        patient={reviewPatient}
        onClose={() => setReviewPatient(null)}
        onReviewSuccess={() => fetchTriageQueue()}
      />

      {/* Incident Detail Modal */}
      <IncidentDetailModal
        incidentId={selectedIncidentId}
        isOpen={!!selectedIncidentId}
        priorityRank={
          selectedIncidentId
            ? incidents
                .slice()
                .sort((a, b) => {
                  const severityScore = { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 };
                  const sevA = severityScore[a.severity] || 5;
                  const sevB = severityScore[b.severity] || 5;
                  if (sevA !== sevB) return sevA - sevB;
                  const isClosedA = a.status === 'RESOLVED' || a.status === 'CLOSED';
                  const isClosedB = b.status === 'RESOLVED' || b.status === 'CLOSED';
                  if (isClosedA !== isClosedB) return isClosedA ? 1 : -1;
                  return new Date(b.createdAt) - new Date(a.createdAt);
                })
                .findIndex((i) => i.id === selectedIncidentId) + 1
            : undefined
        }
        onClose={() => setSelectedIncidentId(null)}
        onIncidentUpdated={() => fetchIncidents(true)}
      />

      {/* Broadcast Creator Modal */}
      <BroadcastManagerModal
        isOpen={isBroadcastModalOpen}
        onClose={() => setIsBroadcastModalOpen(false)}
        venueSlug={user?.venueSlug || 'metro-general-hospital'}
      />

      {/* Staff Admin Role Modal */}
      <AdminUserManagement
        isOpen={isAdminModalOpen}
        onClose={() => setIsAdminModalOpen(false)}
      />
    </motion.div>
  );
}
