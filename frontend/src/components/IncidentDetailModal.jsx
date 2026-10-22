import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XClose as X,
  CheckCircle as CheckCircle2,
  AlertTriangle,
  AlertOctagon as ShieldAlert,
  BellRinging01 as Siren,
  Send01 as Send,
  Copy01 as Copy,
  LinkExternal01 as ExternalLink,
  MarkerPin01 as MapPin,
  Clock,
  User01 as User,
  Phone,
  File06 as FileText,
  Activity,
  Check,
} from '@untitledui/icons';
import { toast } from 'react-toastify';
import incidentApi from '../api/incidentApi';
import { useAuth } from '../context/AuthContext';

export default function IncidentDetailModal({
  incidentId,
  isOpen,
  priorityRank,
  onClose,
  onIncidentUpdated,
}) {
  const { isCoordinator, isSecurity, isAdmin, user } = useAuth();
  const canManageStatus = isSecurity || isAdmin || isCoordinator;
  const canVerify = isSecurity || isAdmin || isCoordinator;
  const canFlagFalseAlarm = isSecurity || isAdmin;
  const canDispatch = isCoordinator || isAdmin;
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState(null);

  // New timeline update form
  const [updateMessage, setUpdateMessage] = useState('');
  const [isPublicToGuest, setIsPublicToGuest] = useState(true);
  const [postingUpdate, setPostingUpdate] = useState(false);

  // False alarm modal
  const [showFalseAlarmForm, setShowFalseAlarmForm] = useState(false);
  const [falseAlarmReason, setFalseAlarmReason] = useState('');

  // 911 dispatch modal
  const [showDispatchForm, setShowDispatchForm] = useState(false);
  const [dispatchReason, setDispatchReason] = useState('');

  const fetchDetail = async () => {
    if (!incidentId) return;
    setLoading(true);
    try {
      const res = await incidentApi.getIncidentDetail(incidentId);
      setDetail(res.data);
    } catch (err) {
      toast.error('Failed to load incident dossier');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && incidentId) {
      fetchDetail();
    }
  }, [isOpen, incidentId]);

  const handleStatusChange = async (newStatus) => {
    try {
      await incidentApi.updateStatus(incidentId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
      fetchDetail();
      if (onIncidentUpdated) onIncidentUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleVerify = async () => {
    try {
      await incidentApi.verifyIncident(incidentId, false, '');
      toast.success('Incident verified by command.');
      fetchDetail();
      if (onIncidentUpdated) onIncidentUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleDispatchEmergency = async (e) => {
    e.preventDefault();
    try {
      await incidentApi.dispatchEmergency(incidentId, dispatchReason);
      toast.success('911 / EMS external emergency units dispatched!');
      setShowDispatchForm(false);
      setDispatchReason('');
      fetchDetail();
      if (onIncidentUpdated) onIncidentUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Dispatch failed');
    }
  };

  const handleFlagFalseAlarm = async (e) => {
    e.preventDefault();
    if (!falseAlarmReason.trim()) return;
    try {
      await incidentApi.flagFalseAlarm(incidentId, falseAlarmReason.trim());
      toast.warning('Incident flagged as false alarm and closed.');
      setShowFalseAlarmForm(false);
      fetchDetail();
      if (onIncidentUpdated) onIncidentUpdated();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to flag false alarm');
    }
  };

  const handleAddTimelineUpdate = async (e) => {
    e.preventDefault();
    if (!updateMessage.trim()) return;
    setPostingUpdate(true);
    try {
      await incidentApi.addTimelineUpdate(incidentId, {
        message: updateMessage.trim(),
        isPublicToGuest,
        updateType: 'STAFF_UPDATE',
      });
      toast.success('Update logged to operational timeline.');
      setUpdateMessage('');
      fetchDetail();
      if (onIncidentUpdated) onIncidentUpdated();
    } catch (err) {
      toast.error('Failed to log update');
    } finally {
      setPostingUpdate(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.info(`${label} copied to clipboard!`);
  };

  if (!isOpen) return null;

  const incident = detail?.incident;
  const timeline = detail?.timeline || [];

  const lifelineUrl =
    incident && incident.guestAccessToken
      ? `${window.location.origin}/lifeline/${incident.id}?token=${incident.guestAccessToken}`
      : null;

  const responderUrl =
    incident && incident.responderToken
      ? `${window.location.origin}/responder/${incident.responderToken}`
      : null;

  const statusSteps = ['REPORTED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CLOSED'];
  const currentStepIdx = statusSteps.indexOf(incident?.status);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(10px)',
        zIndex: 9000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="card"
        style={{
          width: '100%',
          maxWidth: '900px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          padding: '1.75rem',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-start pb-4 border-b border-slate-200 dark:border-white/10">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Priority Queue Position Badge */}
              {priorityRank && (
                <span className="text-[11px] font-black px-2 py-0.5 rounded-md bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs">
                  P{priorityRank}
                </span>
              )}

              {/* Priority Level Criticality Pill */}
              {(() => {
                const isCrit = incident?.severity === 'CRITICAL';
                const isH = incident?.severity === 'HIGH';
                const isMed = incident?.severity === 'MEDIUM';
                return (
                  <span
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-md flex items-center gap-1.5 ${
                      isCrit
                        ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60'
                        : isH
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60'
                        : isMed
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60'
                        : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${isCrit ? 'bg-rose-500 animate-ping' : isH ? 'bg-amber-500' : 'bg-blue-500'}`} />
                    PRIORITY {isCrit ? '1 • CRITICAL' : isH ? '2 • HIGH' : isMed ? '3 • MEDIUM' : '4 • LOW'}
                  </span>
                );
              })()}

              <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                {incident?.type || 'INCIDENT'}
              </span>

              <span className="text-xs text-slate-400 dark:text-slate-500 font-mono font-bold">
                (Ref #{incidentId})
              </span>

              {incident?.emergencyDispatched && (
                <span className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-xs px-2.5 py-1 rounded-full font-bold flex items-center gap-1 animate-pulse">
                  <Siren size={12} /> 911 DISPATCHED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 font-medium">
              Reported on {new Date(incident?.createdAt || Date.now()).toLocaleString()}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={22} />
          </button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-400">Loading incident dossier...</div>
        ) : (
          <div
            style={{
              overflowY: 'auto',
              flex: 1,
              paddingRight: '0.5rem',
              marginTop: '1rem',
            }}
          >
            {/* Status Workflow Progression */}
            <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs uppercase font-bold text-slate-600 dark:text-gray-400 tracking-wider">
                  Operational Workflow Lifecycle
                </span>
                <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                  Status: {incident?.status}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1.5 overflow-x-auto pb-2">
                {statusSteps.map((step, idx) => {
                  const isActive = step === incident?.status;
                  const isDone = currentStepIdx > idx;
                  const isClickable = canManageStatus && !isActive;
                  return (
                    <button
                      key={step}
                      disabled={!isClickable}
                      onClick={() => handleStatusChange(step)}
                      className={`flex-1 py-2 px-1 text-xs font-bold rounded-lg border transition-all whitespace-nowrap cursor-pointer ${
                        isActive
                          ? 'bg-blue-600 border-blue-600 text-white shadow-xs cursor-default'
                          : isDone
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                          : isClickable
                          ? 'bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 hover:text-blue-600 dark:hover:text-white'
                          : 'bg-transparent border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 opacity-60 cursor-not-allowed'
                      }`}
                    >
                      {isDone && '✓ '}
                      {step}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Tactical Controls */}
            <div className="flex flex-wrap gap-2 mb-6">
              {!incident?.verified && canVerify && (
                <button onClick={handleVerify} className="btn-primary text-xs py-2 px-3">
                  <CheckCircle2 size={15} className="mr-1" /> Verify Incident
                </button>
              )}

              {canDispatch && !incident?.emergencyDispatched && (
                <button
                  onClick={() => setShowDispatchForm(true)}
                  style={{
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#f87171',
                    border: '1px solid rgba(239, 68, 68, 0.4)',
                    padding: '0.5rem 0.85rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                  }}
                >
                  <Siren size={15} /> Dispatch 911 / EMS
                </button>
              )}

              {canFlagFalseAlarm && incident?.status !== 'CLOSED' && (
                <button
                  onClick={() => setShowFalseAlarmForm(true)}
                  className="btn-outline text-xs py-2 px-3"
                  style={{ borderColor: 'rgba(244, 63, 94, 0.3)', color: '#f43f5e' }}
                >
                  <AlertTriangle size={15} className="mr-1" /> Flag False Alarm
                </button>
              )}

              {lifelineUrl && (
                <button
                  onClick={() => copyToClipboard(lifelineUrl, 'Guest Lifeline Link')}
                  className="btn-outline text-xs py-2 px-3 ml-auto"
                >
                  <Copy size={13} className="mr-1" /> Copy Lifeline Link
                </button>
              )}

              {responderUrl && (
                <a
                  href={responderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-outline text-xs py-2 px-3"
                  style={{ display: 'inline-flex', alignItems: 'center' }}
                >
                  <ExternalLink size={13} className="mr-1" /> Open Responder HUD
                </a>
              )}
            </div>

            {/* Incident Details Card */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <h4 className="text-xs uppercase font-bold text-slate-500 dark:text-gray-400 mb-2">Location & Details</h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex items-center gap-2">
                    <MapPin size={16} className="text-primary flex-shrink-0" />
                    <span className="text-slate-800 dark:text-slate-200 font-medium">{incident?.location}</span>
                  </div>
                  {incident?.latitude && incident?.longitude && (
                    <div className="text-xs text-emerald-600 dark:text-emerald-400 pl-6">
                      <a
                        href={`https://maps.google.com/?q=${incident.latitude},${incident.longitude}`}
                        target="_blank"
                        rel="noreferrer"
                        className="underline flex items-center gap-1"
                      >
                        GPS: {incident.latitude.toFixed(5)}, {incident.longitude.toFixed(5)}{' '}
                        <ExternalLink size={10} />
                      </a>
                    </div>
                  )}
                  <p className="mt-2 text-slate-700 dark:text-gray-300 bg-white dark:bg-black/20 p-2.5 rounded-lg border border-slate-200 dark:border-white/5">
                    {incident?.description}
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10">
                <h4 className="text-xs uppercase font-bold text-slate-500 dark:text-gray-400 mb-2">Metadata & Verification</h4>
                <div className="space-y-2 text-sm text-slate-800 dark:text-slate-200">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-gray-400">Reporter:</span>
                    <span>{incident?.reporterName || 'Anonymous Distressed Guest'}</span>
                  </div>
                  {incident?.reporterPhone && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-gray-400">Phone:</span>
                      <span>{incident.reporterPhone}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-gray-400">Assigned To:</span>
                    <span className="text-primary font-semibold">
                      {incident?.assignedToName || 'Unassigned (Open)'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-gray-400">Verification:</span>
                    <span>
                      {incident?.verified ? (
                        <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                          Verified by {incident.verifiedByName || 'Staff'}
                        </span>
                      ) : (
                        <span className="text-amber-500 dark:text-amber-400 font-medium">Pending Verification</span>
                      )}
                    </span>
                  </div>
                  {incident?.falseAlarmReason && (
                    <div className="p-2 rounded bg-red-500/10 border border-red-500/20 text-red-300 text-xs mt-1">
                      <strong>False Alarm Reason:</strong> {incident.falseAlarmReason}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Emergency Dispatch Reason Modal */}
            {showDispatchForm && (
              <form
                onSubmit={handleDispatchEmergency}
                className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 space-y-3"
              >
                <h4 className="text-sm font-bold text-red-400 flex items-center gap-1.5">
                  <Siren size={16} /> Confirm 911 / EMS Dispatch Callout
                </h4>
                <input
                  type="text"
                  placeholder="Reason for emergency services dispatch (e.g. cardiac arrest, active fire)..."
                  value={dispatchReason}
                  onChange={(e) => setDispatchReason(e.target.value)}
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-xs py-2 px-4 bg-red-600 hover:bg-red-700">
                    Confirm Dispatch
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowDispatchForm(false)}
                    className="btn-outline text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* False Alarm Reason Modal */}
            {showFalseAlarmForm && (
              <form
                onSubmit={handleFlagFalseAlarm}
                className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-3"
              >
                <h4 className="text-sm font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle size={16} /> Flag as False Alarm
                </h4>
                <input
                  type="text"
                  placeholder="Reason for flagging as false alarm..."
                  value={falseAlarmReason}
                  onChange={(e) => setFalseAlarmReason(e.target.value)}
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn-primary text-xs py-2 px-4 bg-amber-600 hover:bg-amber-700">
                    Submit False Alarm & Close
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFalseAlarmForm(false)}
                    className="btn-outline text-xs py-2 px-4"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Operational Timeline & Chat */}
            <div className="mt-6 border-t border-white/10 pt-4">
              <h4 className="text-base font-bold mb-4 flex items-center gap-2">
                <Clock size={18} className="text-primary" /> Operational Timeline & Updates
              </h4>

              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto pr-2">
                {timeline.length === 0 ? (
                  <p className="text-sm text-gray-500 italic">No timeline entries recorded yet.</p>
                ) : (
                  timeline.map((entry) => (
                    <div
                      key={entry.id}
                      className="p-3 rounded-lg bg-white/5 border border-white/5 text-sm"
                    >
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-semibold text-primary">{entry.authorName}</span>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                          {entry.isPublicToGuest ? (
                            <span className="text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                              Guest Visible
                            </span>
                          ) : (
                            <span className="text-gray-400 bg-white/5 px-1.5 py-0.5 rounded">
                              Internal Only
                            </span>
                          )}
                          <span>{new Date(entry.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </div>
                      <p className="text-gray-300">{entry.message}</p>
                    </div>
                  ))
                )}
              </div>

              {/* Add New Update */}
              <form onSubmit={handleAddTimelineUpdate} className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Log operational update or responder directive..."
                    value={updateMessage}
                    onChange={(e) => setUpdateMessage(e.target.value)}
                    required
                  />
                  <button
                    type="submit"
                    disabled={postingUpdate}
                    className="btn-primary px-4 py-2 flex items-center gap-1.5"
                  >
                    <Send size={15} />
                    {postingUpdate ? 'Logging...' : 'Log'}
                  </button>
                </div>
                <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isPublicToGuest}
                    onChange={(e) => setIsPublicToGuest(e.target.checked)}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  Make this update visible to the distressed guest on their Live Lifeline
                </label>
              </form>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
