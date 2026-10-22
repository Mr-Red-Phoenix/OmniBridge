import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  Clock,
  RefreshCw,
  AlertTriangle,
  UserCheck,
  Stethoscope,
  Users,
  HeartPulse,
  Wind,
  Hourglass,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import triageApi from '../api/triageApi';

const ESI_BADGES = {
  1: {
    bg: 'bg-red-500/20 text-red-400 border-red-500/50',
    label: 'ESI 1: RESUSCITATION',
    glow: 'ring-2 ring-red-500/60 shadow-red-500/30 animate-pulse',
    dot: 'bg-red-500',
  },
  2: {
    bg: 'bg-amber-500/20 text-amber-400 border-amber-500/50',
    label: 'ESI 2: EMERGENT',
    glow: 'ring-1 ring-amber-500/50 shadow-amber-500/20',
    dot: 'bg-amber-500',
  },
  3: {
    bg: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    label: 'ESI 3: URGENT',
    glow: 'border-yellow-500/40',
    dot: 'bg-yellow-400',
  },
  4: {
    bg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50',
    label: 'ESI 4: LESS URGENT',
    glow: 'border-emerald-500/30',
    dot: 'bg-emerald-400',
  },
  5: {
    bg: 'bg-teal-500/20 text-teal-400 border-teal-500/50',
    label: 'ESI 5: NON-URGENT',
    glow: 'border-teal-500/30',
    dot: 'bg-teal-400',
  },
};

