import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Activity,
  HeartPulse,
  Stethoscope,
  Syringe,
  Bed,
  Building,
  Check,
  ShieldAlert,
  Navigation,
  ExternalLink,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'react-toastify';
import venueApi from '../api/venueApi';
import incidentApi from '../api/incidentApi';
import BroadcastBanner from '../components/BroadcastBanner';

const FALLBACK_VENUES = [
  { slug: 'metro-general-hospital', name: 'Metro General Hospital & Trauma Center', type: 'hospital' },
  { slug: 'er-ward', name: 'Emergency Room', type: 'emergency' },
  { slug: 'icu-ward', name: 'Intensive Care Unit (ICU)', type: 'icu' },
  { slug: 'maternity-ward', name: 'Maternity Ward', type: 'maternity' },
  { slug: 'outpatient-clinic', name: 'Outpatient Clinic', type: 'clinic' },
  { slug: 'surgery-wing', name: 'Surgery Wing', type: 'surgery' },
  { slug: 'pediatrics-ward', name: 'Pediatrics', type: 'pediatrics' },
];

export default function PublicReport({ onOpenSos }) {
  const navigate = useNavigate();
  const [venues, setVenues] = useState([]);
  const [selectedVenue, setSelectedVenue] = useState('');

  // Form Fields
  const [type, setType] = useState('MEDICAL');
  const [severity, setSeverity] = useState('LOW');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [coords, setCoords] = useState(null);
  const [detectingGps, setDetectingGps] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Success Confirmation State
  const [createdIncident, setCreatedIncident] = useState(null);

  useEffect(() => {
    const loadVenues = async () => {
      try {
        const res = await venueApi.getVenues();
        if (Array.isArray(res.data) && res.data.length > 0) {
          setVenues(res.data);
          setSelectedVenue(res.data[0].slug);
          return;
        }
      } catch (err) {
        // Fallback to presets
      }
      setVenues(FALLBACK_VENUES);
      setSelectedVenue(FALLBACK_VENUES[0].slug);
    };

    loadVenues();
  }, []);

  const getVenueIcon = (vType, slug = '') => {
    if (slug.includes('er') || vType === 'emergency')
      return <Activity size={18} />;
    if (slug.includes('icu') || vType === 'icu')
      return <HeartPulse size={18} />;
    if (slug.includes('clinic') || vType === 'clinic')
      return <Stethoscope size={18} />;
    if (slug.includes('surgery') || vType === 'surgery')
      return <Syringe size={18} />;
    if (slug.includes('ward') || vType === 'maternity' || vType === 'pediatrics')
      return <Bed size={18} />;
    return <Building size={18} />;
  };

  const detectLocation = () => {
    if ('geolocation' in navigator) {
      setDetectingGps(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setDetectingGps(false);
          toast.success('Current GPS coordinates attached!');
        },
        () => {
          setDetectingGps(false);
          toast.warning('Could not acquire GPS position automatically.');
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  };

  const submitReport = async (e) => {
    e.preventDefault();
    if (!selectedVenue || !description.trim() || !location.trim()) {
      toast.warning('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        type,
        severity,
        location: location.trim(),
        description: description.trim(),
        reporterName: reporterName.trim() || undefined,
        reporterPhone: reporterPhone.trim() || undefined,
        latitude: coords?.latitude,
        longitude: coords?.longitude,
      };

      const res = await incidentApi.submitReport(selectedVenue, payload);
      toast.success('Incident reported successfully! Command center notified.');
      setCreatedIncident(res.data);

      setDescription('');
      setLocation('');
      setReporterName('');
      setReporterPhone('');
      setCoords(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit report.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4 }}
      className="card mx-auto"
      style={{ maxWidth: '750px' }}
    >
      {/* Live Facility Emergency Alert Banner */}
      <BroadcastBanner venueSlug={selectedVenue} />

      {/* Confirmation Card after submission */}
      <AnimatePresence>
        {createdIncident && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="p-5 rounded-2xl mb-6 bg-emerald-500/10 border border-emerald-500/30"
          >
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle size={24} className="text-emerald-400" />
              <h3 className="font-bold text-lg text-emerald-400">
                Incident Report Dispatched #{createdIncident.incidentId}
              </h3>
            </div>
            <p className="text-sm text-gray-300 mb-4">
              Your report has been logged into the tactical command queue. On-duty authorities and emergency staff are reviewing the situation.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() =>
                  navigate(
                    `/lifeline/${createdIncident.incidentId}?token=${encodeURIComponent(
                      createdIncident.guestAccessToken
                    )}`
                  )
                }
                className="btn-primary text-sm py-2 px-4 flex items-center gap-2"
              >
                Track on Live Lifeline <ExternalLink size={14} />
              </button>
              <button
                onClick={() => setCreatedIncident(null)}
                className="btn-outline text-sm py-2 px-4"
              >
                Dismiss
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            Public Incident Report
          </h2>
          <p className="text-sm text-gray-400 mt-0.5">
            Report medical emergencies, hazards, and facility incidents directly to dispatch
          </p>
        </div>

        {/* SOS Button */}
        <button
          type="button"
          onClick={onOpenSos}
          style={{
            backgroundColor: '#ef4444',
            color: '#fff',
            border: 'none',
            borderRadius: '12px',
            padding: '0.65rem 1.25rem',
            fontWeight: 800,
            fontSize: '0.9rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 0 20px rgba(239, 68, 68, 0.4)',
            cursor: 'pointer',
          }}
          className="hover:scale-105 active:scale-95 transition-transform"
        >
          <ShieldAlert size={18} />
          PANIC SOS
        </button>
      </div>

      <form onSubmit={submitReport} className="space-y-6">
        {/* Venue Selector */}
        <div className="space-y-3">
          <label className="text-sm font-bold flex items-center gap-2 text-slate-700 dark:text-slate-300">
            <MapPin size={17} className="text-blue-600 dark:text-blue-400" />
            <span>Select Venue / Ward *</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {venues.map((v) => {
              const isSelected = selectedVenue === v.slug;
              return (
                <div
                  key={v.slug}
                  onClick={() => setSelectedVenue(v.slug)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 text-left ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/80 dark:bg-blue-950/40 text-blue-900 dark:text-blue-100 shadow-xs'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isSelected
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {getVenueIcon(v.type, v.slug)}
                    </div>
                    <span className="text-xs font-semibold leading-snug line-clamp-2">
                      {v.name}
                    </span>
                  </div>

                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Check size={12} strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Type & Severity */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          {/* Incident Type */}
          <div>
            <label className="text-sm font-semibold mb-2.5 block text-slate-700 dark:text-slate-300">
              Incident Type *
            </label>
            <div className="flex flex-wrap gap-2">
              {['MEDICAL', 'FIRE', 'SECURITY', 'FACILITY', 'OTHER'].map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    type === t
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                  }`}
                >
                  {t.charAt(0) + t.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Severity with Distinct Colors: Low=Green, Medium=Yellow, High=Red, Critical=Crimson */}
          <div>
            <label className="text-sm font-semibold mb-2.5 block text-slate-700 dark:text-slate-300">
              Severity *
            </label>
            <div className="flex flex-wrap gap-2">
              {[
                { key: 'LOW', label: 'Low', activeClass: 'bg-emerald-600 text-white border-emerald-600 shadow-xs' },
                { key: 'MEDIUM', label: 'Medium', activeClass: 'bg-amber-500 text-white border-amber-500 shadow-xs' },
                { key: 'HIGH', label: 'High', activeClass: 'bg-red-600 text-white border-red-600 shadow-xs' },
                { key: 'CRITICAL', label: 'Critical', activeClass: 'bg-rose-700 text-white border-rose-700 shadow-xs animate-pulse' },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSeverity(s.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    severity === s.key
                      ? s.activeClass
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700/80 hover:border-slate-300'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Specific Location */}
        <div className="form-group">
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-semibold">Specific Location *</label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={detectingGps}
              className="text-xs text-primary hover:underline flex items-center gap-1 font-semibold"
            >
              <Navigation size={12} className={detectingGps ? 'animate-spin' : ''} />
              {coords ? 'GPS Attached' : 'Auto-Detect GPS'}
            </button>
          </div>
          <input
            type="text"
            placeholder="e.g. Floor 2, Trauma Bay 2 corridor"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          {coords && (
            <div className="mt-3 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-xs">
              <div className="flex items-center justify-between p-2.5 bg-slate-50 dark:bg-slate-800/80 border-b border-slate-200 dark:border-slate-700/80 text-xs">
                <span className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                  <MapPin size={13} />
                  <span>GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</span>
                </span>
                <a
                  href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  <span>Open in Google Maps</span>
                  <ExternalLink size={11} />
                </a>
              </div>
              <iframe
                title="Incident Location Map"
                width="100%"
                height="150"
                style={{ border: 0 }}
                loading="lazy"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.longitude - 0.003}%2C${coords.latitude - 0.003}%2C${coords.longitude + 0.003}%2C${coords.latitude + 0.003}&layer=mapnik&marker=${coords.latitude}%2C${coords.longitude}`}
              />
            </div>
          )}
        </div>

        {/* Description */}
        <div className="form-group">
          <label className="text-sm font-semibold">Description *</label>
          <textarea
            rows="3"
            placeholder="Describe what occurred, who is involved, and any immediate hazards..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
        </div>

        {/* Optional Reporter Info */}
        <div className="row">
          <div className="form-group">
            <label className="text-sm font-semibold">Your Name (Optional)</label>
            <input
              type="text"
              placeholder="Name"
              value={reporterName}
              onChange={(e) => setReporterName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="text-sm font-semibold">Contact Phone (Optional)</label>
            <input
              type="text"
              placeholder="e.g. 10 digit number"
              value={reporterPhone}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                setReporterPhone(val);
              }}
            />
          </div>
        </div>

        <button type="submit" disabled={isSubmitting} className="btn-primary w-full py-3">
          {isSubmitting ? 'Submitting Report...' : 'Submit Incident Report'}
        </button>
      </form>
    </motion.section>
  );
}
