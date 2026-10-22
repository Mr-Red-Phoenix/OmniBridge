import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { MarkerPin01, AlertCircle, XClose, NavigationPointer01, Phone, Check, ShieldZap } from '@untitledui/icons';
import { toast } from 'react-toastify';
import incidentApi from '../api/incidentApi';

export default function SosModal({ isOpen, onClose, venues = [], defaultVenueSlug = '' }) {
  const navigate = useNavigate();
  const [selectedVenue, setSelectedVenue] = useState(defaultVenueSlug);
  const [location, setLocation] = useState('');
  const [type, setType] = useState('MEDICAL');
  const [notes, setNotes] = useState('');
  const [reporterName, setReporterName] = useState('');
  const [reporterPhone, setReporterPhone] = useState('');
  const [coords, setCoords] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (defaultVenueSlug) {
      setSelectedVenue(defaultVenueSlug);
    } else if (venues.length > 0 && !selectedVenue) {
      setSelectedVenue(venues[0].slug);
    }
  }, [defaultVenueSlug, venues, selectedVenue]);

  useEffect(() => {
    if (isOpen) {
      detectLocation();
    }
  }, [isOpen]);

  const detectLocation = () => {
    if ('geolocation' in navigator) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setCoords({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
          setGettingLocation(false);
          toast.success('Exact GPS coordinates captured!');
        },
        () => {
          setGettingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 7000 }
      );
    }
  };

  const handleTriggerSos = async (e) => {
    e.preventDefault();
    const venueSlug = selectedVenue || (venues[0] && venues[0].slug);
    if (!venueSlug) {
      toast.error('Please select a facility venue.');
      return;
    }
    if (!location.trim()) {
      toast.warning('Please provide your current location inside the facility.');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        location: location.trim(),
        type,
        notes: notes.trim() || 'Immediate emergency distress SOS triggered by user.',
        reporterName: reporterName.trim() || undefined,
        reporterPhone: reporterPhone.trim() || undefined,
        latitude: coords?.latitude || undefined,
        longitude: coords?.longitude || undefined,
      };

      const res = await incidentApi.submitSos(venueSlug, payload);
      toast.success('EMERGENCY SOS DISPATCHED! Redirecting to Live Lifeline...');
      onClose();

      if (res.data?.incidentId && res.data?.guestAccessToken) {
        navigate(`/lifeline/${res.data.incidentId}?token=${encodeURIComponent(res.data.guestAccessToken)}`);
      } else {
        navigate('/');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Emergency SOS dispatch failed. Call emergency services directly!');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="w-full max-w-lg max-h-[92vh] overflow-y-auto p-5 sm:p-7 rounded-3xl bg-white dark:bg-[#111827] border-2 border-red-500/60 shadow-2xl relative transition-colors"
      >
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-red-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-red-500/10 dark:bg-red-500/20 text-red-600 dark:text-red-500 animate-pulse">
              <ShieldZap size={26} />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-red-600 dark:text-red-500 tracking-wide uppercase">
                EMERGENCY SOS PANIC TRIGGER
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Instantly alerts on-duty security, medical staff, and dispatch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <XClose size={20} />
          </button>
        </div>

        <form onSubmit={handleTriggerSos} className="space-y-4">
          <div>
            <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5 block">
              Target Venue Facility *
            </label>
            <select
              value={selectedVenue}
              onChange={(e) => setSelectedVenue(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-semibold focus:outline-none focus:border-red-500"
              required
            >
              {venues.map((v) => (
                <option key={v.slug} value={v.slug}>
                  {v.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300">
                Exact Location (Room / Floor / Area) *
              </label>
              <button
                type="button"
                onClick={detectLocation}
                disabled={gettingLocation}
                className="text-xs text-red-600 dark:text-red-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
              >
                <NavigationPointer01 size={12} className={gettingLocation ? 'animate-spin' : ''} />
                {coords ? 'GPS Attached' : 'Auto-Detect GPS'}
              </button>
            </div>
            <input
              type="text"
              placeholder="e.g. 3rd Floor, West Hallway outside Room 304"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500"
              required
              autoFocus
            />
            {coords && (
              <div className="mt-2.5 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                <div className="flex items-center justify-between p-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <span className="flex items-center gap-1">
                    <MarkerPin01 size={12} />
                    <span>GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}</span>
                  </span>
                  <a
                    href={`https://www.google.com/maps?q=${coords.latitude},${coords.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Google Maps ↗
                  </a>
                </div>
                <iframe
                  title="SOS Location Map"
                  width="100%"
                  height="120"
                  style={{ border: 0 }}
                  loading="lazy"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${coords.longitude - 0.003}%2C${coords.latitude - 0.003}%2C${coords.longitude + 0.003}%2C${coords.latitude + 0.003}&layer=mapnik&marker=${coords.latitude}%2C${coords.longitude}`}
                />
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5 block">
              Distress Category
            </label>
            <div className="flex flex-wrap gap-2">
              {['MEDICAL', 'FIRE', 'SECURITY', 'FACILITY'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setType(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                    type === cat
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-bold uppercase text-slate-700 dark:text-slate-300 mb-1.5 block">
              Urgent Field Notes (Optional)
            </label>
            <textarea
              rows="2"
              placeholder="e.g. Patient unconscious / Active intruder / Smoke visible"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:border-red-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Your Name (Optional)</label>
              <input
                type="text"
                placeholder="Name"
                value={reporterName}
                onChange={(e) => setReporterName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1 block">Callback Phone (Optional)</label>
              <input
                type="text"
                placeholder="Phone number"
                value={reporterPhone}
                onChange={(e) => setReporterPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs focus:outline-none focus:border-red-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-extrabold text-sm sm:text-base shadow-lg shadow-red-500/30 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
          >
            <ShieldZap size={20} />
            <span>{submitting ? 'DISPATCHING EMERGENCY UNITS...' : 'TRIGGER IMMEDIATE DISTRESS SOS'}</span>
          </button>
        </form>
      </motion.div>
    </div>
  );
}
