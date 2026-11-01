/**
 * Storage utility for personal guest lifeline tracking.
 * Stored locally in the reporter's browser so that only they can see
 * their private lifeline tracking link and chat in the notification bell,
 * without broadcasting to anyone else in the facility.
 */

const STORAGE_KEY = 'omnibridge_guest_lifelines';

export function savePersonalLifeline({ incidentId, token, type, location, venueSlug, venueName }) {
  if (!incidentId || !token) return;
  try {
    const list = getPersonalLifelines();
    // Prepend new lifeline, deduplicating by incidentId
    const filtered = list.filter((item) => String(item.incidentId) !== String(incidentId));
    const newItem = {
      incidentId,
      token,
      type: type || 'EMERGENCY',
      location: location || 'Venue Location',
      venueSlug: venueSlug || 'default',
      venueName: venueName || 'Facility',
      createdAt: new Date().toISOString(),
      url: `/lifeline/${incidentId}?token=${encodeURIComponent(token)}`,
    };
    const updated = [newItem, ...filtered].slice(0, 10); // keep up to 10 recent
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    // Dispatch a storage event so NotificationBell updates immediately in this tab
    window.dispatchEvent(new Event('omnibridge_lifeline_updated'));
  } catch (err) {
    console.warn('Failed to save personal lifeline to localStorage', err);
  }
}

export function getPersonalLifelines() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function removePersonalLifeline(incidentId) {
  try {
    const list = getPersonalLifelines();
    const updated = list.filter((item) => String(item.incidentId) !== String(incidentId));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event('omnibridge_lifeline_updated'));
  } catch (err) {
    console.warn('Failed to remove personal lifeline', err);
  }
}

