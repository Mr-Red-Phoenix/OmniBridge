import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  XClose as X,
  Signal01 as Radio,
  AlertTriangle,
  AlertOctagon as ShieldAlert,
  Check,
  Trash01 as Trash2,
  Clock,
} from '@untitledui/icons';
import { toast } from 'react-toastify';
import broadcastApi from '../api/broadcastApi';
import { useAuth } from '../context/AuthContext';

export default function BroadcastManagerModal({ isOpen, onClose, venueSlug }) {
  const { isCoordinator } = useAuth();
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [severity, setSeverity] = useState('HIGH');
  const [targetZone, setTargetZone] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [issuing, setIssuing] = useState(false);

  const fetchActiveAlerts = async () => {
    if (!venueSlug) return;
    setLoading(true);
    try {
      const res = await broadcastApi.listActive(venueSlug);
      setActiveAlerts(res.data || []);
    } catch (err) {
      toast.error('Failed to load active broadcasts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && venueSlug) {
      fetchActiveAlerts();
    }
  }, [isOpen, venueSlug]);

  const handleIssueBroadcast = async (e) => {
    e.preventDefault();
    if (!title.trim() || !message.trim()) {
      toast.warning('Please enter broadcast title and message.');
      return;
    }

    setIssuing(true);
    try {
      await broadcastApi.createBroadcast(venueSlug, {
        title: title.trim(),
        message: message.trim(),
        severity,
        targetZone: targetZone.trim() || undefined,
        durationMinutes: Number(durationMinutes) || 60,
      });

      toast.success('Emergency facility broadcast published live!');
      setTitle('');
      setMessage('');
      setTargetZone('');
      fetchActiveAlerts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to issue broadcast');
    } finally {
      setIssuing(false);
    }
  };

  const handleDeactivate = async (alertId) => {
    try {
      await broadcastApi.deactivate(venueSlug, alertId);
      toast.info('Broadcast alert ended.');
      fetchActiveAlerts();
    } catch (err) {
      toast.error('Failed to deactivate broadcast');
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        backdropFilter: 'blur(8px)',
        zIndex: 9100,
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
          maxWidth: '750px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2 text-primary font-bold text-lg">
            <Radio size={22} />
            Facility Emergency Broadcast Center
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:text-gray-400 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div style={{ overflowY: 'auto', flex: 1, paddingRight: '0.5rem', marginTop: '1rem' }}>
          {/* Issue Alert Form */}
          <form onSubmit={handleIssueBroadcast} className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 space-y-4 mb-6">
            <h4 className="text-sm font-bold uppercase text-slate-800 dark:text-gray-300 flex items-center gap-2">
              <ShieldAlert size={16} className="text-red-500 dark:text-red-400" /> Issue Facility-Wide Emergency Alert
            </h4>

            <div className="row">
              <div className="form-group flex-1">
                <label className="text-xs">Alert Title *</label>
                <input
                  type="text"
                  placeholder="e.g. Code Red: Evacuate Sector 4 Immediately"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>
              <div className="form-group w-44">
                <label className="text-xs">Severity *</label>
                <select value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  <option value="INFO">INFO</option>
                  <option value="WARNING">WARNING</option>
                  <option value="HIGH">HIGH</option>
                  <option value="CRITICAL">CRITICAL</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="text-xs">Emergency Message Directives *</label>
              <textarea
                rows="3"
                placeholder="Clear instructions for guests and staff (e.g. Proceed to Emergency Stairwell B. Do not use elevators)..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                required
              />
            </div>

            <div className="row">
              <div className="form-group flex-1">
                <label className="text-xs">Target Zone (Optional)</label>
                <input
                  type="text"
                  placeholder="e.g. All Wings / Trauma Bay / Floor 2"
                  value={targetZone}
                  onChange={(e) => setTargetZone(e.target.value)}
                />
              </div>
              <div className="form-group w-44">
                <label className="text-xs">Duration (Minutes)</label>
                <input
                  type="number"
                  min="5"
                  max="720"
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={issuing}
              className="btn-primary w-full py-2.5 flex items-center justify-center gap-2"
              style={{ backgroundColor: severity === 'CRITICAL' ? '#ef4444' : undefined }}
            >
              <Radio size={16} />
              {issuing ? 'Broadcasting...' : 'Publish Emergency Broadcast'}
            </button>
          </form>

          {/* Active Broadcasts List */}
          <div>
            <h4 className="text-sm font-bold uppercase text-slate-700 dark:text-gray-400 mb-3 flex items-center gap-2">
              <Clock size={16} /> Active Venue Broadcasts ({activeAlerts.length})
            </h4>

            {loading ? (
              <p className="text-sm text-slate-500 dark:text-gray-400">Loading broadcasts...</p>
            ) : activeAlerts.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-gray-500 italic p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 text-center">
                No active broadcasts. Facility status is normal.
              </p>
            ) : (
              <div className="space-y-3">
                {activeAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-4 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-start justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="incident-badge badge-critical text-xs">
                          {alert.severity}
                        </span>
                        {alert.targetZone && (
                          <span className="text-xs text-slate-500 dark:text-gray-400">Zone: {alert.targetZone}</span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-gray-500">
                          Expires: {new Date(alert.expiresAt).toLocaleTimeString()}
                        </span>
                      </div>
                      <h5 className="font-bold text-slate-900 dark:text-white mt-1">{alert.title}</h5>
                      <p className="text-sm text-slate-600 dark:text-gray-300 mt-0.5">{alert.message}</p>
                      <span className="text-xs text-primary mt-1 block">
                        Issued by: {alert.authorName}
                      </span>
                    </div>

                    {isCoordinator && (
                      <button
                        onClick={() => handleDeactivate(alert.id)}
                        className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1"
                        title="End broadcast immediately"
                      >
                        <Trash2 size={13} /> End
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
