import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, AlertOctagon, XClose } from '@untitledui/icons';
import guestApi from '../api/guestApi';

export default function BroadcastBanner({ venueSlug }) {
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState({});

  useEffect(() => {
    if (!venueSlug) return;

    let isMounted = true;

    // Fetch active broadcasts
    const fetchBroadcasts = async () => {
      try {
        const res = await guestApi.getVenueBroadcasts(venueSlug);
        if (isMounted && Array.isArray(res.data)) {
          setAlerts(res.data.filter((a) => a.active));
        }
      } catch (err) {
        // Silently fail if no broadcasts or network error
      }
    };

    fetchBroadcasts();

    // Setup SSE stream for real-time broadcasts
    let eventSource = null;
    try {
      const streamUrl = guestApi.getVenueBroadcastStreamUrl(venueSlug);
      eventSource = new EventSource(streamUrl);

      eventSource.addEventListener('broadcast', (event) => {
        try {
          const alert = JSON.parse(event.data);
          if (alert.active) {
            setAlerts((prev) => {
              const filtered = prev.filter((a) => a.id !== alert.id);
              return [alert, ...filtered];
            });
          } else {
            setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
          }
        } catch (e) {
          console.error('Failed to parse broadcast stream event', e);
        }
      });

      eventSource.onerror = () => {
        // SSE auto-reconnects
      };
    } catch (e) {
      // Ignore SSE init failure in offline or test mode
    }

    return () => {
      isMounted = false;
      if (eventSource) eventSource.close();
    };
  }, [venueSlug]);

  const activeAlerts = alerts.filter((a) => !dismissed[a.id]);

  if (activeAlerts.length === 0) return null;

  return (
    <div className="w-full mb-6">
      <AnimatePresence>
        {activeAlerts.map((alert) => {
          const isCritical = alert.severity === 'CRITICAL' || alert.severity === 'HIGH';
          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
              className={`p-4 rounded-xl mb-3 flex items-start justify-between gap-3 border ${
                isCritical
                  ? 'bg-red-500/15 border-red-500/30 text-red-200'
                  : 'bg-amber-500/15 border-amber-500/30 text-amber-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg mt-0.5 ${
                    isCritical ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
                  }`}
                >
                  {isCritical ? <AlertOctagon size={22} /> : <AlertTriangle size={22} />}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm uppercase tracking-wider px-2 py-0.5 rounded bg-black/30">
                      {alert.severity} ALERT
                    </span>
                    {alert.targetZone && (
                      <span className="text-xs opacity-75">Zone: {alert.targetZone}</span>
                    )}
                    <span className="text-xs opacity-50">
                      {new Date(alert.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <h4 className="font-bold text-base mt-1 text-white">{alert.title}</h4>
                  <p className="text-sm opacity-90 mt-0.5">{alert.message}</p>
                </div>
              </div>
              <button
                onClick={() => setDismissed((prev) => ({ ...prev, [alert.id]: true }))}
                className="opacity-70 hover:opacity-100 p-1 transition-opacity text-white"
                title="Dismiss alert banner"
              >
                <XClose size={18} />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
