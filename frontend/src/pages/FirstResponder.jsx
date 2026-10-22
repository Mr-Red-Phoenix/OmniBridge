import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Key01 as KeyRound,
  Package as Box,
  MarkerPin01 as MapPin,
  Phone,
  File06 as FileText,
  NavigationPointer01 as Navigation,
  Copy01 as Copy,
  Clock,
  Send01 as Send,
  CheckCircle as CheckCircle2,
  AlertTriangle,
  LinkExternal01 as ExternalLink,
  ShieldZap,
} from '@untitledui/icons';
import { toast } from 'react-toastify';
import responderApi from '../api/responderApi';

export default function FirstResponder() {
  const { responderToken } = useParams();
  const [packet, setPacket] = useState(null);
  const [loading, setLoading] = useState(true);

  // Status update
  const [statusNote, setStatusNote] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Field note
  const [fieldNote, setFieldNote] = useState('');
  const [submittingNote, setSubmittingNote] = useState(false);

  const fetchPacket = async () => {
    if (!responderToken) return;
    try {
      const res = await responderApi.getTacticalPacket(responderToken);
      setPacket(res.data);
      setSelectedStatus(res.data.status);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to load tactical responder packet');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPacket();
  }, [responderToken]);

  const handleUpdateStatus = async (status) => {
    try {
      await responderApi.updateStatus(responderToken, status, statusNote);
      toast.success(`Tactical status broadcasted: ${status}`);
      setStatusNote('');
      fetchPacket();
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!fieldNote.trim()) return;
    setSubmittingNote(true);
    try {
      await responderApi.addNote(responderToken, fieldNote.trim());
      toast.success('Field observation logged to command timeline.');
      setFieldNote('');
      fetchPacket();
    } catch (err) {
      toast.error('Failed to log field note');
    } finally {
      setSubmittingNote(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.info(`${label} copied to clipboard!`);
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400 animate-pulse">
        Decrypting Tactical Access Dossier...
      </div>
    );
  }

  if (!packet) {
    return (
      <div className="card mx-auto max-w-lg text-center py-12">
        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">Tactical Packet Expired or Invalid</h2>
        <p className="text-sm text-gray-400 mb-6">
          The requested first responder access token could not be verified. Please contact facility dispatch.
        </p>
        <Link to="/" className="btn-primary">
          Return to Portal
        </Link>
      </div>
    );
  }

  const timeline = packet.timeline || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl"
      style={{
        maxWidth: '850px',
      }}
    >
      {/* Tactical Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <span className="flex items-center justify-center w-11 h-11 rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/70 dark:border-blue-900/60 shadow-xs">
              <ShieldZap size={25} />
            </span>
            <div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                TACTICAL RESPONDER PACKET #{packet.incidentId}
              </h2>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-mono font-semibold mt-0.5">
                {packet.venueName} — {packet.location}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase ${
            packet.severity === 'CRITICAL'
              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50'
              : packet.severity === 'HIGH'
              ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50'
              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
          }`}>
            {packet.severity}
          </span>
          <span className="px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50 text-xs font-bold">
            STATUS: {packet.status}
          </span>
        </div>
      </div>

      {/* Critical Facility Access Dossier */}
      <div className="my-6 p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
        <h4 className="text-xs uppercase font-extrabold text-blue-600 dark:text-blue-400 tracking-wider mb-4 flex items-center gap-2">
          <KeyRound size={16} /> Immediate Building Access & Ingress Codes
        </h4>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Gate code */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                Gate / Security Bypass Code
              </span>
              <span className="text-lg font-mono font-black text-emerald-600 dark:text-emerald-400 tracking-wider">
                {packet.gateCode || 'UNRESTRICTED'}
              </span>
            </div>
            {packet.gateCode && (
              <button
                onClick={() => copyToClipboard(packet.gateCode, 'Gate Code')}
                className="btn-outline text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
              >
                <Copy size={13} /> Copy
              </button>
            )}
          </div>

          {/* Knox box */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block flex items-center gap-1">
              <Box size={13} /> Knox Box Rapid Entry Key Location
            </span>
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 block">
              {packet.knoxBoxLocation || 'Contact on-site security'}
            </span>
          </div>

          {/* Facility address with Google Maps */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-center justify-between shadow-xs">
            <div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
                Facility Physical Address
              </span>
              <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                {packet.venueAddress}
              </span>
            </div>
            {packet.venueAddress && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(packet.venueAddress)}`}
                target="_blank"
                rel="noreferrer"
                className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1 cursor-pointer"
              >
                <Navigation size={13} /> GPS
              </a>
            )}
          </div>

          {/* Emergency contacts */}
          <div className="p-3.5 rounded-xl bg-white dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 shadow-xs">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium block">
              On-Site Dispatch Phone
            </span>
            <span className="text-sm font-mono text-blue-600 dark:text-blue-400 font-bold mt-0.5 block">
              {packet.emergencyContactPhone || 'Command Desk'}
            </span>
          </div>
        </div>

        {/* Floor plan link */}
        {packet.floorPlanUrl && (
          <div className="mt-4 pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
              <FileText size={14} className="text-blue-600 dark:text-blue-400" /> Architectural Evacuation & Floor Plan
            </span>
            <a
              href={packet.floorPlanUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              Open Floor Plan PDF <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Incident Situation Summary */}
      <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-6">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 mb-2">
          Situation Briefing
        </h4>
        <p className="text-sm text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 mb-3 shadow-xs">
          {packet.description || 'No additional details provided.'}
        </p>
        <div className="flex flex-wrap gap-4 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <span>Reporter: <strong className="text-slate-700 dark:text-slate-300">{packet.reporterName || 'Anonymous'}</strong></span>
          {packet.reporterPhone && <span>Phone: <strong className="text-slate-700 dark:text-slate-300">{packet.reporterPhone}</strong></span>}
          <span>Reported: <strong className="text-slate-700 dark:text-slate-300">{new Date(packet.reportedAt).toLocaleTimeString()}</strong></span>
          {packet.onSiteCoordinatorName && (
            <span className="text-blue-600 dark:text-blue-400 font-bold">
              On-Site Lead: {packet.onSiteCoordinatorName}
            </span>
          )}
        </div>
      </div>

      {/* Status Broadcasting Controls */}
      <div className="p-5 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 mb-6">
        <h4 className="text-xs uppercase font-bold text-slate-700 dark:text-slate-300 mb-3">
          Broadcast Field Unit Status
        </h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
          {['ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CLOSED'].map((st) => (
            <button
              key={st}
              onClick={() => handleUpdateStatus(st)}
              className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                packet.status === st
                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-500'
              }`}
            >
              Mark {st}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Optional status observation note (e.g. Unit 4 on scene at West Gate)..."
          value={statusNote}
          onChange={(e) => setStatusNote(e.target.value)}
          className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
        />
      </div>

      {/* Field Note Logging */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <Clock size={16} className="text-blue-600 dark:text-blue-400" /> Incident Command Log & Field Notes
        </h4>

        <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-2">
          {timeline.length === 0 ? (
            <p className="text-xs text-slate-400 dark:text-slate-500 italic">No notes logged yet.</p>
          ) : (
            timeline.map((entry) => (
              <div key={entry.id} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 text-xs shadow-xs">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-blue-600 dark:text-blue-400">{entry.authorName}</span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {new Date(entry.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-700 dark:text-slate-200 mt-0.5">{entry.message}</p>
              </div>
            ))
          )}
        </div>

        <form onSubmit={handleAddNote} className="flex gap-2">
          <input
            type="text"
            placeholder="Log tactical field note (e.g. Hazard contained, patient triaged)..."
            value={fieldNote}
            onChange={(e) => setFieldNote(e.target.value)}
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950/60 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
            required
          />
          <button
            type="submit"
            disabled={submittingNote}
            className="btn-primary px-4 py-2 flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
          >
            <Send size={15} />
            {submittingNote ? 'Saving...' : 'Add Note'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
