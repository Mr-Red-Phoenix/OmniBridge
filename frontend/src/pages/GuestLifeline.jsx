import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldAlert,
  Activity,
  CheckCircle2,
  Siren,
  Send,
  Building,
  MapPin,
  Clock,
  MessageSquare,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { toast } from 'react-toastify';
import guestApi from '../api/guestApi';
import LiveStreamStatus from '../components/LiveStreamStatus';

const STATUS_STEPS = ['REPORTED', 'ACKNOWLEDGED', 'RESPONDING', 'RESOLVED', 'CLOSED'];

export default function GuestLifeline() {
  const { incidentId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [lifeline, setLifeline] = useState(null);
  const [loading, setLoading] = useState(true);
  const [streamStatus, setStreamStatus] = useState('connecting');
  const [guestMessage, setGuestMessage] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);

  const fetchLifeline = async () => {
    if (!incidentId || !token) {
      setLoading(false);
      return;
    }
    try {
      const res = await guestApi.getLifeline(incidentId, token);
      setLifeline(res.data);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to retrieve lifeline status.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLifeline();

    if (!incidentId || !token) return;

    let eventSource = null;
    try {
      const streamUrl = guestApi.getLifelineStreamUrl(incidentId, token);
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        setStreamStatus('connected');
      };

      eventSource.addEventListener('lifeline', (event) => {
        try {
          const data = JSON.parse(event.data);
          setLifeline(data);
          toast.info('Incident status updated in real-time!');
        } catch (e) {
          console.error('Failed to parse SSE lifeline event', e);
        }
      });

      eventSource.onerror = () => {
        setStreamStatus('connecting');
      };
    } catch (e) {
      setStreamStatus('disconnected');
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [incidentId, token]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!guestMessage.trim()) return;
    setSendingMsg(true);
    try {
      await guestApi.sendMessage(incidentId, token, guestMessage.trim());
      toast.success('Message transmitted to incident command center.');
      setGuestMessage('');
      fetchLifeline();
    } catch (err) {
      toast.error('Failed to send message to command.');
    } finally {
      setSendingMsg(false);
    }
  };

  if (!token) {
    return (
      <div className="card mx-auto max-w-lg text-center py-12">
        <AlertTriangle size={48} className="mx-auto text-amber-500 mb-3" />
        <h2 className="text-xl font-bold mb-2">Access Token Required</h2>
        <p className="text-sm text-gray-400 mb-6">
          A secure access token is required to view this guest lifeline. Please click the lifeline link provided in your incident confirmation.
        </p>
        <Link to="/" className="btn-primary">
          Return to Home
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-400 animate-pulse">
        Establishing secure connection to Incident Command Lifeline...
      </div>
    );
  }

  if (!lifeline) {
    return (
      <div className="card mx-auto max-w-lg text-center py-12">
        <h2 className="text-xl font-bold mb-2">Incident Not Found</h2>
        <p className="text-sm text-gray-400 mb-4">
          The requested incident could not be found or your access token is invalid.
        </p>
        <Link to="/" className="btn-primary">
          Return to Home
        </Link>
      </div>
    );
  }

  const currentStepIdx = STATUS_STEPS.indexOf(lifeline.status);
  const updates = lifeline.publicUpdates || [];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="card mx-auto"
      style={{ maxWidth: '800px' }}
    >
      {/* Header */}
      <div className="flex flex-wrap justify-between items-start gap-4 pb-6 border-b border-white/10">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black tracking-tight">
              Live Guest Lifeline #{lifeline.incidentId}
            </h2>
            <LiveStreamStatus status={streamStatus} label="Live Feed" />
          </div>
          <p className="text-sm text-gray-400 mt-1 flex items-center gap-2">
            <Building size={15} className="text-primary" /> {lifeline.venueName} — {lifeline.location}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`incident-badge badge-${lifeline.severity?.toLowerCase()}`}>
            {lifeline.severity} PRIORITY
          </span>
          {lifeline.verified && (
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1">
              <CheckCircle2 size={13} /> Verified
            </span>
          )}
        </div>
      </div>

      {/* 911 / EMS En Route Flashing Banner */}
      {lifeline.emergencyDispatched && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-6 p-4 rounded-xl bg-red-500/20 border border-red-500/40 text-red-200 flex items-center gap-3 animate-pulse"
        >
          <div className="p-2.5 rounded-full bg-red-500/30 text-red-400 flex-shrink-0">
            <Siren size={28} />
          </div>
          <div>
            <h4 className="font-extrabold text-base text-white tracking-wide">
              EMERGENCY SERVICES (911 / EMS) ARE EN ROUTE
            </h4>
            <p className="text-xs text-red-200 opacity-90 mt-0.5">
              Incident Command has dispatched external first responders to your exact coordinates. Remain in a safe position and keep your line open.
            </p>
          </div>
        </motion.div>
      )}

      {/* Status Workflow Progression Bar */}
      <div className="my-8 p-5 rounded-2xl bg-white/5 border border-white/10">
        <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider mb-4">
          Response Status Progression
        </h4>
        <div className="grid grid-cols-5 gap-2">
          {STATUS_STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            return (
              <div key={step} className="text-center">
                <div
                  style={{
                    height: '8px',
                    borderRadius: '99px',
                    backgroundColor: isCurrent
                      ? 'var(--primary)'
                      : isCompleted
                      ? 'rgba(16, 185, 129, 0.6)'
                      : 'rgba(255, 255, 255, 0.1)',
                    boxShadow: isCurrent ? '0 0 10px var(--primary)' : 'none',
                    marginBottom: '0.5rem',
                    transition: 'all 0.3s ease',
                  }}
                />
                <span
                  style={{
                    fontSize: '0.7rem',
                    fontWeight: isCurrent ? '800' : '600',
                    color: isCurrent ? 'var(--primary)' : isCompleted ? '#10b981' : 'var(--text-muted)',
                  }}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Facility Instructions & Assigned Coordinator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <h4 className="text-xs uppercase font-bold text-gray-400 mb-2">
            Facility Emergency Directives
          </h4>
          <p className="text-sm text-gray-300">
            {lifeline.emergencyInstructions ||
              'Remain calm and stay at your current safe location until designated emergency response personnel contact you.'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <h4 className="text-xs uppercase font-bold text-gray-400 mb-2">Command Contact</h4>
          <div className="text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-400">Assigned Officer:</span>
              <span className="text-primary font-semibold">
                {lifeline.assignedStaffName || 'Incident Command Desk'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Distress Category:</span>
              <span>{lifeline.type}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2-Way Real-Time Chat & Public Updates */}
      <div className="border-t border-white/10 pt-6">
        <h4 className="text-base font-bold mb-4 flex items-center gap-2">
          <MessageSquare size={18} className="text-primary" /> Live Communication & Updates Channel
        </h4>

        {/* Updates Feed */}
        <div className="space-y-3 mb-6 max-h-72 overflow-y-auto pr-2">
          {updates.length === 0 ? (
            <p className="text-sm text-gray-500 italic p-3 rounded-lg bg-white/5 text-center">
              No messages posted yet. You can send questions or updates below.
            </p>
          ) : (
            updates.map((upd) => (
              <div
                key={upd.id}
                className="p-3.5 rounded-xl bg-white/5 border border-white/10 text-sm"
              >
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-primary text-xs">{upd.authorName}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(upd.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="text-gray-200">{upd.message}</p>
              </div>
            ))
          )}
        </div>

        {/* Send message form */}
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            placeholder="Type your status or message to Command..."
            value={guestMessage}
            onChange={(e) => setGuestMessage(e.target.value)}
            required
          />
          <button
            type="submit"
            disabled={sendingMsg}
            className="btn-primary px-5 py-2 flex items-center gap-1.5"
          >
            <Send size={16} />
            {sendingMsg ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
    </motion.div>
  );
}
