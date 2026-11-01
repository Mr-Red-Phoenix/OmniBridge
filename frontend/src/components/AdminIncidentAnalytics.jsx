import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  CheckCircle as CheckCircle2,
  AlertCircle,
  Clock,
  ArrowUpRight,
  Eye,
  SearchLg as Search,
  Sliders01 as SlidersHorizontal,
  Activity,
} from '@untitledui/icons';
import { toast } from 'react-toastify';
import incidentApi from '../api/incidentApi';

export default function AdminIncidentAnalytics({ onSelectIncident }) {
  // Preset date options: 'today', '7days', '30days', 'month', 'custom', 'all'
  const [datePreset, setDatePreset] = useState('7days');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Condition Filters
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Analytics State
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState(null);

  // Quick preset handler
  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    const endStr = now.toISOString().split('T')[0];

    if (preset === 'today') {
      setStartDate(endStr);
      setEndDate(endStr);
    } else if (preset === '7days') {
      const past = new Date();
      past.setDate(now.getDate() - 7);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (preset === '30days') {
      const past = new Date();
      past.setDate(now.getDate() - 30);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(endStr);
    } else if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const params = {};
      if (startDate) {
        params.startDate = new Date(`${startDate}T00:00:00.000Z`).toISOString();
      }
      if (endDate) {
        params.endDate = new Date(`${endDate}T23:59:59.999Z`).toISOString();
      }
      if (typeFilter !== 'ALL') params.type = typeFilter;
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (severityFilter !== 'ALL') params.severity = severityFilter;

      const res = await incidentApi.getIncidentAnalytics(params);
      setData(res.data);
    } catch (err) {
      console.error('Analytics load error:', err);
      const msg = err.response?.data?.message || err.response?.data?.error || 'Failed to load historic incident analytics';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [startDate, endDate, typeFilter, statusFilter, severityFilter]);

  // Client-side search for the table view
  const formatMinutes = (minutes) => {
    if (!minutes || minutes <= 0) return '0m';
    if (minutes < 60) return `${Math.round(minutes * 10) / 10}m`;
    const totalMins = Math.round(minutes);
    const hours = Math.floor(totalMins / 60);
    const remMins = totalMins % 60;
    if (hours < 24) {
      return remMins > 0 ? `${hours}h ${remMins}m` : `${hours}h`;
    }
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return remHours > 0 ? `${days}d ${remHours}h` : `${days}d`;
  };

  const filteredIncidents = useMemo(() => {
    if (!data?.incidents) return [];
    if (!searchQuery.trim()) return data.incidents;
    const q = searchQuery.toLowerCase();
    return data.incidents.filter((inc) => {
      const idMatch = String(inc.id).includes(q);
      const descMatch = inc.description?.toLowerCase().includes(q);
      const locMatch = inc.location?.toLowerCase().includes(q);
      const reporterMatch = inc.reporterName?.toLowerCase().includes(q);
      const typeMatch = inc.type?.toLowerCase().includes(q);
      return idMatch || descMatch || locMatch || reporterMatch || typeMatch;
    });
  }, [data?.incidents, searchQuery]);

  // Sparkline & Trend Calculation for the Area Chart
  const timelinePoints = data?.timeline || [];
  const maxReported = useMemo(() => {
    if (!timelinePoints.length) return 10;
    const max = Math.max(...timelinePoints.map((p) => Math.max(p.reportedCount, p.resolvedCount)));
    return max > 0 ? max : 10;
  }, [timelinePoints]);

  const chartWidth = 540;
  const chartHeight = 180;
  const paddingX = 40;
  const paddingY = 25;

  const pointsReported = useMemo(() => {
    if (timelinePoints.length < 2) return '';
    return timelinePoints
      .map((p, idx) => {
        const x = paddingX + (idx / (timelinePoints.length - 1)) * (chartWidth - 2 * paddingX);
        const y = chartHeight - paddingY - (p.reportedCount / maxReported) * (chartHeight - 2 * paddingY);
        return `${x},${y}`;
      })
      .join(' ');
  }, [timelinePoints, maxReported]);

  const pointsResolved = useMemo(() => {
    if (timelinePoints.length < 2) return '';
    return timelinePoints
      .map((p, idx) => {
        const x = paddingX + (idx / (timelinePoints.length - 1)) * (chartWidth - 2 * paddingX);
        const y = chartHeight - paddingY - (p.resolvedCount / maxReported) * (chartHeight - 2 * paddingY);
        return `${x},${y}`;
      })
      .join(' ');
  }, [timelinePoints, maxReported]);

  const areaReported = useMemo(() => {
    if (!pointsReported || timelinePoints.length < 2) return '';
    const firstX = paddingX;
    const lastX = chartWidth - paddingX;
    const bottomY = chartHeight - paddingY;
    return `M ${firstX},${bottomY} L ${pointsReported.split(' ')[0]} ${pointsReported
      .split(' ')
      .map((pt) => `L ${pt}`)
      .join(' ')} L ${lastX},${bottomY} Z`;
  }, [pointsReported, timelinePoints]);

  const hasActiveFilters = typeFilter !== 'ALL' || statusFilter !== 'ALL' || severityFilter !== 'ALL';

  return (
    <div className="space-y-6">
      {/* Top Filter and Date-to-Date Selection Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white tracking-tight">
                Historical Incident Intelligence
              </h3>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/60">
                Admin Audit
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Select date intervals, audit resolution rates, and analyze venue emergency trends.
            </p>
          </div>

          {/* Date Presets & Date-to-Date inputs */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Quick Presets Pills */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/70 dark:border-slate-700/60 no-scrollbar overflow-x-auto shrink-0">
              {[
                { id: 'today', label: 'Today' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'month', label: 'This Month' },
                { id: 'all', label: 'All-Time' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                    datePreset === preset.id
                      ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Compact Date-to-Date Inputs */}
            <div className="inline-flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 text-xs shrink-0">
              <Calendar size={13} className="text-slate-500 dark:text-slate-400 shrink-0" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="date-picker-field text-slate-800 dark:text-slate-100 font-medium"
              />
              <span className="text-slate-400 dark:text-slate-500 font-medium px-0.5">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setDatePreset('custom');
                }}
                className="date-picker-field text-slate-800 dark:text-slate-100 font-medium"
              />
            </div>
          </div>
        </div>

        {/* Condition Filters (Side-by-Side 3 Column Grid) */}
        <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <SlidersHorizontal size={13} />
              <span>Filter Conditions:</span>
            </div>
            {hasActiveFilters && (
              <button
                onClick={() => {
                  setTypeFilter('ALL');
                  setStatusFilter('ALL');
                  setSeverityFilter('ALL');
                }}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full">
            {/* Type Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Incident Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <option value="ALL">All Incident Types</option>
                <option value="MEDICAL">Medical Emergency</option>
                <option value="FIRE">Fire Hazard</option>
                <option value="SECURITY">Security Incident</option>
                <option value="OVERCROWDING">Overcrowding</option>
                <option value="HAZARD">Physical Hazard</option>
                <option value="LOST_CHILD">Missing Person / Child</option>
                <option value="PANIC">SOS Panic Trigger</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Severity Level
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                Operational Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700/80 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-blue-500 focus:outline-hidden font-medium shadow-2xs hover:border-slate-300 dark:hover:border-slate-600 transition-colors"
              >
                <option value="ALL">All Statuses</option>
                <option value="RESOLVED">Resolved Only</option>
                <option value="CLOSED">Closed</option>
                <option value="RESPONDING">Responding</option>
                <option value="DISPATCHED">Dispatched</option>
                <option value="ACKNOWLEDGED">Acknowledged</option>
                <option value="REPORTED">Reported / Open</option>
                <option value="UNVERIFIED">Unverified</option>
                <option value="FALSE_ALARM">False Alarm</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Incidents */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold">
              <AlertCircle size={20} />
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300">
              Historic Total
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? '--' : data?.totalIncidents ?? 0}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Total Incidents Reported
            </p>
          </div>
        </div>

        {/* Card 2: Resolved & Resolution Rate */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
              <CheckCircle2 size={20} />
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 flex items-center gap-1">
              <ArrowUpRight size={12} /> {data?.resolutionRatePercent ?? 0}% Rate
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black tracking-tight text-emerald-600 dark:text-emerald-400">
              {loading ? '--' : data?.resolvedCount ?? 0}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Successfully Resolved Incidents
            </p>
          </div>
        </div>

        {/* Card 3: Active & In-Progress */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Activity size={20} />
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              In-Progress
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black tracking-tight text-amber-600 dark:text-amber-400">
              {loading ? '--' : data?.activeCount ?? 0}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Active / Pending Operations
            </p>
          </div>
        </div>

        {/* Card 4: Avg Resolution Time & False Alarms */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <span className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
              <Clock size={20} />
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300">
              {data?.falseAlarmCount ?? 0} False Alarms
            </span>
          </div>
          <div className="mt-4">
            <div className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              {loading ? '--' : formatMinutes(data?.avgResolutionTimeMinutes)}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
              Average Resolution Duration
            </p>
          </div>
        </div>
      </div>

      {/* Middle Visual Section: Graph Trends & Categorical Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Graph 1: Reported vs Resolved Trends (Wave/Area Chart) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Incident Volume &amp; Resolution Trends
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Daily frequency of reported vs. resolved cases
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Reported
              </span>
              <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Resolved
              </span>
            </div>
          </div>

          {/* SVG Line / Area Graph */}
          <div className="relative w-full h-[220px] flex items-center justify-center overflow-hidden">
            {timelinePoints.length < 2 ? (
              <div className="text-center py-12 text-xs text-slate-400">
                <Calendar size={28} className="mx-auto mb-2 opacity-40" />
                Select a wider date range to visualize daily incident curves.
              </div>
            ) : (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-full overflow-visible">
                <defs>
                  <linearGradient id="blueGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="greenGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Horizontal Guide Lines */}
                {[0.25, 0.5, 0.75, 1].map((ratio) => {
                  const y = chartHeight - paddingY - ratio * (chartHeight - 2 * paddingY);
                  return (
                    <line
                      key={ratio}
                      x1={paddingX}
                      y1={y}
                      x2={chartWidth - paddingX}
                      y2={y}
                      stroke="currentColor"
                      strokeDasharray="3 3"
                      className="text-slate-100 dark:text-slate-800"
                    />
                  );
                })}

                {/* Filled Area for Reported */}
                {areaReported && <path d={areaReported} fill="url(#blueGradient)" />}

                {/* Line for Reported */}
                <polyline
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsReported}
                />

                {/* Line for Resolved */}
                <polyline
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={pointsResolved}
                />

                {/* Data Points */}
                {timelinePoints.map((point, idx) => {
                  const x = paddingX + (idx / (timelinePoints.length - 1)) * (chartWidth - 2 * paddingX);
                  const yRep = chartHeight - paddingY - (point.reportedCount / maxReported) * (chartHeight - 2 * paddingY);
                  const yRes = chartHeight - paddingY - (point.resolvedCount / maxReported) * (chartHeight - 2 * paddingY);

                  return (
                    <g key={point.dateLabel}>
                      {/* Reported circle */}
                      <circle
                        cx={x}
                        cy={yRep}
                        r="3.5"
                        className="fill-blue-600 stroke-white dark:stroke-slate-900 stroke-2 cursor-pointer hover:r-5 transition-all"
                        onMouseEnter={() => setHoveredPoint({ ...point, x, y: yRep, type: 'Reported' })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                      {/* Resolved circle */}
                      <circle
                        cx={x}
                        cy={yRes}
                        r="3"
                        className="fill-emerald-500 stroke-white dark:stroke-slate-900 stroke-2 cursor-pointer hover:r-5 transition-all"
                        onMouseEnter={() => setHoveredPoint({ ...point, x, y: yRes, type: 'Resolved' })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Clean, perfectly-sized Tooltip */}
            <AnimatePresence>
              {hoveredPoint && (
                <motion.div
                  initial={{ opacity: 0, y: -4, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="absolute z-20 pointer-events-none bg-slate-900/95 dark:bg-slate-950/95 text-white text-[11px] px-3 py-2 rounded-xl shadow-xl font-medium border border-slate-700/80 backdrop-blur-md w-max min-w-[130px]"
                  style={{
                    left: `${Math.max(12, Math.min(88, (hoveredPoint.x / chartWidth) * 100))}%`,
                    top: `${Math.max(15, (hoveredPoint.y / chartHeight) * 100 - 15)}%`,
                    transform: 'translate(-50%, -100%)',
                  }}
                >
                  <p className="font-bold text-slate-300 pb-1 mb-1 border-b border-slate-800 text-[10px]">
                    {hoveredPoint.dateLabel}
                  </p>
                  <div className="space-y-0.5">
                    <p className="text-blue-400 font-semibold flex items-center justify-between gap-3">
                      <span>Reported:</span>
                      <span className="font-mono font-bold">{hoveredPoint.reportedCount}</span>
                    </p>
                    <p className="text-emerald-400 font-semibold flex items-center justify-between gap-3">
                      <span>Resolved:</span>
                      <span className="font-mono font-bold">{hoveredPoint.resolvedCount}</span>
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Timeline Date Bounds */}
          {timelinePoints.length > 1 && (
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-mono pt-2 border-t border-slate-100 dark:border-slate-800">
              <span>{timelinePoints[0].dateLabel}</span>
              <span>{timelinePoints[timelinePoints.length - 1].dateLabel}</span>
            </div>
          )}
        </div>

        {/* Graph 2: Incident Category & Severity Bar Breakdown */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Category &amp; Criticality Breakdown
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Proportion by incident category and urgency
              </p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="font-bold text-rose-500">{data?.criticalCount ?? 0}</span> Critical SOS
            </div>
          </div>

          {/* Category Bar Rows */}
          <div className="space-y-3.5 my-auto py-2">
            {data?.countByType && Object.keys(data.countByType).length > 0 ? (
              Object.entries(data.countByType).map(([type, count]) => {
                const total = data.totalIncidents || 1;
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between items-center text-xs font-semibold">
                      <span className="text-slate-700 dark:text-slate-300 capitalize">
                        {type.toLowerCase().replace(/_/g, ' ')}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono">
                        {count} <span className="text-[10px] opacity-70">({percentage}%)</span>
                      </span>
                    </div>
                    {/* Multi-layered bar */}
                    <div className="w-full h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center py-8 text-xs text-slate-400">
                No incident classifications in selected period.
              </div>
            )}
          </div>

          {/* Severity Badges Bottom Bar */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 text-[11px] font-semibold">Severity Split:</span>
            {data?.countBySeverity &&
              Object.entries(data.countBySeverity).map(([sev, count]) => (
                <span
                  key={sev}
                  className={`px-2 py-0.5 rounded-md font-bold text-[10px] border ${
                    sev === 'CRITICAL'
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200'
                      : sev === 'HIGH'
                      ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {sev}: {count}
                </span>
              ))}
          </div>
        </div>
      </div>

      {/* Historic Incidents Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/90 dark:border-slate-800/90 rounded-2xl p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Historic Incident Log &amp; Audit
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Showing {filteredIncidents.length} matching incident records for this period
            </p>
          </div>

          {/* Search bar inside the table card */}
          <div className="relative w-full sm:w-72">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 z-10 flex items-center">
              <Search size={15} />
            </span>
            <input
              type="text"
              placeholder="Search ID, reporter, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs !pl-10 !pr-4 !py-2.5 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 font-medium transition-all"
            />
          </div>
        </div>

        {/* Incident Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                <th className="pb-3 pl-2">Incident ID</th>
                <th className="pb-3">Date &amp; Time</th>
                <th className="pb-3">Type</th>
                <th className="pb-3">Severity</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Reporter</th>
                <th className="pb-3">Status</th>
                <th className="pb-3 text-right pr-2">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan="8" className="text-center py-10 text-slate-400 text-xs">
                    No historic incidents found matching the specified dates or conditions.
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => {
                  const isResolved = inc.status === 'RESOLVED' || inc.status === 'CLOSED';
                  const isFalseAlarm = inc.status === 'FALSE_ALARM';
                  const isCritical = inc.severity === 'CRITICAL';

                  return (
                    <tr
                      key={inc.id}
                      className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      {/* ID */}
                      <td className="py-3 pl-2 font-mono font-bold text-blue-600 dark:text-blue-400">
                        #{inc.id}
                      </td>

                      {/* Date */}
                      <td className="py-3 text-slate-600 dark:text-slate-300 font-medium">
                        {inc.createdAt ? new Date(inc.createdAt).toLocaleString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        }) : '--'}
                      </td>

                      {/* Type */}
                      <td className="py-3 font-semibold text-slate-900 dark:text-white capitalize">
                        {inc.type?.toLowerCase().replace(/_/g, ' ')}
                      </td>

                      {/* Severity */}
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] uppercase border ${
                            isCritical
                              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900'
                              : inc.severity === 'HIGH'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-900'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {inc.severity}
                        </span>
                      </td>

                      {/* Location */}
                      <td className="py-3 text-slate-600 dark:text-slate-300 max-w-[150px] truncate">
                        {inc.location || 'Unknown'}
                      </td>

                      {/* Reporter */}
                      <td className="py-3 text-slate-500 dark:text-slate-400">
                        {inc.reporterName || 'Guest'}
                      </td>

                      {/* Status */}
                      <td className="py-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase inline-flex items-center gap-1 ${
                            isResolved
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400'
                              : isFalseAlarm
                              ? 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                              : 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 animate-pulse'
                          }`}
                        >
                          {isResolved && <CheckCircle2 size={10} />}
                          {inc.status}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="py-3 text-right pr-2 relative">
                        <button
                          onClick={() => onSelectIncident(inc.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-all cursor-pointer inline-flex items-center gap-1"
                        >
                          <Eye size={13} /> View
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
