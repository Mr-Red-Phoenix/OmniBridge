import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Bell01 as Bell,
  AlertTriangle,
  AlertOctagon,
  XClose,
  Signal01 as Radio,
  Clock,
  RefreshCw01 as RefreshCw,
  ActivityHeart,
  MessageSquare01 as MessageSquare,
  ArrowUpRight,
  Trash01 as Trash,
} from '@untitledui/icons';
import guestApi from '../api/guestApi';
import venueApi from '../api/venueApi';
import { useAuth } from '../context/AuthContext';
import { getPersonalLifelines, removePersonalLifeline } from '../utils/personalLifelineStorage';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const selectedVenue = 'metro-general-hospital';
  const [alerts, setAlerts] = useState([]);
  const [personalLifelines, setPersonalLifelines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const dropdownRef = useRef(null);

  // Sync personal lifelines (stored locally on this user's device only)
  const syncPersonalLifelines = () => {
    const list = getPersonalLifelines();
    setPersonalLifelines(list);
  };

  useEffect(() => {
    syncPersonalLifelines();
    const handleStorageUpdate = () => syncPersonalLifelines();
    window.addEventListener('omnibridge_lifeline_updated', handleStorageUpdate);
    window.addEventListener('storage', handleStorageUpdate);
    return () => {
      window.removeEventListener('omnibridge_lifeline_updated', handleStorageUpdate);
      window.removeEventListener('storage', handleStorageUpdate);
    };
  }, []);

  // 2. Fetch broadcasts for Metro General Hospital
  const fetchBroadcasts = async () => {
    setLoading(true);
    try {
      const res = await guestApi.getVenueBroadcasts(slug);
      if (Array.isArray(res.data)) {
        const active = res.data.filter((a) => a.active);
        setAlerts(active);
        if (active.length > 0) {
          setHasUnread(true);
        }
      }
    } catch {
      // Keep silent on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBroadcasts(selectedVenue);
  }, [selectedVenue]);

  // 3. Real-time updates via SSE stream
  useEffect(() => {
    if (!selectedVenue) return;

    let eventSource = null;
    try {
      const streamUrl = guestApi.getVenueBroadcastStreamUrl(selectedVenue);
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('broadcast', (event) => {
        try {
          const alert = JSON.parse(event.data);
          if (alert.active) {
            setAlerts((prev) => {
              const filtered = prev.filter((a) => a.id !== alert.id);
              return [alert, ...filtered];
            });
            setHasUnread(true);
          } else {
            setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
          }
        } catch (e) {
          console.error('Failed to parse incoming broadcast SSE event', e);
        }
      });
    } catch {
      // Safe fallback if SSE unavailable
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }, [selectedVenue]);

  // 4. Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const toggleDropdown = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) {
      setHasUnread(false);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        aria-label="View Emergency Broadcasts"
        className={`relative w-9 h-9 rounded-full flex items-center justify-center transition-all cursor-pointer border ${
          isOpen
            ? 'bg-blue-50 text-blue-600 border-blue-300 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40 shadow-sm'
            : 'bg-[#edf2f7] dark:bg-[#1a2333] border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:border-slate-400 dark:hover:border-slate-600'
        }`}
        title="Emergency Alerts & Broadcasts"
      >
        <Bell size={18} className="stroke-[2.1]" />

        {/* Badge count / pulsating indicator */}
        {(alerts.length > 0 || personalLifelines.length > 0) && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9.5px] font-black text-white ring-2 ring-white dark:ring-[#0c121e] animate-pulse">
            {alerts.length + personalLifelines.length}
          </span>
        )}
      </button>

      {/* Broadcasts Dropdown Popover */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="absolute right-0 mt-2.5 w-[340px] sm:w-[390px] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden text-slate-800 dark:text-slate-100"
          >
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/70 dark:bg-slate-950/40">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-tight">
                  Emergency Notifications
                </h4>
                <span className="text-[10px] text-slate-500 dark:text-slate-400">
                  {personalLifelines.length > 0 && `${personalLifelines.length} private lifeline${personalLifelines.length === 1 ? '' : 's'} • `}
                  {alerts.length} active broadcast{alerts.length === 1 ? '' : 's'}
                </span>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Close"
              >
                <XClose size={15} />
              </button>
            </div>

            {/* Content List */}
            <div className="max-h-[380px] overflow-y-auto p-3 space-y-2.5">
              
              {/* Private Active Incident Lifelines (Only visible on THIS reporter's device, NEVER broadcasted) */}
              {personalLifelines.length > 0 && (
                <div className="space-y-2 pb-2 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1">
                      <ActivityHeart size={12} className="stroke-[2.5]" />
                      My Active Incident Lifelines ({personalLifelines.length})
                    </span>
                    <span className="text-[9.5px] text-slate-400 font-medium">Private to you</span>
                  </div>

                  {personalLifelines.map((pl) => (
                    <div
                      key={pl.incidentId}
                      className="p-3 rounded-xl border bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/50 transition-all hover:border-blue-300 dark:hover:border-blue-700 shadow-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 min-w-0">
                          <div className="p-1.5 rounded-lg bg-blue-600 text-white shrink-0 mt-0.5">
                            <MessageSquare size={14} className="stroke-[2.4]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-black text-blue-700 dark:text-blue-300">
                                Incident #{pl.incidentId}
                              </span>
                              <span className="text-[9.5px] font-bold px-1.5 py-0.2 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200 uppercase">
                                {pl.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-600 dark:text-slate-300 font-medium truncate mt-0.5">
                              {pl.location}
                            </p>
                            <p className="text-[9.5px] text-slate-600 dark:text-slate-300 mt-0.5 font-mono">
                              {new Date(pl.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Link
                            to={pl.url}
                            onClick={() => setIsOpen(false)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] flex items-center gap-1 shadow-xs transition-transform active:scale-95"
                            title="Open 2-Way Command Chat & Live Telemetry"
                          >
                            <span>Chat</span>
                            <ArrowUpRight size={12} className="stroke-[2.5]" />
                          </Link>

                          <button
                            onClick={() => removePersonalLifeline(pl.incidentId)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="Remove from my notifications"
                          >
                            <Trash size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {loading && alerts.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw size={16} className="animate-spin text-blue-500" />
                  <span>Checking for active alerts...</span>
                </div>
              ) : alerts.length === 0 && personalLifelines.length === 0 ? (
                <div className="py-8 px-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-2">
                    <Radio size={18} />
                  </div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    All Clear — No Active Broadcasts
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Facility operations and corridors are running normally.
                  </p>
                </div>
              ) : (
                alerts.map((alert) => {
                  const isCritical = alert.severity === 'CRITICAL' || alert.severity === 'HIGH';
                  return (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-xl border transition-all ${
                        isCritical
                          ? 'bg-rose-50/80 dark:bg-rose-500/10 border-rose-200 dark:border-rose-500/30'
                          : 'bg-amber-50/80 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30'
                      }`}
                    >
                      <div className="flex items-start gap-2.5">
                        <div
                          className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${
                            isCritical
                              ? 'bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
                              : 'bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                          }`}
                        >
                          {isCritical ? <AlertOctagon size={16} /> : <AlertTriangle size={16} />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                                isCritical
                                  ? 'bg-rose-200/70 dark:bg-rose-500/30 text-rose-800 dark:text-rose-300'
                                  : 'bg-amber-200/70 dark:bg-amber-500/30 text-amber-800 dark:text-amber-300'
                              }`}
                            >
                              {alert.severity} ALERT
                            </span>
                            <span className="text-[10px] text-slate-600 dark:text-slate-300 flex items-center gap-1 font-mono">
                              <Clock size={11} />
                              {new Date(alert.createdAt).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>

                          <h5 className="font-bold text-xs mt-1 text-slate-900 dark:text-white leading-snug">
                            {alert.title}
                          </h5>

                          <p className="text-[11.5px] text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                            {alert.message}
                          </p>

                          {alert.targetZone && (
                            <div className="mt-2 text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                              <span>Target Zone:</span>
                              <span className="font-semibold text-slate-700 dark:text-slate-200">
                                {alert.targetZone}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