export default function HallDashboard() {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // 1. Initial & Continuous HTTP GET hydration from public triage endpoint
  const fetchQueue = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await triageApi.getPublicQueue('default');
      if (Array.isArray(res.data)) {
        setQueue(res.data);
      } else {
        setQueue([]);
      }
    } catch (err) {
      console.error('Failed to fetch public triage queue', err);
      if (!silent) setQueue([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    // Immediate initial fetch
    fetchQueue(false);

    // Live Clock Ticker (Updates every 1000ms / 1s)
    const clockTimer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    // Fallback Background Poll (Syncs every 10s in case WebSockets are interrupted or air-gapped)
    const pollTimer = setInterval(() => {
      fetchQueue(true);
    }, 10000);

    // 2. Connect STOMP over SockJS connecting to /ws/triage for instant push updates
    let stompClient = null;
    try {
      if (typeof window !== 'undefined') {
        stompClient = new Client({
          webSocketFactory: () => new SockJS('/ws/triage'),
          reconnectDelay: 3000,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
          onConnect: () => {
            stompClient.subscribe('/topic/queue', (message) => {
              try {
                const updatedQueue = JSON.parse(message.body);
                if (Array.isArray(updatedQueue)) {
                  setQueue(updatedQueue);
                }
              } catch (e) {
                console.error('Error parsing queue broadcast', e);
              }
            });
          },
        });

        stompClient.activate();
      }
    } catch (e) {
      console.warn('STOMP client activation error:', e);
    }

    return () => {
      clearInterval(clockTimer);
      clearInterval(pollTimer);
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, []);

  const sortedQueue = [...queue].sort((a, b) => (b.calculatedPriorityScore || 0) - (a.calculatedPriorityScore || 0));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 py-6 px-4 sm:px-6 lg:px-8 transition-colors">
      {/* 1. HUD Command Header */}
      <div className="max-w-7xl mx-auto pb-6 border-b border-slate-200 dark:border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Activity className="text-blue-600 dark:text-teal-400" size={26} />
            Public Triage Hall Board
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Facility: <strong className="text-slate-700 dark:text-slate-300">Metro General Hospital &amp; Emergency Ward</strong> • Dynamic ESI Priority Decay Order
          </p>
        </div>

        {/* HUD Counters */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl shadow-xs">
            <Users size={14} className="text-blue-600 dark:text-teal-400" />
            <span>Active Patients: <strong className="text-slate-900 dark:text-white font-bold">{sortedQueue.length}</strong></span>
          </div>

          {/* Live Ticking Clock */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 px-3.5 py-1.5 rounded-xl shadow-xs">
            <Clock size={14} className="text-blue-600 dark:text-teal-400" />
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live:</span>
              <strong className="text-slate-900 dark:text-white font-mono">
                {currentTime.toLocaleTimeString()}
              </strong>
            </span>
          </div>
        </div>
      </div>

      {/* 2. 3D Perspective Card Grid */}
      <div className="max-w-7xl mx-auto mt-8">
        {loading && sortedQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-teal-500/10 border border-blue-200 dark:border-teal-500/20 flex items-center justify-center mb-4">
              <RefreshCw size={22} className="text-blue-600 dark:text-teal-400 animate-spin" />
            </div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Hydrating Active Triage Queue...</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
              Synchronizing with hospital triage stream in real time.
            </p>
          </div>
        ) : sortedQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-xs backdrop-blur-sm">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center mb-4 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck size={28} />
            </div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              Triage Hall Queue Clear
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 max-w-md leading-relaxed">
              There are currently no patients waiting in the triage queue. Newly triaged admissions from nurse intake stations will appear here in real time.
            </p>
          </div>
        ) : (
          <div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
            style={{ perspective: '1100px' }}
          >
            <AnimatePresence>
              {sortedQueue.map((item, idx) => {
                const badge = ESI_BADGES[item.esiLevel] || ESI_BADGES[3];
                const isReview = item.status === 'FLAGGED_FOR_REVIEW' || item.status === 'SPECIAL_REQUEST';

                return (
                  <motion.div
                    key={item.trackingCode || item.id}
                    layout
                    initial={{ opacity: 0, y: 20, rotateX: 12 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.45, ease: 'easeOut' }}
                    whileHover={{ y: -6, rotateY: 2.5, rotateX: -2, transition: { duration: 0.2 } }}
                    className={`p-6 rounded-3xl bg-white dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm dark:shadow-2xl relative overflow-hidden transition-all duration-300 ${
                      idx === 0 ? 'ring-2 ring-red-500/50 dark:bg-gradient-to-b dark:from-red-950/25 dark:to-slate-900/90' : ''
                    }`}
                    style={{
                      transformStyle: 'preserve-3d',
                    }}
                  >
                    {/* Card Header: Rank, HIPAA Tracking Code & Acuity Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-extrabold text-xs text-blue-600 dark:text-teal-400">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-mono font-bold tracking-wider text-slate-700 dark:text-slate-300">
                          {item.trackingCode}
                        </span>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold border ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>

                    {/* Masked HIPAA Patient Name */}
                    <div className="mb-2">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white tracking-wide">
                        {item.patientName}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 h-9 mt-0.5">
                        {item.chiefComplaint}
                      </p>
                    </div>

                    {/* Critical Vitals HUD Strip */}
                    <div className="grid grid-cols-3 gap-2 p-3 rounded-2xl bg-slate-50 dark:bg-slate-950/70 border border-slate-200 dark:border-slate-800/80 text-center my-4">
                      <div>
                        <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
                          <Hourglass size={11} className="text-slate-400" />
                          <span>Wait</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.waitTimeMinutes ?? 0}m
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
                          <Wind size={11} className="text-slate-400" />
                          <span>SpO2</span>
                        </div>
                        <span
                          className={`text-xs font-bold ${
                            item.oxygenSaturation && item.oxygenSaturation < 92 ? 'text-red-500 dark:text-red-400 font-extrabold' : 'text-slate-800 dark:text-slate-200'
                          }`}
                        >
                          {item.oxygenSaturation ? `${item.oxygenSaturation}%` : '--'}
                        </span>
                      </div>

                      <div>
                        <div className="flex items-center justify-center gap-1 text-[10px] uppercase font-semibold text-slate-400 dark:text-slate-500 mb-0.5">
                          <HeartPulse size={11} className="text-slate-400" />
                          <span>Pulse</span>
                        </div>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {item.heartRate ? `${item.heartRate} bpm` : item.consciousnessLevel || 'ALERT'}
                        </span>
                      </div>
                    </div>

                    {/* Footer: Dynamic Priority Score & Operational Status */}
                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800/80">
                      <span className="text-slate-500 dark:text-slate-400 font-mono text-[11px]">
                        Score: <strong className="text-blue-600 dark:text-teal-400">{Math.round(item.calculatedPriorityScore || 0)}</strong>
                      </span>

                      {isReview ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 dark:text-amber-400 animate-pulse">
                          <AlertTriangle size={13} /> Doctor Review Requested
                        </span>
                      ) : item.isOverridden ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-indigo-500 dark:text-indigo-400" title={item.overrideReason}>
                          <UserCheck size={13} /> Doctor Override
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                          {item.status === 'IN_EXAM' ? (
                            <>
                              <Stethoscope size={13} className="text-blue-600 dark:text-teal-400" />
                              <span>In Exam Room</span>
                            </>
                          ) : (
                            <>
                              <Clock size={13} className="text-slate-400 dark:text-slate-500" />
                              <span>Queued for Bay</span>
                            </>
                          )}
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
