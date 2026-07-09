const BEACON_SENT_KEY = 'colors-checker-app-analytics-beacon';

export const APP_ANALYTICS_BEACON_URL = 'https://app.gosignpdf.com/colors-checker';
export const LOCAL_APP_ANALYTICS_BEACON_URL = 'http://localhost:9000/colors-checker';

export function getAnalyticsBeaconUrl(hostname = typeof window !== 'undefined' ? window.location.hostname : '') {
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return LOCAL_APP_ANALYTICS_BEACON_URL;
  }
  return APP_ANALYTICS_BEACON_URL;
}

/**
 * Records a visit in the GoSignPDF app Firestore analytics (via app middleware).
 * Uses no-cors GET so no separate /api call appears in the browser network tab.
 */
export function sendAppAnalyticsBeacon() {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (sessionStorage.getItem(BEACON_SENT_KEY)) {
      return;
    }
    sessionStorage.setItem(BEACON_SENT_KEY, '1');
  } catch {
    // sessionStorage unavailable; still attempt once per load
  }

  const url = getAnalyticsBeaconUrl();
  fetch(url, { mode: 'no-cors', keepalive: true, credentials: 'omit' }).catch(() => {});
}
